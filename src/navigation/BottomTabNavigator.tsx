import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import SplitsScreen from '../screens/SplitsScreen';
import MembersScreen from '../screens/MembersScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

function EmptyTab() {
  return <View />;
}

type BottomTabNavProps = {
  navigation: any;
  route: any;
};

export default function BottomTabNavigator({ navigation, route }: BottomTabNavProps) {
  const room_id = route.params?.room_id;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{ room_id }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesScreen}
        initialParams={{ room_id }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Add"
        component={EmptyTab}
        options={{
          tabBarButton: () => (
            <TouchableOpacity
              style={styles.fabWrapper}
              onPress={() => navigation.navigate('AddGrocery', { room_id })}
              activeOpacity={0.85}
            >
              <View style={styles.fab}>
                <Ionicons name="cart" size={26} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="Splits"
        component={SplitsScreen}
        initialParams={{ room_id }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Members"
        component={MembersScreen}
        initialParams={{ room_id }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9d5ff',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: -16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
