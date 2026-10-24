import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InitialState, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';

import { RoomProvider } from '../context/RoomContext';
import { navigationRef } from './navigationRef';
import { getAuthBootstrap } from '../utils/authBootstrap';
import { getLastRoomId } from '../utils/lastRoom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { queryClient, queryKeys } from '../services/queryClient';
import { colors } from '../theme/colors';
import Avatar from '../components/Avatar';
import LoginScreen from '../screens/LoginScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import RoomsListScreen from '../screens/RoomsListScreen';
import InviteAcceptScreen from '../screens/InviteAcceptScreen';
import BottomTabNavigator from './BottomTabNavigator';
import AddGroceryScreen from '../screens/AddGroceryScreen';
import MemberDetailScreen from '../screens/MemberDetailScreen';
import InviteMemberScreen from '../screens/InviteMemberScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ContactSupportScreen from '../screens/ContactSupportScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: '#333',
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

const linking = {
  prefixes: ['roomgrub://'],
  config: {
    screens: {
      AuthCallback: 'auth/callback',
      InviteAccept: 'invite/:token',
    },
  },
};

type Launch = {
  routeName: 'Login' | 'RoomsList';
  // Only set when reopening a room: an explicit initialState overrides linking.
  resumeState?: InitialState;
};

export default function AppNavigator() {
  const { user } = useAuth();
  const [launch, setLaunch] = useState<Launch | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { user } = await getAuthBootstrap();

      if (!user) {
        if (mounted) setLaunch({ routeName: 'Login' });
        return;
      }

      // Reopen the last room, with the rooms list underneath for back — unless
      // the app was cold-started by a deep link (e.g. an invite), which
      // linking must be left free to route.
      const lastRoomId = getLastRoomId();
      const initialUrl = await Linking.getInitialURL().catch(() => null);
      if (mounted) {
        setLaunch({
          routeName: 'RoomsList',
          resumeState:
            lastRoomId != null && !initialUrl
              ? {
                  index: 1,
                  routes: [{ name: 'RoomsList' }, { name: 'RoomHome', params: { room_id: lastRoomId } }],
                }
              : undefined,
        });
      }

      // Warm the rooms cache in the background — RoomsListScreen renders from
      // its own useQuery, which paints instantly from the MMKV-persisted
      // cache on relaunch while this revalidates.
      queryClient.prefetchQuery({ queryKey: queryKeys.rooms, queryFn: api.listRooms }).catch(() => {});
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Hide the native splash only after `launch` has actually
  // committed and the real navigator tree is about to paint — hiding it
  // eagerly inside the async bootstrap above races the setState, so the
  // splash disappears a frame before AppNavigator re-renders past its
  // `return null` guard, producing a blank white flash.
  useEffect(() => {
    if (launch !== null) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [launch]);

  if (launch === null) {
    // Native splash screen is still covering the app while we resolve auth.
    return null;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      initialState={launch.resumeState}
    >
      <RoomProvider>
        <Stack.Navigator initialRouteName={launch.routeName} screenOptions={{ ...headerStyle }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RoomsList" component={RoomsListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} options={{ title: 'Invite' }} />

          {/* Main authenticated flow — bottom tab navigator */}
          <Stack.Screen
            name="RoomHome"
            component={BottomTabNavigator}
            options={({ navigation, route }: any) => ({
              headerTitle: () => null,
              headerLeft: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={() => navigation.navigate('RoomsList')} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={22} color="#333" />
                  </TouchableOpacity>
                  <RoomChip roomId={route.params?.room_id} />
                </View>
              ),
              headerRight: () => (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Settings', {
                      room_id: route.params?.room_id,
                    })
                  }
                >
                  <Avatar
                    uri={user?.profile}
                    label={user?.name || user?.email || '?'}
                    size={32}
                    backgroundColor={colors.purpleAvatar}
                    borderWidth={1.5}
                    borderColor={colors.purpleAvatarBorder}
                    textColor={colors.brand}
                  />
                </TouchableOpacity>
              ),
            })}
          />

          {/* Screens pushed on top of the tab navigator */}
          <Stack.Screen name="AddGrocery" component={AddGroceryScreen} options={{ title: 'Add Expense' }} />
          <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Member Details' }} />
          <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ title: 'Invite Friend' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="ContactSupport" component={ContactSupportScreen} options={{ title: 'Contact Support' }} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: 'Privacy Policy' }} />
        </Stack.Navigator>
      </RoomProvider>
    </NavigationContainer>
  );
}

function RoomChip({ roomId }: { roomId?: number }) {
  return (
    <View style={styles.roomChip}>
      <Text style={styles.roomChipText}>Room #{roomId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  roomChip: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roomChipText: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 14,
  },
});
