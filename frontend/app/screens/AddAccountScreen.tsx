import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type MessengerType = 'telegram' | 'whatsapp' | null;

export default function AddAccountScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [selectedMessenger, setSelectedMessenger] = useState<MessengerType>(null);
  const [accountName, setAccountName] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleSelectMessenger = (type: MessengerType) => {
    setSelectedMessenger(type);
  };

  const handleNext = () => {
    if (!selectedMessenger) {
      Alert.alert('Ошибка', 'Выберите мессенджер');
      return;
    }

    if (!accountName.trim()) {
      Alert.alert('Ошибка', 'Введите название аккаунта');
      return;
    }

    // Открываем WebView для авторизации
    const url = selectedMessenger === 'telegram' 
      ? 'https://web.telegram.org/k/' 
      : 'https://web.whatsapp.com/';
    
    setWebViewUrl(url);
    setShowWebView(true);
  };

  const handleWebViewLoad = () => {
    // WebView загружен, пользователь может авторизоваться
    console.log('WebView loaded');
  };

  const handleSaveAccount = async () => {
    if (!selectedMessenger || !accountName.trim()) return;

    setLoading(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/messenger-accounts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messenger_type: selectedMessenger,
          account_name: accountName.trim()
        })
      });

      if (response.ok) {
        Alert.alert(
          'Успех', 
          'Аккаунт успешно добавлен!',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowWebView(false);
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert('Ошибка', error.detail || 'Не удалось добавить аккаунт');
      }
    } catch (error) {
      console.error('Failed to save account:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }
    
    setLoading(false);
  };

  const handleCloseWebView = () => {
    Alert.alert(
      'Завершить добавление?',
      'Вы действительно хотите закрыть окно авторизации? Аккаунт не будет добавлен.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Закрыть', 
          style: 'destructive',
          onPress: () => setShowWebView(false)
        }
      ]
    );
  };

  const renderMessengerOption = (type: MessengerType, icon: string, name: string, color: string) => (
    <TouchableOpacity
      style={[
        styles.messengerOption,
        selectedMessenger === type && { borderColor: color, backgroundColor: `${color}20` }
      ]}
      onPress={() => handleSelectMessenger(type)}
    >
      <Ionicons name={icon as any} size={32} color={color} />
      <Text style={styles.messengerName}>{name}</Text>
      {selectedMessenger === type && (
        <Ionicons name="checkmark-circle" size={24} color={color} style={styles.checkmark} />
      )}
    </TouchableOpacity>
  );

  if (showWebView) {
    return (
      <Modal visible={showWebView} animationType="slide">
        <SafeAreaView style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity onPress={handleCloseWebView} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>
              Авторизация в {selectedMessenger === 'telegram' ? 'Telegram' : 'WhatsApp'}
            </Text>
            <TouchableOpacity 
              onPress={handleSaveAccount} 
              style={[styles.saveButton, loading && styles.disabledButton]}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            style={styles.webView}
            onLoad={handleWebViewLoad}
            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          />
          
          <View style={styles.webViewFooter}>
            <Text style={styles.footerText}>
              После успешной авторизации нажмите "Сохранить"
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Шаг 1 из 2</Text>
          </View>

          <Text style={styles.title}>Добавить аккаунт мессенджера</Text>
          <Text style={styles.subtitle}>
            Выберите мессенджер и введите название для аккаунта
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Выберите мессенджер:</Text>
            <View style={styles.messengerGrid}>
              {renderMessengerOption('telegram', 'paper-plane', 'Telegram', '#0088cc')}
              {renderMessengerOption('whatsapp', 'logo-whatsapp', 'WhatsApp', '#25d366')}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Название аккаунта:</Text>
            <TextInput
              style={styles.input}
              placeholder="Например: Мой основной аккаунт"
              placeholderTextColor="#666"
              value={accountName}
              onChangeText={setAccountName}
              maxLength={50}
            />
            <Text style={styles.inputHint}>
              Это название поможет вам различать аккаунты в списке
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.nextButton,
              (!selectedMessenger || !accountName.trim()) && styles.disabledButton
            ]}
            onPress={handleNext}
            disabled={!selectedMessenger || !accountName.trim()}
          >
            <Text style={styles.nextButtonText}>Далее</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <Text style={styles.infoText}>
              На следующем шаге откроется браузер для авторизации в выбранном мессенджере. 
              После успешного входа ваш аккаунт будет сохранен для рассылок.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  stepIndicator: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  messengerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messengerOption: {
    flex: 0.48,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  messengerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  inputHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  infoBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  // WebView styles
  webViewContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  webViewTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
  },
  webViewFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});