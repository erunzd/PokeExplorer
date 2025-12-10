// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image, // Import Image for the sprites later
  ImageBackground,
} from 'react-native';
import axios from 'axios';

import PokeHeader from '../components/PokeHeader';
import BottomNav from '../components/BottomNav';
import SearchBar from '../components/SearchBar';


const POKEDEX_KEY = '@pokedex_list'; // Key for AsyncStorage
// Type -> color map (reused from detail screen)
const TYPE_COLORS = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};
const getTypeColor = (typeName) => TYPE_COLORS[typeName?.toLowerCase()] || '#777';
// Small card component that fetches its own type (cached) and renders the image
const PokemonCard = ({ item, navigation }) => {
  const [type, setType] = useState(null);
  const pokeId = item.url.split('/')[item.url.split('/').length - 2];
  const TYPE_KEY = `@pokemon_type_${pokeId}`;

  useEffect(() => {
    let mounted = true;
    const loadType = async () => {
      try {
        const cached = await AsyncStorage.getItem(TYPE_KEY);
        if (cached) {
          if (mounted) setType(JSON.parse(cached));
          return;
        }
        const res = await axios.get(item.url);
        const primary = res.data?.types?.[0]?.type?.name || 'Unknown';
        if (mounted) {
          setType(primary);
          await AsyncStorage.setItem(TYPE_KEY, JSON.stringify(primary));
        }
      } catch (e) {
        if (mounted) setType('Unknown');
      }
    };
    loadType();
    return () => { mounted = false; };
  }, [item.url]);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => navigation.navigate('PokedexDetail', { url: item.url })}
    >
      <Image
        source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeId}.png` }}
        style={styles.cardImage}
        resizeMode="contain"
      />

      <View style={styles.textContainer}>
          <Text style={styles.pokeId}>#{pokeId} {item.name.charAt(0).toUpperCase() + item.name.slice(1)}</Text>
          <Text
            style={[
              styles.pokeType,
              { backgroundColor: type ? getTypeColor(type) : '#DDD', color: type ? '#fff' : '#333' },
            ]}
          >
            {type ? type.toUpperCase() : '...'}
          </Text>
      </View>
    </TouchableOpacity>
  );
};

// --- MAIN COMPONENT ---
const HomeScreen = ({ navigation }) => {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextUrl, setNextUrl] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State for search input

  // Function to fetch the initial list of Pokémon (e.g., first 151)
  // Fetch a single page (used for initial load and pagination)
  const fetchPokemonList = async (url = 'https://pokeapi.co/api/v2/pokemon?limit=100') => {
    try {
      // if this is the first load
      if (!nextUrl) setLoading(true);
      else setLoadingMore(true);

      // Try cache for first-page only (quick startup)
      if (!nextUrl) {
        const cachedData = await AsyncStorage.getItem(POKEDEX_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setPokemonList(parsed.list || parsed || []);
          setNextUrl(parsed.next || null);
          setLoading(false);
          // continue to fetch the first page in background to refresh
        }
      }

      const response = await axios.get(url);
      const results = response.data.results || [];

      // Merge and deduplicate by URL to avoid duplicate items across pages/cached data
      const combined = [...pokemonList, ...results];
      const map = new Map();
      combined.forEach((it) => {
        if (it && it.url) map.set(it.url, it);
      });
      const unique = Array.from(map.values());

      setPokemonList(unique);
      setNextUrl(response.data.next || null);

      // persist merged unique list + next url for quicker startup
      await AsyncStorage.setItem(POKEDEX_KEY, JSON.stringify({ list: unique, next: response.data.next || null }));
    } catch (error) {
      console.error('Error fetching data: ', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Run the fetch function only once when the component mounts
  useEffect(() => {
    fetchPokemonList();
  }, []);

  // --- Search Filtering Logic ---
  // This filters the main list whenever the user types in the search bar.
  const filteredPokemon = pokemonList.filter(pokemon =>
    // Convert both names to lowercase to ensure case-insensitive search
    pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // ---------------------------------

  // Renders a single row in the FlatList
  const renderItem = ({ item }) => <PokemonCard item={item} navigation={navigation} />;

  // Load more when user scrolls to end
  const handleEndReached = () => {
    if (!nextUrl || loadingMore) return;
    fetchPokemonList(nextUrl);
  };

  // --- Loading State Display ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
        <Text>Loading Pokémon Data...</Text>
      </View>
    );
  }

  // --- Main Render View ---
  return (
    
    <ImageBackground
      source={require('../assets/test2.png')}
      style={styles.background}
      blurRadius={1}
    >
      {/* semi-transparent overlay to act as a backdrop filter */}
      <View style={styles.backdropOverlay} />
        <PokeHeader />
      <View style={styles.content}>

        {/* Search Input Bar */}
      <SearchBar value={searchTerm} onChangeText={setSearchTerm} />


        {/* List Display */}
        <FlatList
          data={filteredPokemon}
          keyExtractor={(item) => item.url}
          renderItem={renderItem}
          numColumns={2} // Sets the grid to two columns
          columnWrapperStyle={styles.row} // Custom style for the row wrapper
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 12 }} /> : null}
        />
      </View>
      <BottomNav />
    </ImageBackground>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor kept as fallback if image fails to load
    backgroundColor: '#FF0000',
  },
  background: {
    flex: 1,
    width: '100%',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  content: {
    flex: 1,
    paddingTop: 0,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  listItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pokeId: {
    fontSize: 18,
    marginRight: 10,
    color: '#888',
  },
  pokeName: {
    fontSize: 20,
    textTransform: 'capitalize',
  },
  pokeImage: {
    width: 50,
    height: 50,
    marginLeft: 'auto'
  },
  // src/screens/HomeScreen.js (in StyleSheet.create)

  listContent: {
    paddingHorizontal: 10,
  },
  row: {
    // Distribute space evenly between the two columns
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardContainer: {
    // 48% ensures there is a gap between the two card
    marginTop: 5,
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 5,
    overflow: 'hidden',
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  imagePlaceholder: {
    width: '100%',
    height: 100, // Fixed height for the image area
    backgroundColor: '#fff', // Light green background for placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#fff',
  },
  textContainer: {
    padding: 10,
  },
  pokeId: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  pokeType: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
});

export default HomeScreen;