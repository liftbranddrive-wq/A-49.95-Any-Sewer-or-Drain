import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { styles as globalStyles } from '../styles/globalStyles';
import { AuthContext } from '../context/authContext';
import { API_BASE_URL } from '../config/constants';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const NotificationsScreen = ({ route, navigation }) => {
  const { userToken, userRole, user } = useContext(AuthContext);
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
          read: item.read || item.is_read || false,
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

  const handleNotificationPress = async (item) => {
    // 1. Mark as read locally immediately for smooth UI feedback
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );

    // 2. Persist the "read" status to your backend database if it wasn't already read
    if (userToken && !item.read) {
      try {
        await fetch(`${API_BASE_URL}/api/notifications/${item.id}/read`, {
          method: 'PATCH', // Change to 'PUT' if your FastAPI endpoint uses PUT
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.error('Failed to sync read status with backend:', err);
      }
    }

    const rawRole = userRole || user?.role || '';
    const isAdmin = String(rawRole).trim().toLowerCase() === 'admin';

    // 3. Responsive navigation depending on item parameters or user role
    if (item.service_id) {
      try {
        navigation.navigate(isAdmin ? 'Admin Services' : 'Services', { service_id: item.service_id });
      } catch (err) {
        navigation.navigate(isAdmin ? 'Admin' : 'Home');
      }
    } else if (item.type === 'booking_created' || item.type === 'new_service_added') {
      navigation.navigate(isAdmin ? 'Admin Services' : 'Services');
    } else if (item.type === 'admin_action' && isAdmin) {
      navigation.navigate('Admin');
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
          size={isTablet ? 28 : 24}
          color={item.read ? '#9CA3AF' : '#F59E0B'}
        />
      </View>
      <View style={localStyles.textContainer}>
        <View style={localStyles.titleRow}>
          <Text style={[localStyles.title, item.read && localStyles.readText]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={localStyles.time}>{item.time}</Text>
        </View>
        <Text style={[localStyles.message, item.read && localStyles.readText]} numberOfLines={3}>
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
          <Ionicons name="notifications-off-outline" size={isTablet ? 64 : 48} color="#9CA3AF" />
          <Text style={localStyles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={localStyles.listContainer}
          showsVerticalScrollIndicator={false}
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
    paddingHorizontal: isTablet ? '10%' : 16,
    paddingTop: 10,
  },
  header: {
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  listContainer: {
    paddingBottom: 24,
    paddingTop: 4,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: isTablet ? 20 : 16,
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
    marginRight: isTablet ? 16 : 12,
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
    fontSize: isTablet ? 17 : 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  readText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  message: {
    fontSize: isTablet ? 15 : 13,
    color: '#374151',
    lineHeight: isTablet ? 22 : 18,
  },
  time: {
    fontSize: isTablet ? 13 : 11,
    color: '#6B7280',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: isTablet ? 17 : 15,
    color: '#6B7280',
    fontWeight: '600',
  },
});

export default NotificationsScreen;