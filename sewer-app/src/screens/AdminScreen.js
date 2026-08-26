import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/authContext';
import { API_BASE_URL } from '../config/constants';
import EditUserModal from './EditUser';
import UserBookingsModal from './UserBookingsModal';

export default function AdminUsersScreen() {
  const { userToken } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [selectedBookingUser, setSelectedBookingUser] = useState(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to fetch users');

      setUsers(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditModalVisible(true);
  };

  const openBookingsModal = (user) => {
    setSelectedBookingUser(user);
    setBookingModalVisible(true);
  };

  const handleUserUpdated = (updatedUser) => {
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const renderUserCard = ({ item }) => (
    <View style={cardStyles.card}>
      <View style={cardStyles.headerRow}>
        <Text style={cardStyles.userName}>
          {item.first_name} {item.last_name}
        </Text>
        <View style={[cardStyles.roleBadge, item.role === 'admin' ? cardStyles.adminBadge : cardStyles.userBadge]}>
          <Text style={cardStyles.roleText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={cardStyles.detailText}>📧 {item.email}</Text>
      <Text style={cardStyles.detailText}>📞 {item.phone}</Text>
      <Text style={cardStyles.detailText}>🏠 {item.address}</Text>

      <View style={cardStyles.actionRow}>
        <TouchableOpacity
          style={cardStyles.bookingsBtn}
          onPress={() => openBookingsModal(item)}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={cardStyles.btnText}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={cardStyles.editBtn}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={cardStyles.btnText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      <View style={{ paddingHorizontal: 16, paddingTop: 10, flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          Admin User Management
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0b57d0" />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUserCard}
            refreshing={loading}
            onRefresh={fetchUsers}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      <EditUserModal
        visible={editModalVisible}
        user={selectedUser}
        token={userToken}
        onClose={() => setEditModalVisible(false)}
        onUserUpdated={handleUserUpdated}
      />

      <UserBookingsModal
        visible={bookingModalVisible}
        user={selectedBookingUser}
        token={userToken}
        onClose={() => setBookingModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 10,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  adminBadge: { backgroundColor: '#d32f2f' },
  userBadge: { backgroundColor: '#0288d1' },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#555', marginVertical: 2 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  bookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0288d1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4, fontSize: 12 },
});