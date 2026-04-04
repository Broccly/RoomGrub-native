import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import BottomTabNavigator from './BottomTabNavigator';
import AddGroceryScreen from '../screens/AddGroceryScreen';
import MemberDetailScreen from '../screens/MemberDetailScreen';
import InviteMemberScreen from '../screens/InviteMemberScreen';
import BalanceScreen from '../screens/BalanceScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import RecordPaymentScreen from '../screens/RecordPaymentScreen';
import AdminScreen from '../screens/AdminScreen';
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
    },
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ ...headerStyle }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ title: 'Create Room' }} />

        {/* Main authenticated flow — bottom tab navigator */}
        <Stack.Screen
          name="RoomHome"
          component={BottomTabNavigator}
          options={({ navigation, route }: any) => ({
            title: 'RoomGrub',
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
        <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ title: 'Invite Member' }} />
        <Stack.Screen name="Balance" component={BalanceScreen} options={{ title: 'Balance' }} />
        <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Payments' }} />
        <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{ title: 'Record Payment' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
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
