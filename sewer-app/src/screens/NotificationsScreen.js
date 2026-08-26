import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { styles as globalStyles } from '../styles/globalStyles';
import { AuthContext } from '../context/authContext';
import { API_BASE_URL } from '../config/constants';

const NotificationsScreen = ({ route, navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Automatically fetch notifications every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [userToken])
  );

  const fetchNotifications = async () => {
    if (!userToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const formatted = data.map((item) => ({
          ...item,
          read: item.read || false,
        }));
        setNotifications(formatted);
      } else {
        console.error('Failed to fetch notifications:', response.status);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = (item) => {
    // Mark as read locally
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );

    // If the notification has an associated service_id, navigate to Services with it
    if (item.service_id) {
      navigation.navigate('Services', { service_id: item.service_id });
    } else if (item.type === 'booking_created' || item.type === 'new_service_added') {
      // Fallback redirection to Services if type matches
      navigation.navigate('Services');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[localStyles.notificationCard, item.read && localStyles.readCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.8}
    >
      <View style={localStyles.iconContainer}>
        <Ionicons
          name={item.read ? 'checkmark-circle-outline' : 'notifications'}
          size={24}
          color={item.read ? '#9CA3AF' : '#F59E0B'}
        />
      </View>
      <View style={localStyles.textContainer}>
        <View style={localStyles.titleRow}>
          <Text style={[localStyles.title, item.read && localStyles.readText]}>
            {item.title}
          </Text>
          <Text style={localStyles.time}>{item.time}</Text>
        </View>
        <Text style={[localStyles.message, item.read && localStyles.readText]}>
          {item.message}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.screenBackground, localStyles.container]}>
      <View style={localStyles.header}>
        <Text style={localStyles.headerTitle}>Notifications & Alerts</Text>
      </View>

      {loading && !refreshing ? (
        <View style={localStyles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={localStyles.center}>
          <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
          <Text style={localStyles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={localStyles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
        />
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  listContainer: {
    paddingBottom: 24,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  readCard: {
    backgroundColor: '#F9FAFB',
    borderLeftColor: '#9CA3AF',
    opacity: 0.85,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  readText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: '#6B7280',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
});

export default NotificationsScreen;