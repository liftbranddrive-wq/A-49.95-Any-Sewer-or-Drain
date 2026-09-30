import React, { useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { AuthProvider, AuthContext } from './src/context/authContext';
import { registerForPushNotificationsAsync } from './src/services/NotificationServices';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import AccountScreen from './src/screens/AccountScreen';
import CallScreen from './src/screens/CallScreen';
import AdminUsersScreen from './src/screens/AdminScreen';
import AdminServicesScreen from './src/screens/AdminServicesScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import TopBanner from './src/screens/TopBanner';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

// ----------------------------------------------------
// BOTTOM TAB NAVIGATOR (Handles Guest, User, and Admin)
// ----------------------------------------------------
function MainTabs() {
  const { userToken, userRole, user } = useContext(AuthContext);

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default Channel',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (userToken) {
      registerForPushNotificationsAsync(userToken);
    }

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (navigationRef.isReady()) {
        let targetScreen = data?.screen || 'Notifications';
        if (targetScreen === 'My Bookings') targetScreen = 'MyBookingsScreen';
        if (targetScreen === 'AdminDashboard' || targetScreen === 'Admin') targetScreen = 'Admin';
        if (targetScreen === 'Call') targetScreen = 'Call';
        if (targetScreen === 'Services') targetScreen = 'Services';
        
        try {
          navigationRef.navigate(targetScreen, data?.params);
        } catch (err) {
          navigationRef.navigate('Notifications');
        }
      }
    });

    return () => responseListener.remove();
  }, [userToken]);

  const rawRole = userRole || user?.role || '';
  const isAdmin = String(rawRole).trim().toLowerCase() === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        // Pass navigation to TopBanner so it can trigger the Auth Screen
        header: () => (isAdmin ? null : <TopBanner navigation={navigation} />),
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Home') iconName = 'home-outline';
          if (route.name === 'Call') iconName = 'call-outline';
          if (route.name === 'Services') iconName = 'calendar-outline';
          if (route.name === 'MyBookingsScreen') iconName = 'receipt-outline';
          if (route.name === 'Account') iconName = 'person-outline';
          if (route.name === 'Admin') iconName = 'people-outline';
          if (route.name === 'Admin Services') iconName = 'construct-outline';
          if (route.name === 'Notifications') iconName = 'notifications-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* --- CONDITIONAL TABS BASED ON AUTH/ROLE --- */}
      {userToken ? (
        isAdmin ? (
          /* ================= ADMIN TABS ================= */
          <>
            <Tab.Screen name="Account" component={AccountScreen} />
            <Tab.Screen name="Admin" component={AdminUsersScreen} options={{ title: 'Users' }} />
            <Tab.Screen name="Admin Services" component={AdminServicesScreen} options={{ title: 'Services' }} />
            <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Alerts' }} />
          </>
        ) : (
          /* ================= NORMAL LOGGED-IN USER TABS ================= */
          <>
            <Tab.Screen name="Home" options={{ title: 'Home' }}>
              {(props) => <HomeScreen {...props} onNavigate={(screenName) => props.navigation.navigate(screenName)} />}
            </Tab.Screen>
            <Tab.Screen name="Call" component={CallScreen} />
            <Tab.Screen name="Services">
              {(props) => <BookingScreen {...props} userToken={userToken} />}
            </Tab.Screen>
            <Tab.Screen name="MyBookingsScreen" component={MyBookingsScreen} options={{ title: 'My Bookings' }} />
            <Tab.Screen name="Account" component={AccountScreen} />
            <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Alerts' }} />
          </>
        )
      ) : (
        /* ================= GUEST TABS (NO LOGIN) ================= */
        <>
          <Tab.Screen name="Home" options={{ title: 'Home' }}>
            {(props) => <HomeScreen {...props} onNavigate={(screenName) => props.navigation.navigate(screenName)} />}
          </Tab.Screen>
          <Tab.Screen name="Call" component={CallScreen} />
          <Tab.Screen name="Services">
            {(props) => <BookingScreen {...props} userToken={userToken} />}
          </Tab.Screen>
        </>
      )}
    </Tab.Navigator>
  );
}

// ----------------------------------------------------
// ROOT STACK (Controls hiding bottom bar for Auth screens)
// ----------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {/* The main app with bottom tabs */}
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          
          {/* Auth Screen is pushed ON TOP of tabs, hiding the bottom bar */}
          <RootStack.Screen name="Auth" component={AuthScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}