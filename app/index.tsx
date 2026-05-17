import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getHistory, HistoryEntry } from '@/store/historyStore';

function ScoreChip({ label, value }: { label: string; value?: string }) {
  if (!value || value === 'N/A') return null;
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function HistoryCard({ entry, onPress }: { entry: HistoryEntry; onPress: () => void }) {
  const { ratings } = entry;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {ratings.poster ? (
        <Image source={{ uri: ratings.poster }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={styles.posterPlaceholderText}>🎬</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{ratings.title}</Text>
        <Text style={styles.cardMeta}>
          {ratings.year} · {ratings.type === 'series' ? 'TV Series' : 'Film'}
        </Text>
        <View style={styles.chips}>
          <ScoreChip label="IMDb" value={ratings.imdbRating} />
          <ScoreChip label="RT" value={ratings.rottenTomatoes} />
          <ScoreChip label="Meta" value={ratings.metacritic} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const data = await getHistory();
    setHistory(data);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>CineScope</Text>
        <Text style={styles.tagline}>Instant ratings from your screen</Text>
      </View>

      {/* Scan CTA */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/scanner')}
        activeOpacity={0.85}
      >
        <Text style={styles.scanIcon}>⬤</Text>
        <Text style={styles.scanLabel}>Scan Screen</Text>
        <Text style={styles.scanSub}>Point at any streaming grid or carousel</Text>
      </TouchableOpacity>

      {/* Recent scans */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {history.length > 0 ? 'Recently Scanned' : ''}
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <HistoryCard
            entry={item}
            onPress={() =>
              router.push({ pathname: '/rating', params: { data: JSON.stringify(item.ratings) } })
            }
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#555" />}
        ListEmptyComponent={
          <Text style={styles.empty}>Scan a streaming screen to see ratings here.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { paddingTop: 64, paddingHorizontal: 24, paddingBottom: 24 },
  logo: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: '#555', fontSize: 14, marginTop: 4 },

  scanButton: {
    marginHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  scanIcon: { color: '#e50914', fontSize: 28, marginBottom: 8 },
  scanLabel: { color: '#000', fontSize: 20, fontWeight: '700' },
  scanSub: { color: '#555', fontSize: 13, marginTop: 4, textAlign: 'center' },

  section: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  list: { paddingHorizontal: 24, paddingBottom: 40 },
  empty: { color: '#444', fontSize: 14, textAlign: 'center', marginTop: 40 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  poster: { width: 70, height: 100 },
  posterPlaceholder: { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  posterPlaceholderText: { fontSize: 24 },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cardMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: {
    backgroundColor: '#222',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  chipLabel: { color: '#888', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipValue: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 1 },
});
