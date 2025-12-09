import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

const SearchBar = ({ value, onChangeText }) => {
  return (
    <TextInput
      style={styles.searchBar}
      placeholder="Search..."
      placeholderTextColor="#3B4CCA"
      value={value}
      onChangeText={onChangeText}
    />
  );
};

const styles = StyleSheet.create({
  searchBar: {
    width: '95%',
    alignSelf: 'center',
    marginTop: 15,
    marginBottom: 30,
    backgroundColor: '#f2f2f3',
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 15,
    color: '#3B4CCA',
    fontSize: 24,
    letterSpacing: 1.2,
    fontFamily: 'BrickSans-Bold',
    elevation: 10,
  },
});

export default SearchBar;
