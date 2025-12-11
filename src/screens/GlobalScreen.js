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

// --- REQUIRED EXTERNAL LIBRARIES ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';
// 🚨 FIREBASE IMPORTS 🚨
import { firestore, storage, auth, FieldValue } from '../config/firebaseConfig';

// Assuming these components exist
import BottomNav from '../components/BottomNav';
import GlobalHeader from '../components/GlobalHeader';

// --- CONSTANTS ---
const LIKES_STORAGE_KEY = '@LikedPostIds';
const DISCOVERIES_COLLECTION = 'discoveries';

// --- INITIAL STATIC DATA (Seeding data) ---
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

// -----------------------------------------------------------
// 0. SUB-COMPONENTS (Moved OUTSIDE GlobalScreen for Performance)
// -----------------------------------------------------------
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
  // ------------------------------------
  // 1. STATE HOOKS (TOP LEVEL)
  // ------------------------------------
  const [discoveries, setDiscoveries] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [newPostImageUri, setNewPostImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  // ------------------------------------
  // 2. CALLBACK HOOKS (TOP LEVEL)
  // ------------------------------------

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
    // Optimistic Update (Update UI immediately)
    setDiscoveries((prev) => {
      return prev.map((post) => {
        if (post.id === postId) {
          const newLikedStatus = !post.likedByCurrentUser;
          return {
            ...post,
            likedByCurrentUser: newLikedStatus,
            likesCount: post.likesCount + (newLikedStatus ? 1 : -1),
          };
        }
        return post;
      });
    });

    try {
      const post = discoveries.find(p => p.id === postId);
      const action = !post.likedByCurrentUser ? 1 : -1; 

      const firestoreInstance = firestore();
      await firestoreInstance
        .collection(DISCOVERIES_COLLECTION)
        .doc(postId)
        .update({
          likesCount: FieldValue.increment(action),
        });

      // Update Local Storage
      const currentLikes = await loadLocalLikes();
      let newLikesList;
      if (action === 1) {
        newLikesList = [...new Set([...currentLikes, postId])];
      } else {
        newLikesList = currentLikes.filter(id => id !== postId);
      }
      await AsyncStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(newLikesList));

    } catch (error) {
      console.error('Firestore Like Failed:', error);
      // In a real app, you would revert the optimistic state here
    }
  }, [discoveries, loadLocalLikes]);

  const handleShare = useCallback(async (post) => {
    const message = `Check out ${post.userName}'s Pokémon Discovery: "${post.content}" #PokeExplorer #Pokemon`;
    const shareOptions = {
      title: 'Share Pokémon Discovery',
      message: message,
      failOnCancel: false,
      ...(post.photo && { url: post.photo })
    };

    try {
      await Share.open(shareOptions);
    } catch (error) {
      if (!error.message.includes('User did not share')) {
        Alert.alert('Share Failed', 'Could not open sharing options.');
      }
    }
  }, []);

  const requestStoragePermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
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

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      quality: 0.8,
      // FIX: Removed 'selectionLimit: 1' to resolve 'No Activity Found' error
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Image Picker Error', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        setNewPostImageUri(response.assets[0].uri);
      }
    });
  }, [requestStoragePermission]);

  // ------------------------------------
  // 3. EFFECT HOOKS (TOP LEVEL)
  // ------------------------------------

  // SEEDING CHECK (Run ONCE on mount, independent of the listener)
  useEffect(() => {
    const checkAndSeed = async () => {
      const snap = await firestore().collection(DISCOVERIES_COLLECTION).limit(1).get();
      if (snap.empty) {
        console.log("Seeding Database...");
        const batch = firestore().batch();
        INITIAL_STATIC_DISCOVERIES.forEach((post) => {
          const docRef = firestore().collection(DISCOVERIES_COLLECTION).doc(post.id);
          batch.set(docRef, post);
        });
        await batch.commit();
      }
    };
    checkAndSeed();
  }, []); // Empty dependency array ensures it runs only once

  // REAL-TIME LISTENER
  useEffect(() => {
    const unsubscribe = firestore()
      .collection(DISCOVERIES_COLLECTION)
      .orderBy('timestamp', 'desc')
      .onSnapshot(
        async (querySnapshot) => {
          if (!querySnapshot) return;
          
          const likedIds = await loadLocalLikes();
          const loadedPosts = [];

          querySnapshot.forEach((documentSnapshot) => {
            const postData = documentSnapshot.data();
            let postTimestamp = Date.now();

            if (postData.timestamp?.toDate) {
              postTimestamp = postData.timestamp.toDate().getTime();
            } else if (typeof postData.timestamp === 'number') {
              postTimestamp = postData.timestamp;
            }

            loadedPosts.push({
              id: documentSnapshot.id,
              ...postData,
              timestamp: postTimestamp,
              likedByCurrentUser: likedIds.includes(documentSnapshot.id),
              comments: postData.comments || [],
              likesCount: postData.likesCount || 0,
              content: postData.content || '',
              photo: postData.photo || null,
              profilePhoto: postData.profilePhoto || null,
              userName: postData.userName || 'Anonymous',
            });
          });

          setDiscoveries(loadedPosts);
          setIsLoading(false);
        },
        (error) => {
          console.error('Firestore Error:', error);
          setIsLoading(false);
        }
      );

    return () => unsubscribe();
  }, [loadLocalLikes]);

  // ------------------------------------
  // 4. POST HANDLER
  // ------------------------------------
  const handlePostDiscovery = async () => {
    if (!newPost.trim() && !newPostImageUri) {
      Alert.alert('Cannot Post', 'Please enter content or select a photo.');
      return;
    }

    setIsPosting(true);

    try {
      let downloadUrl = null;

      if (newPostImageUri) {
        const filename = newPostImageUri.substring(newPostImageUri.lastIndexOf('/') + 1);
        const storageRef = storage().ref(`discoveries/${Date.now()}_${filename}`);
        
        // Safer URI handling for Android Storage Uploads
        let uploadUri = newPostImageUri;
        if (Platform.OS === 'android' && !uploadUri.startsWith('content://') && !uploadUri.startsWith('file://')) {
             uploadUri = 'file://' + uploadUri;
        }

        await storageRef.putFile(uploadUri);
        downloadUrl = await storageRef.getDownloadURL();
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

      setNewPost('');
      setNewPostImageUri(null);
      Alert.alert('Success', 'Discovery posted!');

    } catch (error) {
      console.error('Post Error:', error);
      Alert.alert('Error', 'Failed to post discovery.');
    } finally {
      setIsPosting(false);
    }
  };

  // ------------------------------------
  // 5. CONDITIONAL RENDER
  // ------------------------------------
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ImageBackground source={require('../assets/test2.png')} style={styles.background} blurRadius={1}>
      <View style={styles.backdropOverlay} />
      <GlobalHeader />
      <View style={styles.container}>
        
        {/* INPUT BOX */}
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
            disabled={isPosting}
          >
            <Text style={styles.imageSelectBtnText}>
              {newPostImageUri ? '✅ Image Selected' : 'Select Image'}
            </Text>
            {newPostImageUri && <Text style={styles.imageSelectBtnTextSecondary}>(Tap to change)</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.postBtn, isPosting && styles.disabledPostBtn]}
            onPress={handlePostDiscovery}
            disabled={isPosting || (!newPost.trim() && !newPostImageUri)}
          >
            <Text style={styles.postBtnText}>{isPosting ? 'Posting...' : 'Post Discovery'}</Text>
          </TouchableOpacity>
        </View>

        {/* FEED */}
        <FlatList
          data={discoveries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DiscoveryCard 
              post={item} 
              onLike={handleLike} 
              onShare={handleShare} 
            />
          )}
          contentContainerStyle={{ paddingBottom: 60 }}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
        
        <BottomNav />
      </View>
    </ImageBackground>
  );
};

// --- STYLES ---
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
  card: { backgroundColor: '#fff', marginBottom: 10, padding: 12, borderRadius: 8, elevation: 2 },
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