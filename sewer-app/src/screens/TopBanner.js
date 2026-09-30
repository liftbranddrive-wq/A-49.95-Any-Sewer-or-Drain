import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/authContext';

export default function TopBanner({ navigation }) {
  const { userToken } = useContext(AuthContext);

  const handleCall = () => {
    Linking.openURL('tel:+12126874995'); // Replace with your phone number
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.headerContainer}>
        
        {/* Existing Promotional Banner */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.banner}
          onPress={handleCall}
        >
          <Ionicons name="call" size={16} color="#212529" style={{ marginRight: 6 }} />
          <Text style={styles.bannerText}>
            Want <Text style={styles.boldText}>$5 OFF?</Text> — Just call here
          </Text>
        </TouchableOpacity>

        {/* New Auth Buttons (Only visible to Guests) */}
        {!userToken && (
          <View style={styles.authContainer}>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={styles.authButton} 
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.authButtonText}>Sign In</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              activeOpacity={0.7}
              style={styles.authButton} 
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.authButtonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fcdc4d', // Yellow matches full top status bar space
  },
  headerContainer: {
    backgroundColor: '#fcdc4d',
    paddingBottom: 8,
  },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    color: '#212529',
    fontSize: 13,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '800',
  },
  authContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  authButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  authButtonText: {
    color: '#212529',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: '#212529',
    marginHorizontal: 8,
    opacity: 0.3, // Creates a subtle separation line between the two buttons
  },
});