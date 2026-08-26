import React, { useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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

// Global notification presentation handler (for foreground notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

function MainNavigator() {
  const { userToken, userRole, user } = useContext(AuthContext);

  useEffect(() => {
    if (!userToken) return;

    // 1. Create high-importance Android notification channel
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default Channel',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // 2. Register device push token with FastAPI backend
    registerForPushNotificationsAsync(userToken);

    // 3. Handle user tapping on a push notification with robust screen mapping
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      if (navigationRef.isReady()) {
        let targetScreen = data?.screen || 'Notifications';
        
        // Map backend route aliases to registered bottom tab names
        if (targetScreen === 'My Bookings') targetScreen = 'MyBookingsScreen';
        if (targetScreen === 'AdminDashboard' || targetScreen === 'Admin') targetScreen = 'Admin';
        if (targetScreen === 'Call') targetScreen = 'Call';
        if (targetScreen === 'Services') targetScreen = 'Services';
        
        try {
          navigationRef.navigate(targetScreen, data?.params);
        } catch (err) {
          console.log('--- Navigation routing fallback triggered ---', err);
          // Fallback to Notifications tab if the route isn't available for the current role
          navigationRef.navigate('Notifications');
        }
      }
    });

    return () => {
      responseListener.remove();
    };
  }, [userToken]);

  if (!userToken) {
    return <AuthScreen />;
  }

  // Resolve role and safely convert to lowercase for comparison
  const rawRole = userRole || user?.role || '';
  const isAdmin = String(rawRole).trim().toLowerCase() === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => (isAdmin ? null : <TopBanner />),
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Home') iconName = 'home-outline';
          if (route.name === 'Call') iconName = 'call-outline';
          if (route.name === 'Services') iconName = 'calendar-outline';
          if (route.name === 'MyBookingsScreen' || route.name === 'My Bookings') iconName = 'receipt-outline';
          if (route.name === 'Account') iconName = 'person-outline';
          if (route.name === 'Admin') iconName = 'people-outline';
          if (route.name === 'Admin Services') iconName = 'construct-outline';
          if (route.name === 'Notifications') iconName = 'notifications-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {isAdmin ? (
        <>
          <Tab.Screen name="Account" component={AccountScreen} />
          <Tab.Screen
            name="Admin"
            component={AdminUsersScreen}
            options={{ title: 'Users' }}
          />
          <Tab.Screen
            name="Admin Services"
            component={AdminServicesScreen}
            options={{ title: 'Services' }}
          />
          {/* Admin Bottom Navigation Tab for Notifications */}
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Alerts' }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="Home"
            options={{ title: 'Home' }}
          >
            {(props) => (
              <HomeScreen
                {...props}
                onNavigate={(screenName) => props.navigation.navigate(screenName)}
              />
            )}
          </Tab.Screen>

          <Tab.Screen name="Call" component={CallScreen} />
          
          <Tab.Screen name="Services">
            {(props) => <BookingScreen {...props} userToken={userToken} />}
          </Tab.Screen>

          <Tab.Screen
            name="MyBookingsScreen"
            options={{ title: 'My Bookings' }}
          >
            {(props) => <MyBookingsScreen {...props} userToken={userToken} />}
          </Tab.Screen>
          
          <Tab.Screen name="Account" component={AccountScreen} />
          
          {/* Regular User Notifications Tab */}
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Alerts' }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <MainNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}