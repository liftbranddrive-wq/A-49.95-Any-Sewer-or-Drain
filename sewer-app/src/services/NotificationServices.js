import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/constants';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userToken) {
  console.log('--- [PUSH SERVICE] Starting Registration ---');

  if (!Device.isDevice) {
    console.log('--- [PUSH SERVICE] Skipped: Must use a physical device ---');
    return null;
  }

  // 1. Permissions Check
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('--- [PUSH SERVICE] Permission denied by user ---');
    return null;
  }

  // 2. Fetch Expo Push Token
  let pushToken = null;

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      'cfb6f963-bd93-45f5-97b9-8ed91c5c0d70';

    console.log('--- [PUSH SERVICE] Fetching token with Project ID:', projectId);

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    pushToken = tokenData.data;

    console.log('====================================');
    console.log('EXPO PUSH TOKEN:', pushToken);
    console.log('====================================');
  } catch (tokenErr) {
    console.error('--- [PUSH SERVICE] Error getting Expo Push Token:', tokenErr);
    return null;
  }

  // 3. Android Notification Channel Setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 4. Send token to FastAPI Backend
  try {
    console.log(`--- [PUSH SERVICE] Registering token with backend at ${API_BASE_URL} ---`);
    const response = await fetch(`${API_BASE_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: userToken ? `Bearer ${userToken}` : '',
      },
      body: JSON.stringify({ push_token: pushToken }),
    });

    if (response.ok) {
      console.log('--- [PUSH SERVICE] Push token registered on backend! ---');
    } else {
      console.error('--- [PUSH SERVICE] Backend returned status:', response.status);
    }
  } catch (err) {
    console.error('--- [PUSH SERVICE] Error saving push token to backend:', err);
  }

  return pushToken;
}