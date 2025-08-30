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

interface ScheduledBroadcast {
  id: string;
  title: string;
  messenger_type: string;
  scheduled_time: string;
  recipients_count: number;
  status: 'pending' | 'scheduled' | 'cancelled';
  created_at: string;
}

export default function ScheduledScreen() {
  const { token } = useAuth();
  const [scheduledBroadcasts, setScheduledBroadcasts] = useState<ScheduledBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // For now, we'll use mock data since scheduled broadcasts aren't implemented yet
    loadMockData();
  }, []);

  const loadMockData = () => {
    // Mock data for demonstration
    const mockData: ScheduledBroadcast[] = [
      {
        id: '1',
        title: 'Еженедельная рассылка',
        messenger_type: 'telegram',
        scheduled_time: '2025-08-31T10:00:00Z',
        recipients_count: 25,
        status: 'scheduled',
        created_at: '2025-08-30T15:30:00Z'
      },
      {
        id: '2',
        title: 'Акционное предложение',
        messenger_type: 'whatsapp',
        scheduled_time: '2025-09-01T14:30:00Z',
        recipients_count: 150,
        status: 'pending',
        created_at: '2025-08-30T12:15:00Z'
      }
    ];
    
    setScheduledBroadcasts(mockData);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadMockData();
    setRefreshing(false);
  };

  const handleCancelBroadcast = (broadcastId: string, title: string) => {
    Alert.alert(
      'Отменить рассылку',
      `Вы уверены, что хотите отменить рассылку "${title}"?`,
      [
        { text: 'Нет', style: 'cancel' },
        { 
          text: 'Да, отменить', 
          style: 'destructive',
          onPress: () => cancelBroadcast(broadcastId)
        }
      ]
    );
  };

  const cancelBroadcast = (broadcastId: string) => {
    // TODO: Implement actual cancellation
    setScheduledBroadcasts(prev => 
      prev.map(broadcast => 
        broadcast.id === broadcastId 
          ? { ...broadcast, status: 'cancelled' as const }
          : broadcast
      )
    );
    Alert.alert('Успех', 'Рассылка отменена');
  };

  const handleEditBroadcast = (broadcastId: string) => {
    Alert.alert('Функция в разработке', 'Редактирование запланированных рассылок будет добавлено позже');
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { text: 'Запланирована', color: '#007AFF', icon: 'time' };
      case 'pending':
        return { text: 'Ожидает', color: '#FF9500', icon: 'hourglass' };
      case 'cancelled':
        return { text: 'Отменена', color: '#FF3B30', icon: 'close-circle' };
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

  const renderBroadcastItem = ({ item }: { item: ScheduledBroadcast }) => {
    const statusInfo = getStatusInfo(item.status);
    const messengerInfo = getMessengerInfo(item.messenger_type);
    const scheduledDateTime = formatDateTime(item.scheduled_time);

    return (
      <View style={styles.broadcastItem}>
        <View style={styles.broadcastHeader}>
          <View style={styles.broadcastMainInfo}>
            <Text style={styles.broadcastTitle}>{item.title}</Text>
            <View style={styles.broadcastMeta}>
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
          
          {item.status !== 'cancelled' && (
            <View style={styles.broadcastActions}>
              <TouchableOpacity 
                onPress={() => handleEditBroadcast(item.id)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil" size={18} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleCancelBroadcast(item.id, item.title)}
                style={styles.actionButton}
              >
                <Ionicons name="trash" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.broadcastDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.detailText}>
              {scheduledDateTime.date} в {scheduledDateTime.time}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.recipients_count} получателей
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="add-circle" size={16} color="#666" />
            <Text style={styles.detailText}>
              Создана: {formatDateTime(item.created_at).date}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={48} color="#666" />
      <Text style={styles.emptyTitle}>Нет запланированных рассылок</Text>
      <Text style={styles.emptySubtitle}>
        Запланированные рассылки будут отображаться здесь
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={() => {
        Alert.alert('Функция в разработке', 'Планирование рассылок будет добавлено в следующей версии');
      }}>
        <Text style={styles.addButtonText}>Запланировать рассылку</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Отложенные рассылки</Text>
        <TouchableOpacity 
          onPress={() => {
            Alert.alert('Функция в разработке', 'Планирование рассылок будет добавлено в следующей версии');
          }}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={scheduledBroadcasts}
        renderItem={renderBroadcastItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={scheduledBroadcasts.length === 0 ? styles.emptyContainer : styles.listContainer}
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
  broadcastItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  broadcastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  broadcastMainInfo: {
    flex: 1,
  },
  broadcastTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  broadcastMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  messengerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  messengerText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  broadcastActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  broadcastDetails: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
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