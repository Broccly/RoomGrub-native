import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

const isSupported = Platform.OS === 'android';

export function registerBackgroundHandler() {
  if (!isSupported) return;
  // Notification messages are shown by the system while backgrounded/killed.
  setBackgroundMessageHandler(getMessaging(), async () => {});
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!isSupported) return null;
  try {
    if (Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) return null;
    }
    const token = await getToken(getMessaging());
    console.log('[FCM] token', token);
    return token;
  } catch (e) {
    console.warn('[FCM] registration failed', e);
    return null;
  }
}

// FCM doesn't display notifications while the app is in the foreground.
export function listenForForegroundMessages(): () => void {
  if (!isSupported) return () => {};
  return onMessage(getMessaging(), (message) => {
    const { title, body } = message.notification ?? {};
    if (title || body) Alert.alert(title ?? '', body ?? '');
  });
}
