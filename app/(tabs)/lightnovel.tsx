import React, { useState } from 'react'
import {
  View, Text, FlatList, Pressable,
  StyleSheet, ActivityIndicator, StatusBar, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import MediaCard, { MediaItem } from '@/components/MediaCard'
import { searchLightNovel } from '@/services/consumet'
import { useDebounce } from '@/hooks/useDebounce'

const ACCENT = '#D4860A'

// Popular light novel series to show by default
const DEFAULT_QUERIES = [
  'Sword Art Online',
  'Re:Zero',
  'Overlord',
  'Mushoku Tensei',
]

function normalise(item: any): MediaItem {
  return {
    id:         item.id ?? item.title ?? Math.random().toString(),
    title:      item.title ?? 'Unknown',
    coverImage: item.image ?? item.cover ?? '',
    type:       'lightnovel',
    raw:        item,
  }
}

export default function LightNovelScreen() {
  const [search, setSearch] = useState('')
  const [activeDefault, setActiveDefault] = useState(DEFAULT_QUERIES[0])
  const debouncedSearch = useDebounce(search, 500)

  const isSearching = debouncedSearch.length > 1

  // Default browsing: cycle through popular titles
  const { data: defaultData, isLoading: defaultLoading } = useQuery({
    queryKey: ['ln', 'default', activeDefault],
    queryFn:  () => searchLightNovel(activeDefault),
    enabled:  !isSearching,
  })

  // User search
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['ln', 'search', debouncedSearch],
    queryFn:  () => searchLightNovel(debouncedSearch),
    enabled:  isSearching,
  })

  const rawData  = isSearching ? searchData : defaultData
  const loading  = isSearching ? searchLoading : defaultLoading
  const results = (rawData?.results ?? []).map(normalise) as MediaItem[]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Read</Text>
          <Text style={styles.headerTitle}>Light Novels</Text>
        </View>
        <Ionicons name="book" size={26} color={ACCENT} style={{ opacity: 0.7 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={15} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search light novels…"
          placeholderTextColor="rgba(255,255,255,0.28)"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor={ACCENT}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
          </Pressable>
        )}
      </View>

      {/* Quick browse pills (hidden when searching) */}
      {!isSearching && (
        <FlatList
          data={DEFAULT_QUERIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={q => q}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersRow}
          renderItem={({ item: q }) => {
            const active = activeDefault === q
            return (
              <Pressable
                onPress={() => setActiveDefault(q)}
                style={[styles.pill, active && { backgroundColor: ACCENT, borderColor: ACCENT }]}
              >
                <Text style={[styles.pillText, active && { color: '#fff', fontWeight: '600' }]}>
                  {q}
                </Text>
              </Pressable>
            )
          }}
        />
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={[styles.loadingText, { color: ACCENT }]}>Fetching novels…</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="library-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.errorText}>
            {isSearching ? 'No results found.' : 'Could not load novels.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MediaCard item={item} variant="landscape" style={styles.card} />
          )}
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 12,
    paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 0 },
  filtersRow: { flexGrow: 0, marginBottom: 12 },
  filtersContainer: { paddingHorizontal: 16, gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {},
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  errorText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
})