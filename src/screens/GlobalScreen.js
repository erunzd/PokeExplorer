import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ImageBackground,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

import { awardXPAndCheckBadges } from '../utils/GamificationService';
import BottomNav from '../components/BottomNav';
import GlobalHeader from '../components/GlobalHeader';

// --- CONSTANTS ---
const LIKES_STORAGE_KEY = '@LikedPostIds';
const DISCOVERIES_COLLECTION = 'discoveries';

const INITIAL_STATIC_DISCOVERIES = [
  {
    id: '1',
    userName: 'Ash',
    timestamp: Date.now() - 86400000,
    content: 'Just caught a Pikachu! ⚡️',
    likesCount: 12,
    comments: [
      { user: 'Misty', text: 'Nice catch!', timestamp: Date.now() - 86000000 },
      { user: 'Brock', text: 'That’s electric, Ash!', timestamp: Date.now() - 85000000 },
    ],
    photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    profilePhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/12.png',
  },
  {
    id: '2',
    userName: 'Misty',
    timestamp: Date.now() - 3600000,
    content: 'Water type gym battle was intense 💧🔥',
    likesCount: 8,
    comments: [],
    photo: null,
    profilePhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/120.png',
  },
];

const GlobalScreen = () => {
  const [discoveries, setDiscoveries] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [newPostImageUri, setNewPostImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const loadLocalLikes = useCallback(async () => {
    try {
      const storedLikes = await AsyncStorage.getItem(LIKES_STORAGE_KEY);
      return storedLikes ? JSON.parse(storedLikes) : [];
    } catch (e) {
      console.error("Failed to load local likes:", e);
      return [];
    }
  }, []);

  const handleLike = useCallback(
    async (postId) => {
      const postToLike = discoveries.find((p) => p.id === postId);
      if (!postToLike) return;

      const action = postToLike.likedByCurrentUser ? -1 : 1;
      let updatedLikes = [];

      setDiscoveries((prev) => {
        const newDiscoveries = prev.map((post) => {
          if (post.id === postId) {
            const liked = !post.likedByCurrentUser;
            return {
              ...post,
              likedByCurrentUser: liked,
              likesCount: post.likesCount + action,
            };
          }
          return post;
        });

        updatedLikes = newDiscoveries
          .filter((post) => post.likedByCurrentUser)
          .map((post) => post.id);

        return newDiscoveries;
      });

      try {
        const firestoreInstance = firestore();
        await firestoreInstance
          .collection(DISCOVERIES_COLLECTION)
          .doc(postId)
          .update({
            likesCount: firestore.FieldValue.increment(action)
          });

        await AsyncStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updatedLikes));
      } catch (error) {
        console.error('Firestore Like Failed:', error);
        Alert.alert('Error', 'Failed to update like count.');
      }
    },
    [discoveries]
  );

  const handleShare = useCallback(async (post) => {
    const message = `Check out ${post.userName}'s Pokémon Discovery: "${post.content}" #PokeExplorer #Pokemon`;
    const shareOptions = { title: 'Share Pokémon Discovery', message, failOnCancel: false };
    if (post.photo) shareOptions.url = post.photo;

    try {
      await Share.open(shareOptions);
    } catch (error) {
      if (!error.message.includes('User did not share')) {
        Alert.alert('Share Failed', 'Could not open sharing options.');
      }
    }
  }, []);

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const permissionType = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const granted = await PermissionsAndroid.request(permissionType, {
        title: 'Storage Permission',
        message: 'App needs access to your photos to select images.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      });

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission request failed:', err);
      return false;
    }
  };

  const selectImage = useCallback(async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Cannot access photos without permission.');
      return;
    }

    launchImageLibrary({ mediaType: 'photo', includeBase64: false }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Image Error', response.errorMessage || 'Unknown error');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        if (uri) setNewPostImageUri(uri);
      }
    });
  }, []);

  useEffect(() => {
    const firestoreInstance = firestore();
    const unsubscribe = firestoreInstance
      .collection(DISCOVERIES_COLLECTION)
      .orderBy('timestamp', 'desc')
      .onSnapshot(async (querySnapshot) => {
        const likedIds = await loadLocalLikes();
        const loadedPosts = [];

        querySnapshot.forEach((doc) => {
          const postData = doc.data();
          let postTimestamp;

          if (postData.timestamp && typeof postData.timestamp.toDate === 'function') {
            postTimestamp = postData.timestamp.toDate().getTime();
          } else if (typeof postData.timestamp === 'number') {
            postTimestamp = postData.timestamp;
          } else {
            postTimestamp = Date.now();
          }

          loadedPosts.push({
            id: doc.id,
            ...postData,
            timestamp: postTimestamp,
            likedByCurrentUser: likedIds.includes(doc.id),
            comments: postData.comments || [],
            likesCount: postData.likesCount || 0,
            content: postData.content || '',
            photo: postData.photo || null,
            profilePhoto: postData.profilePhoto || null,
            userName: postData.userName || 'Anonymous',
          });
        });

        if (loadedPosts.length === 0) {
          INITIAL_STATIC_DISCOVERIES.forEach((post) => {
            firestoreInstance.collection(DISCOVERIES_COLLECTION).doc(post.id).set(post);
          });
        }

        setDiscoveries(loadedPosts);
        setIsLoading(false);
      }, (error) => {
        console.error('Firestore Listener Failed:', error);
        setIsLoading(false);
        Alert.alert('Data Error', 'Failed to load community feed.');
      });

    return () => unsubscribe();
  }, [loadLocalLikes]);

  const handlePostDiscovery = async () => {
    if (!newPost.trim() && !newPostImageUri) {
      Alert.alert('Cannot Post', 'Please enter some content or select a photo.');
      return;
    }

    setIsPosting(true);
    let downloadUrl = null;

    try {
      const firestoreInstance = firestore();
      const storageInstance = storage();
      const currentUser = auth().currentUser;
      const username = currentUser ? currentUser.email.split('@')[0] : 'Anonymous';

      if (newPostImageUri) {
        const filename = newPostImageUri.substring(newPostImageUri.lastIndexOf('/') + 1);
        const storageRef = storageInstance.ref(`discoveries/${Date.now()}_${filename}`);
        let uploadUri = newPostImageUri.startsWith('file://') ? newPostImageUri.replace('file://', '') : newPostImageUri;
        await storageRef.putFile(uploadUri);
        downloadUrl = await storageRef.getDownloadURL();
      }

      const newDiscoveryData = {
        userId: currentUser ? currentUser.uid : 'unknown',
        userName: username,
        userEmail: currentUser ? currentUser.email : '',
        timestamp: firestore.FieldValue.serverTimestamp(),
        content: newPost.trim(),
        likesCount: 0,
        comments: [],
        photo: downloadUrl,
        profilePhoto: `https://ui-avatars.com/api/?name=${username}`,
      };

      await firestoreInstance.collection(DISCOVERIES_COLLECTION).add(newDiscoveryData);

      if (currentUser?.email) {
        await awardXPAndCheckBadges(currentUser.email, 'FIRST_DISCOVERY_POST');
      }

      Alert.alert('Success!', 'Your discovery has been posted. XP earned!');
    } catch (error) {
      console.error('Posting Error:', error.message, error.code);
      Alert.alert('Post Error', `Failed to upload or post: ${error.message}`);
    } finally {
      setNewPost('');
      setNewPostImageUri(null);
      setIsPosting(false);
    }
  };

  const DiscoveryCard = ({ post }) => {
    const avatarSource = post.profilePhoto
      ? { uri: post.profilePhoto }
      : { uri: `https://ui-avatars.com/api/?name=${post.userName}` };

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Image source={avatarSource} style={styles.avatar} />
          <View style={styles.headerText}>
            <Text style={styles.userName}>{post.userName}</Text>
            <Text style={styles.timestamp}>{new Date(post.timestamp).toLocaleDateString()}</Text>
          </View>
        </View>

        {post.photo && <Image source={{ uri: post.photo }} style={styles.photo} resizeMode="cover" />}
        {post.content.trim() !== '' && <Text style={styles.content}>{post.content}</Text>}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleLike(post.id)}>
            <Text style={[styles.actionBtn, post.likedByCurrentUser && styles.liked]}>
              {post.likedByCurrentUser ? '❤️' : '♡'} {post.likesCount}
            </Text>
          </TouchableOpacity>
          <Text style={styles.actionBtn}>💬 {post.comments.length}</Text>
          <TouchableOpacity onPress={() => handleShare(post)}>
            <Text style={[styles.actionBtn, styles.shareBtn]}>🔗 Share</Text>
          </TouchableOpacity>
        </View>

        {post.comments.length > 0 && (
          <View style={styles.comments}>
            {post.comments.map((c, i) => (
              <Text key={i} style={styles.comment}>
                <Text style={styles.commentUser}>{c.user}: </Text>{c.text}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading Discoveries...</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={require('../assets/test2.png')} style={styles.background} blurRadius={1}>
      <View style={styles.backdropOverlay} />
      <GlobalHeader />
      <View style={styles.container}>
        <View style={styles.postBox}>
          <TextInput
            style={styles.input}
            placeholder="Share your discovery..."
            value={newPost}
            onChangeText={setNewPost}
            multiline
          />

          <TouchableOpacity
            style={[styles.imageSelectBtn, newPostImageUri && styles.imageSelectedBtn]}
            onPress={selectImage}
            disabled={false} // allow picking anytime
          >
            <Text style={styles.imageSelectBtnText}>
              {newPostImageUri ? '✅ Image Selected' : 'Select Image'}
            </Text>
            {newPostImageUri && <Text style={styles.imageSelectBtnTextSecondary}>(Tap to change)</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.postBtn, isPosting && styles.disabledPostBtn]}
            onPress={handlePostDiscovery}
            disabled={isPosting}
          >
            <Text style={styles.postBtnText}>{isPosting ? 'Posting...' : 'Post Discovery'}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={discoveries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DiscoveryCard post={item} />}
          contentContainerStyle={{ paddingBottom: 60 }}
        />

        <BottomNav />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  background: { flex: 1, width: '100%' },
  backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  postBox: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  input: { borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 8, marginBottom: 8, fontSize: 14 },
  imageSelectBtn: { backgroundColor: '#fdd400', padding: 10, borderRadius: 5, alignItems: 'center', marginBottom: 8 },
  imageSelectedBtn: { backgroundColor: '#3b4cca' },
  imageSelectBtnText: { color: '#532221', fontSize: 14 },
  imageSelectBtnTextSecondary: { color: '#fff', fontSize: 10 },
  postBtn: { backgroundColor: '#3b4cca', padding: 10, elevation: 6, borderRadius: 5, alignItems: 'center', marginTop: 5 },
  disabledPostBtn: { opacity: 0.6 },
  postBtnText: { color: '#fff', fontSize: 14, letterSpacing: 1.2 },
  card: { backgroundColor: '#fff', marginBottom: 10, padding: 12, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
  header: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10, borderWidth: 2, borderColor: '#007AFF' },
  headerText: { justifyContent: 'center' },
  userName: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  timestamp: { fontSize: 12, color: '#888' },
  photo: { width: '100%', height: 200, marginBottom: 10, borderRadius: 8, backgroundColor: '#eee' },
  content: { fontSize: 14, marginBottom: 10, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 15, paddingVertical: 5 },
  actionBtn: { fontSize: 16, color: '#007AFF' },
  shareBtn: { color: '#00B8D9', fontWeight: '600' },
  liked: { fontWeight: 'bold', color: '#FF0000' },
  comments: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 },
  comment: { fontSize: 12, color: '#555', marginBottom: 4 },
  commentUser: { fontWeight: 'bold' },
});

export default GlobalScreen;
