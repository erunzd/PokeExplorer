import React, { useRef } from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  FlatList,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Image,
} from 'react-native';

import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

import BottomNav from '../components/BottomNav';
import configureNotifications, { notifyNearbyPokemon } from '../utils/NotificationService';

// Constants
const POKEMON_COUNT = 1025;
const POKEMON_TO_SPAWN = 3;

const HuntScreen = () => {
  // ---------- HOOKS (UNCONDITIONAL & FIXED ORDER) ----------
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [nearbyPokemon, setNearbyPokemon] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const retryTimerRef = useRef(null);

  // ---------- HELPERS (plain functions, not hooks) ----------

  // Fetch details from PokeAPI
  const fetchPokemonDetails = async (id) => {
    try {
      const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = response.data;
      const typeNames = data.types
        .map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1))
        .join('/');

      return {
        id: data.id,
        name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
        type: typeNames,
        imageUrl: (data.sprites && data.sprites.other && data.sprites.other['official-artwork'])
          ? data.sprites.other['official-artwork'].front_default
          : data.sprites.front_default,
        spriteUrl: data.sprites.front_default,
      };
    } catch (err) {
      console.warn('fetchPokemonDetails error', err);
      return null;
    }
  };

  // Simulate encounters based on current coords
  const simulatePokemonEncounters = async (lat, long) => {
    setLoadingEncounters(true);

    const uniqueIds = new Set();
    while (uniqueIds.size < POKEMON_TO_SPAWN) {
      uniqueIds.add(Math.floor(Math.random() * POKEMON_COUNT) + 1);
    }

    const promises = [...uniqueIds].map(id => fetchPokemonDetails(id));
    const results = (await Promise.all(promises)).filter(Boolean);

    const spawned = results.map((poke, idx) => {
      const latOffset = (Math.random() - 0.5) * 0.002;
      const longOffset = (Math.random() - 0.5) * 0.002;
      return {
        ...poke,
        uniqueKey: `${poke.id}-${idx}-${Date.now()}`,
        latitude: lat + latOffset,
        longitude: long + longOffset,
        distance: Math.floor(Math.random() * 100) + 10,
      };
    });

    setNearbyPokemon(spawned);
    setLoadingEncounters(false);

    if (spawned.length > 0) {
      try { await notifyNearbyPokemon(spawned[0].name); } catch (e) { console.warn('notify error', e); }
    }
  };

  // Shared success handler for location
  const handleLocationSuccess = (position) => {
    const { latitude, longitude } = position.coords;
    const newRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setLocation(newRegion);
    simulatePokemonEncounters(latitude, longitude);
    setLoadingLocation(false);
  };

  // Try fast network-based location then fallback to high-accuracy GPS
  const findCurrentLocation = () => {
    setLoadingLocation(true);
    setNearbyPokemon([]);

    // Attempt 1: fast (network/Wi-Fi/cell)
    Geolocation.getCurrentPosition(
      (pos) => {
        handleLocationSuccess(pos);
      },
      (err) => {
        console.log('Fast location failed, falling back to GPS:', err);

        // Attempt 2: high-accuracy GPS
        Geolocation.getCurrentPosition(
          (pos2) => {
            handleLocationSuccess(pos2);
          },
          (err2) => {
            console.log('GPS fallback failed:', err2);
            setLoadingLocation(false);
            setLoadingEncounters(false);

            // Auto-retry after 3s (keeps app responsive)
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
              findCurrentLocation();
            }, 3000);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
    );
  };

  // Request location permission on Android
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need location access to find Pokémon!',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          findCurrentLocation();
        } else {
          Alert.alert('Permission Denied', 'Cannot hunt Pokémon without location access.');
          setLoadingLocation(false);
        }
      } catch (err) {
        console.warn('permission request error', err);
        setLoadingLocation(false);
      }
    } else {
      // iOS or others
      findCurrentLocation();
    }
  };

  // ---------- LIFECYCLE ----------
  useEffect(() => {
    configureNotifications();
    requestLocationPermission();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps => runs once; no hooks inside

  // ---------- RENDER ITEM ----------
  const renderPokemonItem = ({ item }) => (
    <View style={styles.row}>
      <Image source={{ uri: item.imageUrl }} style={styles.pokemonImage} resizeMode="contain" />

      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={[styles.nt, { fontSize: 20, fontWeight: 'bold' }]}>
          {item.name.toUpperCase()}
        </Text>
        <Text style={styles.nt}>TYPE: {item.type}</Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.nt, { textAlign: 'right', fontSize: 18 }]}>{item.distance} M</Text>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ARScreen', {
              pokemonId: item.id,
              pokemonName: item.name,
              pokemonSpriteUrl: item.spriteUrl,
            });
          }}
        >
          <Text style={styles.btn}>Capture</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---------- UI ----------
  return (
    <ImageBackground source={require('../assets/test2.png')} style={styles.background} blurRadius={1}>
      <View style={styles.backdropOverlay} />

      <View style={styles.mapContainer}>
        {loadingLocation || !location ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#fdd400" />
            <Text style={{ color: '#fff', marginTop: 10 }}>Acquiring GPS Signal...</Text>
          </View>
        ) : (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={location}
            showsUserLocation={true}
            followsUserLocation={true}
            initialRegion={location}
          >
            {nearbyPokemon.map((poke) => (
              <Marker
                key={poke.uniqueKey}
                coordinate={{ latitude: poke.latitude, longitude: poke.longitude }}
                title={poke.name}
                description={`${poke.distance}m away`}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Image
                  source={{ uri: poke.imageUrl }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 100,
                    borderWidth: 2,
                    borderColor: '#fff',
                  }}
                  resizeMode="contain"
                />
              </Marker>
            ))}
          </MapView>
        )}
        <View style={styles.mapLabelContainer}>
          <Text style={styles.mapLabelText}>Live Map Display</Text>
        </View>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Nearby Pokemon</Text>

        {loadingEncounters ? (
          <ActivityIndicator size="large" color="#fdd400" style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={nearbyPokemon}
            keyExtractor={(item) => item.uniqueKey}
            renderItem={renderPokemonItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
                No Pokémon found. Try rescanning!
              </Text>
            }
          />
        )}

        <TouchableOpacity onPress={findCurrentLocation}>
          <Text style={styles.vsbtn}>Rescan for Pokemon</Text>
        </TouchableOpacity>

        <BottomNav />
      </View>
    </ImageBackground>
  );
};

// ---------- STYLES (unchanged) ----------
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  mapContainer: {
    height: 300,
    width: '100%',
    marginTop: 50,
    borderBottomWidth: 3,
    borderColor: '#333',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoading: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLabelContainer: {
    position: 'absolute',
    top: 10,
    width: '100%',
    alignItems: 'center',
  },
  mapLabelText: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    color: '#fdd400',
    elevation: 6,
    padding: 5,
    fontSize: 30,
    letterSpacing: 1.2,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    fontFamily: 'BrickSans-Bold',
  },
  pokemonImage: {
    width: 60,
    height: 60,
    marginRight: 10,
    borderRadius: 30,
    backgroundColor: '#eee',
  },
  nt: {
    fontSize: 16,
    color: '#532221',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  btn: {
    backgroundColor: '#3b4cca',
    fontSize: 14,
    marginTop: 5,
    paddingVertical: 8,
    paddingHorizontal: 15,
    color: '#fff',
    elevation: 2,
    borderRadius: 5,
    textAlign: 'center',
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  vsbtn: {
    backgroundColor: '#fdd400',
    textAlign: 'center',
    color: '#532221',
    borderRadius: 5,
    elevation: 6,
    padding: 12,
    fontSize: 18,
    bottom: 125,
    letterSpacing: 1.2,
    fontWeight: 'bold',
  },
});

export default HuntScreen;