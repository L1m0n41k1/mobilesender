from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app without a prefix
app = FastAPI(title="Sender API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Subscription plans
SUBSCRIPTION_PLANS = {
    "free": {"name": "Бесплатный", "message_limit": 10, "price": 0},
    "basic": {"name": "Базовый", "message_limit": 1000, "price": 999},
    "professional": {"name": "Профессиональный", "message_limit": 5000, "price": 2999},
    "corporate": {"name": "Корпоративный", "message_limit": 20000, "price": 9999},
    "unlimited": {"name": "Безлимитный", "message_limit": -1, "price": 0}
}

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    password_hash: str
    role: str = "user"  # user, admin
    subscription_plan: str = "free"
    is_unlimited: bool = False
    messages_sent_this_month: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str
    subscription_plan: str
    is_unlimited: bool
    messages_sent_this_month: int
    created_at: datetime

class MessengerAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    messenger_type: str  # telegram, whatsapp
    account_name: str
    session_data: Dict[str, Any] = {}
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Template(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Contact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    phone: Optional[str] = None
    telegram_username: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BroadcastLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    messenger_type: str
    total_contacts: int
    successful_sends: int = 0
    failed_sends: int = 0
    status: str = "pending"  # pending, in_progress, completed, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return UserResponse(**user)

async def get_admin_user(current_user: UserResponse = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Authentication routes
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({
        "$or": [{"email": user_data.email}, {"username": user_data.username}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hashed_password
    )
    
    await db.users.insert_one(user.dict())
    return UserResponse(**user.dict())

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user)
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# User management routes
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(admin_user: UserResponse = Depends(get_admin_user)):
    users = await db.users.find().to_list(1000)
    return [UserResponse(**user) for user in users]

@api_router.put("/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str,
    plan: str,
    admin_user: UserResponse = Depends(get_admin_user)
):
    if plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"subscription_plan": plan, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Subscription updated successfully"}

@api_router.put("/users/{user_id}/unlimited")
async def toggle_unlimited_access(
    user_id: str,
    is_unlimited: bool,
    admin_user: UserResponse = Depends(get_admin_user)
):
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_unlimited": is_unlimited, "updated_at": datetime.utcnow()}}
    )
    return {"message": f"Unlimited access {'granted' if is_unlimited else 'revoked'}"}

# Subscription plans routes
@api_router.get("/subscription-plans")
async def get_subscription_plans():
    return SUBSCRIPTION_PLANS

@api_router.put("/subscription-plans/{plan_id}")
async def update_subscription_plan(
    plan_id: str,
    price: int,
    admin_user: UserResponse = Depends(get_admin_user)
):
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
    
    SUBSCRIPTION_PLANS[plan_id]["price"] = price
    # In a real app, you'd save this to database
    return {"message": "Plan updated successfully"}

# Messenger accounts routes
@api_router.get("/messenger-accounts", response_model=List[MessengerAccount])
async def get_messenger_accounts(current_user: UserResponse = Depends(get_current_user)):
    accounts = await db.messenger_accounts.find({"user_id": current_user.id}).to_list(100)
    return [MessengerAccount(**account) for account in accounts]

class MessengerAccountCreate(BaseModel):
    messenger_type: str
    account_name: str

@api_router.post("/messenger-accounts", response_model=MessengerAccount)
async def create_messenger_account(
    account_data: MessengerAccountCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    if account_data.messenger_type not in ["telegram", "whatsapp"]:
        raise HTTPException(status_code=400, detail="Invalid messenger type")
    
    account = MessengerAccount(
        user_id=current_user.id,
        messenger_type=account_data.messenger_type,
        account_name=account_data.account_name
    )
    
    await db.messenger_accounts.insert_one(account.dict())
    return account

# Templates routes
@api_router.get("/templates", response_model=List[Template])
async def get_templates(current_user: UserResponse = Depends(get_current_user)):
    templates = await db.templates.find({"user_id": current_user.id}).to_list(100)
    return [Template(**template) for template in templates]

class TemplateCreate(BaseModel):
    name: str
    content: str

@api_router.post("/templates", response_model=Template)
async def create_template(
    template_data: TemplateCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    template = Template(
        user_id=current_user.id,
        name=template_data.name,
        content=template_data.content
    )
    
    await db.templates.insert_one(template.dict())
    return template

# Contacts routes
@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(current_user: UserResponse = Depends(get_current_user)):
    contacts = await db.contacts.find({"user_id": current_user.id}).to_list(1000)
    return [Contact(**contact) for contact in contacts]

@api_router.post("/contacts", response_model=Contact)
async def create_contact(
    name: str,
    phone: Optional[str] = None,
    telegram_username: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    contact = Contact(
        user_id=current_user.id,
        name=name,
        phone=phone,
        telegram_username=telegram_username
    )
    
    await db.contacts.insert_one(contact.dict())
    return contact

# Broadcast logs routes
@api_router.get("/broadcast-logs", response_model=List[BroadcastLog])
async def get_broadcast_logs(current_user: UserResponse = Depends(get_current_user)):
    logs = await db.broadcast_logs.find({"user_id": current_user.id}).to_list(100)
    return [BroadcastLog(**log) for log in logs]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Create admin user if not exists
    admin_user = await db.users.find_one({"role": "admin"})
    if not admin_user:
        admin = User(
            email="admin@sender.app",
            username="admin",
            password_hash=hash_password("admin123"),
            role="admin",
            subscription_plan="unlimited",
            is_unlimited=True
        )
        await db.users.insert_one(admin.dict())
        logger.info("Admin user created: admin@sender.app / admin123")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()