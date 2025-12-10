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
  // Removed unused imports: ScrollView
  Alert,
  ActivityIndicator, // Added for loading state
} from 'react-native';

// --- REQUIRED EXTERNAL LIBRARIES ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';

// Assuming these components exist
import BottomNav from '../components/BottomNav'; 
import GlobalHeader from '../components/GlobalHeader'; 

// --- ASYNC STORAGE KEYS ---
const POSTS_STORAGE_KEY = '@DiscoveryPosts';
const LIKES_STORAGE_KEY = '@LikedPostIds';

// --- INITIAL STATIC DATA (used only on first run) ---
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
    likedByCurrentUser: false, // Will be overridden by AsyncStorage
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
    likedByCurrentUser: false, // Will be overridden by AsyncStorage (was true before)
    photo: null, 
    profilePhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/120.png',
  },
  {
    id: '3',
    userName: 'Brock',
    timestamp: Date.now() - 7200000,
    content: 'Cooked a mean stew with my Onix around.',
    likesCount: 5,
    comments: [{ user: 'Ash', text: 'Yum!', timestamp: Date.now() - 7100000 }],
    likedByCurrentUser: false, // Will be overridden by AsyncStorage
    photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/95.png', 
    profilePhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/74.png',
  },
];

const GlobalScreen = () => {
  const [discoveries, setDiscoveries] = useState([]);
  const [newPost, setNewPost] = useState('');
  // New state for the image URI selected by the user
  const [newPostImageUri, setNewPostImageUri] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);

  // --- ASYNC STORAGE LOGIC ---
  
  // 1. Load initial data and likes on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load posts
        const storedPosts = await AsyncStorage.getItem(POSTS_STORAGE_KEY);
        let initialPosts = storedPosts ? JSON.parse(storedPosts) : INITIAL_STATIC_DISCOVERIES;

        // Load liked IDs
        const storedLikes = await AsyncStorage.getItem(LIKES_STORAGE_KEY);
        const likedIds = storedLikes ? JSON.parse(storedLikes) : [];
        
        // Reconcile likes with posts
        initialPosts = initialPosts.map(post => ({
          ...post,
          // Use stored like state for existing posts, or initialize new posts to false
          likedByCurrentUser: likedIds.includes(post.id) || post.likedByCurrentUser,
        }));

        setDiscoveries(initialPosts);
      } catch (e) {
        console.error("Failed to load data from storage:", e);
        // Fallback to static data if storage fails
        setDiscoveries(INITIAL_STATIC_DISCOVERIES);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. Save posts whenever the 'discoveries' state changes
  useEffect(() => {
    if (!isLoading) { // Don't save on initial load
      const savePosts = async () => {
        try {
          await AsyncStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(discoveries));
        } catch (e) {
          console.error("Failed to save posts to storage:", e);
        }
      };
      savePosts();
    }
  }, [discoveries, isLoading]);

  // 3. Like/Unlike handler (updates posts AND saves liked IDs)
  const handleLike = useCallback(async (postId) => {
    let updatedLikes = [];
    
    setDiscoveries((prev) => {
      const newDiscoveries = prev.map((post) => {
        if (post.id === postId) {
          const liked = !post.likedByCurrentUser;
          return {
            ...post,
            likedByCurrentUser: liked,
            likesCount: liked ? post.likesCount + 1 : post.likesCount - 1,
          };
        }
        return post;
      });
      
      // Determine the set of liked IDs
      updatedLikes = newDiscoveries
        .filter(post => post.likedByCurrentUser)
        .map(post => post.id);

      return newDiscoveries;
    });

    try {
      // Save the updated set of liked IDs
      await AsyncStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updatedLikes));
    } catch (e) {
      console.error("Failed to save liked IDs:", e);
    }
  }, []);

  // --- IMAGE PICKER LOGIC ---
  const selectImage = useCallback(() => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 200,
      maxWidth: 200,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Image Picker Error', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setNewPostImageUri(uri);
        console.log('Image URI:', uri);
      }
    });
  }, []);


  // --- UPDATED POST HANDLER ---
  const handlePostDiscovery = () => {
    if (!newPost.trim() && !newPostImageUri) {
      Alert.alert('Cannot Post', 'Please enter some content or select a photo.');
      return;
    }

    const newId = Date.now().toString(); // Use timestamp as unique ID for new posts

    const newDiscovery = {
      id: newId,
      userName: 'You',
      timestamp: Date.now(),
      content: newPost.trim(),
      likesCount: 0,
      comments: [],
      likedByCurrentUser: false,
      photo: newPostImageUri, // Use the local URI from the image picker
      // Placeholder photo for the current user ("You")
      profilePhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/6.png', 
    };

    // Prepend the new post to the list
    setDiscoveries((prev) => [newDiscovery, ...prev]);

    // Clear inputs
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
            <Text style={styles.timestamp}>{new Date(post.timestamp).toLocaleDateString()}</Text>
          </View>
        </View>

        {post.photo && (
          <Image
            source={{ uri: post.photo }}
            style={styles.photo}
            resizeMode="cover" // Changed to cover for potentially non-URL images
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
          placeholder="Share your discovery (text)..."
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

// --- UPDATED STYLES ---
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
  // --- New Styles for Image Picker Button ---
  imageSelectBtn: {
    backgroundColor: '#fdd400', // Green for selection
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 8,
  },
  imageSelectedBtn: {
    backgroundColor: '#007AFF', // Blue after selection
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
  // --- End New Styles ---
  postBtn: {
    backgroundColor: '#FF3B30', // Changed Post button color for contrast
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