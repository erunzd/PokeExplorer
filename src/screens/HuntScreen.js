import React, { useState, useEffect } from 'react';
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

// --- EXTERNAL LIBRARIES ---
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';

// --- COMPONENTS ---
import BottomNav from '../components/BottomNav';
import configureNotifications, { notifyNearbyPokemon } from '../utils/NotificationService';

// Constants for API calls
const POKEMON_COUNT = 1025;
const POKEMON_TO_SPAWN = 3;

const HuntScreen = () => {
  // 🚨 ALL HOOKS AT THE TOP 🚨
  const [location, setLocation] = useState(null);
  const [nearbyPokemon, setNearbyPokemon] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingEncounters, setLoadingEncounters] = useState(false); // Fix: Moved to the top

  // --- API HELPER FUNCTIONS ---

  const fetchPokemonDetails = async (id) => {
    try {
      const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = response.data;

      const typeNames = data.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)).join('/');
      // Use the official artwork as it's often more reliable and higher quality
      const imageUrl = data.sprites.other['official-artwork'].front_default || data.sprites.front_default || 'https://via.placeholder.com/50';

      return {
        id: data.id,
        name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
        type: typeNames,
        imageUrl: imageUrl,
      };
    } catch (error) {
      console.error("Error fetching Pokémon details:", error);
      return null;
    }
  };

  // 3. Get Random Pokémon Encounters Logic (Axios Integration)
  const simulatePokemonEncounters = async (lat, long) => {
    setLoadingEncounters(true);
    const pokemonPromises = [];
    const uniqueIds = new Set();

    while (uniqueIds.size < POKEMON_TO_SPAWN) {
      const randomId = Math.floor(Math.random() * POKEMON_COUNT) + 1;
      uniqueIds.add(randomId);
    }

    for (const id of uniqueIds) {
      pokemonPromises.push(fetchPokemonDetails(id));
    }

    const fetchedPokemon = (await Promise.all(pokemonPromises)).filter(p => p !== null);

    const spawned = fetchedPokemon.map((poke, index) => {
      const latOffset = (Math.random() - 0.5) * 0.002;
      const longOffset = (Math.random() - 0.5) * 0.002;

      return {
        ...poke,
        uniqueKey: `${poke.id}-${index}-${Date.now()}`,
        latitude: lat + latOffset,
        longitude: long + longOffset,
        distance: Math.floor(Math.random() * 100) + 10,
      };
    });

    setNearbyPokemon(spawned);
    setLoadingEncounters(false);

    // Trigger Notification
    if (spawned.length > 0) {
      await notifyNearbyPokemon(spawned[0].name);
    }
  };

  // 2. Get Current Location
  const findCurrentLocation = () => {
      setLoadingLocation(true);
      setNearbyPokemon([]);

      Geolocation.getCurrentPosition(
          (position) => {
              const { latitude, longitude } = position.coords;
              const newLocation = {
                  latitude,
                  longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
              };
              setLocation(newLocation);
              simulatePokemonEncounters(latitude, longitude);
              setLoadingLocation(false);
          },
          (error) => {
              console.error("Geolocation Error:", error.code, error.message);
              Alert.alert(
                  'GPS Error',
                  `Cannot find your location. Check your GPS settings. (Code: ${error.code})`
              );
              setLoadingLocation(false);
              setLoadingEncounters(false);
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
  };

  // 1. Request Location Permissions
  const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
          try {
              const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                  {
                      title: "Location Permission",
                      message: "We need location access to find Pokémon!",
                      buttonNeutral: "Ask Me Later",
                      buttonNegative: "Cancel",
                      buttonPositive: "OK"
                  }
              );
              if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                  findCurrentLocation();
              } else {
                  Alert.alert('Permission Denied', 'Cannot hunt Pokémon without location access.');
                  setLoadingLocation(false);
              }
          } catch (err) {
              console.warn(err);
              setLoadingLocation(false);
          }
      } else {
          findCurrentLocation();
      }
  };

  // 🚨 useEffect is a Hook and must be called unconditionally at the top level 🚨
  useEffect(() => {
    requestLocationPermission();
    configureNotifications();
  }, []);

  // --- RENDER ITEM ---
  const renderPokemonItem = ({ item }) => (
    <View style={styles.row}>
       <Image
          source={{ uri: item.imageUrl }}
          style={styles.pokemonImage}
          resizeMode="contain"
       />

      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={[styles.nt, { fontSize: 20, fontWeight: 'bold' }]}>
          {item.name.toUpperCase()}
        </Text>
        <Text style={styles.nt}>TYPE: {item.type}</Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.nt, { textAlign: 'right', fontSize: 18 }]}>{item.distance} M</Text>
        <TouchableOpacity
          onPress={() => Alert.alert("Encounter!", `You started an encounter with ${item.name}!`)}
        >
          <Text style={styles.btn}>Capture</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ImageBackground
        source={require('../assets/test2.png')}
        style={styles.background}
        blurRadius={1}
    >
      <View style={styles.backdropOverlay} />

        {/* --- MAP SECTION --- */}
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
                    />
                  ))}
                </MapView>
             )}
             <View style={styles.mapLabelContainer}>
                <Text style={styles.mapLabelText}>Live Map Display</Text>
             </View>
        </View>

        <View style={styles.container}>
            <Text style={styles.title}>Nearby Pokemon</Text>

            {/* --- LIST SECTION --- */}
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

// --- STYLES ---
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
    marginTop: 0,
    borderBottomWidth: 3,
    borderColor: '#333'
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoading: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center'
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
    fontSize: 12
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10
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
    textShadowRadius: 10
  },
  pokemonImage: {
     width: 60,
     height: 60,
     marginRight: 10,
     borderRadius: 30,
     backgroundColor: '#eee'
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
    shadowColor: "#000",
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
    overflow: 'hidden'
  },
  vsbtn: {
    backgroundColor: '#fdd400',
    textAlign: 'center',
    color: '#532221',
    borderRadius: 5,
    elevation: 6,
    padding: 12,
    fontSize: 18,
    letterSpacing: 1.2,
    marginBottom: 80,
    fontWeight: 'bold'
  },
});

export default HuntScreen;