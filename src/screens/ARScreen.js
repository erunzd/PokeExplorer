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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { captureRef } from 'react-native-view-shot';
import BottomNav from '../components/BottomNav';
import { awardXPAndCheckBadges } from '../utils/GamificationService';

const CAPTURES_KEY = '@pokemon_captures_gallery';

const ARScreen = ({ navigation }) => {
  const route = useRoute();
  const {
    pokemonId: initialPokemonId,
    pokemonName: initialPokemonName,
    pokemonSpriteUrl: initialPokemonSpriteUrl,
  } = route.params || {};

  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraDevice = useCameraDevice('back');
  const cameraRef = useRef(null);
  const combinedViewRef = useRef(null);

  const [pokemonData, setPokemonData] = useState(
    initialPokemonId && initialPokemonName && initialPokemonSpriteUrl
      ? { id: initialPokemonId, name: initialPokemonName, sprite: initialPokemonSpriteUrl }
      : null
  );

  const [loadingPokemon, setLoadingPokemon] = useState(!initialPokemonId || !initialPokemonName || !initialPokemonSpriteUrl);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState('checking...');
  const [isPokemonVisible, setIsPokemonVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const fetchPokemonSprite = useCallback(async (id = '25') => {
    if (pokemonData) return;
    try {
      const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const spriteUrl = response.data.sprites.front_default;
      setPokemonData({
        id: id,
        name: response.data.name.charAt(0).toUpperCase() + response.data.name.slice(1),
        sprite: spriteUrl,
      });
      setTimeout(() => setIsPokemonVisible(true), 1000);
    } catch (error) {
      console.error('Error fetching Pokémon:', error);
      Alert.alert('API Error', 'Could not fetch Pokémon sprite from PokeAPI.');
      setPokemonData({ id: null, name: 'Error', sprite: null });
    } finally {
      setLoadingPokemon(false);
    }
  }, [pokemonData]);

  useEffect(() => {
    if (!hasPermission) {
      const delayTimer = setTimeout(() => {
        requestPermission().then(granted => {
          setCameraPermissionStatus(granted ? 'enabled' : 'disabled');
          if (!granted) {
            Alert.alert('Permission Required', 'Camera access is needed to use the AR feature.');
          }
        });
      }, 500);
      return () => clearTimeout(delayTimer);
    }

    if (!pokemonData) fetchPokemonSprite();
    else {
      setTimeout(() => setIsPokemonVisible(true), 500);
      setLoadingPokemon(false);
    }
  }, [hasPermission, requestPermission, fetchPokemonSprite, pokemonData]);

  useEffect(() => {
    if (hasPermission && cameraDevice) setCameraPermissionStatus('enabled');
    else if (hasPermission === false) setCameraPermissionStatus('disabled');
  }, [hasPermission, cameraDevice]);

  const currentPokemonName = pokemonData ? pokemonData.name : 'Unknown Pokémon';
  const currentPokemonSprite = pokemonData ? pokemonData.sprite : null;
  const currentPokemonId = pokemonData ? pokemonData.id : null;

  const handleCapture = async () => {
    if (!isPokemonVisible || isCapturing || !combinedViewRef.current) {
      Alert.alert('Error', 'Pokémon not visible or camera not ready.');
      return;
    }

    setIsCapturing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const uri = await captureRef(combinedViewRef, { format: 'png', quality: 1 });
      const savedUri = await CameraRoll.save(uri, { type: 'photo', album: 'PokeExplorer Captures' });

      const captureData = {
        id: Date.now().toString(),
        uri: savedUri,
        pokemonName: currentPokemonName,
        pokemonSprite: currentPokemonSprite,
        timestamp: new Date().toISOString(),
      };

      const existingCapturesJSON = await AsyncStorage.getItem(CAPTURES_KEY);
      const existingCaptures = existingCapturesJSON ? JSON.parse(existingCapturesJSON) : [];
      const newCaptures = [captureData, ...existingCaptures];
      await AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(newCaptures));

      // Gamification: award XP and check badges
      const userEmail = await AsyncStorage.getItem('@user_email');
      if (userEmail && currentPokemonId) {
        await awardXPAndCheckBadges(userEmail, 'POKEMON_CAPTURE', currentPokemonId);
      }

      Alert.alert('Capture Successful!', `${currentPokemonName} saved to your Gallery! XP earned.`);
    } catch (error) {
      console.error('Photo Capture Error:', error);
      Alert.alert('Capture Failed', `Could not save photo: ${error.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleGallery = () => navigation.navigate('Profile');

  return (
    <ImageBackground source={require('../assets/test2.png')} style={styles.background} blurRadius={1}>
      <View style={styles.backdropOverlay} />

      <View ref={combinedViewRef} style={styles.cameraContainer} collapsable={false}>
        {hasPermission && cameraDevice ? (
          <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={cameraDevice} isActive photo />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fdd400" />
            <Text style={styles.loadingText}>
              {hasPermission === false ? 'Camera Permission Denied' : 'Loading AR Camera...'}
            </Text>
            {!cameraDevice && hasPermission && <Text style={styles.loadingText}>Searching for camera device...</Text>}
          </View>
        )}

        {loadingPokemon || !pokemonData || !pokemonData.sprite ? (
          <View style={styles.pokemonLoading}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingText}>Loading Sprite...</Text>
          </View>
        ) : (
          isPokemonVisible && (
            <View style={styles.pokemonContainer}>
              <Image source={{ uri: pokemonData.sprite }} style={styles.pokemonSprite} resizeMode="contain" />
              <Text style={styles.pokemonNameTag}>A Wild {currentPokemonName} Appears!</Text>
            </View>
          )
        )}
      </View>

      <View style={styles.container}>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={handleCapture}
            disabled={!hasPermission || !isPokemonVisible || isCapturing || !cameraDevice}
            style={[styles.buttonContainer, (!hasPermission || !isPokemonVisible || isCapturing || !cameraDevice) && styles.disabledBtn]}
          >
            <Text style={styles.buttonText}>{isCapturing ? 'Saving...' : 'Capture'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleGallery} style={[styles.buttonContainer, { backgroundColor: '#fdd400' }]}>
            <Text style={[styles.buttonText, { color: '#532221' }]}>Gallery</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.col}>
          <Text style={styles.title}>AR CAMERA INFORMATION</Text>
          <Text style={styles.status}>Camera Permissions: ({cameraPermissionStatus})</Text>
          <Text style={styles.status}>Sprite Overlay: {isPokemonVisible ? `${currentPokemonName} (2D)` : 'None'}</Text>
          <Text style={styles.status}>Capture Status: {isCapturing ? 'Saving...' : 'Ready'}</Text>
        </View>

        <BottomNav />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  background: { flex: 1, width: '100%' },
  backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  cameraContainer: { height: 350, width: '100%', backgroundColor: '#000', marginTop: 60, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' },
  pokemonLoading: { position: 'absolute', top: '50%', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingText: { color: '#fff', marginTop: 10 },
  pokemonContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  pokemonSprite: { width: 250, height: 250 },
  pokemonNameTag: { color: '#fff', backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 5, marginTop: 5, fontWeight: 'bold' },
  row: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  buttonContainer: { backgroundColor: '#3b4cca', paddingHorizontal: 35, borderRadius: 5, elevation: 6, padding: 20, flex: 1 },
  buttonText: { color: '#fff', fontSize: 24, letterSpacing: 1.2, textAlign: 'center', fontFamily: 'BrickSans-Bold' },
  disabledBtn: { opacity: 0.5 },
  col: { marginTop: 20, flexDirection: 'column', backgroundColor: '#fff', padding: 20, borderRadius: 5, elevation: 6 },
  title: { color: '#532221', fontSize: 30, letterSpacing: 1.2, marginBottom: 5, fontFamily: 'BrickSans-Bold' },
  status: { fontSize: 16, color: '#532221', fontWeight: '500', paddingVertical: 2 },
});

export default ARScreen;
