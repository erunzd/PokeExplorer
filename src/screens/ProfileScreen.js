import React, { useState, useEffect, useCallback } from 'react';
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

// 🚨 NEW IMPORT: Utility for XP, Level, and Badge logic 🚨
import {
  loadUserProgress,
  DEFAULT_PROGRESS,
  getLevelFromXP,
  getXPForNextLevel,
  BADGES
} from '../utils/GamificationService';

// CONSTANT: Key for storing capture data (Must match ARScreen.js)
const CAPTURES_KEY = '@pokemon_captures_gallery';

const ProfileScreen = ({ navigation }) => {
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [pokemonCount, setPokemonCount] = useState(0);

  // 🚨 NEW STATE FOR GAMIFICATION 🚨
  const [userXP, setUserXP] = useState(DEFAULT_PROGRESS.xp);
  const [userLevel, setUserLevel] = useState(DEFAULT_PROGRESS.level);
  const [userBadges, setUserBadges] = useState(DEFAULT_PROGRESS.badges);
  const [xpToNextLevel, setXPToNextLevel] = useState(0);

  // STATE: To hold the actual captured photo data
  const [capturedPhotos, setCapturedPhotos] = useState([]);

  // --- Load Gallery Data ---
  const loadCapturedPhotos = useCallback(async () => {
    try {
      const capturesJSON = await AsyncStorage.getItem(CAPTURES_KEY);
      if (capturesJSON) {
        const captures = JSON.parse(capturesJSON);
        setCapturedPhotos(captures);
      } else {
        setCapturedPhotos([]);
      }
    } catch (error) {
      console.error('Error loading captured photos (Gallery):', error);
    }
  }, []);

  // --- Load Gamification Data ---
  const loadGamificationData = useCallback(async (email) => {
    try {
      const progress = await loadUserProgress(email);

      const currentLevel = getLevelFromXP(progress.xp);
      const xpRequired = getXPForNextLevel(currentLevel);

      setUserXP(progress.xp);
      setUserLevel(currentLevel);
      setUserBadges(progress.badges);
      setXPToNextLevel(xpRequired);

    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    loadPokemonCount();
    loadCapturedPhotos();

    const unsubscribe = navigation.addListener('focus', () => {
      loadCapturedPhotos();
      if (userEmail) {
        loadGamificationData(userEmail);
      }
    });

    return unsubscribe;
  }, [navigation, loadCapturedPhotos, userEmail, loadGamificationData]);

  const loadUserData = async () => {
    try {
      const email = await AsyncStorage.getItem('@user_email');

      if (email) {
        setUserEmail(email);
        const username = email.split('@')[0];
        setUserName(username.toUpperCase());

        await loadGamificationData(email);

        const profileImageKey = `@profile_image_${email.trim()}`;
        const savedImageUri = await AsyncStorage.getItem(profileImageKey);
        if (savedImageUri) setProfileImage(savedImageUri);
      }

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
        const uniqueCount = new Set(parsed.list.map(p => p.id)).size;
        setPokemonCount(uniqueCount || 0);
      }
    } catch (error) {
      console.error('Error loading Pokémon count:', error);
    }
  };

  const handleImagePicker = () => {
    const options = { mediaType: 'photo', includeBase64: false };
    launchImageLibrary(options, async (response) => {
      if (response.assets && response.assets[0]) {
        const uri = response.assets[0].uri;
        setProfileImage(uri);
        const key = `@profile_image_${userEmail.trim()}`;
        await AsyncStorage.setItem(key, uri);
      }
    });
  };

  const confirmLogout = async () => {
    try {
      await AsyncStorage.removeItem('@user_email');
      await AsyncStorage.removeItem(`@user_progress_${userEmail}`);
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const renderGalleryItem = ({ item }) => (
    <View style={styles.galleryItem}>
      <Image source={{ uri: item.uri }} style={styles.galleryImage} />
      <View style={styles.galleryOverlay}>
        <Text style={styles.galleryPokemonName}>{item.pokemonName}</Text>
      </View>
    </View>
  );

  const renderBadgeItem = ({ item }) => {
    const obtained = userBadges.includes(item.id);
    return (
      <View style={[styles.badgeItem, { backgroundColor: obtained ? '#FFCB05' : '#E0E0E0' }]}>
        <Text style={[styles.badgeTitle, { color: obtained ? '#2C72B8' : '#666' }]}>{item.title}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC0A2D" />
        <Text style={{ marginTop: 10 }}>Loading Profile...</Text>
      </View>
    );
  }

  const xpCurrentLevelStart = getXPForNextLevel(userLevel - 1);
  const xpProgress = userXP - xpCurrentLevelStart;
  const xpRange = xpToNextLevel - xpCurrentLevelStart;
  const xpPercentage = xpRange > 0 ? (xpProgress / xpRange) * 100 : 0;

  return (
    <ImageBackground
      source={require('../assets/test2.png')}
      style={styles.background}
      blurRadius={1}
    >
      <View style={styles.backdropOverlay} />
      <ProfileHeader />

      <ScrollView style={styles.container}>
        <View style={styles.trainerCardContainer}>
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={handleImagePicker}
              activeOpacity={0.9}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} resizeMode="cover" />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>{userName ? userName.charAt(0) : '?'}</Text>
                </View>
              )}
              <View style={styles.imageOverlay}>
                <Text style={styles.imageOverlayText}>CHANGE</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName || 'TRAINER'}</Text>

              <View style={styles.levelContainer}>
                <View style={styles.levelBox}>
                  <Text style={styles.statValue}>{userLevel}</Text>
                  <Text style={styles.statLabel}>Level</Text>
                </View>
                <View style={styles.xpBarWrapper}>
                  <Text style={styles.xpText}>XP: {userXP} / {xpToNextLevel}</Text>
                  <View style={styles.xpBarBackground}>
                    <View style={[styles.xpBarFill, { width: `${xpPercentage}%` }]} />
                  </View>
                  <Text style={styles.xpProgressText}>
                    {xpToNextLevel > 0 ? `${xpProgress} XP to Level ${userLevel + 1}` : 'MAX LEVEL!'}
                  </Text>
                </View>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>---</Text>
                  <Text style={styles.statLabel}>Daily</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{pokemonCount}</Text>
                  <Text style={styles.statLabel}>Dex</Text>
                </View>
              </View>

              <View style={styles.badgesSection}>
                <Text style={styles.badgesTitle}>Badges</Text>
                <FlatList
                  data={Object.values(BADGES)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  renderItem={renderBadgeItem}
                  contentContainerStyle={styles.badgesList}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.galleryHeader}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <Text style={styles.galleryCount}>{capturedPhotos.length}</Text>
          </View>
          {capturedPhotos.length === 0 ? (
            <Text style={styles.emptyGalleryText}>
              You haven't captured any Pokémon photos yet! Go to AR Camera to catch one.
            </Text>
          ) : (
            <FlatList
              data={capturedPhotos}
              renderItem={renderGalleryItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={styles.galleryHorizontalList}
              key="horizontal-gallery"
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
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
  // General
  background: { flex: 1 },
  backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

  // Trainer card
  trainerCardContainer: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 15, padding: 0, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden' },
  profileSection: { flexDirection: 'row' },
  profileImageContainer: { width: '40%', height: 350, marginLeft: -20, marginTop: -20, marginBottom: -20, borderTopLeftRadius: 15, borderBottomLeftRadius: 15, overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { backgroundColor: '#DC0A2D', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: 'white', fontSize: 48, fontWeight: 'bold' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 6, pointerEvents: 'none' },
  imageOverlayText: { color: 'white', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  userInfo: { flex: 1, padding: 20, justifyContent: 'flex-start' },
  userName: { fontSize: 32, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15 },

  // Gamification
  levelContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(220,10,45,0.1)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 15, marginBottom: 20 },
  levelBox: { alignItems: 'center', marginRight: 15 },
  xpBarWrapper: { flex: 1, paddingRight: 10 },
  xpText: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: 'bold' },
  xpBarBackground: { height: 10, backgroundColor: '#ccc', borderRadius: 5, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 5 },
  xpProgressText: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'right' },

  statsContainer: { flexDirection: 'row', backgroundColor: 'rgba(220,10,45,0.1)', borderRadius: 10, padding: 15, marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#DC0A2D' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 5 },
  statDivider: { width: 1, backgroundColor: 'rgba(220,10,45,0.3)' },

  badgesSection: { marginTop: 10 },
  badgesTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  badgesList: { paddingVertical: 5 },
  badgeItem: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  badgeTitle: { fontSize: 14, fontWeight: 'bold' },

  // Gallery
  sectionContainer: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  galleryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  galleryCount: { fontSize: 16, color: '#666', fontWeight: '500' },
  galleryHorizontalList: { paddingVertical: 5 },
  galleryItem: { width: 120, marginRight: 10, position: 'relative' },
  galleryImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#f0f0f0' },
  galleryOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingVertical: 2 },
  galleryPokemonName: { color: 'white', fontSize: 10, textAlign: 'center', fontWeight: 'bold', textTransform: 'capitalize' },
  emptyGalleryText: { textAlign: 'center', color: '#666', padding: 20, fontStyle: 'italic' },

  logoutButton: { backgroundColor: '#DC0A2D', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginBottom: 30, elevation: 5 },
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
