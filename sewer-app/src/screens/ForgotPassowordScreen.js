import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../config/constants';
import { styles } from '../styles/globalStyles';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = Request Code, 2 = Reset
  const [loading, setLoading] = useState(false);

  // Step 1: Request 6-Digit Code
  const handleRequestToken = async () => {
    if (!email) return Alert.alert("Error", "Please enter your email address.");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to send reset code.");

      Alert.alert("Success", "A 6-digit code has been sent to your email.");
      setStep(2);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit Code and New Password
  const handleResetPassword = async () => {
    if (!token || !newPassword) {
      return Alert.alert("Error", "Please fill in all fields.");
    }
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: token.trim(),
          new_password: newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to reset password.");

      Alert.alert("Success", "Password updated successfully! Please login.", [
        { text: "OK", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      {step === 1 ? (
        <>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleRequestToken} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <TextInput
            style={styles.input}
            placeholder="6-Digit Code"
            value={token}
            onChangeText={setToken}
            keyboardType="number-pad"  // <--- Shows numeric keypad
            maxLength={6}              // <--- Limits input to 6 digits
          />
          <TextInput
            style={styles.input}
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleResetPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}