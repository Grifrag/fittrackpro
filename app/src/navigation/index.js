import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import FoodSearchScreen from '../screens/FoodSearchScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import LogMealScreen from '../screens/LogMealScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import PaymentScreen from '../screens/PaymentScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = { primary: '#2E86AB', background: '#F8F9FA', text: '#1A1A2E' };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee', paddingBottom: 4 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Dashboard: focused ? 'home'        : 'home-outline',
            Log:       focused ? 'add-circle'  : 'add-circle-outline',
            Progress:  focused ? 'stats-chart' : 'stats-chart-outline',
            Workout:   focused ? 'barbell'     : 'barbell-outline',
            Profile:   focused ? 'person'      : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Αρχική' }} />
      <Tab.Screen name="Log"       component={LogMealScreen}   options={{ title: 'Γεύμα' }} />
      <Tab.Screen name="Progress"  component={ProgressScreen}  options={{ title: 'Πρόοδος' }} />
      <Tab.Screen name="Workout"   component={WorkoutScreen}   options={{ title: 'Άσκηση' }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}   options={{ title: 'Προφίλ' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="FoodSearch"     component={FoodSearchScreen}     options={{ headerShown: true, title: 'Αναζήτηση τροφίμου' }} />
            <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} options={{ headerShown: true, title: 'Σάρωση barcode' }} />
            <Stack.Screen name="Payment"        component={PaymentScreen}        options={{ headerShown: true, title: 'Αγορά Lifetime Access' }} />
            <Stack.Screen name="PrivacyPolicy"  component={PrivacyPolicyScreen}  options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
