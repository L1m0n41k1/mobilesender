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
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Stats {
  totalAccounts: number;
  totalTemplates: number;
  totalContacts: number;
  totalBroadcasts: number;
}

export default function DashboardScreen() {
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalAccounts: 0,
    totalTemplates: 0,
    totalContacts: 0,
    totalBroadcasts: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!token) return;

    try {
      const [accountsRes, templatesRes, contactsRes, logsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/messenger-accounts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/templates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/contacts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/broadcast-logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (accountsRes.ok && templatesRes.ok && contactsRes.ok && logsRes.ok) {
        const [accounts, templates, contacts, logs] = await Promise.all([
          accountsRes.json(),
          templatesRes.json(),
          contactsRes.json(),
          logsRes.json()
        ]);

        setStats({
          totalAccounts: accounts.length,
          totalTemplates: templates.length,
          totalContacts: contacts.length,
          totalBroadcasts: logs.length
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: logout }
      ]
    );
  };

  const getSubscriptionInfo = () => {
    if (!user) return { name: 'Неизвестно', limit: 0, color: '#666' };

    if (user.is_unlimited) {
      return { name: 'Безлимитный', limit: -1, color: '#00FF88' };
    }

    switch (user.subscription_plan) {
      case 'free':
        return { name: 'Бесплатный', limit: 10, color: '#666' };
      case 'basic':
        return { name: 'Базовый', limit: 1000, color: '#007AFF' };
      case 'professional':
        return { name: 'Профессиональный', limit: 5000, color: '#FF9500' };
      case 'corporate':
        return { name: 'Корпоративный', limit: 20000, color: '#FF3B30' };
      default:
        return { name: 'Неизвестно', limit: 0, color: '#666' };
    }
  };

  const subscriptionInfo = getSubscriptionInfo();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Добро пожаловать!</Text>
            <Text style={styles.usernameText}>{user?.username}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userCardHeader}>
            <Ionicons name="person-circle" size={40} color="#007AFF" />
            <View style={styles.userInfo}>
              <Text style={styles.userInfoEmail}>{user?.email}</Text>
              <Text style={styles.userInfoRole}>
                {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
              </Text>
            </View>
          </View>

          <View style={styles.subscriptionInfo}>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Подписка:</Text>
              <Text style={[styles.subscriptionValue, { color: subscriptionInfo.color }]}>
                {subscriptionInfo.name}
              </Text>
            </View>
            
            {subscriptionInfo.limit !== -1 && (
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Лимит сообщений:</Text>
                <Text style={styles.subscriptionValue}>
                  {user?.messages_sent_this_month || 0} / {subscriptionInfo.limit}
                </Text>
              </View>
            )}

            {user?.is_unlimited && (
              <View style={styles.unlimitedBadge}>
                <Text style={styles.unlimitedText}>БЕЗЛИМИТ</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="person-outline" size={24} color="#007AFF" />
            <Text style={styles.statNumber}>{stats.totalAccounts}</Text>
            <Text style={styles.statLabel}>Аккаунты</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="document-text-outline" size={24} color="#FF9500" />
            <Text style={styles.statNumber}>{stats.totalTemplates}</Text>
            <Text style={styles.statLabel}>Шаблоны</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={24} color="#00FF88" />
            <Text style={styles.statNumber}>{stats.totalContacts}</Text>
            <Text style={styles.statLabel}>Контакты</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="send-outline" size={24} color="#FF3B30" />
            <Text style={styles.statNumber}>{stats.totalBroadcasts}</Text>
            <Text style={styles.statLabel}>Рассылки</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>Добавить аккаунт</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="document-text" size={24} color="#FF9500" />
            <Text style={styles.actionButtonText}>Создать шаблон</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="people" size={24} color="#00FF88" />
            <Text style={styles.actionButtonText}>Импорт контактов</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="send" size={24} color="#FF3B30" />
            <Text style={styles.actionButtonText}>Начать рассылку</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
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
  header: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  usernameText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  userCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userInfoEmail: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  userInfoRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  subscriptionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionLabel: {
    fontSize: 14,
    color: '#666',
  },
  subscriptionValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  unlimitedBadge: {
    backgroundColor: '#00FF88',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  unlimitedText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginRight: '2%',
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
  },
  quickActions: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
});