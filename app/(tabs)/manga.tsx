import React, { useState } from 'react'
import {
  View, Text, FlatList, Pressable,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import MediaCard, { MediaItem } from '@/components/MediaCard'
import { getTrending } from '@/services/anilist'
import { searchManga } from '@/services/mangadex'

const ACCENT = '#16A881'
const FILTERS = ['Trending', 'Popular', 'Top Rated'] as const
type Filter = typeof FILTERS[number]

const SORT_MAP: Record<Filter, string> = {
  Trending:    'TRENDING_DESC',
  Popular:     'POPULARITY_DESC',
  'Top Rated': 'SCORE_DESC',
}

// Normalise Anilist manga response
function normaliseAnilist(item: any): MediaItem {
  return {
    id:         item.id,
    title:      item.title?.english ?? item.title?.romaji ?? 'Unknown',
    coverImage: item.coverImage?.large ?? '',
    type:       'manga',
    score:      item.averageScore,
    chapters:   item.chapters,
    genres:     item.genres ?? [],
    raw:        item,
  }
}

export default function MangaScreen() {
  const [filter, setFilter] = useState<Filter>('Trending')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['manga', filter],
    queryFn: () => getTrending('MANGA', SORT_MAP[filter]),
  })

  const items: MediaItem[] = (data ?? []).map(normaliseAnilist)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Browse</Text>
          <Text style={styles.headerTitle}>Manga</Text>
        </View>
        <Pressable
          onPress={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
          style={styles.viewBtn}
        >
          <Ionicons
            name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
            size={20}
            color="rgba(255,255,255,0.6)"
          />
        </Pressable>
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

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={[styles.loadingText, { color: ACCENT }]}>Loading manga…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.errorText}>Failed to load. Check your connection.</Text>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={items}
          keyExtractor={i => String(i.id)}
          numColumns={viewMode === 'grid' ? 2 : 1}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MediaCard
              item={item}
              variant={viewMode === 'grid' ? 'portrait' : 'landscape'}
              style={viewMode === 'grid' ? styles.gridCard : styles.listCard}
            />
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
  viewBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  filtersRow: { flexGrow: 0, marginBottom: 12 },
  filtersContainer: { paddingHorizontal: 16, gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  gridCard: { flex: 1, margin: 6 },
  listCard: { marginHorizontal: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  errorText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
})