import MediaCard, { MediaItem } from "@/components/MediaCard";
import { getTrending, AnimeFilter } from "@/services/anilist";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

const COLORS = {
  bg:           "#080810",
  surface:      "#10101E",
  card:         "#13132A",
  accent:       "#6C4EF6",
  accentLight:  "#9B7FFF",
  accentGlow:   "rgba(108,78,246,0.25)",
  gold:         "#F5A623",
  text:         "#FFFFFF",
  textSub:      "rgba(255,255,255,0.55)",
  textMuted:    "rgba(255,255,255,0.28)",
  border:       "rgba(255,255,255,0.07)",
  borderStrong: "rgba(108,78,246,0.4)",
};

const FILTERS: AnimeFilter[] = ["Trending", "Popular", "Top Rated", "Airing"];

const FILTER_META: Record<AnimeFilter, { icon: string; description: string }> = {
  Trending:    { icon: "flame-outline",           description: "What everyone's watching right now" },
  Popular:     { icon: "heart-outline",            description: "All-time fan favourites"            },
  "Top Rated": { icon: "star-outline",             description: "Highest scored titles (70+ score)"  },
  Airing:      { icon: "radio-button-on-outline",  description: "Currently airing this season"       },
};

function normalise(item: any): MediaItem {
  return {
    id:         item.id,
    title:      item.title?.english ?? item.title?.romaji ?? "Unknown",
    coverImage: item.coverImage?.large ?? "",
    type:       "anime",
    score:      item.averageScore,
    episodes:   item.episodes,
    genres:     item.genres ?? [],
    rankings:   item.rankings ?? [],
    raw:        item,
  };
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard({ variant }: { variant: "portrait" | "landscape" }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  if (variant === "landscape") {
    return (
      <View style={sk.landscapeWrap}>
        <Animated.View style={[sk.landscapeImg, { opacity }]} />
        <View style={sk.landscapeBody}>
          <Animated.View style={[sk.lineWide,   { opacity }]} />
          <Animated.View style={[sk.lineNarrow, { opacity }]} />
          <Animated.View style={[sk.lineThin,   { opacity }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={sk.portraitWrap}>
      <Animated.View style={[sk.portraitImg, { opacity }]} />
      <Animated.View style={[sk.lineWide,    { opacity, marginTop: 8 }]} />
      <Animated.View style={[sk.lineNarrow,  { opacity, marginTop: 4 }]} />
    </View>
  );
}

const sk = StyleSheet.create({
  portraitWrap:  { flex: 1, margin: 6 },
  portraitImg:   { width: "100%", aspectRatio: 2/3, borderRadius: 12, backgroundColor: COLORS.card },
  landscapeWrap: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.card, borderRadius: 14, overflow: "hidden" },
  landscapeImg:  { width: 80, height: 110, backgroundColor: COLORS.surface },
  landscapeBody: { flex: 1, padding: 12, justifyContent: "center", gap: 6 },
  lineWide:      { height: 13, borderRadius: 6, backgroundColor: COLORS.surface, width: "70%" },
  lineNarrow:    { height: 11, borderRadius: 6, backgroundColor: COLORS.surface, width: "45%" },
  lineThin:      { height: 10, borderRadius: 6, backgroundColor: COLORS.surface, width: "30%" },
});

// ─── Filter Pill ──────────────────────────────────────────────────────────────
function FilterPill({
  label,
  active,
  onPress,
}: {
  label: AnimeFilter;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const meta  = FILTER_META[label];

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80,  useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[pill.wrap, active && pill.wrapActive, { transform: [{ scale }] }]}>
        {active && (
          <LinearGradient
            colors={[COLORS.accent, COLORS.accentLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Ionicons
          name={meta.icon as any}
          size={13}
          color={active ? "#fff" : COLORS.textMuted}
          style={{ marginRight: 5 }}
        />
        <Text style={[pill.text, active && pill.activeText]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const pill = StyleSheet.create({
  wrap:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  wrapActive: { borderColor: "transparent" },
  text:       { color: COLORS.textMuted, fontSize: 13, fontWeight: "500", letterSpacing: 0.2 },
  activeText: { color: "#fff", fontWeight: "700" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AnimeScreen() {
  const [filter,   setFilter]   = useState<AnimeFilter>("Trending");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function sortItems(items: MediaItem[], filter: string): MediaItem[] {
  const sorted = [...items];
  switch (filter) {
    case "Top Rated":
      return sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    case "Popular":
      return sorted.sort((a, b) =>
        ((b.raw as any)?.popularity ?? 0) - ((a.raw as any)?.popularity ?? 0)
      );
    case "Airing":
      return sorted.sort((a, b) =>
        ((b.raw as any)?.popularity ?? 0) - ((a.raw as any)?.popularity ?? 0)
      );
    default:
      return sorted;
  }
}

  const { data, isLoading, isError } = useQuery({
    queryKey: ["anime", filter],
    queryFn:  () => getTrending("ANIME", filter),
  });

  const items: MediaItem[] = sortItems((data ?? []).map(normalise), filter);

  useEffect(() => {
    if (!isLoading) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }
  }, [isLoading, filter]);

  const numColumns     = viewMode === "grid" ? 2 : 1;
  const SKELETON_COUNT = viewMode === "grid" ? 6 : 5;
  const skeletonData   = Array.from({ length: SKELETON_COUNT }, (_, i) => i);

  const filterMeta = FILTER_META[filter];

  const ListHeader = (
    <>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={s.eyebrow}>DISCOVER</Text>
          <Text style={s.title}>Anime</Text>
          <Text style={s.subtitle}>{filterMeta.description}</Text>
        </View>
        <View style={s.actions}>
          {!isLoading && !isError && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{items.length}</Text>
            </View>
          )}
          <Pressable onPress={() => setViewMode(v => v === "grid" ? "list" : "grid")} style={s.iconBtn}>
            <Ionicons name={viewMode === "grid" ? "list-outline" : "grid-outline"} size={18} color={COLORS.textSub} />
          </Pressable>
        </View>
      </View>

      {/* Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.pillsContainer}
        style={s.pillsRow}
      >
        {FILTERS.map(f => (
          <FilterPill key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      <View style={s.divider} />

      {/* Skeleton */}
      {isLoading && (
        <FlatList
          key={`skeleton-${viewMode}`}
          data={skeletonData}
          keyExtractor={i => String(i)}
          numColumns={numColumns}
          scrollEnabled={false}
          contentContainerStyle={s.listContent}
          renderItem={() => <SkeletonCard variant={viewMode === "grid" ? "portrait" : "landscape"} />}
        />
      )}

      {/* Error state */}
      {isError && (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={36} color={COLORS.accentLight} />
          </View>
          <Text style={s.emptyTitle}>Couldn't load anime</Text>
          <Text style={s.emptyBody}>Check your connection and try again.</Text>
        </View>
      )}

      {/* Results header label */}
      {!isLoading && !isError && items.length > 0 && (
        <View style={s.listHeader}>
          <Text style={s.listHeaderText}>
            {filter} · <Text style={{ color: COLORS.accentLight }}>{items.length} titles</Text>
          </Text>
        </View>
      )}
    </>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={s.glowCircle} pointerEvents="none" />

      <SafeAreaView style={s.safe} edges={["top"]}>
        <Animated.FlatList
          key={viewMode}
          data={!isLoading && !isError ? items : []}
          keyExtractor={i => String((i as MediaItem).id)}
          numColumns={numColumns}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <MediaCard
              item={item as MediaItem}
              variant={viewMode === "grid" ? "portrait" : "landscape"}
              style={viewMode === "grid" ? s.gridCard : s.listCard}
              activeFilter={filter}
            />
          )}
          ListEmptyComponent={
            !isLoading && !isError ? (
              <View style={s.emptyState}>
                <Text style={s.emptyTitle}>No results found</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: COLORS.bg },
  safe:          { flex: 1 },
  glowCircle:    { position: "absolute", top: -80, left: SCREEN_W / 2 - 160, width: 320, height: 320, borderRadius: 160, backgroundColor: COLORS.accentGlow, opacity: 0.55 },
  header:        { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 70, paddingBottom: 16 },
  eyebrow:       { color: COLORS.accent, fontSize: 10, fontWeight: "800", letterSpacing: 2.5, marginBottom: 2 },
  title:         { color: COLORS.text, fontSize: 32, fontWeight: "800", letterSpacing: -0.8, lineHeight: 40 },
  subtitle:      { color: COLORS.textMuted, fontSize: 12, marginTop: 3, lineHeight: 16 },
  actions:       { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 48 },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: COLORS.accentGlow, borderWidth: 1, borderColor: COLORS.borderStrong },
  badgeText:     { color: COLORS.accentLight, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  iconBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  pillsRow:      { flexGrow: 0 },
  pillsContainer:{ paddingHorizontal: 18, gap: 8, paddingBottom: 2, flexDirection: "row" },
  divider:       { height: 1, backgroundColor: COLORS.border, marginTop: 14 },
  listContent:   { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 120 },
  listHeader:    { paddingHorizontal: 6, paddingVertical: 12 },
  listHeaderText:{ color: COLORS.textMuted, fontSize: 12, fontWeight: "600", letterSpacing: 0.3, textTransform: "uppercase" },
  gridCard:      { flex: 1, margin: 6 },
  listCard:      { marginHorizontal: 6, marginBottom: 10 },
  emptyState:    { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accentGlow, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle:    { color: COLORS.textSub, fontSize: 17, fontWeight: "700" },
  emptyBody:     { color: COLORS.textMuted, fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});