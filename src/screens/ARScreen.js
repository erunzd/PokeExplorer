import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ImageBackground,
  // Removed unused imports: ScrollView
  Alert,
  ActivityIndicator, // Added for loading state
} from 'react-native';

// --- REQUIRED EXTERNAL LIBRARIES ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';

// Assuming these components exist
import BottomNav from '../components/BottomNav'; 

const ARScreen = () => {

  return (     
    <ImageBackground
        source={require('../assets/test2.png')} 
        style={styles.background}
        blurRadius={1}
    >
      <View style={styles.backdropOverlay} />
        <View style={styles.container}>

       <BottomNav />
        </View>
    </ImageBackground>   
  );
};

// --- UPDATED STYLES ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  background: {
    flex: 1,
    width: '100%',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 }, 
});

export default ARScreen;