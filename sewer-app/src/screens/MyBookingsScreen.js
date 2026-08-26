import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/constants';

const DynamicIcon = ({ name, size = 22, color = '#0066CC' }) => {
  const fa5Icons = ['shower', 'faucet', 'tools', 'wrench', 'toilet', 'hand-holding-water'];
  if (fa5Icons.includes(name)) {
    return <FontAwesome5 name={name} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={name || 'pipe'} size={size} color={color} />;
};

export default function MyBookingsScreen({ userToken, navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    try {
      setError('');

      const response = await fetch(`${API_BASE_URL}/api/auth/ghl/my-bookings`, {
        headers: {
          Authorization: userToken ? `Bearer ${userToken}` : '',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to fetch bookings`);
      }

      const data = await response.json();

      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data.bookings)) {
        list = data.bookings;
      } else if (Array.isArray(data.appointments)) {
        list = data.appointments;
      } else if (Array.isArray(data.data)) {
        list = data.data;
      }

      setBookings(list);
    } catch (err) {
      console.error('Fetch Bookings Error:', err);
      setError(err.message || 'Unable to load previous bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [userToken])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return { badge: styles.badgeConfirmed, text: styles.textConfirmed };
      case 'COMPLETED':
        return { badge: styles.badgeCompleted, text: styles.textCompleted };
      case 'CANCELLED':
        return { badge: styles.badgeCancelled, text: styles.textCancelled };
      default:
        return { badge: styles.badgePending, text: styles.textPending };
    }
  };

  const renderBookingCard = ({ item, index }) => {
    const rawTime = item.start_time || item.startTime || item.selected_slot || item.selectedSlot || item.date;
    const title = item.service_title || item.service_name || item.title || 'Drain & Sewer Service';
    const status = (item.status || item.appointmentStatus || 'CONFIRMED').toUpperCase();
    const notes = item.notes || item.additional_information || item.additionalInformation;
    const iconName = item.service_icon || item.icon || 'pipe';

    let dateStr = 'Scheduled Date';
    let timeStr = '';

    if (rawTime) {
      const bookingDate = new Date(rawTime);
      if (!isNaN(bookingDate.getTime())) {
        dateStr = bookingDate.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        timeStr = bookingDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    const badgeStyle = getStatusBadgeStyle(status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <DynamicIcon name={iconName} size={22} color="#0066CC" />
            <Text style={styles.serviceTitle}>{title}</Text>
          </View>
          <View style={[styles.badge, badgeStyle.badge]}>
            <Text style={[styles.badgeText, badgeStyle.text]}>{status}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calendar-clock" size={18} color="#666" />
          <Text style={styles.detailText}>
            {dateStr} {timeStr ? `at ${timeStr}` : ''}
          </Text>
        </View>

        {notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText} numberOfLines={2}>
              Note: {notes}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.centerContainer}>
      <MaterialCommunityIcons name="calendar-blank" size={54} color="#CCC" />
      <Text style={styles.emptyTitle}>No Previous Bookings</Text>
      <Text style={styles.emptySubtext}>You haven't scheduled any services yet.</Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>My Bookings</Text>

      {error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBookings}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item, index) =>
            (item.id || item._id || item.appointmentId || item.ghl_appointment_id || index).toString()
          }
          renderItem={renderBookingCard}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={bookings.length === 0 ? styles.emptyContainerStyle : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0066CC']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 40 },
  screenTitle: { fontSize: 22, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 12, color: '#111' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyContainerStyle: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginLeft: 10, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeConfirmed: { backgroundColor: '#E6F4EA' },
  textConfirmed: { color: '#137333' },
  badgeCompleted: { backgroundColor: '#E8F0FE' },
  textCompleted: { color: '#1A73E8' },
  badgePending: { backgroundColor: '#FEF7E0' },
  textPending: { color: '#B06000' },
  badgeCancelled: { backgroundColor: '#FCE8E6' },
  textCancelled: { color: '#C5221F' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  detailText: { fontSize: 14, color: '#444', marginLeft: 8, fontWeight: '500' },
  notesBox: { marginTop: 10, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 },
  notesText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  errorText: { color: '#D32F2F', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  retryBtn: { backgroundColor: '#0066CC', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#444', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#888', marginTop: 4 },
});