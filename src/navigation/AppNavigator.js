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
import ARScreen from '../screens/ARScreen.js';
import HuntScreen from '../screens/HuntScreen.js';

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

        {/* FIXED: Use the correct route name "ARScreen" */}
        <Stack.Screen name="ARScreen" component={ARScreen} />

        <Stack.Screen name="Hunt" component={HuntScreen} />
        <Stack.Screen name="Global" component={GlobalScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="PokedexDetail" component={PokemonDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
