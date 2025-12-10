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

const HuntScreen = () => {

  return (     
    <ImageBackground
        source={require('../assets/test2.png')} 
        style={styles.background}
        blurRadius={1}
    >
      <View style={styles.backdropOverlay} />
            <View style={{ height: 350, width: '100%', backgroundColor: '#000', marginTop: 60, }}>
                <Text style={{ color: '#fff', textAlign: 'center', paddingTop: 10 }}>Map Display</Text>
            </View>
        <View style={styles.container}>
                <Text style={styles.title}>Nearby Pokemon</Text>
            
        <View style={styles.row}>
            <Text>img</Text>
            <View>
                <Text style={[styles.nt, { fontSize: 24, fontWeight: 'bold' }]}>BULBASAUR</Text>
                <Text style={styles.nt}>Grass/Poison</Text>
            </View>

            <View>
                <Text style={[styles.nt, {textAlign: 'right'}]}>99 M</Text>
                <TouchableOpacity>
                    <Text style={styles.btn}>Encounter</Text>
                </TouchableOpacity> 
            </View>            
        </View> 

                <View style={styles.row}>
            <Text>img</Text>
            <View>
                <Text style={[styles.nt, { fontSize: 24, fontWeight: 'bold' }]}>BULBASAUR</Text>
                <Text style={styles.nt}>Grass/Poison</Text>
            </View>

            <View>
                <Text style={[styles.nt, {textAlign: 'right'}]}>99 M</Text>
                <TouchableOpacity>
                    <Text style={styles.btn}>Encounter</Text>
                </TouchableOpacity> 
            </View>            
        </View>    
            <TouchableOpacity>
                <Text style={styles.vsbtn}>Rescan for Pokemon</Text>
            </TouchableOpacity>                  
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
  title: {
    fontFamily: 'BrickSans-Bold',
    color: '#fdd400',
    elevation: 6,
    padding: 5,    
    fontSize: 30,
    letterSpacing: 1.2,
  },
  nt: {
    fontSize: 16,
    color: '#532221',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 5,
    justifyContent: 'space-between',
    marginBottom: 20,
    elevation: 6,
  },
  btn: {
    backgroundColor: '#3b4cca',
    fontSize: 16,
    marginTop: 5,
    paddingVertical: 5,
    paddingHorizontal: 20,
    color: '#fff',
    elevation: 6,
    borderRadius: 5,
  },    
  status: {
    fontSize: 16,
    color: '#532221',
    fontWeight: 'semibold',
  },
  vsbtn: {
    backgroundColor: '#fdd400', 
    textAlign: 'center',
    color: '#532221',
    borderRadius: 5,
    elevation: 6,
    padding: 10,
    fontSize: 18,
    letterSpacing: 1.2,
  },
});

export default HuntScreen;