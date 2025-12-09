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
} from 'react-native';
import axios from 'axios';

const POKEDEX_KEY = '@pokedex_list'; // Key for AsyncStorage
// --- MAIN COMPONENT ---
const HomeScreen = ({ navigation }) => {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // State for search input

  // Function to fetch the initial list of Pokémon (e.g., first 151)
  const fetchPokemonList = async () => {
    try {
      setLoading(true);
      // 1. Try to load data from cache (AsyncStorage)
            const cachedData = await AsyncStorage.getItem(POKEDEX_KEY);
            if (cachedData) {
              setPokemonList(JSON.parse(cachedData));
              setLoading(false);
              // We can return here to show cached data immediately,
              // or continue to fetch new data in the background (Stale-While-Revalidate).
              return;
            }

      // 2. If no cache, fetch from PokeAPI
      // Fetches the first 151 Pokémon names and URLs
      const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=151');
      const results = response.data.results;

      setPokemonList(results);

      // 3. Save the new data to cache
      await AsyncStorage.setItem(POKEDEX_KEY, JSON.stringify(results));
    } catch (error) {
      console.error("Error fetching data: ", error);
      // Optional: Show an error alert here
    } finally {
      setLoading(false);
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
  const renderItem = ({ item }) => {
      const pokeId = item.url.split('/')[item.url.split('/').length - 2];

      // The list item must fill half the container width minus margin
      return (
        <TouchableOpacity
          style={styles.cardContainer}
          onPress={() => navigation.navigate('PokedexDetail', { url: item.url })}
        >
          {/* Placeholder for the image */}
          <View style={styles.imagePlaceholder} />

          <View style={styles.textContainer}>
              <Text style={styles.pokeId}>#{pokeId} {item.name.charAt(0).toUpperCase() + item.name.slice(1)}</Text>
              {/* We will fetch the actual type on the detail screen,
                  but for now, let's use a placeholder until we optimize the API calls. */}
              <Text style={styles.pokeType}>Ground type</Text>
          </View>

        </TouchableOpacity>
      );
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
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Pokédex List</Text>

      {/* Search Input Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search Pokémon by name..."
        placeholderTextColor="#666"
        value={searchTerm}
        onChangeText={setSearchTerm} // Updates the searchTerm state
      />

      {/* List Display */}
      <FlatList
        data={filteredPokemon}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}

        // 🚨 KEY UI CHANGES:
        numColumns={2} // Sets the grid to two columns
        columnWrapperStyle={styles.row} // Custom style for the row wrapper
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: '#FFF',
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
  searchBar: {
    height: 40,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginHorizontal: 15,
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
      // 48% ensures there is a gap between the two cards
      width: '48%',
      backgroundColor: 'white',
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#CCC',
      elevation: 3, // Android shadow
      shadowColor: '#000', // iOS shadow
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    imagePlaceholder: {
      width: '100%',
      height: 100, // Fixed height for the image area
      backgroundColor: '#D1FFC3', // Light green background for placeholder
      justifyContent: 'center',
      alignItems: 'center',
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
      color: '#666',
    },
    // Ensure your searchBar style is also updated for the look
    searchBar: {
      // ... existing styles
      borderRadius: 20, // More rounded corners
      marginBottom: 15,
    }
});

export default HomeScreen;