import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';

import BottomNav from '../components/BottomNav';
import ProfileHeader from '../components/ProfileHeader';

// Mock data
const mockGalleryImages = [
  { id: '1', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png' },
  { id: '2', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png' },
  { id: '3', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png' },
  { id: '4', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' },
  { id: '5', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png' },
  { id: '6', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png' },
  { id: '7', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png' },
  { id: '8', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png' },
];

const sampleBadges = [
  { id: '1', title: 'Kanto', obtained: true },
  { id: '2', title: 'Johto', obtained: true },
  { id: '3', title: 'Hoenn', obtained: true },
  { id: '4', title: 'Sinnoh', obtained: false },
  { id: '5', title: 'Unova', obtained: true },
  { id: '6', title: 'Kalos', obtained: false },
  { id: '7', title: 'Alola', obtained: true },
  { id: '8', title: 'Galar', obtained: false },
  { id: '9', title: 'Paldea', obtained: true },
];

const ProfileScreen = ({ navigation }) => {
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [pokemonCount, setPokemonCount] = useState(0);

  useEffect(() => {
    loadUserData();
    loadPokemonCount();
  }, []);

  const loadUserData = async () => {
    try {
      const email = await AsyncStorage.getItem('@user_email');
      if (!email) {
        navigation.replace('Login');
        return;
      }

      setUserEmail(email);
      setUserName(email.split('@')[0].toUpperCase());

      // Load user-specific image
      const key = `@profile_image_${email.trim()}`;
      const savedImage = await AsyncStorage.getItem(key);
      if (savedImage) setProfileImage(savedImage);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPokemonCount = async () => {
    try {
      const pokedexData = await AsyncStorage.getItem('@pokedex_list');
      if (pokedexData) {
        const parsed = JSON.parse(pokedexData);
        setPokemonCount(parsed.list?.length || 0);
      }
    } catch (error) {
      console.error('Error loading Pokémon count:', error);
    }
  };

  const handleImagePicker = () => {
    const options = {
      mediaType: 'photo',
      cropping: true,
      width: 600,
      height: 600,
      cropperCircleOverlay: false,
      freeStyleCropEnabled: true,
      includeBase64: false,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel || response.errorCode) return;

      const uri = response.assets?.[0]?.uri;
      if (!uri) return;

      setProfileImage(uri);

      try {
        const email = await AsyncStorage.getItem('@user_email');
        if (email) {
          await AsyncStorage.setItem(`@profile_image_${email.trim()}`, uri);
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  const confirmLogout = async () => {
    try {
      await AsyncStorage.removeItem('@user_email'); // Only remove login, keep photos!
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
        <Text style={{ marginTop: 10 }}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/test2.png')}
      style={styles.background}
      blurRadius={1}
    >
      <View style={styles.backdropOverlay} />
      <ProfileHeader />

      <ScrollView style={styles.container}>
        {/* Trainer Info Card */}
        <View style={styles.trainerCardContainer}>
          <View style={styles.profileSection}>
            {/* FULL HEIGHT PROFILE IMAGE (33% width, no cut-off) */}
            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={handleImagePicker}
              activeOpacity={0.9}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>
                    {userName ? userName.charAt(0) : '?'}
                  </Text>
                </View>
              )}
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>CHANGE</Text>
              </View>
            </TouchableOpacity>

            {/* User Info Section */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName || 'TRAINER'}</Text>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>69</Text>
                  <Text style={styles.statLabel}>Level</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{pokemonCount}</Text>
                  <Text style={styles.statLabel}>Box</Text>
                </View>
              </View>

              {/* Badges */}
              <View style={styles.badgesSection}>
                <Text style={styles.badgesTitle}>Badges</Text>
                <FlatList
                  data={sampleBadges}
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.badgeItem,
                        { backgroundColor: item.obtained ? '#FFCB05' : '#E0E0E0' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeTitle,
                          { color: item.obtained ? '#2C72B8' : '#666' },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </View>
                  )}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.badgesList}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Gallery */}
        <View style={styles.sectionContainer}>
          <View style={styles.galleryHeader}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <Text style={styles.galleryCount}>51/100</Text>
          </View>
          <FlatList
            data={mockGalleryImages}
            renderItem={({ item }) => (
              <View style={styles.galleryItem}>
                <Image source={{ uri: item.uri }} style={styles.galleryImage} />
              </View>
            )}
            keyExtractor={(item) => item.id}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={styles.galleryGrid}
          />
        </View>

        {/* Logout Button */}
        */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  background: { flex: 1 },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 80,
  },
  trainerCardContainer: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 15,
    padding: 0,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  profileSection: {
    flexDirection: 'row',
  },
  profileImageContainer: {
    width: '33%',
    position: 'relative',
    marginTop: -20,
    marginBottom: -20,
    marginLeft: -20,
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    overflow: 'hidden',
    height: 180,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: '#DC0A2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 5,
    pointerEvents: 'none',
  },
  imageOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfo: {
    flex: 1,
    padding: 20,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(220,10,45,0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#DC0A2D' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 5 },
  statDivider: { width: 1, backgroundColor: 'rgba(220,10,45,0.3)' },
  badgesSection: { marginTop: 10 },
  badgesTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  badgesList: { paddingVertical: 5 },
  badgeItem: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  badgeTitle: { fontSize: 14, fontWeight: 'bold' },
  sectionContainer: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
  },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  galleryCount: { fontSize: 16, color: '#666', fontWeight: '500' },
  galleryGrid: { paddingHorizontal: 5 },
  galleryItem: { width: '23%', marginHorizontal: '1%', marginBottom: 10 },
  galleryImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#f0f0f0' },
  logoutButton: {
    backgroundColor: '#DC0A2D',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5,
  },
  logoutButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: 15, padding: 25, width: '80%', elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  modalMessage: { fontSize: 16, color: '#666', marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#f0f0f0' },
  confirmButton: { backgroundColor: '#DC0A2D' },
  cancelButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});

export default ProfileScreen;