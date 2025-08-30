import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Contact {
  id: string;
  name: string;
  phone?: string;
  telegram_username?: string;
  created_at: string;
}

export default function ContactsScreen() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTelegram, setContactTelegram] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить контакты');
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContacts();
    setRefreshing(false);
  };

  const handleCreateContact = async () => {
    if (!contactName.trim()) {
      Alert.alert('Ошибка', 'Введите имя контакта');
      return;
    }

    if (!contactPhone.trim() && !contactTelegram.trim()) {
      Alert.alert('Ошибка', 'Введите номер телефона или Telegram username');
      return;
    }

    setSaving(true);

    try {
      const body: any = {
        name: contactName.trim()
      };

      if (contactPhone.trim()) {
        body.phone = contactPhone.trim();
      }

      if (contactTelegram.trim()) {
        body.telegram_username = contactTelegram.trim().startsWith('@') 
          ? contactTelegram.trim() 
          : `@${contactTelegram.trim()}`;
      }

      const response = await fetch(`${BACKEND_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowModal(false);
        resetForm();
        await fetchContacts();
        Alert.alert('Успех', 'Контакт добавлен');
      } else {
        const error = await response.json();
        Alert.alert('Ошибка', error.detail || 'Не удалось добавить контакт');
      }
    } catch (error) {
      console.error('Failed to create contact:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }

    setSaving(false);
  };

  const resetForm = () => {
    setContactName('');
    setContactPhone('');
    setContactTelegram('');
  };

  const handleImportCSV = () => {
    Alert.alert(
      'Импорт CSV',
      'Функция импорта контактов из CSV файла будет добавлена в следующей версии',
      [{ text: 'ОК' }]
    );
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactHeader}>
        <View style={styles.contactIcon}>
          <Ionicons name="person" size={20} color="#007AFF" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.phone && (
            <Text style={styles.contactDetail}>
              <Ionicons name="call" size={14} color="#666" /> {item.phone}
            </Text>
          )}
          {item.telegram_username && (
            <Text style={styles.contactDetail}>
              <Ionicons name="paper-plane" size={14} color="#666" /> {item.telegram_username}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.contactDate}>
        Добавлен: {new Date(item.created_at).toLocaleDateString('ru-RU')}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={48} color="#666" />
      <Text style={styles.emptyTitle}>Нет контактов</Text>
      <Text style={styles.emptySubtitle}>
        Добавьте контакты для рассылки сообщений
      </Text>
      <View style={styles.emptyButtons}>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>Добавить контакт</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.importButton} onPress={handleImportCSV}>
          <Text style={styles.importButtonText}>Импорт CSV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Контакты</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleImportCSV} style={styles.headerButton}>
            <Ionicons name="download-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.headerButton}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={contacts.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Contact Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowModal(false);
                resetForm();
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Добавить контакт</Text>
            <TouchableOpacity 
              onPress={handleCreateContact}
              style={[styles.modalSaveButton, saving && styles.disabledButton]}
              disabled={saving}
            >
              <Text style={styles.modalSaveText}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Имя контакта: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Например: Иван Петров"
                placeholderTextColor="#666"
                value={contactName}
                onChangeText={setContactName}
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Номер телефона (для WhatsApp):</Text>
              <TextInput
                style={styles.input}
                placeholder="+7 900 123 45 67"
                placeholderTextColor="#666"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telegram username:</Text>
              <TextInput
                style={styles.input}
                placeholder="@username или username"
                placeholderTextColor="#666"
                value={contactTelegram}
                onChangeText={setContactTelegram}
                autoCapitalize="none"
                maxLength={50}
              />
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="information-circle" size={20} color="#007AFF" />
              <Text style={styles.tipText}>
                Укажите номер телефона для WhatsApp рассылок или Telegram username для Telegram рассылок.
                Можно указать оба параметра.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  listContainer: {
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contactItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  contactDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  importButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
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
  tipBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});