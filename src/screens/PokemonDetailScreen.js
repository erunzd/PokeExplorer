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
import BottomNav from '../components/BottomNav';
import DetailsHeader from '../components/DetailsHeader';

// Map of Pokemon type -> background color (matches common Pokedex palettes)
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
    <View style={{ flex: 1 }}>
      <DetailsHeader />      
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
            {types.map((typeObj, index) => {
              const t = typeObj.type.name;
              return (
                <Text
                  key={index}
                  style={[
                    styles.typeText,
                    { backgroundColor: getTypeColor(t), color: getTypeColor(t) ? '#fff' : '#000' },
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              );
            })}
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

        <View style={{ height: 80 }} />
      </ScrollView>
      <BottomNav />
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
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
    borderBottomColor: '#fff',
    paddingBottom: 10,
    fontFamily: 'BrickSans-Bold',
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
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 15,
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
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    color: 'white',
    fontWeight: '700',
    overflow: 'hidden',
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