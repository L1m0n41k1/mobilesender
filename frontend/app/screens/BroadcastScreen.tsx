import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface MessengerAccount {
  id: string;
  messenger_type: string;
  account_name: string;
  is_active: boolean;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

interface Contact {
  id: string;
  name: string;
  phone?: string;
  telegram_username?: string;
}

export default function BroadcastScreen() {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState<MessengerAccount[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateMode, setTemplateMode] = useState<'single' | 'random' | 'alternate'>('single');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token) return;

    try {
      const [accountsRes, templatesRes, contactsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/messenger-accounts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/templates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/contacts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (accountsRes.ok && templatesRes.ok && contactsRes.ok) {
        const [accountsData, templatesData, contactsData] = await Promise.all([
          accountsRes.json(),
          templatesRes.json(),
          contactsRes.json()
        ]);

        setAccounts(accountsData.filter((acc: MessengerAccount) => acc.is_active));
        setTemplates(templatesData);
        setContacts(contactsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    }
  };

  const getEligibleContacts = () => {
    if (!selectedAccount) return [];
    
    const account = accounts.find(acc => acc.id === selectedAccount);
    if (!account) return [];

    if (account.messenger_type === 'telegram') {
      return contacts.filter(contact => contact.telegram_username);
    } else if (account.messenger_type === 'whatsapp') {
      return contacts.filter(contact => contact.phone);
    }

    return [];
  };

  const canStartBroadcast = () => {
    const eligibleContacts = getEligibleContacts();
    
    if (!selectedAccount || eligibleContacts.length === 0) {
      return { canStart: false, reason: 'Выберите аккаунт и убедитесь, что есть подходящие контакты' };
    }

    if (templateMode === 'single' && !selectedTemplate) {
      return { canStart: false, reason: 'Выберите шаблон сообщения' };
    }

    if ((templateMode === 'random' || templateMode === 'alternate') && selectedTemplates.length === 0) {
      return { canStart: false, reason: 'Выберите минимум один шаблон' };
    }

    // Check message limits
    if (!user?.is_unlimited) {
      const limit = getMessageLimit();
      if (user?.messages_sent_this_month && user.messages_sent_this_month >= limit) {
        return { canStart: false, reason: 'Достигнут лимит сообщений на текущий месяц' };
      }
      
      if (user?.messages_sent_this_month && 
          (user.messages_sent_this_month + eligibleContacts.length) > limit) {
        return { 
          canStart: false, 
          reason: `Рассылка превысит месячный лимит. Доступно: ${limit - user.messages_sent_this_month} сообщений` 
        };
      }
    }

    return { canStart: true, reason: '' };
  };

  const getMessageLimit = () => {
    if (!user) return 0;
    
    switch (user.subscription_plan) {
      case 'free': return 10;
      case 'basic': return 1000;
      case 'professional': return 5000;
      case 'corporate': return 20000;
      default: return 0;
    }
  };

  const handleStartBroadcast = () => {
    const { canStart, reason } = canStartBroadcast();
    
    if (!canStart) {
      Alert.alert('Невозможно начать рассылку', reason);
      return;
    }

    const eligibleContacts = getEligibleContacts();
    const account = accounts.find(acc => acc.id === selectedAccount);
    
    Alert.alert(
      'Подтвердите рассылку',
      `Будет отправлено ${eligibleContacts.length} сообщений через ${account?.account_name}. Продолжить?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Начать', onPress: startBroadcast }
      ]
    );
  };

  const startBroadcast = async () => {
    setLoading(true);
    
    // TODO: Implement actual broadcast logic
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Успех', 'Рассылка запущена! Отслеживайте прогресс во вкладке "Логи"');
    }, 2000);
  };

  const handleTemplateSelection = (templateId: string) => {
    if (selectedTemplates.includes(templateId)) {
      setSelectedTemplates(selectedTemplates.filter(id => id !== templateId));
    } else {
      setSelectedTemplates([...selectedTemplates, templateId]);
    }
  };

  const eligibleContacts = getEligibleContacts();
  const broadcastCheck = canStartBroadcast();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Новая рассылка</Text>
          <Text style={styles.subtitle}>
            Настройте параметры рассылки и запустите отправку сообщений
          </Text>

          {/* Account Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Выберите аккаунт:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedAccount}
                onValueChange={setSelectedAccount}
                style={styles.picker}
                dropdownIconColor="#666"
              >
                <Picker.Item label="Выберите аккаунт..." value="" />
                {accounts.map(account => (
                  <Picker.Item
                    key={account.id}
                    label={`${account.account_name} (${account.messenger_type})`}
                    value={account.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Contacts Info */}
          {selectedAccount && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="people" size={20} color="#007AFF" />
                <Text style={styles.infoText}>
                  Доступно контактов: {eligibleContacts.length}
                </Text>
              </View>
            </View>
          )}

          {/* Template Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Режим шаблонов:</Text>
            
            <TouchableOpacity
              style={[styles.modeOption, templateMode === 'single' && styles.selectedMode]}
              onPress={() => setTemplateMode('single')}
            >
              <Ionicons 
                name={templateMode === 'single' ? 'radio-button-on' : 'radio-button-off'} 
                size={20} 
                color="#007AFF" 
              />
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Один шаблон</Text>
                <Text style={styles.modeDescription}>
                  Отправить одинаковое сообщение всем контактам
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeOption, templateMode === 'random' && styles.selectedMode]}
              onPress={() => setTemplateMode('random')}
            >
              <Ionicons 
                name={templateMode === 'random' ? 'radio-button-on' : 'radio-button-off'} 
                size={20} 
                color="#007AFF" 
              />
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Случайный выбор</Text>
                <Text style={styles.modeDescription}>
                  Случайно выбирать шаблон для каждого контакта
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeOption, templateMode === 'alternate' && styles.selectedMode]}
              onPress={() => setTemplateMode('alternate')}
            >
              <Ionicons 
                name={templateMode === 'alternate' ? 'radio-button-on' : 'radio-button-off'} 
                size={20} 
                color="#007AFF" 
              />
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Чередование</Text>
                <Text style={styles.modeDescription}>
                  Поочередно использовать выбранные шаблоны
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Template Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {templateMode === 'single' ? 'Выберите шаблон:' : 'Выберите шаблоны:'}
            </Text>
            
            {templateMode === 'single' ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  <Picker.Item label="Выберите шаблон..." value="" />
                  {templates.map(template => (
                    <Picker.Item
                      key={template.id}
                      label={template.name}
                      value={template.id}
                    />
                  ))}
                </Picker>
              </View>
            ) : (
              <View style={styles.templatesList}>
                {templates.map(template => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateOption,
                      selectedTemplates.includes(template.id) && styles.selectedTemplate
                    ]}
                    onPress={() => handleTemplateSelection(template.id)}
                  >
                    <Ionicons
                      name={selectedTemplates.includes(template.id) ? 'checkbox' : 'checkbox-outline'}
                      size={20}
                      color="#007AFF"
                    />
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateName}>{template.name}</Text>
                      <Text style={styles.templatePreview} numberOfLines={2}>
                        {template.content}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Usage Info */}
          {!user?.is_unlimited && (
            <View style={styles.usageCard}>
              <Text style={styles.usageTitle}>Использование подписки:</Text>
              <Text style={styles.usageText}>
                Отправлено в этом месяце: {user?.messages_sent_this_month || 0} / {getMessageLimit()}
              </Text>
              {eligibleContacts.length > 0 && (
                <Text style={styles.usageText}>
                  После рассылки: {(user?.messages_sent_this_month || 0) + eligibleContacts.length} / {getMessageLimit()}
                </Text>
              )}
            </View>
          )}

          {/* Start Button */}
          <TouchableOpacity
            style={[
              styles.startButton,
              (!broadcastCheck.canStart || loading) && styles.disabledButton
            ]}
            onPress={handleStartBroadcast}
            disabled={!broadcastCheck.canStart || loading}
          >
            {loading ? (
              <Text style={styles.startButtonText}>Запуск рассылки...</Text>
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.startButtonText}>Начать рассылку</Text>
              </>
            )}
          </TouchableOpacity>

          {!broadcastCheck.canStart && (
            <View style={styles.errorCard}>
              <Ionicons name="warning" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{broadcastCheck.reason}</Text>
            </View>
          )}
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
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
  pickerContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  picker: {
    color: '#fff',
    backgroundColor: 'transparent',
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedMode: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF20',
  },
  modeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  templatesList: {
    maxHeight: 300,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedTemplate: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF20',
  },
  templateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  templatePreview: {
    fontSize: 14,
    color: '#666',
  },
  usageCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  usageText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  startButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorCard: {
    backgroundColor: '#FF3B3020',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});