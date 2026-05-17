import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MovieRatings } from '../types';

interface Props {
  ratings: MovieRatings | null;
  loading: boolean;
  error: string | null;
  onDismiss: () => void;
}

function scoreColor(value: string): string {
  const num = parseInt(value, 10);
  if (isNaN(num)) return '#fff';
  if (num >= 70) return '#4CAF50';
  if (num >= 50) return '#FF9800';
  return '#F44336';
}

export function RatingCard({ ratings, loading, error, onDismiss }: Props) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.dismiss} onPress={onDismiss}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color="#fff" style={{ marginVertical: 16 }} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {ratings && (
        <>
          <Text style={styles.title}>{ratings.title}</Text>
          <Text style={styles.meta}>
            {ratings.year} · {ratings.type === 'series' ? 'TV Series' : 'Film'}
          </Text>

          <View style={styles.scores}>
            {ratings.imdbRating !== 'N/A' && (
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>IMDb</Text>
                <Text style={styles.scoreValue}>{ratings.imdbRating}</Text>
              </View>
            )}
            {ratings.rottenTomatoes && (
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>RT</Text>
                <Text style={[styles.scoreValue, { color: scoreColor(ratings.rottenTomatoes) }]}>
                  {ratings.rottenTomatoes}
                </Text>
              </View>
            )}
            {ratings.metacritic && ratings.metacritic !== 'N/A' && (
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Metacritic</Text>
                <Text style={[styles.scoreValue, { color: scoreColor(ratings.metacritic) }]}>
                  {ratings.metacritic}
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(10,10,10,0.92)',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dismiss: { position: 'absolute', top: 12, right: 12, padding: 4 },
  dismissText: { color: '#888', fontSize: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 4, paddingRight: 24 },
  meta: { color: '#888', fontSize: 13, marginTop: 4 },
  scores: { flexDirection: 'row', marginTop: 16, gap: 24 },
  scoreItem: { alignItems: 'center' },
  scoreLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValue: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  error: { color: '#FF6B6B', fontSize: 14, paddingVertical: 8 },
});
