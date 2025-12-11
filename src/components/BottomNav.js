import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const BottomNav = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const items = [
    { key: 'Pokedex', label: 'PokeDex', routeName: 'Pokedex' },
    { key: 'Hunt', label: 'Hunt', routeName: 'Hunt' },    
    { key: 'AR', label: 'AR', routeName: 'AR' },    
    { key: 'Global', label: 'Global', routeName: 'Global' },
    { key: 'Profile', label: 'Profile', routeName: 'Profile' },        
  ];

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.nav}>
        {items.map(i => {
          const active = route.name === i.routeName;
          return (
            <TouchableOpacity
              key={i.key}
              style={styles.item}
              onPress={() => navigation.navigate(i.routeName)}
              activeOpacity={0.8}
            >
              <Text style={[styles.label, active ? styles.active : styles.inactive]}>{i.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
    pointerEvents: 'box-none',
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: '#532221',
    paddingVertical: 15,
    borderRadius: 5,
    width: '90%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
  },
  active: {
    color: '#f2f2f3',
  },
  inactive: {
    color: '#ff7e7e',
  },
});

export default BottomNav;
