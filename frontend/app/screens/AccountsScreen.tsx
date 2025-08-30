import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface MessengerAccount {
  id: string;
  messenger_type: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
}

export default function AccountsScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [accounts, setAccounts] = useState<MessengerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/messenger-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить аккаунты');
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAccounts();
    setRefreshing(false);
  };

  const handleAddAccount = () => {
    navigation.navigate('AddAccount' as never);
  };

  const handleToggleAccount = async (accountId: string, currentStatus: boolean) => {
    // TODO: Implement account status toggle
    Alert.alert('Функция в разработке', 'Возможность активации/деактивации аккаунтов будет добавлена позже');
  };

  const renderAccountItem = ({ item }: { item: MessengerAccount }) => {
    const getMessengerInfo = (type: string) => {
      switch (type) {
        case 'telegram':
          return { name: 'Telegram', icon: 'paper-plane', color: '#0088cc' };
        case 'whatsapp':
          return { name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25d366' };
        default:
          return { name: type, icon: 'chatbubble', color: '#666' };
      }
    };

    const messengerInfo = getMessengerInfo(item.messenger_type);

    return (
      <View style={styles.accountItem}>
        <View style={styles.accountHeader}>
          <View style={styles.accountIcon}>
            <Ionicons 
              name={messengerInfo.icon as any} 
              size={24} 
              color={messengerInfo.color} 
            />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{item.account_name}</Text>
            <Text style={styles.messengerType}>{messengerInfo.name}</Text>
          </View>
          <View style={styles.accountActions}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                { backgroundColor: item.is_active ? '#00FF88' : '#FF3B30' }
              ]}
              onPress={() => handleToggleAccount(item.id, item.is_active)}
            >
              <Text style={styles.statusText}>
                {item.is_active ? 'Активен' : 'Неактивен'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.createdDate}>
          Добавлен: {new Date(item.created_at).toLocaleDateString('ru-RU')}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="person-add-outline" size={48} color="#666" />
      <Text style={styles.emptyTitle}>Нет аккаунтов</Text>
      <Text style={styles.emptySubtitle}>
        Добавьте свой первый аккаунт мессенджера для начала рассылок
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddAccount}>
        <Text style={styles.addButtonText}>Добавить аккаунт</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мои аккаунты</Text>
        <TouchableOpacity onPress={handleAddAccount} style={styles.headerButton}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={accounts.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />
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
  headerButton: {
    padding: 8,
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
  accountItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  messengerType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  accountActions: {
    alignItems: 'flex-end',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  createdDate: {
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
});