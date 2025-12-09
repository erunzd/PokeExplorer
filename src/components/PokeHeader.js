import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PokeHeader = ({ title }) => {
  return (
    <View style={styles.header}>
        <View style={styles.titleWrapper}>
            <Text style={[styles.titleOutline, { top: 3, left: 0 }]}>PokeDex</Text>
            <Text style={[styles.titleOutline, { top: -3, left: 0 }]}>PokeDex</Text>
            <Text style={[styles.titleOutline, { top: 0, left: 3 }]}>PokeDex</Text>
            <Text style={[styles.titleOutline, { top: 0, left: -3 }]}>PokeDex</Text>

            <Text style={styles.title}>PokeDex</Text>
        </View>

        <View style={styles.leftLights}>
            <View style={[styles.light, { backgroundColor: '#A8030A' }]} />
            <View style={[styles.light, { backgroundColor: '#FFDE00' }]} />
            <View style={[styles.light, { backgroundColor: '#3B4CCA' }]} />
        </View>

    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 65,
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FF0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 120,
    borderBottomWidth: 15,
    borderColor: '#532221',
  },
  leftLights: {
    flexDirection: 'row',    
  },
  light: {
    width: 30,
    height: 30,
    borderRadius: 100,
    marginLeft: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  titleWrapper: {
    position: 'relative',
  },

  titleOutline: {
    position: 'absolute',
    fontSize: 40,
    fontWeight: 'normal',
    color: '#3B4CCA',
    letterSpacing: 1.5,
    fontFamily: 'BrickSans-Bold',
  },

  // Keep your original title but remove marginBottom because wrapper handles it
  title: {
    fontSize: 40,
    fontWeight: 'normal',
    color: '#FFDE00',
    fontFamily: 'BrickSans-Bold',
    textShadowOffset: { width: 4, height: 4 },
    letterSpacing: 1.5,  
    textShadowRadius: 2,
  },
});

export default PokeHeader;
