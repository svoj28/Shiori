import React, { useState, useCallback } from 'react'
import {
  View, Text, Pressable, StyleSheet,
  FlatList, ActivityIndicator, Dimensions,
  StatusBar, TouchableOpacity,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { getChapterPages } from '@/services/mangadex'
import { WebView } from 'react-native-webview'

const { width: W } = Dimensions.get('window')
const ACCENT_MANGA = '#16A881'
const ACCENT_LN    = '#D4860A'

// ─── Page image ───────────────────────────────────────────────────────────────

function MangaPage({ uri }: { uri: string }) {
  const [imgH, setImgH] = useState(W * 1.4)
  return (
    <Image
      source={{ uri }}
      style={{ width: W, height: imgH }}
      contentFit="contain"
      onLoad={e => {
        const { width, height } = e.source
        if (width && height) setImgH((height / width) * W)
      }}
    />
  )
}

// ─── Main reader ──────────────────────────────────────────────────────────────

export default function ReaderScreen() {
  const router = useRouter()
  const {
    chapterId, chapterNum, mangaTitle, isLN, url,
  } = useLocalSearchParams<{
    chapterId:  string
    chapterNum: string
    mangaTitle: string
    isLN?:      string
    url?:       string
  }>()

  const [headerVisible, setHeaderVisible] = useState(true)
  const isLightNovel = isLN === 'true'
  const accent = isLightNovel ? ACCENT_LN : ACCENT_MANGA

  // Fetch MangaDex page URLs
  const { data: pages, isLoading, isError } = useQuery({
    queryKey: ['pages', chapterId],
    queryFn:  () => getChapterPages(chapterId),
    enabled:  !isLightNovel,
  })

  const toggleHeader = useCallback(() => setHeaderVisible(v => !v), [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" hidden={!headerVisible} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {headerVisible && (
        <SafeAreaView edges={['top']} style={[styles.header, { borderBottomColor: accent + '33' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{mangaTitle}</Text>
            <Text style={[styles.headerSub, { color: accent }]}>
              {isLightNovel ? 'Chapter' : 'Chapter'} {chapterNum}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </SafeAreaView>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {isLightNovel ? (
        // Light novel: render via WebView if URL provided, otherwise placeholder
        url ? (
          <WebView
            source={{ uri: url }}
            style={styles.webview}
            javaScriptEnabled
            onTouchEnd={toggleHeader}
          />
        ) : (
          <View style={styles.center}>
            <Ionicons name="book-outline" size={52} color="rgba(255,255,255,0.2)" />
            <Text style={styles.errorText}>No readable URL for this chapter.</Text>
            <Text style={styles.errorSub}>Try opening it from the source website.</Text>
          </View>
        )
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={accent} size="large" />
          <Text style={[styles.loadingText, { color: accent }]}>Loading pages…</Text>
        </View>
      ) : isError || !pages || pages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={52} color="rgba(255,255,255,0.3)" />
          <Text style={styles.errorText}>Failed to load chapter.</Text>
          <Text style={styles.errorSub}>This chapter may not be available.</Text>
        </View>
      ) : (
        // Manga page-by-page scroll
        <FlatList
          data={pages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item: uri }) => <MangaPage uri={uri} />}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setHeaderVisible(false)}
          onMomentumScrollEnd={() => setHeaderVisible(true)}
          ListFooterComponent={
            <View style={styles.footer}>
              <Ionicons name="checkmark-circle" size={32} color={accent} />
              <Text style={styles.footerText}>End of Chapter {chapterNum}</Text>
              <Pressable onPress={() => router.back()} style={[styles.footerBtn, { backgroundColor: accent }]}>
                <Text style={styles.footerBtnText}>Back to Chapters</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(12,12,24,0.95)',
    paddingHorizontal: 12, paddingBottom: 10, gap: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: '#fff', fontSize: 14, fontWeight: '600' },
  headerSub:    { fontSize: 11, fontWeight: '500', marginTop: 1 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#0C0C18',
  },
  loadingText: { fontSize: 14, fontWeight: '500' },
  errorText:   { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  errorSub:    { color: 'rgba(255,255,255,0.3)', fontSize: 13 },

  footer: {
    alignItems: 'center', gap: 12,
    paddingVertical: 40, backgroundColor: '#0C0C18',
  },
  footerText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  footerBtn:  {
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 4,
  },
  footerBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})