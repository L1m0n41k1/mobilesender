#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Sender App
Tests all authentication, user management, and CRUD operations
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://msg-sender.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@sender.app"
ADMIN_PASSWORD = "admin123"

class SenderAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, params: Dict = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == "POST":
                if params:
                    response = requests.post(url, headers=headers, params=params, timeout=30)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                if params:
                    response = requests.put(url, headers=headers, params=params, timeout=30)
                else:
                    response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_admin_login(self):
        """Test admin authentication"""
        try:
            response = self.make_request("POST", "/auth/login", {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                user_info = data.get("user", {})
                
                if self.admin_token and user_info.get("role") == "admin":
                    self.log_test("Admin Login", True, 
                                f"Admin logged in successfully. Role: {user_info.get('role')}")
                    return True
                else:
                    self.log_test("Admin Login", False, 
                                "Login successful but missing token or admin role", data)
                    return False
            else:
                self.log_test("Admin Login", False, 
                            f"Login failed with status {response.status_code}", 
                            response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception during login: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration"""
        try:
            test_email = f"testuser_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
            test_username = f"testuser_{datetime.now().strftime('%H%M%S')}"
            
            response = self.make_request("POST", "/auth/register", {
                "email": test_email,
                "username": test_username,
                "password": "testpassword123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.test_user_id = data.get("id")
                
                # Now login with the new user
                login_response = self.make_request("POST", "/auth/login", {
                    "email": test_email,
                    "password": "testpassword123"
                })
                
                if login_response.status_code == 200:
                    login_data = login_response.json()
                    self.user_token = login_data.get("access_token")
                    self.log_test("User Registration & Login", True, 
                                f"User registered and logged in. ID: {self.test_user_id}")
                    return True
                else:
                    self.log_test("User Registration & Login", False, 
                                "Registration successful but login failed", 
                                login_response.text)
                    return False
            else:
                self.log_test("User Registration & Login", False, 
                            f"Registration failed with status {response.status_code}", 
                            response.text)
                return False
                
        except Exception as e:
            self.log_test("User Registration & Login", False, 
                        f"Exception during registration: {str(e)}")
            return False
    
    def test_auth_me(self):
        """Test getting current user info"""
        try:
            # Test with admin token
            response = self.make_request("GET", "/auth/me", token=self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "admin":
                    self.log_test("Auth Me (Admin)", True, 
                                f"Admin user info retrieved. Email: {data.get('email')}")
                else:
                    self.log_test("Auth Me (Admin)", False, 
                                "User info retrieved but role is not admin", data)
                    return False
            else:
                self.log_test("Auth Me (Admin)", False, 
                            f"Failed to get user info. Status: {response.status_code}", 
                            response.text)
                return False
            
            # Test with regular user token
            if self.user_token:
                response = self.make_request("GET", "/auth/me", token=self.user_token)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test("Auth Me (User)", True, 
                                f"User info retrieved. Role: {data.get('role')}")
                else:
                    self.log_test("Auth Me (User)", False, 
                                f"Failed to get user info. Status: {response.status_code}", 
                                response.text)
                    return False
            
            return True
            
        except Exception as e:
            self.log_test("Auth Me", False, f"Exception during auth/me test: {str(e)}")
            return False
    
    def test_user_management(self):
        """Test admin user management endpoints"""
        try:
            # Test getting all users (admin only)
            response = self.make_request("GET", "/users", token=self.admin_token)
            
            if response.status_code == 200:
                users = response.json()
                self.log_test("Get All Users", True, 
                            f"Retrieved {len(users)} users")
            else:
                self.log_test("Get All Users", False, 
                            f"Failed to get users. Status: {response.status_code}", 
                            response.text)
                return False
            
            # Test updating user subscription (admin only)
            if self.test_user_id:
                response = self.make_request("PUT", f"/users/{self.test_user_id}/subscription", 
                                           params={"plan": "basic"}, token=self.admin_token)
                
                if response.status_code == 200:
                    self.log_test("Update User Subscription", True, 
                                "User subscription updated to basic plan")
                else:
                    self.log_test("Update User Subscription", False, 
                                f"Failed to update subscription. Status: {response.status_code}", 
                                response.text)
                    return False
                
                # Test granting unlimited access
                response = self.make_request("PUT", f"/users/{self.test_user_id}/unlimited", 
                                           params={"is_unlimited": True}, token=self.admin_token)
                
                if response.status_code == 200:
                    self.log_test("Grant Unlimited Access", True, 
                                "Unlimited access granted to user")
                else:
                    self.log_test("Grant Unlimited Access", False, 
                                f"Failed to grant unlimited access. Status: {response.status_code}", 
                                response.text)
                    return False
            
            return True
            
        except Exception as e:
            self.log_test("User Management", False, 
                        f"Exception during user management test: {str(e)}")
            return False
    
    def test_subscription_plans(self):
        """Test subscription plans endpoints"""
        try:
            # Test getting all subscription plans
            response = self.make_request("GET", "/subscription-plans")
            
            if response.status_code == 200:
                plans = response.json()
                self.log_test("Get Subscription Plans", True, 
                            f"Retrieved {len(plans)} subscription plans")
                
                # Test updating a plan price (admin only)
                response = self.make_request("PUT", "/subscription-plans/basic", 
                                           params={"price": 1299}, token=self.admin_token)
                
                if response.status_code == 200:
                    self.log_test("Update Plan Price", True, 
                                "Basic plan price updated successfully")
                else:
                    self.log_test("Update Plan Price", False, 
                                f"Failed to update plan price. Status: {response.status_code}", 
                                response.text)
                    return False
            else:
                self.log_test("Get Subscription Plans", False, 
                            f"Failed to get plans. Status: {response.status_code}", 
                            response.text)
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Subscription Plans", False, 
                        f"Exception during subscription plans test: {str(e)}")
            return False
    
    def test_messenger_accounts(self):
        """Test messenger accounts CRUD operations"""
        try:
            # Test getting messenger accounts (should be empty initially)
            response = self.make_request("GET", "/messenger-accounts", token=self.user_token)
            
            if response.status_code == 200:
                accounts = response.json()
                self.log_test("Get Messenger Accounts", True, 
                            f"Retrieved {len(accounts)} messenger accounts")
            else:
                self.log_test("Get Messenger Accounts", False, 
                            f"Failed to get accounts. Status: {response.status_code}", 
                            response.text)
                return False
            
            # Test creating a new messenger account
            response = self.make_request("POST", "/messenger-accounts", 
                                       params={"messenger_type": "telegram", "account_name": "My Telegram"}, 
                                       token=self.user_token)
            
            if response.status_code == 200:
                account = response.json()
                self.log_test("Create Messenger Account", True, 
                            f"Created Telegram account: {account.get('account_name')}")
            else:
                self.log_test("Create Messenger Account", False, 
                            f"Failed to create account. Status: {response.status_code}", 
                            response.text)
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Messenger Accounts", False, 
                        f"Exception during messenger accounts test: {str(e)}")
            return False
    
    def test_templates(self):
        """Test message templates CRUD operations"""
        try:
            # Test getting templates (should be empty initially)
            response = self.make_request("GET", "/templates", token=self.user_token)
            
            if response.status_code == 200:
                templates = response.json()
                self.log_test("Get Templates", True, 
                            f"Retrieved {len(templates)} templates")
            else:
                self.log_test("Get Templates", False, 
                            f"Failed to get templates. Status: {response.status_code}", 
                            response.text)
                return False
            
            # Test creating a new template
            response = self.make_request("POST", "/templates", 
                                       params={"name": "Приветствие", "content": "Привет! Как дела?"}, 
                                       token=self.user_token)
            
            if response.status_code == 200:
                template = response.json()
                self.log_test("Create Template", True, 
                            f"Created template: {template.get('name')}")
            else:
                self.log_test("Create Template", False, 
                            f"Failed to create template. Status: {response.status_code}", 
                            response.text)
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Templates", False, 
                        f"Exception during templates test: {str(e)}")
            return False
    
    def test_contacts(self):
        """Test contacts CRUD operations"""
        try:
            # Test getting contacts (should be empty initially)
            response = self.make_request("GET", "/contacts", token=self.user_token)
            
            if response.status_code == 200:
                contacts = response.json()
                self.log_test("Get Contacts", True, 
                            f"Retrieved {len(contacts)} contacts")
            else:
                self.log_test("Get Contacts", False, 
                            f"Failed to get contacts. Status: {response.status_code}", 
                            response.text)
                return False
            
            # Test creating a new contact
            response = self.make_request("POST", "/contacts", 
                                       params={"name": "Иван Петров", "phone": "+79001234567", "telegram_username": "@ivan_petrov"}, 
                                       token=self.user_token)
            
            if response.status_code == 200:
                contact = response.json()
                self.log_test("Create Contact", True, 
                            f"Created contact: {contact.get('name')}")
            else:
                self.log_test("Create Contact", False, 
                            f"Failed to create contact. Status: {response.status_code}", 
                            response.text)
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Contacts", False, 
                        f"Exception during contacts test: {str(e)}")
            return False
    
    def test_broadcast_logs(self):
        """Test broadcast logs endpoint"""
        try:
            # Test getting broadcast logs (should be empty initially)
            response = self.make_request("GET", "/broadcast-logs", token=self.user_token)
            
            if response.status_code == 200:
                logs = response.json()
                self.log_test("Get Broadcast Logs", True, 
                            f"Retrieved {len(logs)} broadcast logs")
                return True
            else:
                self.log_test("Get Broadcast Logs", False, 
                            f"Failed to get logs. Status: {response.status_code}", 
                            response.text)
                return False
            
        except Exception as e:
            self.log_test("Broadcast Logs", False, 
                        f"Exception during broadcast logs test: {str(e)}")
            return False
    
    def test_authorization(self):
        """Test authorization and access control"""
        try:
            # Test accessing admin endpoint without admin token
            response = self.make_request("GET", "/users", token=self.user_token)
            
            if response.status_code == 403:
                self.log_test("Authorization Control", True, 
                            "Regular user correctly denied access to admin endpoint")
            else:
                self.log_test("Authorization Control", False, 
                            f"Regular user should not access admin endpoint. Status: {response.status_code}", 
                            response.text)
                return False
            
            # Test accessing protected endpoint without token
            response = self.make_request("GET", "/auth/me")
            
            if response.status_code in [401, 403]:
                self.log_test("Authentication Required", True, 
                            f"Correctly denied access without authentication token (Status: {response.status_code})")
            else:
                self.log_test("Authentication Required", False, 
                            f"Should require authentication. Status: {response.status_code}", 
                            response.text)
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Authorization", False, 
                        f"Exception during authorization test: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Sender API Tests")
        print(f"📡 Base URL: {self.base_url}")
        print(f"👤 Admin: {ADMIN_EMAIL}")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
        
        if not self.test_user_registration():
            print("❌ User registration failed - continuing with limited tests")
        
        self.test_auth_me()
        
        # Admin functionality tests
        self.test_user_management()
        self.test_subscription_plans()
        
        # CRUD operations tests
        if self.user_token:
            self.test_messenger_accounts()
            self.test_templates()
            self.test_contacts()
            self.test_broadcast_logs()
        
        # Security tests
        self.test_authorization()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        
        if total - passed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        return passed == total

def main():
    """Main test execution"""
    tester = SenderAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()