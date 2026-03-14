import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../utils/supabase';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}


export default function LoginScreen({ navigation }: any) {
  useEffect(() => {
    const completeWebCallbackIfPresent = async () => {
      if (Platform.OS !== 'web') return;
      if (window.location.pathname !== '/auth/callback') return;

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : '';
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState({}, '', '/');
        navigation.replace('AuthCallback');
      }
    };

    completeWebCallbackIfPresent()
      .catch(() => undefined)
      .finally(() => {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            navigation.replace('AuthCallback');
          }
        });
      });
  }, [navigation]);

  const signInWithGoogle = async () => {
    const redirectUrl = Platform.OS === 'web'
      ? `${window.location.origin}/auth/callback`
      : 'roomgrub://auth/callback';
    console.log('Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        ...(Platform.OS === 'web' ? { skipBrowserRedirect: true } : {}),
      },
    });

    if (error) {
      console.error('OAuth error:', error);
      return;
    }

    if (Platform.OS === 'web') {
      if (data?.url) {
        window.location.assign(data.url);
      }
      return;
    }

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success') {
        const url = result.url;
        const hash = url.split('#')[1] || '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          navigation.replace('AuthCallback');
        }
      }
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

        <TouchableOpacity style={styles.googleButton} onPress={signInWithGoogle}>
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
    backgroundColor: '#f0f0f0',
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
    color: '#BF377E',
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
