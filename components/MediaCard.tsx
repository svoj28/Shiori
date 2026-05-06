import React from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'

export type MediaType = 'anime' | 'manga' | 'lightnovel'

export interface MediaItem {
  id: string | number
  title: string
  coverImage: string
  type: MediaType
  score?: number
  episodes?: number
  chapters?: number
  genres?: string[]
  raw?: Record<string, unknown>
}

interface MediaCardProps {
  item: MediaItem
  variant?: 'portrait' | 'landscape'
  style?: ViewStyle
  onPress?: (item: MediaItem) => void
}

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = (SCREEN_W - 48) / 2
const CARD_H = CARD_W * 1.5

const TYPE_COLOR: Record<MediaType, string> = {
  anime:      '#7C5CFC',
  manga:      '#16A881',
  lightnovel: '#D4860A',
}

const TYPE_LABEL: Record<MediaType, string> = {
  anime:      'ANIME',
  manga:      'MANGA',
  lightnovel: 'LIGHT NOVEL',
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#22C55E' : score >= 50 ? '#EAB308' : '#EF4444'
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <Text style={[styles.scoreText, { color }]}>{score}</Text>
    </View>
  )
}

function PortraitCard({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  const accent = TYPE_COLOR[item.type]
  const meta = item.episodes ? `${item.episodes} eps` : item.chapters ? `${item.chapters} ch` : null

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.portraitCard,
        { width: CARD_W, height: CARD_H },
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={{ uri: item.coverImage }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.97)']}
        locations={[0.4, 0.72, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.typePill, { backgroundColor: accent + '25', borderColor: accent + '70' }]}>
        <Text style={[styles.typePillText, { color: accent }]}>{TYPE_LABEL[item.type]}</Text>
      </View>
      <View style={styles.portraitBottom}>
        {item.score != null && <ScoreBadge score={item.score} />}
        <Text style={styles.portraitTitle} numberOfLines={2}>{item.title}</Text>
        {meta && <Text style={styles.portraitMeta}>{meta}</Text>}
        {item.genres && item.genres.length > 0 && (
          <Text style={styles.portraitGenre} numberOfLines={1}>
            {item.genres.slice(0, 2).join(' · ')}
          </Text>
        )}
      </View>
    </Pressable>
  )
}

function LandscapeCard({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  const accent = TYPE_COLOR[item.type]
  const meta = item.episodes
    ? `${item.episodes} episodes`
    : item.chapters
    ? `${item.chapters} chapters`
    : '—'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.landscapeCard, pressed && styles.pressed]}
    >
      <View style={styles.landscapeThumb}>
        <Image
          source={{ uri: item.coverImage }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={300}
        />
        <View style={[styles.landscapeAccent, { backgroundColor: accent }]} />
      </View>
      <View style={styles.landscapeInfo}>
        <View style={styles.landscapeTopRow}>
          <Text style={[styles.landscapeType, { color: accent }]}>{TYPE_LABEL[item.type]}</Text>
          {item.score != null && (
            <Text style={styles.landscapeScore}>★ {(item.score / 10).toFixed(1)}</Text>
          )}
        </View>
        <Text style={styles.landscapeTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.landscapeMeta}>{meta}</Text>
        {item.genres && (
          <Text style={styles.landscapeGenre} numberOfLines={1}>
            {item.genres.slice(0, 3).join(' · ')}
          </Text>
        )}
      </View>
    </Pressable>
  )
}

export default function MediaCard({ item, variant = 'portrait', style, onPress }: MediaCardProps) {
  const router = useRouter()
  const handlePress = () => {
    if (onPress) {
      onPress(item)
    } else {
      router.push({
        pathname: '/modal',
        params: { id: String(item.id), type: item.type, title: item.title, cover: item.coverImage },
      })
    }
  }
  return (
    <View style={style}>
      {variant === 'portrait'
        ? <PortraitCard item={item} onPress={handlePress} />
        : <LandscapeCard item={item} onPress={handlePress} />}
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  portraitCard: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a2e' },
  typePill: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  typePillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  portraitBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, gap: 3 },
  scoreBadge: {
    alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, marginBottom: 3,
  },
  scoreText: { fontSize: 11, fontWeight: '700' },
  portraitTitle: { color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 17 },
  portraitMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  portraitGenre: { color: 'rgba(255,255,255,0.32)', fontSize: 10 },
  landscapeCard: {
    flexDirection: 'row', backgroundColor: '#141420',
    borderRadius: 12, overflow: 'hidden', marginBottom: 10, height: 110,
  },
  landscapeThumb: { width: 76, height: 110 },
  landscapeAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  landscapeInfo: { flex: 1, padding: 12, justifyContent: 'center', gap: 3 },
  landscapeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  landscapeType: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  landscapeScore: { color: '#EAB308', fontSize: 11, fontWeight: '600' },
  landscapeTitle: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 19 },
  landscapeMeta: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  landscapeGenre: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
})