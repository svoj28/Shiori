import React, { useState } from 'react'
import {
  View, Text, FlatList, Pressable,
  StyleSheet, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import MediaCard, { MediaItem } from '@/components/MediaCard'
import { getTrending } from '@/services/anilist'

const ACCENT = '#7C5CFC'

const FILTERS = ['Trending', 'Popular', 'Top Rated', 'Airing'] as const
type Filter = typeof FILTERS[number]

const SORT_MAP: Record<Filter, string> = {
  Trending:   'TRENDING_DESC',
  Popular:    'POPULARITY_DESC',
  'Top Rated':'SCORE_DESC',
  Airing:     'TRENDING_DESC',
}

function normalise(item: any): MediaItem {
  return {
    id:         item.id,
    title:      item.title?.english ?? item.title?.romaji ?? 'Unknown',
    coverImage: item.coverImage?.large ?? '',
    type:       'anime',
    score:      item.averageScore,
    episodes:   item.episodes,
    genres:     item.genres ?? [],
    raw:        item,
  }
}

export default function AnimeScreen() {
  const [filter, setFilter] = useState<Filter>('Trending')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['anime', filter],
    queryFn: () => getTrending('ANIME', SORT_MAP[filter]),
  })

  const items: MediaItem[] = (data ?? []).map(normalise)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Track your</Text>
          <Text style={styles.headerTitle}>Anime</Text>
        </View>
        <View style={[styles.accentDot, { backgroundColor: ACCENT }]} />
      </View>

      {/* Filter pills */}
      <FlatList
        data={FILTERS as unknown as Filter[]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={f => f}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersRow}
        renderItem={({ item: f }) => {
          const active = filter === f
          return (
            <Pressable
              onPress={() => setFilter(f)}
              style={[styles.pill, active && { backgroundColor: ACCENT, borderColor: ACCENT }]}
            >
              <Text style={[styles.pillText, active && { color: '#fff', fontWeight: '600' }]}>
                {f}
              </Text>
            </Pressable>
          )
        }}
      />

      {/* Grid */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={[styles.loadingText, { color: ACCENT }]}>Loading anime…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.errorText}>Failed to load. Check your connection.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MediaCard item={item} variant="portrait" style={styles.cardWrap} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.errorText}>No results found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0C0C18' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 0.3 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  accentDot: { width: 10, height: 10, borderRadius: 5 },
  filtersRow: { flexGrow: 0, marginBottom: 12 },
  filtersContainer: { paddingHorizontal: 16, gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  cardWrap: { flex: 1, margin: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  errorText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
})