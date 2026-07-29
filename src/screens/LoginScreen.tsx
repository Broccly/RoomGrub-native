import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { useAuth } from '../hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

let NativeGoogleSignin: typeof import('@react-native-google-signin/google-signin') | null = null;
if (Platform.OS !== 'web') {
  NativeGoogleSignin = require('@react-native-google-signin/google-signin');
  NativeGoogleSignin!.GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

export default function LoginScreen({ navigation }: any) {
  const { login, isAuthenticated } = useAuth();

  const [, response, promptAsync] = useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('AuthCallback');
    }
  }, [isAuthenticated, navigation]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !response) return;

    if (response.type === 'success') {
      const idToken = response.params.id_token;
      if (!idToken) {
        Alert.alert('Login failed', 'Google did not return an ID token.');
        return;
      }
      login('google', idToken)
        .then(() => navigation.replace('AuthCallback'))
        .catch((error) =>
          Alert.alert('Login failed', error instanceof Error ? error.message : 'Please try again.'),
        );
    } else if (response.type === 'error') {
      Alert.alert('Login failed', 'Please try again.');
    }
  }, [response, login, navigation]);

  const signInWithGoogle = async () => {
    if (Platform.OS === 'web') {
      await promptAsync();
      return;
    }

    try {
      const { GoogleSignin, isSuccessResponse } = NativeGoogleSignin!;
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();

      if (!isSuccessResponse(result)) {
        return;
      }

      const idToken = result.data.idToken;
      if (!idToken) {
        Alert.alert('Login failed', 'Google did not return an ID token.');
        return;
      }

      await login('google', idToken);
      navigation.replace('AuthCallback');
    } catch (error) {
      const { isErrorWithCode, statusCodes } = NativeGoogleSignin!;
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.tagline}>Split Bills, Share Easy</Text>
        <Text style={styles.subtitle}>Track expenses with your roommates</Text>
        <Text style={styles.hint}>Perfect for bachelors sharing expenses</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={signInWithGoogle}
        >
          <GoogleIcon />
          <Text style={styles.googleButtonText}>Login with Google</Text>
        </TouchableOpacity>

        <Text style={styles.bottomTagline}>
          Smart sharing, stress free living
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made by Broccly</Text>
        <Image
          source={require('../../assets/broccly.png')}
          style={styles.brocclyLogo}
        />
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4285F4' }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '800',
    color: '#9333ea',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#706e6e',
    marginBottom: 32,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 24,
  },
  googleIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  bottomTagline: {
    fontSize: 15,
    fontWeight: '500',
    color: '#706e6e',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.8,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'gray',
  },
  brocclyLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
