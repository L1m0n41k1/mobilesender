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

interface Template {
  id: string;
  name: string;
  content: string;
  created_at: string;
}

export default function TemplatesScreen() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить шаблоны');
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: templateName.trim(),
          content: templateContent.trim()
        })
      });

      if (response.ok) {
        setShowModal(false);
        setTemplateName('');
        setTemplateContent('');
        await fetchTemplates();
        Alert.alert('Успех', 'Шаблон создан');
      } else {
        const error = await response.json();
        Alert.alert('Ошибка', error.detail || 'Не удалось создать шаблон');
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      Alert.alert('Ошибка', 'Проблемы с подключением');
    }

    setSaving(false);
  };

  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    Alert.alert(
      'Удалить шаблон',
      `Вы уверены, что хотите удалить шаблон "${templateName}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => deleteTemplate(templateId)
        }
      ]
    );
  };

  const deleteTemplate = async (templateId: string) => {
    // TODO: Implement delete functionality in backend
    Alert.alert('Функция в разработке', 'Удаление шаблонов будет добавлено позже');
  };

  const renderTemplateItem = ({ item }: { item: Template }) => (
    <View style={styles.templateItem}>
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{item.name}</Text>
        <TouchableOpacity 
          onPress={() => handleDeleteTemplate(item.id, item.name)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.templateContent} numberOfLines={3}>
        {item.content}
      </Text>
      
      <Text style={styles.templateDate}>
        Создан: {new Date(item.created_at).toLocaleDateString('ru-RU')}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={48} color="#666" />
      <Text style={styles.emptyTitle}>Нет шаблонов</Text>
      <Text style={styles.emptySubtitle}>
        Создайте свой первый шаблон сообщения для рассылок
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
        <Text style={styles.addButtonText}>Создать шаблон</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Шаблоны сообщений</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.headerButton}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={templates}
        renderItem={renderTemplateItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={templates.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Template Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Создать шаблон</Text>
            <TouchableOpacity 
              onPress={handleCreateTemplate}
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
              <Text style={styles.inputLabel}>Название шаблона:</Text>
              <TextInput
                style={styles.input}
                placeholder="Например: Приветствие"
                placeholderTextColor="#666"
                value={templateName}
                onChangeText={setTemplateName}
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Содержание сообщения:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Введите текст сообщения..."
                placeholderTextColor="#666"
                value={templateContent}
                onChangeText={setTemplateContent}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.characterCount}>
                {templateContent.length}/1000 символов
              </Text>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb-outline" size={20} color="#FF9500" />
              <Text style={styles.tipText}>
                Совет: Используйте переменные как {'{'}имя{'}'} для персонализации сообщений
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
  templateItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  templateContent: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
    lineHeight: 20,
  },
  templateDate: {
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
  textArea: {
    height: 120,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  tipBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    color: '#FF9500',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});