// src/screens/ARScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from 'react-native';

// --- REQUIRED EXTERNAL LIBRARIES ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

// AR CAMERA INTEGRATION
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import BottomNav from '../components/BottomNav'; // Assuming this component exists


// CONSTANT: Key for storing capture data in AsyncStorage
const CAPTURES_KEY = '@pokemon_captures_gallery';

const ARScreen = ({ navigation }) => {
    // Get navigation route parameters
    const route = useRoute();
    const {
        pokemonId: initialPokemonId,
        pokemonName: initialPokemonName,
        pokemonSpriteUrl: initialPokemonSpriteUrl
    } = route.params || {};

    // Vision Camera Hooks
    const { hasPermission, requestPermission } = useCameraPermission();
    // Safely attempt to get the back camera device.
    const cameraDevice = useCameraDevice('back');

    // Camera Reference Hook: Allows calling takePhoto()
    const cameraRef = useRef(null);

    // --- STATE FOR DYNAMIC POKEMON DATA ---
    const [pokemonData, setPokemonData] = useState(
        initialPokemonId && initialPokemonName && initialPokemonSpriteUrl
        ? { id: initialPokemonId, name: initialPokemonName, sprite: initialPokemonSpriteUrl }
        : null
    );
    const [loadingPokemon, setLoadingPokemon] = useState(
        !initialPokemonId || !initialPokemonName || !initialPokemonSpriteUrl
    );

    // State for UI status and controls
    const [cameraPermissionStatus, setCameraPermissionStatus] = useState('checking...');
    const [isPokemonVisible, setIsPokemonVisible] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    // --- API FETCH FUNCTION (Fallback if navigated directly) ---
    const fetchPokemonSprite = useCallback(async (id = '25') => { // 25 is Pikachu's ID
        if (pokemonData) return;

        try {
            const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
            const spriteUrl = response.data.sprites.front_default;

            setPokemonData({
                name: response.data.name.charAt(0).toUpperCase() + response.data.name.slice(1),
                sprite: spriteUrl,
            });

            // Simulate "spawning"
            setTimeout(() => {
                setIsPokemonVisible(true);
            }, 1000);

        } catch (error) {
            console.error("Error fetching Pokémon:", error);
            Alert.alert("API Error", "Could not fetch Pokémon sprite from PokeAPI (Fallback failed).");
            setPokemonData({ name: 'Error', sprite: null });
        } finally {
            setLoadingPokemon(false);
        }
    }, [pokemonData]);
    // --- END API FETCH FUNCTION ---

    // Initial setup effects
    useEffect(() => {
        // 1. Request Camera Permission
        if (!hasPermission) {
            const delayTimer = setTimeout(() => {
                requestPermission().then(granted => {
                    setCameraPermissionStatus(granted ? 'enabled' : 'disabled');
                    if (!granted) {
                        Alert.alert("Permission Required", "Camera access is needed to use the AR feature.");
                    }
                });
            }, 500);
            return () => clearTimeout(delayTimer);
        }

        // 2. Handle Pokemon Display
        if (!pokemonData) {
            fetchPokemonSprite(); // Fetch fallback Pokemon (Pikachu)
        } else {
            setTimeout(() => setIsPokemonVisible(true), 500);
            setLoadingPokemon(false);
        }
    }, [hasPermission, requestPermission, fetchPokemonSprite, pokemonData]);

    // Update status based on camera permission
    useEffect(() => {
        if (hasPermission && cameraDevice) {
            setCameraPermissionStatus('enabled');
        } else if (hasPermission === false) {
            setCameraPermissionStatus('disabled');
        }
    }, [hasPermission, cameraDevice]);


    // --- ACTION HANDLERS ---
    const currentPokemonName = pokemonData ? pokemonData.name : 'Unknown Pokémon';
    const currentPokemonSprite = pokemonData ? pokemonData.sprite : null;


    // --- handleCapture: TAKE PHOTO AND SAVE TO ASYNCSTORAGE ---
    const handleCapture = async () => {
        if (!isPokemonVisible || isCapturing || !cameraRef.current) {
            Alert.alert("Error", "Pokémon not visible or camera not ready.");
            return;
        }

        // CRITICAL CHECK: Ensure camera device is ready
        if (!cameraDevice) {
             Alert.alert("Error", "Camera device is not initialized.");
             return;
        }

        setIsCapturing(true);

        try {
            // 1. Take the photo using the camera reference
            const photo = await cameraRef.current.takePhoto({
                flash: 'off',
                enableShutterSound: true,
            });

            const assetUri = `file://${photo.path}`;

            // 2. Save the temporary file to the device's Camera Roll/Gallery permanently
            const savedAsset = await CameraRoll.save(assetUri, {
                type: 'photo',
                album: 'PokeExplorer Captures',
            });

            const finalUri = savedAsset.uri;

            // 3. Prepare data for app's internal gallery (AsyncStorage)
            const captureData = {
                id: Date.now().toString(),
                uri: finalUri,
                pokemonName: currentPokemonName,
                pokemonSprite: currentPokemonSprite,
                timestamp: new Date().toISOString(),
            };

            // 4. Load existing captures and prepend the new one
            const existingCapturesJSON = await AsyncStorage.getItem(CAPTURES_KEY);
            const existingCaptures = existingCapturesJSON ? JSON.parse(existingCapturesJSON) : [];

            const newCaptures = [captureData, ...existingCaptures];
            await AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(newCaptures));

            Alert.alert(
                "Capture Successful!",
                `${currentPokemonName} saved to your Gallery!`
            );

        } catch (error) {
            console.error('Photo Capture Error:', error);
            Alert.alert("Capture Failed", `Could not save photo: ${error.message}`);
        } finally {
            setIsCapturing(false);
        }
    };
    // --- END handleCapture ---


    const handleGallery = () => {
        // Navigate to the Profile screen where the gallery is located
        navigation.navigate('Profile');
    };

    // --- END ACTION HANDLERS ---

  return (
    <ImageBackground
        source={require('../assets/test2.png')}
        style={styles.background}
        blurRadius={1}
    >
      <View style={styles.backdropOverlay} />

      {/* 🚨 AR CAMERA AND OVERLAY CONTAINER 🚨 */}
      <View style={styles.cameraContainer}>
        {/* 1. CAMERA FEED: The base layer */}
        {/* CRITICAL FIX: Explicitly check if cameraDevice is available before rendering Camera */}
        {hasPermission && cameraDevice != null ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={cameraDevice}
            isActive={true}
            photo={true}
          />
        ) : (
            // Fallback for when camera is loading or permission is denied
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fdd400" />
                <Text style={styles.loadingText}>
                    {hasPermission === false ? "Camera Permission Denied" : "Loading AR Camera..."}
                </Text>
                {!cameraDevice && hasPermission && (
                    <Text style={styles.loadingText}>Searching for camera device...</Text>
                )}
            </View>
        )}

        {/* 2. SPRITE OVERLAY: The AR Element */}
        {loadingPokemon || !pokemonData || !pokemonData.sprite ? (
             <View style={styles.pokemonLoading}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loadingText}>Loading Sprite...</Text>
            </View>
        ) : (
             isPokemonVisible && (
                <View style={styles.pokemonContainer}>
                    <Image
                        source={{ uri: pokemonData.sprite }}
                        style={styles.pokemonSprite}
                        resizeMode="contain"
                    />
                    <Text style={styles.pokemonNameTag}>A Wild {currentPokemonName} Appears!</Text>
                </View>
            )
        )}
      </View>
      {/* END AR CAMERA CONTAINER */}


      <View style={styles.container}>
        <View style={styles.row}>
            {/* Capture Button */}
            <TouchableOpacity
                onPress={handleCapture}
                // Disable if no permission, pokemon not visible, capturing, OR camera not ready
                disabled={!hasPermission || !isPokemonVisible || isCapturing || cameraDevice == null}
                style={[styles.buttonContainer, (!hasPermission || !isPokemonVisible || isCapturing || cameraDevice == null) && styles.disabledBtn]}
            >
                <Text style={styles.buttonText}>{isCapturing ? 'Saving...' : 'Capture'}</Text>
            </TouchableOpacity>

            {/* Gallery Button */}
            <TouchableOpacity
                onPress={handleGallery}
                style={styles.buttonContainer}
            >
                <Text style={styles.buttonText}>Gallery</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.col}>
            <Text style={styles.title}>AR CAMERA INFORMATION</Text>
            <Text style={styles.status}>[ ] Camera Permissions: ({cameraPermissionStatus})</Text>
            <Text style={styles.status}>[ ] Sprite Overlay: {isPokemonVisible ? `${currentPokemonName} (2D)` : 'None'}</Text>
            <Text style={styles.status}>[ ] Capture Status: {isCapturing ? 'Saving...' : 'Ready'}</Text>
        </View>

       <BottomNav />
      </View>
    </ImageBackground>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 10
  },

  // CAMERA & AR STYLES
  cameraContainer: {
    height: 350,
    width: '100%',
    backgroundColor: '#000',
    marginTop: 60,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pokemonLoading: {
    position: 'absolute',
    top: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  pokemonContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pokemonSprite: {
    width: 250,
    height: 250,
  },
  pokemonNameTag: {
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 5,
    marginTop: 5,
    fontWeight: 'bold',
  },

  row: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  buttonContainer: {
    backgroundColor: '#3b4cca',
    paddingHorizontal: 35,
    borderRadius: 5,
    elevation: 6,
    padding: 20,
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 30,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
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
    color: '#532221',
    fontSize: 30,
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    color: '#532221',
    fontWeight: '500',
    paddingVertical: 2,
  },
});

export default ARScreen;