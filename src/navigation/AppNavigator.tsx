import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RoomProvider } from '../context/RoomContext';
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

const Stack = createNativeStackNavigator();

const headerStyle = {
  headerStyle: { backgroundColor: '#fff' },
  headerTintColor: '#333',
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
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

export default function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <RoomProvider>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ ...headerStyle }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RoomsList" component={RoomsListScreen} options={{ headerShown: false }} />
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
