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
import firestore, { FieldValue } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Uncomment if you have gamification
// import { awardXPAndCheckBadges } from '../utils/GamificationService';
import BottomNav from '../components/BottomNav';
import GlobalHeader from '../components/GlobalHeader';

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

const DiscoveryCard = React.memo(({ post, onLike, onShare }) => {
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
        <TouchableOpacity onPress={() => onLike(post.id)}>
          <Text style={[styles.actionBtn, post.likedByCurrentUser && styles.liked]}>
            {post.likedByCurrentUser ? '❤️' : '♡'} {post.likesCount}
          </Text>
        </TouchableOpacity>

        <Text style={styles.actionBtn}>💬 {post.comments.length}</Text>

        <TouchableOpacity onPress={() => onShare(post)}>
          <Text style={[styles.actionBtn, styles.shareBtn]}>🔗 Share</Text>
        </TouchableOpacity>
      </View>

      {post.comments.length > 0 && (
        <View style={styles.comments}>
          {post.comments.map((c, i) => (
            <Text key={i} style={styles.comment}>
              <Text style={styles.commentUser}>{c.user}: </Text>
              {c.text}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
});

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

  const handleLike = useCallback(async (postId) => {
    setDiscoveries((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const liked = !post.likedByCurrentUser;
          return { ...post, likedByCurrentUser: liked, likesCount: post.likesCount + (liked ? 1 : -1) };
        }
        return post;
      })
    );

    try {
      const post = discoveries.find((p) => p.id === postId);
      const action = !post?.likedByCurrentUser ? 1 : -1;

      await firestore().collection(DISCOVERIES_COLLECTION).doc(postId).update({
        likesCount: FieldValue.increment(action),
      });

      const currentLikes = await loadLocalLikes();
      const newLikesList = action === 1 ? [...new Set([...currentLikes, postId])] : currentLikes.filter((id) => id !== postId);
      await AsyncStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(newLikesList));
    } catch (error) {
      console.error(error);
    }
  }, [discoveries, loadLocalLikes]);

  const handleShare = useCallback(async (post) => {
    try {
      await Share.open({
        title: 'Share Pokémon Discovery',
        message: `Check out ${post.userName}'s Pokémon Discovery: "${post.content}" #PokeExplorer #Pokemon`,
        ...(post.photo && { url: post.photo }),
        failOnCancel: false,
      });
    } catch (error) {
      if (!error.message.includes('User did not share')) Alert.alert('Share Failed', 'Could not open sharing options.');
    }
  }, []);

  const requestStoragePermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const permissionType = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(permissionType);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }, []);

  const selectImage = useCallback(async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please enable photo access in settings.');
      return;
    }

    launchImageLibrary({ mediaType: 'photo', includeBase64: false, quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) return Alert.alert('Image Picker Error', response.errorMessage);
      if (response.assets?.length > 0) setNewPostImageUri(response.assets[0].uri);
    });
  }, [requestStoragePermission]);

  useEffect(() => {
    const seedData = async () => {
      const snap = await firestore().collection(DISCOVERIES_COLLECTION).limit(1).get();
      if (snap.empty) {
        const batch = firestore().batch();
        INITIAL_STATIC_DISCOVERIES.forEach((post) => batch.set(firestore().collection(DISCOVERIES_COLLECTION).doc(post.id), post));
        await batch.commit();
      }
    };
    seedData();
  }, []);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection(DISCOVERIES_COLLECTION)
      .orderBy('timestamp', 'desc')
      .onSnapshot(async (snapshot) => {
        const likedIds = await loadLocalLikes();
        const loadedPosts = snapshot.docs.map((doc) => {
          const data = doc.data();
          let timestamp = Date.now();
          if (data.timestamp?.toDate) timestamp = data.timestamp.toDate().getTime();
          else if (typeof data.timestamp === 'number') timestamp = data.timestamp;
          return {
            id: doc.id,
            ...data,
            timestamp,
            likedByCurrentUser: likedIds.includes(doc.id),
            comments: data.comments || [],
            likesCount: data.likesCount || 0,
            content: data.content || '',
            photo: data.photo || null,
            profilePhoto: data.profilePhoto || null,
            userName: data.userName || 'Anonymous',
          };
        });
        setDiscoveries(loadedPosts);
        setIsLoading(false);
      }, (error) => {
        console.error(error);
        setIsLoading(false);
        Alert.alert('Data Error', 'Failed to load feed.');
      });

    return () => unsubscribe();
  }, [loadLocalLikes]);

  const handlePostDiscovery = async () => {
    if (!newPost.trim() && !newPostImageUri) {
      Alert.alert('Cannot Post', 'Please enter content or select a photo.');
      return;
    }

    setIsPosting(true);
    try {
      let downloadUrl = null;
      if (newPostImageUri) {
        const filename = newPostImageUri.split('/').pop();
        const ref = storage().ref(`discoveries/${Date.now()}_${filename}`);
        let uploadUri = newPostImageUri;
        if (Platform.OS === 'android' && !uploadUri.startsWith('file://')) uploadUri = 'file://' + uploadUri;
        await ref.putFile(uploadUri);
        downloadUrl = await ref.getDownloadURL();
      }

      const currentUser = auth().currentUser;
      const username = currentUser?.email?.split('@')[0] || 'Anonymous';

      await firestore().collection(DISCOVERIES_COLLECTION).add({
        userId: currentUser?.uid || 'unknown',
        userName: username,
        userEmail: currentUser?.email || '',
        timestamp: FieldValue.serverTimestamp(),
        content: newPost.trim(),
        likesCount: 0,
        comments: [],
        photo: downloadUrl,
        profilePhoto: `https://ui-avatars.com/api/?name=${username}`,
      });

      // await awardXPAndCheckBadges(currentUser.email, 'FIRST_DISCOVERY_POST');

      setNewPost('');
      setNewPostImageUri(null);
      Alert.alert('Success', 'Discovery posted!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to post discovery.');
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#007AFF" /></View>;

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
          <TouchableOpacity style={[styles.imageSelectBtn, newPostImageUri && styles.imageSelectedBtn]} onPress={selectImage}>
            <Text style={styles.imageSelectBtnText}>{newPostImageUri ? '✅ Image Selected' : 'Select Image'}</Text>
            {newPostImageUri && <Text style={styles.imageSelectBtnTextSecondary}>(Tap to change)</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.postBtn, isPosting && styles.disabledPostBtn]} onPress={handlePostDiscovery}>
            <Text style={styles.postBtnText}>{isPosting ? 'Posting...' : 'Post Discovery'}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={discoveries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DiscoveryCard post={item} onLike={handleLike} onShare={handleShare} />}
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
  postBtn: { backgroundColor: '#3b4cca', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 5 },
  disabledPostBtn: { opacity: 0.6 },
  postBtnText: { color: '#fff', fontSize: 14 },
  card: { backgroundColor: '#fff', marginBottom: 10, padding: 12, borderRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10, borderWidth: 2, borderColor: '#007AFF' },
  headerText: { justifyContent: 'center' },
  userName: { fontSize: 16, fontWeight: 'bold' },
  timestamp: { fontSize: 12, color: '#888' },
  photo: { width: '100%', height: 200, marginBottom: 10, borderRadius: 8, backgroundColor: '#eee' },
  content: { fontSize: 14, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 15, paddingVertical: 5 },
  actionBtn: { fontSize: 16, color: '#007AFF' },
  shareBtn: { color: '#00B8D9', fontWeight: '600' },
  liked: { fontWeight: 'bold', color: '#FF0000' },
  comments: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 },
  comment: { fontSize: 12, color: '#555', marginBottom: 4 },
  commentUser: { fontWeight: 'bold' },
});

export default GlobalScreen;
