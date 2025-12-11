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
} from 'react-native';

// --- REQUIRED EXTERNAL LIBRARIES ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';

// 🚨 FIREBASE IMPORTS 🚨
import { firestore, storage } from '../config/firebaseConfig';

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

const GlobalScreen = () => {
  // ------------------------------------
  // 1. STATE HOOKS (MUST be declared first)
  // ------------------------------------
  const [discoveries, setDiscoveries] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [newPostImageUri, setNewPostImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  // ------------------------------------------------------------------
  // 2. CALLBACK HOOKS (Declared next, FIXES HOOK ORDERING VIOLATION)
  // ------------------------------------------------------------------

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
    const postToLike = discoveries.find(p => p.id === postId);
    if (!postToLike) return;

    const firestoreInstance = firestore();

    const action = postToLike.likedByCurrentUser ? -1 : 1;
    let updatedLikes = [];

    // Optimistic Local State Update
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
        .filter(post => post.likedByCurrentUser)
        .map(post => post.id);

      return newDiscoveries;
    });

    // Atomic Firestore Update
    firestoreInstance
        .collection(DISCOVERIES_COLLECTION)
        .doc(postId)
        .update({
            likesCount: firestoreInstance.FieldValue.increment(action)
        })
        .then(() => {
            AsyncStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updatedLikes));
        })
        .catch((error) => {
            console.error('Firestore Like Failed:', error);
            Alert.alert('Error', 'Failed to update like count.');
        });
  }, [discoveries]);


  const handleShare = useCallback(async (post) => {
    const message = `Check out ${post.userName}'s Pokémon Discovery: "${post.content}" #PokeExplorer #Pokemon`;

    const shareOptions = {
        title: 'Share Pokémon Discovery',
        message: message,
        failOnCancel: false,
    };

    let photoUrl = post.photo;

    if (photoUrl && (photoUrl.startsWith('file://') || photoUrl.startsWith('content://'))) {
        shareOptions.url = photoUrl;
    }

    try {
        await Share.open(shareOptions);
    } catch (error) {
        if (!error.message.includes('User did not share')) {
             Alert.alert('Share Failed', 'Could not open sharing options.');
        }
    }
  }, []);


  const selectImage = useCallback(() => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setNewPostImageUri(uri);
      } else if (response.errorMessage) {
          Alert.alert('Image Error', response.errorMessage);
      }
    });
  }, []);


  // ------------------------------------
  // 3. EFFECT HOOKS (Declared next)
  // ------------------------------------
  useEffect(() => {
    const firestoreInstance = firestore();

    const unsubscribe = firestoreInstance
        .collection(DISCOVERIES_COLLECTION)
        .orderBy('timestamp', 'desc')
        .onSnapshot(async (querySnapshot) => {
            const likedIds = await loadLocalLikes();
            const loadedPosts = [];

            querySnapshot.forEach(documentSnapshot => {
                const postData = documentSnapshot.data();

                // 🌟 FIX: Defensive Timestamp Conversion 🌟
                let postTimestamp;

                if (postData.timestamp && typeof postData.timestamp.toDate === 'function') {
                    // Case 1: Firestore Timestamp object
                    postTimestamp = postData.timestamp.toDate().getTime();
                } else if (typeof postData.timestamp === 'number') {
                    // Case 2: Standard JavaScript number (from seed data)
                    postTimestamp = postData.timestamp;
                } else {
                    // Fallback (if serverTimestamp() is still pending or invalid)
                    postTimestamp = Date.now();
                }

                loadedPosts.push({
                    id: documentSnapshot.id,
                    ...postData,
                    timestamp: postTimestamp,
                    likedByCurrentUser: likedIds.includes(documentSnapshot.id),
                });
            });

            // Seed database if empty
            if (loadedPosts.length === 0) {
                 INITIAL_STATIC_DISCOVERIES.forEach(post => {
                    firestoreInstance.collection(DISCOVERIES_COLLECTION).doc(post.id).set(post);
                });
            }

            setDiscoveries(loadedPosts);
            setIsLoading(false);
        },
        (error) => {
            console.error("Firestore Listener Failed:", error);
            setIsLoading(false);
            Alert.alert('Data Error', 'Failed to load community feed.');
        });

    return () => unsubscribe();
  }, [loadLocalLikes]);


  // --- 4. POST HANDLER (Function definition) ---
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

      if (newPostImageUri) {
        // 1. Setup paths
        const filename = newPostImageUri.substring(newPostImageUri.lastIndexOf('/') + 1);
        const storageRef = storageInstance.ref(`discoveries/${Date.now()}_${filename}`);

        // 🌟 FIX: URI Cleaning for Storage Upload 🌟
        // Remove file:// prefix, which often causes putFile to fail (object-not-found error)
        let uploadUri = newPostImageUri;
        if (uploadUri.startsWith('file://')) {
            uploadUri = uploadUri.replace('file://', '');
        }

        console.log("Cleaned URI being used for upload:", uploadUri);

        // 2. Upload file
        await storageRef.putFile(uploadUri);
        console.log("File upload successful!");

        // 3. Get the public download URL
        downloadUrl = await storageRef.getDownloadURL();
        console.log("Download URL received:", downloadUrl);
      }

      // 4. Create the post data
      const newDiscoveryData = {
        userName: 'You',
        timestamp: firestoreInstance.FieldValue.serverTimestamp(),
        content: newPost.trim(),
        likesCount: 0,
        comments: [],
        photo: downloadUrl,
        profilePhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/6.png',
      };

      // 5. Post document to Firestore
      await firestoreInstance
          .collection(DISCOVERIES_COLLECTION)
          .add(newDiscoveryData);

      Alert.alert('Success!', 'Your discovery has been posted.');

    } catch (error) {
      console.error('Posting Error (Upload or Firestore):', error.message, error.code);

      if (error.code && error.code.includes('storage/unauthorized')) {
          Alert.alert('Post Failed: Permissions', 'Check your Firebase Storage Security Rules.');
      } else {
          Alert.alert('Post Error', `Failed to upload or post: ${error.message}`);
      }
    } finally {
      // 6. Cleanup
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
          <Image
            source={avatarSource}
            style={styles.avatar}
          />
          <View style={styles.headerText}>
            <Text style={styles.userName}>{post.userName}</Text>
            <Text style={styles.timestamp}>
                {new Date(post.timestamp).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {post.photo && (
          <Image
            source={{ uri: post.photo }}
            style={styles.photo}
            resizeMode="cover"
          />
        )}

        {post.content.trim() !== '' && <Text style={styles.content}>{post.content}</Text>}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => handleLike(post.id)}>
            <Text style={[styles.actionBtn, post.likedByCurrentUser && styles.liked]}>
              {post.likedByCurrentUser ? '❤️' : '♡'} {post.likesCount}
            </Text>
          </TouchableOpacity>

          <Text style={styles.actionBtn}>💬 {post.comments.length}</Text>

          <TouchableOpacity onPress={() => handleShare(post)}>
            <Text style={[styles.actionBtn, styles.shareBtn]}>
                🔗 Share
            </Text>
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
  };

  // ------------------------------------
  // 5. CONDITIONAL RENDER (AFTER ALL HOOKS)
  // ------------------------------------
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading Discoveries...</Text>
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
        <GlobalHeader />
        <View style={styles.container}>
      {/* NEW POST INPUT */}
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
          {newPostImageUri && (
            <Text style={styles.imageSelectBtnTextSecondary}>
                (Tap to change)
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.postBtn, isPosting && styles.disabledPostBtn]}
          onPress={handlePostDiscovery}
          disabled={isPosting}
        >
          <Text style={styles.postBtnText}>
            {isPosting ? 'Posting...' : 'Post Discovery'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
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

// --- STYLES ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  background: {
    flex: 1,
    width: '100%',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  postBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  imageSelectBtn: {
    backgroundColor: '#fdd400',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 8,
  },
  imageSelectedBtn: {
    backgroundColor: '#3b4cca',
  },
  imageSelectBtnText: {
    color: '#532221',
    // fontFamily: 'BrickSans-Bold',
    fontSize: 20,
  },
  imageSelectBtnTextSecondary: {
    color: '#fff',
    fontSize: 10,
  },
  postBtn: {
    backgroundColor: '#3b4cca',
    padding: 10,
    elevation: 6,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  disabledPostBtn: {
    opacity: 0.6,
  },
  postBtnText: {
    color: '#fff',
    // fontFamily: 'BrickSans-Bold',
    fontSize: 20,
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  header: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  headerText: { justifyContent: 'center' },
  userName: {
    // fontFamily: 'BrickSans-Bold',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  timestamp: { fontSize: 12, color: '#888' },
  photo: {
    width: '100%',
    height: 200,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  content: { fontSize: 14, marginBottom: 10, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 15, paddingVertical: 5 },
  actionBtn: { fontSize: 16, color: '#007AFF' },
  shareBtn: {
      color: '#00B8D9',
      fontWeight: '600',
  },
  liked: { fontWeight: 'bold', color: '#FF0000' },
  comments: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  comment: { fontSize: 12, color: '#555', marginBottom: 4 },
  commentUser: { fontWeight: 'bold' },
});

export default GlobalScreen;