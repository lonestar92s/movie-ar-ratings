import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MovieRatings } from '@/types';

function ScoreBlock({ label, value, color }: { label: string; value?: string; color?: string }) {
  if (!value || value === 'N/A') return null;
  return (
    <View style={styles.scoreBlock}>
      <Text style={[styles.scoreValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

function rtColor(value?: string): string {
  if (!value) return '#fff';
  const num = parseInt(value, 10);
  if (num >= 70) return '#4CAF50';
  if (num >= 50) return '#FF9800';
  return '#F44336';
}

export default function RatingScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const ratings: MovieRatings = JSON.parse(data);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Poster + title hero */}
      <View style={styles.hero}>
        {ratings.poster ? (
          <Image source={{ uri: ratings.poster }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={styles.posterPlaceholderText}>🎬</Text>
          </View>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.title}>{ratings.title}</Text>
          <Text style={styles.meta}>
            {ratings.year} · {ratings.type === 'series' ? 'TV Series' : 'Film'}
          </Text>
        </View>
      </View>

      {/* Scores */}
      <View style={styles.scoresRow}>
        <ScoreBlock label="IMDb" value={ratings.imdbRating} />
        <View style={styles.divider} />
        <ScoreBlock
          label="Rotten Tomatoes"
          value={ratings.rottenTomatoes}
          color={rtColor(ratings.rottenTomatoes)}
        />
        <View style={styles.divider} />
        <ScoreBlock label="Metacritic" value={ratings.metacritic} />
      </View>

      {/* All ratings detail */}
      {ratings.ratings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Ratings</Text>
          {ratings.ratings.map((r, i) => (
            <View key={i} style={styles.ratingRow}>
              <Text style={styles.ratingSource}>{r.source}</Text>
              <Text style={styles.ratingValue}>{r.value}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { paddingBottom: 60 },

  hero: { flexDirection: 'row', padding: 24, gap: 16, alignItems: 'flex-start' },
  poster: { width: 100, height: 148, borderRadius: 8 },
  posterPlaceholder: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  posterPlaceholderText: { fontSize: 36 },
  heroInfo: { flex: 1, paddingTop: 4 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28 },
  meta: { color: '#666', fontSize: 13, marginTop: 6 },

  scoresRow: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    marginHorizontal: 24,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  scoreBlock: { alignItems: 'center' },
  scoreValue: { color: '#fff', fontSize: 24, fontWeight: '800' },
  scoreLabel: { color: '#666', fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  divider: { width: 1, height: 36, backgroundColor: '#2a2a2a' },

  section: { marginTop: 32, marginHorizontal: 24 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  ratingSource: { color: '#888', fontSize: 14 },
  ratingValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
