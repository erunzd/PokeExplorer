// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import your screens
import LoginScreen from '../screens/LoginScreen.js';
import RegisterScreen from '../screens/RegisterScreen.js';
import HomeScreen from '../screens/HomeScreen.js';
import GlobalScreen from '../screens/GlobalScreen.js';
import ProfileScreen from '../screens/ProfileScreen.js';
import PokemonDetailScreen from '../screens/PokemonDetailScreen.js';
import ARScreen from '../screens/ARScreen.js'; // <-- Keep this one
import HuntScreen from '../screens/HuntScreen.js';
// Removed: import ARScreen from '../screens/ARScreen.js'; // <-- Remove the duplicate

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Pokedex" component={HomeScreen} />

        {/* You have two screens registered using the ARScreen component: "AR" and "ARScreen" */}
        <Stack.Screen name="AR" component={ARScreen} />
        <Stack.Screen name="Hunt" component={HuntScreen} />                
        <Stack.Screen name="Global" component={GlobalScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />        
        <Stack.Screen name="PokedexDetail" component={PokemonDetailScreen} />
        <Stack.Screen name="ARScreen" component={ARScreen} options={{ title: 'AR Encounter' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;