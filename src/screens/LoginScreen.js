import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Dimensions, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import auth from '@react-native-firebase/auth';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    try {
      await auth().signInWithEmailAndPassword(email, password);
      Alert.alert('Success', 'Welcome back, Trainer!');
      // Navigate to your main Home/Pokedex screen here
      // navigation.replace('Pokedex');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* --- Pokedex Header --- */}
      <View style={styles.header}>
        <View style={styles.blueLensOuter}>
          <View style={styles.blueLensInner} />
          <View style={styles.lensHighlight} />
        </View>
        <View style={styles.lightsContainer}>
          <View style={[styles.light, { backgroundColor: '#A8030A' }]} />
          <View style={[styles.light, { backgroundColor: '#FFDE00' }]} />
          <View style={[styles.light, { backgroundColor: '#3B4CCA' }]} />
        </View>
      </View>
    <Image source={require('../assets/testline.png')}
          style={styles.headerImg}
    />
      {/* --- Main Content --- */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.titleWrapper}>
  <Text style={[styles.titleOutline, { top: 3, left: 0 }]}>PokeExp</Text>
  <Text style={[styles.titleOutline, { top: -3, left: 0 }]}>PokeExp</Text>
  <Text style={[styles.titleOutline, { top: 0, left: 3 }]}>PokeExp</Text>
  <Text style={[styles.titleOutline, { top: 0, left: -3 }]}>PokeExp</Text>

  <Text style={styles.title}>PokeExp</Text>
</View>


        <View style={styles.imageContainer}>
           {/* Make sure to add your image to src/assets */}
           <Image
             source={require('../assets/pikachu_login.png')}
             style={styles.pokemonImage}
             resizeMode="contain"
           />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#ff7e7e"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#ff7e7e"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.forgotContainer}>
          <Text style={styles.forgotPass}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>

    <Image source={require('../assets/tesline2.png')}
            style={{bottom: 20,}}
    />

      {/* --- Footer Navigation --- */}
      <TouchableOpacity
        style={styles.footer}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.footerText}>No account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF0000', // Pokedex Red
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  headerImg: {
    bottom: 30,
  },
  // The Big Blue Circle
  blueLensOuter: {
    width: 80,
    height: 80,
    borderRadius: 100,
    backgroundColor: '#4967a4ff', // Dark Blue border
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  blueLensInner: {
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: '#28AAFD', // Light Blue
  },
  lensHighlight: {
    position: 'absolute',
    bottom: 10,
    left: 30,
    width: 20,
    height: 20,
    borderRadius: 100,
    backgroundColor: '#8CD5FF', // Glint/Reflection
    opacity: 0.6,
  },
  // The 3 Small Lights
  lightsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  light: {
    width: 25,
    height: 25,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FFF',
    marginRight: 5,
  },
  // Content
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  titleWrapper: {
    position: 'relative',
    marginBottom: 0,  
  },

  titleOutline: {
    position: 'absolute',
    fontSize: 120,
    fontWeight: 'normal',
    color: '#3B4CCA',
    letterSpacing: 1.5,
    fontFamily: 'BrickSans-Bold',
  },

  // Keep your original title but remove marginBottom because wrapper handles it
  title: {
    fontSize: 120,
    fontWeight: 'normal',
    color: '#FFDE00',
    fontFamily: 'BrickSans-Bold',
    textShadowOffset: { width: 4, height: 4 },
    letterSpacing: 1.5,  
    textShadowRadius: 2,
  },
  imageContainer: {
    backgroundColor: '#FFF',
    padding: 10,
    borderWidth: 4,
    borderColor: '#FFF',
    marginBottom: 30,
  },
  pokemonImage: {
    width: 150,
    height: 100,
    backgroundColor: '#8FACD6', // Blue background inside picture
  },
  input: {
    width: '95%',
    backgroundColor: '#532221', // Dark Brown/Black
    borderRadius: 5, // Rounded corners
    padding: 20,
    color: '#FFF',
    fontSize: 20,
    marginBottom: 25,
    fontFamily: 'BrickSans-Bold',
    letterSpacing: 1.5,    
    elevation: 6,
  },
  forgotPass: {
    color: '#FFDE00',
    letterSpacing: 1.2,
    bottom: 10,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: 'normal',
    fontFamily: 'BrickSans-Bold',
  },
  forgotContainer: {
    width: '100%',
    alignItems: 'flex-end',
    paddingRight: 15,
  },
  loginBtn: {
    backgroundColor: '#3B4CCA', // Button Blue
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 5,
    marginTop: 10,
    elevation: 6,
  },
  loginText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'normal',
    fontFamily: 'BrickSans-Bold',
    letterSpacing: 1.2,
  },
  footer: {
    bottom: 25,
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#FFDE00',
    fontSize: 28,
    fontWeight: 'normal',
    fontFamily: 'BrickSans-Bold',
  },
});

export default LoginScreen;