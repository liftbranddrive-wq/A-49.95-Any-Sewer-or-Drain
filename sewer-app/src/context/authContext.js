import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if a token was previously saved when the app loads
  useEffect(() => {
    const loadStoredToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');
        
        if (storedToken) {
          setUserToken(storedToken);
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setUserRole(parsedUser?.role || parsedUser);
          }
        }
      } catch (e) {
        console.log('Failed to load token from storage', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredToken();
  }, []);

  const login = async (token, userData) => {
    setUserToken(token);
    
    const role = typeof userData === 'object' && userData !== null 
      ? userData.role 
      : userData;

    setUser(userData);
    setUserRole(role);

    // Save token and user data to device storage persistently
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
    } catch (e) {
      console.log('Failed to save token to storage', e);
    }
  };

  const logout = async () => {
    setUserToken(null);
    setUser(null);
    setUserRole(null);
    
    // Clear saved token from device storage
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    } catch (e) {
      console.log('Failed to clear token from storage', e);
    }
  };

  return (
    <AuthContext.Provider value={{ userToken, userRole, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};