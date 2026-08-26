import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TopBanner() {
  const handleCall = () => {
    Linking.openURL('tel:+12126874995'); // Replace with your phone number
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fcdc4d', // Yellow matches full top status bar space
  },
  banner: {
    backgroundColor: '#fcdc4d',
    paddingVertical: 10,
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
});