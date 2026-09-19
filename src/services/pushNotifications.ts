import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { api } from './api';
import { getToken as getAuthToken } from '../utils/tokenStorage';

const isSupported = Platform.OS === 'android';

export function registerBackgroundHandler() {
  if (!isSupported) return;
  // Notification messages are shown by the system while backgrounded/killed.
  setBackgroundMessageHandler(getMessaging(), async () => {});
}

// Android < 13 grants notifications at install time; 13+ needs a runtime prompt.
async function ensureNotificationPermission(askUser: boolean): Promise<boolean> {
  if (Number(Platform.Version) < 33) return true;
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (!askUser) return PermissionsAndroid.check(permission);
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

// Sends this device's FCM token to the backend for the logged-in user.
// Call only once a JWT is stored; failures never propagate. The permission
// prompt is shown only with askPermission (after joining/creating a room);
// otherwise we register silently if permission was already granted.
export async function syncPushToken({ askPermission = false } = {}): Promise<void> {
  if (!isSupported) return;
  try {
    if (!(await ensureNotificationPermission(askPermission))) return;
    const token = await getToken(getMessaging());
    await api.registerPushToken(token);
  } catch (e) {
    console.warn('[FCM] token sync failed', e);
  }
}

// Must run before the JWT is cleared on logout, since the request is authenticated.
export async function unregisterPushToken(): Promise<void> {
  if (!isSupported) return;
  try {
    const token = await getToken(getMessaging());
    await api.unregisterPushToken(token);
  } catch (e) {
    console.warn('[FCM] token unregister failed', e);
  }
}

// FCM can rotate the token at any time; keep the backend's copy current.
export function listenForTokenRefresh(): () => void {
  if (!isSupported) return () => {};
  return onTokenRefresh(getMessaging(), async (token) => {
    try {
      if (await getAuthToken()) await api.registerPushToken(token);
    } catch (e) {
      console.warn('[FCM] token refresh sync failed', e);
    }
  });
}

// FCM doesn't display notifications while the app is in the foreground.
export function listenForForegroundMessages(): () => void {
  if (!isSupported) return () => {};
  return onMessage(getMessaging(), (message) => {
    const { title, body } = message.notification ?? {};
    if (title || body) Alert.alert(title ?? '', body ?? '');
  });
}
