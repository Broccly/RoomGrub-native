jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
  },
  isSuccessResponse: jest.fn(() => true),
  isErrorWithCode: jest.fn(() => false),
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: () => [null, null, jest.fn()],
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openBrowserAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-view-shot', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    captureRef: jest.fn(() => Promise.resolve('file://mock.png')),
  };
});

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('react-native-modal-datetime-picker', () => 'DateTimePickerModal');

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

// The real Ionicons component lazily loads a font asset and calls setState
// once it resolves, which trips "not wrapped in act()" warnings in every
// screen test. A plain View stand-in avoids that async font-loading noise.
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return new Proxy({}, { get: () => View });
});

// Auto-confirms Alert.alert dialogs by invoking the non-cancel button, so
// screens using showAlert() for confirmation flows can be tested without
// simulating native alert UI.
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation((...args: unknown[]) => {
  const buttons = args[2] as Array<{ style?: string; onPress?: () => void }> | undefined;
  const button = buttons?.find((b) => b.style !== 'cancel') ?? buttons?.[0];
  button?.onPress?.();
});

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(() => Promise.resolve('test-token')),
  onMessage: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
}));
