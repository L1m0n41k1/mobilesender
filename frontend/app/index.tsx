import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  subscription_plan: string;
  is_unlimited: boolean;
  messages_sent_this_month: number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'main'>('login');
  const [loading, setLoading] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const user = await response.json();
          setAuthState({
            isAuthenticated: true,
            user,
            token
          });
        } else {
          await AsyncStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.access_token);
        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token: data.access_token
        });
        setEmail('');
        setPassword('');
      } else {
        Alert.alert('Ошибка входа', data.detail || 'Неверные учетные данные');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Проблемы с подключением к серверу');
    }
  };

  const handleRegister = async () => {
    if (!email || !username || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, username, password })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Успех', 'Аккаунт создан! Теперь войдите в систему.');
        setCurrentView('login');
        setEmail(email); // Сохраняем email для входа
        setUsername('');
        setPassword('');
      } else {
        Alert.alert('Ошибка регистрации', data.detail || 'Ошибка при создании аккаунта');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Проблемы с подключением к серверу');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('auth_token');
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex1}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.authContainer}>
              <View style={styles.headerContainer}>
                <Ionicons name="send" size={48} color="#007AFF" />
                <Text style={styles.appTitle}>Sender</Text>
                <Text style={styles.appSubtitle}>
                  Система массовых рассылок
                </Text>
              </View>

              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {currentView === 'register' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Имя пользователя"
                    placeholderTextColor="#666"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Пароль"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={currentView === 'login' ? handleLogin : handleRegister}
                >
                  <Text style={styles.primaryButtonText}>
                    {currentView === 'login' ? 'Войти' : 'Зарегистрироваться'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setCurrentView(currentView === 'login' ? 'register' : 'login');
                    setPassword('');
                    if (currentView === 'register') setUsername('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    {currentView === 'login' 
                      ? 'Нет аккаунта? Зарегистрируйтесь' 
                      : 'Уже есть аккаунт? Войдите'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Main app interface (placeholder for now)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sender</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        <Text style={styles.welcomeText}>
          Добро пожаловать, {authState.user?.username}!
        </Text>
        
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>
            Подписка: {authState.user?.subscription_plan}
          </Text>
          <Text style={styles.userInfoText}>
            Роль: {authState.user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
          </Text>
          {authState.user?.is_unlimited && (
            <Text style={styles.unlimitedBadge}>БЕЗЛИМИТ</Text>
          )}
          <Text style={styles.userInfoText}>
            Отправлено в этом месяце: {authState.user?.messages_sent_this_month}
          </Text>
        </View>

        <Text style={styles.comingSoonText}>
          Основной интерфейс приложения в разработке...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  flex1: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    padding: 16,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  userInfo: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  userInfoText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  unlimitedBadge: {
    color: '#00FF88',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  comingSoonText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});