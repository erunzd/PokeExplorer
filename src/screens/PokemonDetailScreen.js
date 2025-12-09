// src/screens/PokemonDetailScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For caching details

const PokemonDetailScreen = ({ route, navigation }) => {
  // 1. Get the URL passed from the HomeScreen list item
  const { url } = route.params;

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use the full URL as the cache key
  const DETAIL_KEY = `@pokemon_detail_${url.split('/').slice(-2, -1)[0]}`;

  useEffect(() => {
    const fetchAndCacheDetails = async () => {
      try {
        setLoading(true);

        // --- Caching Logic: Try to load from cache first ---
        const cachedData = await AsyncStorage.getItem(DETAIL_KEY);
        if (cachedData) {
          setDetails(JSON.parse(cachedData));
          setLoading(false);
          // Return early to display cached data immediately
          return;
        }

        // --- Network Fetch if cache fails ---
        const response = await axios.get(url);
        const data = response.data;

        setDetails(data);

        // Save the fetched data to AsyncStorage
        await AsyncStorage.setItem(DETAIL_KEY, JSON.stringify(data));

      } catch (error) {
        console.error("Error fetching Pokémon details: ", error);
        // Handle error display
      } finally {
        setLoading(false);
      }
    };

    fetchAndCacheDetails();
  }, [url]); // Rerun effect if the 'url' changes

  // --- Loading and Error States ---
  if (loading || !details) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
        <Text>Loading {details ? details.name : 'Pokémon'} Data...</Text>
      </View>
    );
  }

  // Destructure for cleaner access
  const { name, id, sprites, types, stats, abilities } = details;

  // --- Main Render: Display Details ---
  return (
    <ScrollView style={styles.container}>

      {/* Name and ID Header */}
      <View style={styles.header}>
        <Text style={styles.nameText}>#{id} {name.toUpperCase()}</Text>
      </View>

      {/* Sprite Image */}
      <View style={styles.imageContainer}>
          <Image
            // Use the official front default sprite
            source={{ uri: sprites.front_default }}
            style={styles.spriteImage}
          />
      </View>

      {/* Types Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Types</Text>
        <View style={styles.typeRow}>
          {types.map((typeObj, index) => (
            <Text key={index} style={styles.typeText}>
              {typeObj.type.name.toUpperCase()}
            </Text>
          ))}
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Base Stats</Text>
        {stats.map((statObj, index) => (
          <View key={index} style={styles.statRow}>
            <Text style={styles.statName}>{statObj.stat.name.toUpperCase()}:</Text>
            <Text style={styles.statValue}>{statObj.base_stat}</Text>
          </View>
        ))}
      </View>

      {/* Abilities Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Abilities</Text>
        {abilities.map((abilityObj, index) => (
          <Text key={index} style={styles.abilityText}>
            {abilityObj.ability.name.toUpperCase()}
          </Text>
        ))}
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  nameText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  spriteImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  section: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingBottom: 5,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  typeText: {
    fontSize: 16,
    padding: 5,
    borderRadius: 5,
    backgroundColor: '#DC0A2D', // Red background for types
    color: 'white',
    fontWeight: 'bold',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statName: {
    fontSize: 16,
    fontWeight: '600',
    width: '50%',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A73DC', // Blue text for values
  },
  abilityText: {
    fontSize: 16,
    marginBottom: 4,
    textTransform: 'capitalize',
  }
});

export default PokemonDetailScreen;