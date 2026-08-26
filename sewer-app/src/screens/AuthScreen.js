import React, { useState, useContext, useEffect } from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthContext } from '../context/authContext';
import { API_BASE_URL } from '../config/constants';
import { styles } from '../styles/globalStyles';

// Configure Google Sign-In with your Web Client ID
GoogleSignin.configure({
  webClientId: '592240709905-imqn3h0j4dbreeh76ro0bfb9adnsvfgm.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function AuthScreen() {
  const { login } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot / Reset Password Modal State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Native Google Sign-In Handler
  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Robust extraction supporting all module versions (v11+ uses data.idToken, older or alternative returns idToken directly)
      const googleToken = userInfo.data?.idToken || userInfo?.idToken || userInfo.user?.idToken;

      if (googleToken) {
        await handleBackendGoogleLogin(googleToken);
      } else {
        throw new Error("Failed to retrieve ID token from Google.");
      }
    } catch (error) {
      setGoogleLoading(false);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in modal, do nothing
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Sign-in operation is already running
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Google Sign-In", "Google Play Services is not available or outdated on this device.");
      } else {
        Alert.alert("Google Sign-In Error", error.message || "An unexpected error occurred during Google Sign-In.");
      }
    }
  };

  const handleBackendGoogleLogin = async (googleToken) => {
    try {
      const apiResponse = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: googleToken }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.detail || "Google authentication failed.");
      }

      const token = data.access_token || data.token;
      const userPayload = data.user || data.role || data;

      login(token, userPayload);
    } catch (error) {
      Alert.alert(
        "Google Sign-In", 
        error.message || "Could not complete Google authentication with backend."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const validatePassword = (pwd) => {
    const minLength = pwd.length >= 8;
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

    if (!minLength) return 'Password must be at least 8 characters long.';
    if (!hasNumber) return 'Password must contain at least one number.';
    if (!hasSymbol) return 'Password must contain at least one special symbol.';
    return null;
  };

  const handleAuth = async () => {
    if (!email || !password) {
      return Alert.alert("Error", "Please enter your email and password.");
    }

    if (!isLogin) {
      if (!firstName || !lastName || !phone || !address || !confirmPassword) {
        return Alert.alert("Error", "Please fill out all fields.");
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        return Alert.alert("Weak Password", passwordError);
      }

      if (password !== confirmPassword) {
        return Alert.alert("Error", "Passwords do not match.");
      }
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    const payload = isLogin
      ? {
          email: email.trim().toLowerCase(),
          password,
        }
      : {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: address.trim(),
          password,
          confirm_password: confirmPassword,
        };

    try {
      const apiResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        let errorMsg = "Authentication failed";
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map((err) => err.msg).join('\n');
        }
        throw new Error(errorMsg);
      }

      const token = data.access_token || data.token;
      const userPayload = data.user || data.role || data;

      login(token, userPayload);
    } catch (error) {
      Alert.alert("Authentication Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      return Alert.alert("Error", "Please enter your email address.");
    }

    setResetLoading(true);

    try {
      const apiResponse = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.detail || "Failed to send reset code.");
      }

      Alert.alert(
        "Code Sent",
        "If an account with that email exists, a 6-digit code has been sent."
      );
      setResetStep(2);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otpCode || !newPassword) {
      return Alert.alert("Error", "Please enter the code and your new password.");
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return Alert.alert("Weak Password", passwordError);
    }

    setResetLoading(true);

    try {
      const apiResponse = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim().toLowerCase(),
          token: otpCode.trim(),
          new_password: newPassword,
        }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.detail || "Failed to reset password.");
      }

      Alert.alert("Success", "Your password has been updated successfully. Please log in.");
      closeResetModal();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setForgotModalVisible(false);
    setResetStep(1);
    setResetEmail('');
    setOtpCode('');
    setNewPassword('');
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.authInner}>
            <View style={styles.authHeader}>
              <Image 
                source={require('../../assets/a4995-logo.webp')} 
                style={localStyles.logo} 
                resizeMode="contain" 
              />
              <Text style={localStyles.businessName}>A 49.95 Any Sewer Or Drain Inc</Text>
              <Text style={styles.headerSubtitle}>
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </Text>
            </View>

            <View style={styles.authForm}>
              {/* Google Sign In / Sign Up Button */}
              <TouchableOpacity 
                style={[
                  localStyles.googleButton, 
                  googleLoading && { opacity: 0.6 }
                ]}
                onPress={handleGoogleAuth}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#333" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
                    <Text style={localStyles.googleButtonText}>
                      {isLogin ? 'Sign In with Google' : 'Sign Up with Google'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={localStyles.dividerContainer}>
                <View style={localStyles.dividerLine} />
                <Text style={localStyles.dividerText}>OR</Text>
                <View style={localStyles.dividerLine} />
              </View>

              {!isLogin && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Address"
                    value={address}
                    onChangeText={setAddress}
                  />
                </>
              )}

              <TextInput 
                style={styles.input} 
                placeholder="Email Address" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address" 
              />
              
              <View style={localStyles.inputWrapper}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Password" 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry={!showPassword} 
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  style={localStyles.eyeButton} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>

              {isLogin && (
                <TouchableOpacity 
                  style={localStyles.forgotPasswordButton}
                  onPress={() => {
                    setResetEmail(email);
                    setForgotModalVisible(true);
                  }}
                >
                  <Text style={localStyles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {!isLogin && (
                <>
                  <View style={localStyles.inputWrapper}>
                    <TextInput 
                      style={styles.input} 
                      placeholder="Confirm Password" 
                      value={confirmPassword} 
                      onChangeText={setConfirmPassword} 
                      secureTextEntry={!showConfirmPassword} 
                      autoCapitalize="none"
                    />
                    <TouchableOpacity 
                      style={localStyles.eyeButton} 
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons 
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>

                  {password.length > 0 && (
                    <View style={localStyles.validationBox}>
                      <View style={localStyles.checkItem}>
                        <Ionicons
                          name={password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={password.length >= 8 ? '#2e7d32' : '#888'}
                        />
                        <Text style={[localStyles.checkText, password.length >= 8 && localStyles.checkTextValid]}>
                          At least 8 characters
                        </Text>
                      </View>

                      <View style={localStyles.checkItem}>
                        <Ionicons
                          name={/\d/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={/\d/.test(password) ? '#2e7d32' : '#888'}
                        />
                        <Text style={[localStyles.checkText, /\d/.test(password) && localStyles.checkTextValid]}>
                          At least 1 number
                        </Text>
                      </View>

                      <View style={localStyles.checkItem}>
                        <Ionicons
                          name={
                            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
                              ? 'checkmark-circle'
                              : 'ellipse-outline'
                          }
                          size={14}
                          color={
                            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
                              ? '#2e7d32'
                              : '#888'
                          }
                        />
                        <Text
                          style={[
                            localStyles.checkText,
                            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) &&
                              localStyles.checkTextValid,
                          ]}
                        >
                          At least 1 special symbol
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleAuth} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={toggleAuthMode} 
                style={styles.toggleAuth}
              >
                <Text style={styles.toggleAuthText}>
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot / Reset Password Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeResetModal}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContainer}>
            <Text style={localStyles.modalTitle}>
              {resetStep === 1 ? 'Reset Password' : 'Enter Verification Code'}
            </Text>
            <Text style={localStyles.modalSubtitle}>
              {resetStep === 1
                ? 'Enter your registered email address to receive a 6-digit reset code.'
                : `Enter the code sent to ${resetEmail} and choose a new password.`}
            </Text>

            {resetStep === 1 ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit Code"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <View style={localStyles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={localStyles.eyeButton} 
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons 
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleResetPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={localStyles.cancelButton}
              onPress={closeResetModal}
            >
              <Text style={localStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 12,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0b57d0',
    textAlign: 'center',
    marginBottom: 6,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 6,
    zIndex: 1,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#0b57d0',
    fontSize: 14,
    fontWeight: '500',
  },
  validationBox: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  checkText: {
    fontSize: 12,
    color: '#888',
  },
  checkTextValid: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});