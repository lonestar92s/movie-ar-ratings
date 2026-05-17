import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DetectedTitle } from '../types';

interface Props {
  titles: DetectedTitle[];
  onSelect: (title: string) => void;
  onDismiss: () => void;
  heading?: string;
}

export function TitlePicker({ titles, onSelect, onDismiss, heading = 'Detected titles' }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>{heading}</Text>
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        {titles.map((item, i) => (
          <TouchableOpacity key={i} style={styles.item} onPress={() => onSelect(item.text)}>
            <Text style={styles.itemText}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  heading: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancel: { color: '#888', fontSize: 15 },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  itemText: { color: '#fff', fontSize: 16 },
});
