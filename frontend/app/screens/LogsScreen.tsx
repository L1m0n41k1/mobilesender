import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface BroadcastLog {
  id: string;
  messenger_type: string;
  total_contacts: number;
  successful_sends: number;
  failed_sends: number;
  status: string;
  created_at: string;
  completed_at?: string;
}

export default function LogsScreen() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/broadcast-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: 'Завершена', color: '#00FF88', icon: 'checkmark-circle' };
      case 'in_progress':
        return { text: 'В процессе', color: '#FF9500', icon: 'time' };
      case 'failed':
        return { text: 'Ошибка', color: '#FF3B30', icon: 'close-circle' };
      case 'pending':
        return { text: 'Ожидает', color: '#666', icon: 'hourglass' };
      default:
        return { text: 'Неизвестно', color: '#666', icon: 'help-circle' };
    }
  };

  const getMessengerInfo = (type: string) => {
    switch (type) {
      case 'telegram':
        return { name: 'Telegram', color: '#0088cc', icon: 'paper-plane' };
      case 'whatsapp':
        return { name: 'WhatsApp', color: '#25d366', icon: 'logo-whatsapp' };
      default:
        return { name: type, color: '#666', icon: 'chatbubble' };
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('ru-RU'),
      time: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const renderLogItem = ({ item }: { item: BroadcastLog }) => {
    const statusInfo = getStatusInfo(item.status);
    const messengerInfo = getMessengerInfo(item.messenger_type);
    const createdDateTime = formatDateTime(item.created_at);
    const completedDateTime = item.completed_at ? formatDateTime(item.completed_at) : null;

    const successRate = item.total_contacts > 0 
      ? Math.round((item.successful_sends / item.total_contacts) * 100)
      : 0;

    return (
      <View style={styles.logItem}>
        <View style={styles.logHeader}>
          <View style={styles.logMainInfo}>
            <View style={styles.logTitleRow}>
              <View style={styles.messengerBadge}>
                <Ionicons 
                  name={messengerInfo.icon as any} 
                  size={16} 
                  color={messengerInfo.color} 
                />
                <Text style={[styles.messengerText, { color: messengerInfo.color }]}>
                  {messengerInfo.name}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                <Ionicons 
                  name={statusInfo.icon as any} 
                  size={14} 
                  color={statusInfo.color} 
                />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.text}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.total_contacts}</Text>
            <Text style={styles.statLabel}>Всего</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#00FF88' }]}>{item.successful_sends}</Text>
            <Text style={styles.statLabel}>Успешно</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{item.failed_sends}</Text>
            <Text style={styles.statLabel}>Ошибки</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#007AFF' }]}>{successRate}%</Text>
            <Text style={styles.statLabel}>Успех</Text>
          </View>
        </View>

        <View style={styles.logDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.detailText}>
              Начата: {createdDateTime.date} в {createdDateTime.time}
            </Text>
          </View>
          
          {completedDateTime && (
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle" size={16} color="#666" />
              <Text style={styles.detailText}>
                Завершена: {completedDateTime.date} в {completedDateTime.time}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="list-outline" size={48} color="#666" />
      <Text style={styles.emptyTitle}>Нет логов рассылок</Text>
      <Text style={styles.emptySubtitle}>
        Информация о рассылках будет отображаться здесь после их запуска
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Логи рассылок</Text>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={logs.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  listContainer: {
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  logHeader: {
    marginBottom: 16,
  },
  logMainInfo: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messengerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  messengerText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  logDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
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
  },
});