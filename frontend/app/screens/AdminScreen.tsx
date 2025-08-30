import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  FlatList,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  subscription_plan: string;
  is_unlimited: boolean;
  messages_sent_this_month: number;
  created_at: string;
}

interface SubscriptionPlan {
  name: string;
  message_limit: number;
  price: number;
}

export default function AdminScreen() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<Record<string, SubscriptionPlan>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    if (!token) return;

    try {
      const [usersRes, plansRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/subscription-plans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (usersRes.ok && plansRes.ok) {
        const [usersData, plansData] = await Promise.all([
          usersRes.json(),
          plansRes.json()
        ]);

        setUsers(usersData);
        setSubscriptionPlans(plansData);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAdminData();
    setRefreshing(false);
  };

  const handleToggleUnlimited = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}/unlimited`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_unlimited: !currentStatus })
      });

      if (response.ok) {
        await fetchAdminData();
        Alert.alert('Успех', `Безлимитный доступ ${!currentStatus ? 'предоставлен' : 'отозван'}`);
      } else {
        Alert.alert('Ошибка', 'Не удалось изменить статус');
      }
    } catch (error) {
      console.error('Failed to toggle unlimited:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }
  };

  const handleChangeSubscription = async (userId: string, plan: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}/subscription`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      });

      if (response.ok) {
        await fetchAdminData();
        Alert.alert('Успех', 'Подписка изменена');
      } else {
        Alert.alert('Ошибка', 'Не удалось изменить подписку');
      }
    } catch (error) {
      console.error('Failed to change subscription:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }
  };

  const handleUpdatePricing = async () => {
    if (!selectedPlan || !newPrice.trim()) {
      Alert.alert('Ошибка', 'Выберите план и введите новую цену');
      return;
    }

    const price = parseInt(newPrice);
    if (isNaN(price) || price < 0) {
      Alert.alert('Ошибка', 'Введите корректную цену');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/subscription-plans/${selectedPlan}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price })
      });

      if (response.ok) {
        setShowPricingModal(false);
        setSelectedPlan('');
        setNewPrice('');
        await fetchAdminData();
        Alert.alert('Успех', 'Цена обновлена');
      } else {
        Alert.alert('Ошибка', 'Не удалось обновить цену');
      }
    } catch (error) {
      console.error('Failed to update pricing:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <Text style={styles.userPlan}>{subscriptionPlans[item.subscription_plan]?.name}</Text>
            {item.is_unlimited && <Text style={styles.unlimitedBadge}>БЕЗЛИМИТ</Text>}
          </View>
        </View>
        
        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Изменить подписку',
                'Выберите новый план:',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Бесплатный', onPress: () => handleChangeSubscription(item.id, 'free') },
                  { text: 'Базовый', onPress: () => handleChangeSubscription(item.id, 'basic') },
                  { text: 'Профессиональный', onPress: () => handleChangeSubscription(item.id, 'professional') },
                  { text: 'Корпоративный', onPress: () => handleChangeSubscription(item.id, 'corporate') },
                ]
              );
            }}
          >
            <Ionicons name="card" size={18} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleUnlimited(item.id, item.is_unlimited)}
          >
            <Ionicons 
              name={item.is_unlimited ? "infinite" : "infinite-outline"} 
              size={18} 
              color={item.is_unlimited ? "#00FF88" : "#666"} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.userStats}>
        Сообщений в месяце: {item.messages_sent_this_month}
      </Text>
    </View>
  );

  const renderPlanItem = (planKey: string, plan: SubscriptionPlan) => (
    <View key={planKey} style={styles.planItem}>
      <View style={styles.planInfo}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planLimit}>
          Лимит: {plan.message_limit === -1 ? 'Безлимит' : `${plan.message_limit} сообщений`}
        </Text>
        <Text style={styles.planPrice}>Цена: {plan.price} ₽</Text>
      </View>
      
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          setSelectedPlan(planKey);
          setNewPrice(plan.price.toString());
          setShowPricingModal(true);
        }}
      >
        <Ionicons name="pencil" size={18} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={48} color="#FF3B30" />
          <Text style={styles.accessDeniedTitle}>Доступ запрещен</Text>
          <Text style={styles.accessDeniedText}>
            Только администраторы могут получить доступ к этой странице
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Администрирование</Text>
          <Text style={styles.subtitle}>Управление пользователями и настройками системы</Text>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color="#007AFF" />
              <Text style={styles.statNumber}>{users.length}</Text>
              <Text style={styles.statLabel}>Всего пользователей</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="infinite" size={24} color="#00FF88" />
              <Text style={styles.statNumber}>
                {users.filter(u => u.is_unlimited).length}
              </Text>
              <Text style={styles.statLabel}>С безлимитом</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Быстрые действия</Text>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setShowUsersModal(true)}
            >
              <Ionicons name="people" size={24} color="#007AFF" />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Управление пользователями</Text>
                <Text style={styles.actionDescription}>
                  Просмотр и изменение подписок пользователей
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => setShowPricingModal(true)}
            >
              <Ionicons name="card" size={24} color="#FF9500" />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Управление ценами</Text>
                <Text style={styles.actionDescription}>
                  Изменение стоимости планов подписки
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Subscription Plans */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Планы подписки</Text>
            {Object.entries(subscriptionPlans).map(([key, plan]) => 
              renderPlanItem(key, plan)
            )}
          </View>
        </View>
      </ScrollView>

      {/* Users Modal */}
      <Modal
        visible={showUsersModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowUsersModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Пользователи</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>

      {/* Pricing Modal */}
      <Modal
        visible={showPricingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowPricingModal(false);
                setSelectedPlan('');
                setNewPrice('');
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Изменить цену</Text>
            <TouchableOpacity 
              onPress={handleUpdatePricing}
              style={styles.modalSaveButton}
            >
              <Text style={styles.modalSaveText}>Сохранить</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>План:</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.selectedPlan}>
                  {selectedPlan ? subscriptionPlans[selectedPlan]?.name : 'Выберите план'}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Новая цена (₽):</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.plansList}>
              {Object.entries(subscriptionPlans).map(([key, plan]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.planSelectItem,
                    selectedPlan === key && styles.selectedPlanItem
                  ]}
                  onPress={() => {
                    setSelectedPlan(key);
                    setNewPrice(plan.price.toString());
                  }}
                >
                  <Text style={styles.planSelectName}>{plan.name}</Text>
                  <Text style={styles.planSelectPrice}>Текущая цена: {plan.price} ₽</Text>
                </TouchableOpacity>
              ))}
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
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  planLimit: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
  modalPlaceholder: {
    width: 40,
  },
  modalSaveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalList: {
    padding: 24,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  userItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userPlan: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  unlimitedBadge: {
    fontSize: 10,
    color: '#00FF88',
    backgroundColor: '#00FF8820',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  userStats: {
    fontSize: 12,
    color: '#666',
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
  pickerContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedPlan: {
    fontSize: 16,
    color: '#fff',
  },
  plansList: {
    gap: 12,
  },
  planSelectItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPlanItem: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF20',
  },
  planSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  planSelectPrice: {
    fontSize: 14,
    color: '#666',
  },
});