import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';

import { RoomProvider } from '../context/RoomContext';
import { getAuthBootstrap } from '../utils/authBootstrap';
import { api } from '../services/api';
import { Role, RoomListItem } from '../types/api';
import LoginScreen from '../screens/LoginScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import RoomsListScreen from '../screens/RoomsListScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import InviteAcceptScreen from '../screens/InviteAcceptScreen';
import BottomTabNavigator from './BottomTabNavigator';
import AddGroceryScreen from '../screens/AddGroceryScreen';
import MemberDetailScreen from '../screens/MemberDetailScreen';
import InviteMemberScreen from '../screens/InviteMemberScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityHistoryScreen from '../screens/ActivityHistoryScreen';

const Stack = createNativeStackNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: '#fff' },
  headerTintColor: '#333',
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#f0f0f0' },
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

type RoomWithRole = RoomListItem & { role: Role | null };

type InitialRoute = 'Login' | 'RoomsList' | 'CreateRoom' | null;

export default function AppNavigator() {
  const [initialRouteName, setInitialRouteName] = useState<InitialRoute>(null);
  const [prefetchedRooms, setPrefetchedRooms] = useState<RoomWithRole[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { user } = await getAuthBootstrap();

      if (!user) {
        if (mounted) setInitialRouteName('Login');
        SplashScreen.hideAsync().catch(() => {});
        return;
      }

      try {
        const rooms = await api.listRooms();
        const withRoles = await Promise.all(
          rooms.map(async (room) => {
            try {
              const members = await api.listMembers(room.id);
              const me = members.find((m) => m.email === user.email);
              return { ...room, role: me?.role ?? null };
            } catch {
              return { ...room, role: null };
            }
          }),
        );
        if (!mounted) return;
        setPrefetchedRooms(withRoles);
        setInitialRouteName(withRoles.length === 0 ? 'CreateRoom' : 'RoomsList');
      } catch {
        // couldn't prefetch (offline, expired session, etc.) — let RoomsList
        // handle its own fetch/error state rather than blocking startup
        if (mounted) setInitialRouteName('RoomsList');
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (initialRouteName === null) {
    // Native splash screen is still covering the app while we resolve auth.
    return null;
  }

  return (
    <NavigationContainer linking={linking}>
      <RoomProvider>
        <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ ...headerStyle }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="RoomsList"
            component={RoomsListScreen}
            options={{ headerShown: false }}
            initialParams={prefetchedRooms ? { prefetchedRooms } : undefined}
          />
          <Stack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ title: 'Create Room' }} />
          <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} options={{ title: 'Invite' }} />

          {/* Main authenticated flow — bottom tab navigator */}
          <Stack.Screen
            name="RoomHome"
            component={BottomTabNavigator}
            options={({ navigation, route }: any) => ({
              title: 'RoomGrub',
              headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.navigate('RoomsList')} style={{ padding: 4 }}>
                  <Ionicons name="arrow-back" size={22} color="#333" />
                </TouchableOpacity>
              ),
              headerRight: () => (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <SettingsButton
                    onPress={() =>
                      navigation.navigate('Settings', {
                        room_id: route.params?.room_id,
                      })
                    }
                  />
                </View>
              ),
            })}
          />

          {/* Screens pushed on top of the tab navigator */}
          <Stack.Screen name="AddGrocery" component={AddGroceryScreen} options={{ title: 'Add Grocery' }} />
          <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Member Details' }} />
          <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ title: 'Invite Friend' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} options={{ title: 'Activity History' }} />
        </Stack.Navigator>
      </RoomProvider>
    </NavigationContainer>
  );
}

function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 4 }}>
      <Ionicons name="settings-outline" size={22} color="#333" />
    </TouchableOpacity>
  );
}
