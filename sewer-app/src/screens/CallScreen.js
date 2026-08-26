import React, { useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles as globalStyles } from '../styles/globalStyles';
import { AuthContext } from '../context/authContext';
import { API_BASE_URL } from '../config/constants';

// Replace with your active backend IP address and port

const AREAS = [
  {
    id: 'NYC',
    flag: 'NYC',
    region: 'New York City',
    displayNumber: '(212) 687-4995',
    phoneNumber: 'tel:+12126874995',
    featured: true,
  },
  {
    id: 'Boroughs',
    flag: 'BK\nQN',
    region: 'Brooklyn / Queens',
    displayNumber: '(718) 845-4995',
    phoneNumber: 'tel:+17188454995',
  },
  {
    id: 'Nassau',
    flag: 'NAS',
    region: 'Nassau County',
    displayNumber: '(516) 354-4995',
    phoneNumber: 'tel:+15163544995',
  },
  {
    id: 'Suffolk',
    flag: 'SUF',
    region: 'Suffolk County',
    displayNumber: '(631) 698-4995',
    phoneNumber: 'tel:+16316984995',
  },
  {
    id: 'TollFree',
    flag: '1-888',
    region: 'Toll-Free (Anywhere)',
    displayNumber: '(888) PAY-4995',
    phoneNumber: 'tel:+18887294995',
    tollFree: true,
  },
];

export default function AreasScreen() {
  const { userToken } = useContext(AuthContext);

  const handleCall = (area) => {
    console.log(`[CallScreen] Button pressed for ${area.region}`);

    // Format clean telephone URI
    const cleanDigits = area.phoneNumber.replace('tel:', '').replace(/[^0-9+]/g, '');
    const dialerUrl = `tel:${cleanDigits}`;

    // Prepare headers with Authorization token if available
    const headers = {
      'Content-Type': 'application/json',
    };
    if (userToken) {
      headers['Authorization'] = `Bearer ${userToken}`;
    }

    // 1. Send call notification payload with 3s timeout (non-blocking)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    fetch(`${API_BASE_URL}/api/notifications/notify-call`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        caller_name: `${area.region} Contact`,
        phone_number: area.displayNumber,
      }),
    })
      .then((res) => {
        clearTimeout(timeoutId);
        console.log('[CallScreen] Notification response status:', res.status);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          console.log('[CallScreen] Notification request timed out');
        } else {
          console.log('[CallScreen] Admin call notification error:', err.message);
        }
      });

    // 2. Immediately launch the native dialer
    console.log(`[CallScreen] Launching dialer: ${dialerUrl}`);
    Linking.openURL(dialerUrl)
      .then(() => {
        console.log('[CallScreen] Phone dialer launched successfully.');
      })
      .catch((err) => {
        console.log('[CallScreen] Dialer launch error:', err);
        Alert.alert('Error', 'Unable to open native dialer on this device.');
      });
  };

  return (
    <SafeAreaView style={[styles.container, globalStyles.screenBackground]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Area</Text>
          <Text style={styles.subtitle}>
            Call us at your nearest location.
          </Text>
        </View>

        {/* Area List */}
        <View style={styles.areaList}>
          {AREAS.map((area) => (
            <TouchableOpacity
              key={area.id}
              activeOpacity={0.85}
              style={[
                styles.card,
                area.featured && styles.cardFeatured,
                area.tollFree && styles.cardTollFree,
              ]}
              onPress={() => handleCall(area)}
            >
              {/* Flag Badge */}
              <View style={[styles.flag, styles.flagYellow]}>
                <Text style={[styles.flagText, styles.flagTextYellow]}>
                  {area.flag}
                </Text>
              </View>

              {/* Region and Number */}
              <View style={styles.info}>
                <Text
                  style={[
                    styles.regionText,
                    area.featured && styles.regionTextFeatured,
                  ]}
                >
                  {area.region}
                </Text>
                <Text
                  style={[
                    styles.numberText,
                    area.featured && styles.numberTextFeatured,
                  ]}
                >
                  {area.displayNumber}
                </Text>
              </View>

              {/* 3D Phone Call Button */}
              <View style={styles.phone3dContainer}>
                <View style={styles.phone3dBase} />
                <View style={styles.phone3dTop}>
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  areaList: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardFeatured: {
    backgroundColor: '#15517a',
    borderColor: '#fcdc4d',
    borderWidth: 2,
  },
  cardTollFree: {
    borderColor: '#f8d7da',
    backgroundColor: '#fff8f8',
  },
  flag: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  flagYellow: {
    backgroundColor: '#fcdc4d',
  },
  flagText: {
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 16,
  },
  flagTextYellow: {
    color: '#212529',
  },
  info: {
    flex: 1,
  },
  regionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  regionTextFeatured: {
    color: '#FFFFFF',
  },
  numberText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  numberTextFeatured: {
    color: '#fcdc4d',
  },
  phone3dContainer: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  phone3dBase: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#991b1b',
    borderRadius: 20,
  },
  phone3dTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#dc2626',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});