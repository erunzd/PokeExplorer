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
            <View style={{ height: 350, width: '100%', backgroundColor: '#000', marginTop: 60, }}>
                <Text style={{ color: '#fff', textAlign: 'center', paddingTop: 10 }}>Camera Display</Text>
            </View>
        <View style={styles.container}>
            <View style={styles.row}>
                <TouchableOpacity>
                    <Text style={styles.btn}>Capture</Text>
                </TouchableOpacity>

                <TouchableOpacity>
                    <Text style={styles.btn}>Gallery</Text>
                </TouchableOpacity>                
            </View>

            <View style={styles.col}>
                <Text style={styles.title}>AR CAMERA INFORMATION</Text>
                <Text style={styles.status}>[] Camera Permissions: (enabled/disabled)</Text>
                <Text style={styles.status}>[] Sprite Overlay: 2d Pokemon</Text>
                <Text style={styles.status}>[] Gyro Detection: (enabled/disabled)</Text>                                                
            </View>

            <TouchableOpacity>
                <Text style={styles.vsbtn}>Voice Search</Text>
            </TouchableOpacity>        
                <Text style={styles.vstxt}>Try saying: Pikachu, Bulbasaur, Snorlax</Text>               
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
  row: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  btn: {
    backgroundColor: '#3b4cca', 
    color: '#fff',
    paddingHorizontal: 35,
    borderRadius: 5,
    elevation: 6,
    padding: 20,
    fontSize: 30,
    fontFamily: 'BrickSans-Bold',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  col: {
    marginTop: 20,
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 5,
    elevation: 6,
  },
  title: {
    fontFamily: 'BrickSans-Bold',
    color: '#532221',    
    fontSize: 30,
    letterSpacing: 1.2,
  },
  status: {
    fontSize: 16,
    color: '#532221',
    fontWeight: 'semibold',
  },
  vsbtn: {
    backgroundColor: '#fdd400', 
    marginTop: 20,
    textAlign: 'center',
    color: '#532221',
    paddingHorizontal: 35,
    borderRadius: 5,
    elevation: 6,
    padding: 20,
    fontSize: 30,
    fontFamily: 'BrickSans-Bold',
    letterSpacing: 1.2,
  },
  vstxt: {
    color: '#fff',
    fontSize: 16,
    paddingVertical: 5,
    fontStyle: 'italic',
  },
});

export default ARScreen;