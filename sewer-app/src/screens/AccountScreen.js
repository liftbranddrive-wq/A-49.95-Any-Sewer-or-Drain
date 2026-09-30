import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/authContext';
import { API_BASE_URL } from '../config/constants';
import { styles as globalStyles } from '../styles/globalStyles';

export default function AccountScreen() {
  const { user, userToken, logout } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  // Fetch full user profile details from the backend
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setProfile(data);
        setMarketingEnabled(data?.marketing_push_enabled || false);
      } else {
        setProfile(user);
        setMarketingEnabled(user?.marketing_push_enabled || false);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setProfile(user);
      setMarketingEnabled(user?.marketing_push_enabled || false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Handle marketing preference toggle update
  const handleToggleMarketing = async (value) => {
    setMarketingEnabled(value);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/preferences`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marketing_push_enabled: value }),
      });

      if (!response.ok) throw new Error('Failed to update preference');
    } catch (error) {
      setMarketingEnabled(!value); // Revert state on failure
      Alert.alert('Error', 'Could not update notification preferences.');
    }
  };

  // Handle self-account deletion
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? Your account details and past bookings will be archived for administrative review and cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${userToken}`,
                  'Content-Type': 'application/json',
                },
              });

              const data = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(data.detail || 'Failed to delete account');

              Alert.alert('Account Deleted', 'Your account has been successfully removed.');
              logout(); // Log out the user and return to auth stack
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView contentContainerStyle={localStyles.scrollContainer}>
        <Text style={globalStyles.headerTitle}>Account Profile</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#0b57d0"
            style={{ marginVertical: 30 }}
          />
        ) : (
          <View style={localStyles.profileCard}>
            <Text style={localStyles.userName}>
              {profile?.first_name || profile?.last_name
                ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
                : profile?.name || 'Your Name'}
            </Text>
            <Text style={localStyles.userEmail}>
              {profile?.email || user?.email || 'N/A'}
            </Text>

            <View style={localStyles.divider} />

            {/* Profile Information List */}
            <View style={localStyles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#0b57d0" style={localStyles.infoIcon} />
              <View>
                <Text style={localStyles.infoLabel}>Phone Number</Text>
                <Text style={localStyles.infoValue}>
                  {profile?.phone || profile?.phone_number || 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={localStyles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#0b57d0" style={localStyles.infoIcon} />
              <View style={{ flex: 1 }}>
                <Text style={localStyles.infoLabel}>Service Address</Text>
                <Text style={localStyles.infoValue}>
                  {profile?.address || 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={localStyles.divider} />

            {/* Notification Preferences Toggle Row */}
            <View style={localStyles.infoRow}>
              <Ionicons name="notifications-outline" size={20} color="#0b57d0" style={localStyles.infoIcon} />
              <View style={localStyles.switchTextContainer}>
                <Text style={localStyles.infoLabel}>Promotional Offers & News</Text>
                <Text style={localStyles.switchSubLabel}>Receive weekend promos and discounts.</Text>
              </View>
              <Switch
                value={marketingEnabled}
                onValueChange={handleToggleMarketing}
                trackColor={{ false: '#767577', true: '#0b57d0' }}
              />
            </View>
          </View>
        )}

        {/* 3D Red Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={localStyles.btn3dContainer}
          onPress={logout}
        >
          <View style={localStyles.btn3dBase} />
          <View style={localStyles.btn3dTop}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#ffffff"
              style={{ marginRight: 8 }}
            />
            <Text style={localStyles.btn3dText}>Sign Out</Text>
          </View>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[localStyles.btn3dContainer, { marginTop: 14 }]}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          <View style={[localStyles.btn3dBase, { backgroundColor: '#581c87' }]} />
          <View style={[localStyles.btn3dTop, { backgroundColor: '#7e22ce' }]}>
            {deleting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons
                  name="trash-bin-outline"
                  size={20}
                  color="#ffffff"
                  style={{ marginRight: 8 }}
                />
                <Text style={localStyles.btn3dText}>Delete Account</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '500',
    marginTop: 1,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchSubLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 1,
  },

  /* 3D Button Style */
  btn3dContainer: {
    height: 52,
    position: 'relative',
    marginTop: 8,
  },
  btn3dBase: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: '#991b1b',
    borderRadius: 20,
  },
  btn3dTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: '#dc2626',
    borderRadius: 20,
    flexDirection: 'row',
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
  btn3dText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
});