import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Screens
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import AccountsScreen from './screens/AccountsScreen';
import TemplatesScreen from './screens/TemplatesScreen';
import ContactsScreen from './screens/ContactsScreen';
import BroadcastScreen from './screens/BroadcastScreen';
import ScheduledScreen from './screens/ScheduledScreen';
import LogsScreen from './screens/LogsScreen';
import AdminScreen from './screens/AdminScreen';
import AddAccountScreen from './screens/AddAccountScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Accounts') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Templates') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Broadcast') {
            iconName = focused ? 'send' : 'send-outline';
          } else if (route.name === 'Scheduled') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Logs') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333',
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Главная' }} />
      <Tab.Screen name="Accounts" component={AccountsScreen} options={{ title: 'Аккаунты' }} />
      <Tab.Screen name="Templates" component={TemplatesScreen} options={{ title: 'Шаблоны' }} />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Контакты' }} />
      <Tab.Screen name="Broadcast" component={BroadcastScreen} options={{ title: 'Рассылка' }} />
      <Tab.Screen name="Scheduled" component={ScheduledScreen} options={{ title: 'Отложенные' }} />
      <Tab.Screen name="Logs" component={LogsScreen} options={{ title: 'Логи' }} />
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Админ' }} />
      )}
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="AddAccount" 
              component={AddAccountScreen}
              options={{
                headerShown: true,
                title: 'Добавить аккаунт',
                headerStyle: { backgroundColor: '#1a1a1a' },
                headerTintColor: '#fff',
                presentation: 'modal'
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
});