import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
// Import the SAME styles from LoginScreen to keep it consistent
// Or copy-paste the style object if you aren't using a shared style file yet.

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      await auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Success', 'Account created! Please Login.');
      navigation.navigate('Login');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Error', 'That email address is already in use!');
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  // Re-use the styles from LoginScreen (copy them here)
  // Just change the Image source to Bulbasaur
  // Change Button Text to "Register"
  // Change Footer to "Have an account? Login"

  return (
    <View style={styles.container}>
       {/* --- Pokedex Header --- */}
             <View style={styles.header}>
               <View style={styles.blueLensOuter}>
                 <View style={styles.blueLensInner} />
                 <View style={styles.lensHighlight} />
               </View>
               <View style={styles.lightsContainer}>
                 <View style={[styles.light, { backgroundColor: '#FF0000' }]} />
                 <View style={[styles.light, { backgroundColor: '#FFDE00' }]} />
                 <View style={[styles.light, { backgroundColor: '#3B4CCA' }]} />
               </View>
             </View>

       <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        <Text style={styles.title}>PokeExp</Text>

        <View style={styles.imageContainer}>
           <Image
             source={require('../assets/bulbasaur_register.png')}
             style={styles.pokemonImage}
             resizeMode="contain"
           />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#FF6B6B"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#FF6B6B"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Register Button */}
        <TouchableOpacity style={styles.loginBtn} onPress={handleRegister}>
          <Text style={styles.loginText}>Register</Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>

      <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.footerText}>Have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DC0A2D', // Pokedex Red
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  // The Big Blue Circle
  blueLensOuter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#143B88', // Dark Blue border
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  blueLensInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#28AAFD', // Light Blue
  },
  lensHighlight: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8CD5FF', // Glint/Reflection
    opacity: 0.6,
  },
  // The 3 Small Lights
  lightsContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  light: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
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
  title: {
    fontSize: 98,
    fontWeight: 'normal',
    color: '#FFDE00', // Pokemon Yellow
    textShadowColor: '#2B62C6', // Blue Shadow
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 2,
    marginBottom: 20,
    fontFamily: 'BrickSans-Bold', // Uncomment if you add a custom font
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
    width: '100%',
    backgroundColor: '#2C2C2C', // Dark Brown/Black
    borderRadius: 15, // Rounded corners
    padding: 15,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#1E1E1E',
  },
  forgotPass: {
    color: '#FFDE00',
    alignSelf: 'flex-end',
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 'normal',
    fontFamily: 'BrickSans-Bold',
  },
  loginBtn: {
    backgroundColor: '#3B4CCA', // Button Blue
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1D2C5E',
    marginTop: 10,
    elevation: 5,
  },
  loginText: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'normal',
    fontFamily: 'BrickSans-Bold',
  },
  footer: {
    padding: 20,
    backgroundColor: '#AA0621', // Darker red footer
    alignItems: 'center',
  },
  footerText: {
    color: '#FFDE00',
    fontSize: 28,
    fontWeight: 'normal',
    fontFamily: 'BrickSans-Bold',
  },
});

export default RegisterScreen;