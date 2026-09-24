import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { queryClient } from '../services/queryClient';
import ActionButton from '../components/ActionButton';

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
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const taglineFontSize = Math.min(Math.max(windowWidth * 0.036, 11), 16);
  // Web only: the popup resolves via `response`, outside the button's own promise.
  const [webSigningIn, setWebSigningIn] = useState(false);

  const [, response, promptAsync] = useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // Drop the previous session's cached data. Runs after the signed-in screens
  // unmount, so no mounted query can refetch against the emptied cache.
  useEffect(() => {
    queryClient.clear();
  }, []);

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
      setWebSigningIn(true);
      login('google', idToken)
        .then(() => navigation.replace('AuthCallback'))
        .catch((error) => {
          setWebSigningIn(false);
          Alert.alert('Login failed', error instanceof Error ? error.message : 'Please try again.');
        });
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
      <View style={styles.heroWrap}>
        <Image
          source={require('../../assets/login-girl.png')}
          style={styles.hero}
          resizeMode="cover"
        />
        <View style={styles.heroCut} />
        <View style={styles.logoBadge}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        <ActionButton
          onPress={signInWithGoogle}
          loading={webSigningIn}
          indicatorColor="#000000"
          style={[styles.googleButtonShadow, styles.googleButton]}
        >
          <GoogleIcon />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </ActionButton>

        <Text
          style={[styles.bottomTagline, { fontSize: taglineFontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          Smart sharing, stress free living
        </Text>
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 18 18" style={styles.googleIcon}>
      <Path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.6154z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9087-2.2581c-.8064.54-1.8368.8618-3.0477.8618-2.3436 0-4.3282-1.5818-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <Path
        fill="#FBBC05"
        d="M3.9641 10.71c-.18-.54-.2823-1.1159-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.5782c1.3214 0 2.5077.4541 3.4405 1.3459l2.5818-2.5818C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1618 6.6564 3.5782 9 3.5782z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf5ff',
  },
  heroWrap: {
    width: '100%',
    height: '70%',
    position: 'relative',
    backgroundColor: '#ede9fe',
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  heroCut: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -60,
    height: 100,
    backgroundColor: '#faf5ff',
    transform: [{ rotate: '-4deg' }],
  },
  logoBadge: {
    position: 'absolute',
    top: 20,
    left: 10,
  },
  logo: {
    width: 84,
    height: 84,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 28,
  },
  googleButtonShadow: {
    width: '100%',
    borderRadius: 999,
    marginBottom: 28,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  bottomTagline: {
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 'auto',
    marginBottom: 24,
  },
});
