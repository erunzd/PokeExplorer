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
} from 'react-native';

// --- REQUIRED EXTERNAL LIBRARIES ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';

// 🚨 FIREBASE IMPORTS 🚨
import { firestore } from '../config/firebaseConfig'; // <-- IMPORT FIRESTORE INSTANCE

// Assuming these components exist
import BottomNav from '../components/BottomNav';
import GlobalHeader from '../components/GlobalHeader';

// --- STORAGE KEYS & FIREBASE PATH ---
const LIKES_STORAGE_KEY = '@LikedPostIds';   // Local storage for tracking current user's likes
const DISCOVERIES_COLLECTION = 'discoveries'; // Firestore collection name

// --- INITIAL STATIC DATA (Used to seed the database if it's empty) ---
const INITIAL_STATIC_DISCOVERIES = [
  {
    id: '1',
    userName: 'Ash',
    // Firestore will replace this with a server timestamp upon seeding
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

  // --- 1. FIRESTORE LISTENER (Read Data) ---
  useEffect(() => {
    // Helper to load locally liked post IDs
    const loadLocalLikes = async () => {
        try {
            const storedLikes = await AsyncStorage.getItem(LIKES_STORAGE_KEY);
            return storedLikes ? JSON.parse(storedLikes) : [];
        } catch (e) {
            console.error("Failed to load local likes:", e);
            return [];
        }
    };

    // Setup Firestore listener for real-time updates
    const unsubscribe = firestore()
        .collection(DISCOVERIES_COLLECTION)
        .orderBy('timestamp', 'desc') // Order by latest post first
        .onSnapshot(async (querySnapshot) => {
            const likedIds = await loadLocalLikes();
            const loadedPosts = [];

            querySnapshot.forEach(documentSnapshot => {
                const postData = documentSnapshot.data();

                // Ensure timestamp exists before parsing (can be null during seeding)
                const postTimestamp = postData.timestamp ? postData.timestamp.toDate().getTime() : Date.now();

                loadedPosts.push({
                    id: documentSnapshot.id,
                    ...postData,
                    timestamp: postTimestamp, // Convert Firestore Timestamp object to JS ms
                    // Set local 'likedByCurrentUser' state
                    likedByCurrentUser: likedIds.includes(documentSnapshot.id),
                });
            });

            // Seed database if empty (optional, but ensures first run works)
            if (loadedPosts.length === 0) {
                 INITIAL_STATIC_DISCOVERIES.forEach(post => {
                    firestore().collection(DISCOVERIES_COLLECTION).doc(post.id).set(post);
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

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, []); // Empty dependency array means this runs only on mount/unmount


  // --- 2. LIKE/UNLIKE HANDLER (Update Data with Atomic Increment) ---
  const handleLike = useCallback(async (postId) => {
    const postToLike = discoveries.find(p => p.id === postId);
    if (!postToLike) return;

    const action = postToLike.likedByCurrentUser ? -1 : 1;
    let updatedLikes = [];

    // Optimistic Local State Update (updates the UI immediately)
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

    // Atomic Firestore Update (updates the global like count reliably)
    firestore()
        .collection(DISCOVERIES_COLLECTION)
        .doc(postId)
        .update({
            likesCount: firestore.FieldValue.increment(action)
        })
        .then(() => {
            // Save local liked IDs only after the cloud update is confirmed
            AsyncStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updatedLikes));
        })
        .catch((error) => {
            console.error('Firestore Like Failed:', error);
            // NOTE: If this fails, the Firebase listener will correct the local `likesCount`
            // on the next snapshot, but the `likedByCurrentUser` state might be wrong
            // until the user manually corrects it or restarts the app.
        });
  }, [discoveries]);


  // --- 3. SHARING LOGIC (External Feature) ---
  const handleShare = useCallback(async (post) => {
    const message = `Check out ${post.userName}'s Pokémon Discovery: "${post.content}" #PokeExplorer #Pokemon`;

    const shareOptions = {
        title: 'Share Pokémon Discovery',
        message: message,
        failOnCancel: false,
    };

    let photoUrl = post.photo;

    // Use local URI if available for direct sharing
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


  // --- 4. IMAGE PICKER LOGIC ---
  const selectImage = useCallback(() => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setNewPostImageUri(uri);
      }
    });
  }, []);


  // --- 5. POST HANDLER (Create Data) ---
  const handlePostDiscovery = () => {
    if (!newPost.trim() && !newPostImageUri) {
      Alert.alert('Cannot Post', 'Please enter some content or select a photo.');
      return;
    }

    const newDiscoveryData = {
      userName: 'You',
      // Guaranteed server-side timestamp
      timestamp: firestore.FieldValue.serverTimestamp(),
      content: newPost.trim(),
      likesCount: 0,
      comments: [],
      photo: newPostImageUri,
      profilePhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/6.png',
    };

    // Post to Firestore - listener handles the UI update
    firestore()
        .collection(DISCOVERIES_COLLECTION)
        .add(newDiscoveryData)
        .then(() => console.log('Post sent to Firestore!'))
        .catch(error => Alert.alert('Post Error', error.message));

    // Clear inputs immediately
    setNewPost('');
    setNewPostImageUri(null);
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
            {/* Display time formatted from JS Date object */}
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
          {/* Like Button */}
          <TouchableOpacity onPress={() => handleLike(post.id)}>
            <Text style={[styles.actionBtn, post.likedByCurrentUser && styles.liked]}>
              {post.likedByCurrentUser ? '❤️' : '♡'} {post.likesCount}
            </Text>
          </TouchableOpacity>

          {/* Comments Count */}
          <Text style={styles.actionBtn}>💬 {post.comments.length}</Text>

          {/* Share Button */}
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
      {/* NEW POST */}
      <View style={styles.postBox}>
        <TextInput
          style={styles.input}
          placeholder="Share your discovery..."
          value={newPost}
          onChangeText={setNewPost}
          multiline
        />

        {/* --- IMAGE PICKER BUTTON --- */}
        <TouchableOpacity
            style={[styles.imageSelectBtn, newPostImageUri && styles.imageSelectedBtn]}
            onPress={selectImage}
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

        <TouchableOpacity style={styles.postBtn} onPress={handlePostDiscovery}>
          <Text style={styles.postBtnText}>Post Discovery</Text>
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

// --- STYLES (No Change) ---
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
    fontFamily: 'BrickSans-Bold',
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
  postBtnText: {
    color: '#fff',
    fontFamily: 'BrickSans-Bold',
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
    fontFamily: 'BrickSans-Bold',
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