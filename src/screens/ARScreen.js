import React, { useState, useEffect, useCallback } from 'react';
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
import { launchImageLibrary } from 'react-native-image-picker';
import { useRoute } from '@react-navigation/native';
import BottomNav from '../components/BottomNav';
import axios from 'axios';

// AR CAMERA INTEGRATION
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';


const ARScreen = () => {
    // Get navigation route parameters
    const route = useRoute();
    const {
        pokemonId: initialPokemonId,
        pokemonName: initialPokemonName,
        pokemonSpriteUrl: initialPokemonSpriteUrl
    } = route.params || {};

    // Vision Camera Hooks
    const { hasPermission, requestPermission } = useCameraPermission();
    const cameraDevice = useCameraDevice('back');

    // --- STATE FOR DYNAMIC POKEMON DATA ---
    const [pokemonData, setPokemonData] = useState(
        initialPokemonId && initialPokemonName && initialPokemonSpriteUrl
        ? { id: initialPokemonId, name: initialPokemonName, sprite: initialPokemonSpriteUrl }
        : null
    );
    const [loadingPokemon, setLoadingPokemon] = useState(
        !initialPokemonId || !initialPokemonName || !initialPokemonSpriteUrl // True if data wasn't passed, meaning we need to fetch
    );
    // --- END NEW STATE ---

    // State for UI status
    const [cameraPermissionStatus, setCameraPermissionStatus] = useState('checking...');
    const [isPokemonVisible, setIsPokemonVisible] = useState(false);

    // --- MODIFIED API FETCH FUNCTION (Fallback if navigated directly) ---
    const fetchPokemonSprite = useCallback(async (id = '25') => { // 25 is Pikachu's ID
        if (pokemonData) return; // Skip if data was pre-filled by route

        try {
            const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
            const spriteUrl = response.data.sprites.front_default;

            setPokemonData({
                name: response.data.name.charAt(0).toUpperCase() + response.data.name.slice(1),
                sprite: spriteUrl,
            });

            // Simulate "spawning"
            const spawnTimer = setTimeout(() => {
                setIsPokemonVisible(true);
            }, 1000);
            return () => clearTimeout(spawnTimer);

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
        // 1. Request Camera Permission with delay fix
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
             // If data was passed, show the Pokemon immediately after load
            setTimeout(() => setIsPokemonVisible(true), 500);
            setLoadingPokemon(false); // Since data is local
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

    const handleCapture = () => {
        if (!isPokemonVisible) {
            Alert.alert("No Pokémon Found", "Point your camera at a landmark to find a Pokémon!");
            return;
        }
        Alert.alert("Capture!", `You attempted to capture ${currentPokemonName}! (Add photo/saving logic here)`);
    };

    const handleGallery = () => {
        launchImageLibrary({ mediaType: 'photo' }, (response) => {
            if (response.didCancel) return;
            Alert.alert("Gallery", "Image selected from gallery.");
        });
    };

    // The handleVoiceSearch function was defined but not used in your provided code
    // const handleVoiceSearch = () => {
    //     Alert.alert("Voice Search", "Voice recognition feature initiated. Searching for Pokémon...");
    // };


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
        {hasPermission && cameraDevice ? (
          <Camera
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
            <TouchableOpacity onPress={handleCapture} disabled={!hasPermission || !isPokemonVisible}>
                <Text style={[styles.btn, (!hasPermission || !isPokemonVisible) && styles.disabledBtn]}>Capture</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleGallery}>
                <Text style={styles.btn}>Gallery</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.col}>
            <Text style={styles.title}>AR CAMERA INFORMATION</Text>
            <Text style={styles.status}>[ ] Camera Permissions: ({cameraPermissionStatus})</Text>
            <Text style={styles.status}>[ ] Sprite Overlay: {isPokemonVisible ? `${currentPokemonName} (2D)` : 'None'}</Text>
            <Text style={styles.status}>[ ] Gyro Detection: (disabled - *future feature*)</Text>
        </View>

       <BottomNav />
      </View>
    </ImageBackground>
  );
};

// --- UPDATED STYLES (Centering fix applied to pokemonContainer) ---
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
    justifyContent: 'center', // Added for centering fallback
    alignItems: 'center',   // Added for centering fallback
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

  // 💡 CENTERING FIX APPLIED HERE:
  pokemonContainer: {
    // 1. Fill the entire parent camera view
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,

    // 2. Use flexbox to center its children (the Image and Text)
    justifyContent: 'center', // Centers vertically
    alignItems: 'center',   // Centers horizontally
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
    flex: 1,
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
     fontFamily: 'BrickSans-Bold',
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
  // The following styles were unused in your render function but kept for completeness
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