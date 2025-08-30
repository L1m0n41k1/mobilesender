import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setLoading(true);
    const success = await login(email, password);
    setLoading(false);

    if (!success) {
      Alert.alert('Ошибка входа', 'Неверные учетные данные');
    }
  };

  const handleRegister = async () => {
    if (!email || !username || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setLoading(true);
    const success = await register(email, username, password);
    setLoading(false);

    if (success) {
      Alert.alert('Успех', 'Аккаунт создан! Теперь войдите в систему.');
      setCurrentView('login');
      setUsername('');
      setPassword('');
    } else {
      Alert.alert('Ошибка регистрации', 'Ошибка при создании аккаунта');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
                editable={!loading}
              />

              {currentView === 'register' && (
                <TextInput
                  style={styles.input}
                  placeholder="Имя пользователя"
                  placeholderTextColor="#666"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Пароль"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={currentView === 'login' ? handleLogin : handleRegister}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Загрузка...' : (currentView === 'login' ? 'Войти' : 'Зарегистрироваться')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setCurrentView(currentView === 'login' ? 'register' : 'login');
                  setPassword('');
                  if (currentView === 'register') setUsername('');
                }}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>
                  {currentView === 'login' 
                    ? 'Нет аккаунта? Зарегистрируйтесь' 
                    : 'Уже есть аккаунт? Войдите'
                  }
                </Text>
              </TouchableOpacity>

              {/* Admin credentials hint */}
              <View style={styles.adminHint}>
                <Text style={styles.adminHintText}>
                  Админ аккаунт: admin@sender.app / admin123
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  disabledButton: {
    opacity: 0.6,
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
  adminHint: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  adminHintText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});