import MediaCard, { MediaItem, MediaType } from "@/components/MediaCard";
import { useAnimeSearch } from "@/hooks/useAnime";
import { useDebounce } from "@/hooks/useDebounce";
import { useLightNovelSearch } from "@/hooks/useLightNovel";
import { useMangaSearch } from "@/hooks/useManga";
import {
  ANIME_GENRES,
  getByGenre,
  MANGA_GENRES,
  NOVEL_GENRES,
} from "@/services/anilist";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Types & constants ────────────────────────────────────────────────────────

type FilterTab = MediaType | "all";

const TABS: { key: FilterTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all",        label: "All",         icon: "apps" },
  { key: "anime",      label: "Anime",       icon: "play-circle-outline" },
  { key: "manga",      label: "Manga",       icon: "book-outline" },
  { key: "lightnovel", label: "Light Novel", icon: "library-outline" },
];

const ACCENT: Record<FilterTab, string> = {
  all:        "#A78BFA",
  anime:      "#7C5CFC",
  manga:      "#12B884",
  lightnovel: "#E09432",
};

const ACCENT_DIM: Record<FilterTab, string> = {
  all:        "rgba(167,139,250,0.13)",
  anime:      "rgba(124,92,252,0.13)",
  manga:      "rgba(18,184,132,0.12)",
  lightnovel: "rgba(224,148,50,0.12)",
};

const GENRE_POOL: Record<FilterTab, readonly string[]> = {
  all:        Array.from(new Set([...ANIME_GENRES, ...MANGA_GENRES, ...NOVEL_GENRES])),
  anime:      ANIME_GENRES,
  manga:      MANGA_GENRES,
  lightnovel: NOVEL_GENRES,
};

// ─── Normalisation helpers ────────────────────────────────────────────────────

function normaliseAnilist(item: any, type: MediaType): MediaItem {
  return {
    id:         item.id,
    title:      item.title?.english ?? item.title?.romaji ?? "Unknown",
    coverImage: item.coverImage?.large ?? "",
    type,
    score:      item.averageScore ?? undefined,
    episodes:   item.episodes ?? undefined,
    chapters:   item.chapters ?? undefined,
    genres:     item.genres ?? [],
    raw:        item,
  };
}

function normaliseAnilistManga(item: any): MediaItem {
  return {
    id:         item.id,
    title:      item.title?.english ?? item.title?.romaji ?? "Unknown",
    coverImage: item.coverImage?.large ?? "",
    type:       "manga",
    score:      item.averageScore ?? undefined,
    chapters:   item.chapters ?? undefined,
    genres:     item.genres ?? [],
    raw:        item,
  };
}

function normaliseAnilistNovel(item: any): MediaItem {
  return {
    id:         item.id,
    title:      item.title?.english ?? item.title?.romaji ?? item.title ?? "Unknown",
    coverImage: item.coverImage?.large ?? item.coverImage?.extraLarge ?? "",
    type:       "lightnovel",
    score:      item.averageScore ?? undefined,
    chapters:   item.chapters ?? undefined,
    genres:     item.genres ?? [],
    raw:        item,
  };
}

// ─── RandomizerButton ─────────────────────────────────────────────────────────

interface RandomizerProps {
  accent:      string;
  spinning:    boolean;
  onRandomize: () => void;
}

function RandomizerButton({ accent, spinning, onRandomize }: RandomizerProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  useEffect(() => {
    if (spinning) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [spinning]);

  return (
    <Pressable
      onPress={onRandomize}
      style={({ pressed }) => [
        rs.btn,
        { borderColor: accent + "40", backgroundColor: accent + "14" },
        pressed && { opacity: 0.72 },
      ]}
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="shuffle" size={13} color={accent} />
      </Animated.View>
      <Text style={[rs.btnText, { color: accent }]}>Random</Text>
    </Pressable>
  );
}

// ─── TypeBadge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: MediaType }) {
  const colors: Record<MediaType, { bg: string; text: string; label: string }> = {
    anime:      { bg: "rgba(124,92,252,0.75)",  text: "#D4CCFF", label: "Anime" },
    manga:      { bg: "rgba(18,184,132,0.75)",  text: "#AAFAE0", label: "Manga" },
    lightnovel: { bg: "rgba(224,148,50,0.7)",   text: "#FFE8B8", label: "Novel" },
  };
  const c = colors[type];
  return (
    <View style={[tb.badge, { backgroundColor: c.bg }]}>
      <Text style={[tb.text, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ query, active, genres }: { query: string; active: FilterTab; genres: string[] }) {
  const accent    = ACCENT[active];
  const hasGenres = genres.length > 0;
  const hasQuery  = query.length > 0;
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconBox, { backgroundColor: accent + "18" }]}>
        <Ionicons
          name={hasGenres ? "filter-outline" : "search-outline"}
          size={26}
          color={accent}
          style={{ opacity: 0.75 }}
        />
      </View>
      {hasQuery || hasGenres ? (
        <>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySub}>Try a different title or filter</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Search SHIORI</Text>
          <Text style={styles.emptySub}>Find anime, manga, and light novels you love</Text>
        </>
      )}
    </View>
  );
}

// ─── GenreResultHeader ────────────────────────────────────────────────────────

function GenreResultHeader({ genres, accent }: { genres: string[]; accent: string }) {
  if (genres.length === 0) return null;
  return (
    <View style={gh.wrap}>
      <View style={gh.badges}>
        {genres.map((g) => (
          <View key={g} style={[gh.badge, { backgroundColor: accent + "22" }]}>
            <Text style={[gh.badgeText, { color: accent }]}>{g}</Text>
          </View>
        ))}
      </View>
      <Text style={gh.sub}>Browsing by genre</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const [query,        setQuery]        = useState("");
  const [activeTab,    setTab]          = useState<FilterTab>("all");
  const [viewMode,     setView]         = useState<"grid" | "list">("grid");
  const [selectedGenres, setGenres]     = useState<string[]>([]);
  const [genreResults, setGenreResults] = useState<MediaItem[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [randSpinning, setRandSpinning] = useState(false);
  const [randomized,   setRandomized]   = useState<MediaItem[] | null>(null);

  const debouncedQ = useDebounce(query, 400);
  const accent     = ACCENT[activeTab];
  const accentDim  = ACCENT_DIM[activeTab];

  const needsAnime = activeTab === "all" || activeTab === "anime";
  const needsManga = activeTab === "all" || activeTab === "manga";
  const needsLN    = activeTab === "all" || activeTab === "lightnovel";

  const animeQ = useAnimeSearch(needsAnime && !selectedGenres.length ? debouncedQ : "");
  const mangaQ = useMangaSearch(needsManga && !selectedGenres.length ? debouncedQ : "");
  const lnQ    = useLightNovelSearch(needsLN && !selectedGenres.length ? debouncedQ : "");

  const searchResults = useMemo<MediaItem[]>(() => {
    const out: MediaItem[] = [];
    if (needsAnime && animeQ.data) animeQ.data.forEach((i: any) => out.push(normaliseAnilist(i, "anime")));
    if (needsManga && mangaQ.data) mangaQ.data.forEach((i: any) => out.push(normaliseAnilistManga(i)));
    if (needsLN    && lnQ.data)    lnQ.data.forEach((i: any) => out.push(normaliseAnilistNovel(i)));
    return out;
  }, [animeQ.data, mangaQ.data, lnQ.data, needsAnime, needsManga, needsLN]);

  const isSearchLoading =
    (needsAnime && animeQ.isLoading) ||
    (needsManga && mangaQ.isLoading) ||
    (needsLN    && lnQ.isLoading);

  const toggleGenre = useCallback((genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const clearGenres = useCallback(() => {
    setGenres([]);
    setGenreResults([]);
    setRandomized(null);
  }, []);

  useEffect(() => {
    if (selectedGenres.length === 0) { setGenreResults([]); return; }
    let cancelled = false;
    setGenreLoading(true);
    const fetches: Promise<MediaItem[]>[] = [];
    if (needsAnime)
      fetches.push(getByGenre("ANIME", selectedGenres).then((items: any[]) => items.map((i) => normaliseAnilist(i, "anime"))));
    if (needsManga)
      fetches.push(getByGenre("MANGA", selectedGenres).then((items: any[]) => items.map((i) => normaliseAnilistManga(i))));
    if (needsLN)
      fetches.push(getByGenre("MANGA", selectedGenres, "NOVEL").then((items: any[]) => items.map((i) => normaliseAnilistNovel(i))));
    Promise.all(fetches)
      .then((chunks) => { if (!cancelled) setGenreResults(chunks.flat()); })
      .finally(() => { if (!cancelled) setGenreLoading(false); });
    return () => { cancelled = true; };
  }, [selectedGenres, activeTab]);

  const randomizeResults = useCallback(() => {
    const source = selectedGenres.length > 0 ? genreResults : searchResults;
    if (source.length === 0) return;
    setRandSpinning(true);
    setTimeout(() => setRandSpinning(false), 700);
    setRandomized([...source].sort(() => Math.random() - 0.5));
  }, [genreResults, searchResults, selectedGenres.length]);

  useEffect(() => { setRandomized(null); }, [activeTab, debouncedQ, selectedGenres]);

  const results   = randomized ?? (selectedGenres.length > 0 ? genreResults : searchResults);
  const isLoading = selectedGenres.length > 0
    ? genreLoading
    : isSearchLoading && debouncedQ.length > 1;

  const handleClear = useCallback(() => {
    setQuery(""); setRandomized(null); Keyboard.dismiss();
  }, []);

  const handleTabChange = useCallback((tab: FilterTab) => {
    setTab(tab); setGenres([]); setGenreResults([]); setRandomized(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <MediaCard
        item={item}
        variant={viewMode === "grid" ? "portrait" : "landscape"}
        style={viewMode === "grid" ? styles.gridItem : styles.listItem}
      />
    ),
    [viewMode]
  );

  const numColumns = viewMode === "grid" ? 2 : 1;

  // Everything above the results grid lives here so there's only ONE FlatList
  const ListHeader = (
    <>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Search &amp; Track</Text>
          <Text style={styles.title}>Discover</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setView((v) => (v === "grid" ? "list" : "grid"))}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.65 }]}
          >
            <Ionicons
              name={viewMode === "grid" ? "list-outline" : "grid-outline"}
              size={19}
              color="rgba(255,255,255,0.55)"
            />
          </Pressable>
        </View>
      </View>

      {/* ── Search bar ───────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, query.length > 0 && { borderColor: accent + "50" }]}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.28)" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search titles to track…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={query}
            onChangeText={(t) => { setQuery(t); if (t.length > 0) clearGenres(); }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={accent}
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.3)" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter tabs (ScrollView — no nested FlatList) ────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        style={styles.tabsRow}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const col      = ACCENT[tab.key];
          return (
            <Pressable
              key={tab.key}
              onPress={() => handleTabChange(tab.key)}
              style={[
                styles.tab,
                isActive && { backgroundColor: col + "1E", borderColor: col + "66" },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={13}
                color={isActive ? col : "rgba(255,255,255,0.35)"}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, isActive && { color: col, fontWeight: "600" }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Genre section header ─────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Browse by Genre</Text>
        <RandomizerButton accent={accent} spinning={randSpinning} onRandomize={randomizeResults} />
      </View>

      {/* ── Genre chips (ScrollView — no nested FlatList) ────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={gs.container}
        style={gs.row}
      >
        {selectedGenres.length > 0 && (
          <Pressable onPress={clearGenres} style={gs.clearChip}>
            <Ionicons name="close" size={11} color="rgba(255,100,100,0.9)" style={{ marginRight: 3 }} />
            <Text style={gs.clearText}>Clear</Text>
          </Pressable>
        )}
        {(GENRE_POOL[activeTab] as string[]).map((genre) => {
          const active = selectedGenres.includes(genre);
          return (
            <Pressable
              key={genre}
              onPress={() => { setQuery(""); toggleGenre(genre); }}
              style={[gs.chip, active && { backgroundColor: accentDim, borderColor: accent + "66" }]}
            >
              <Text style={[gs.chipText, active && { color: accent, fontWeight: "600" }]}>
                {genre}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Loading / empty states (inside header so FlatList stays) ─── */}
      {isLoading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={accent} size="large" />
          <Text style={[styles.loadingText, { color: accent + "CC" }]}>
            {selectedGenres.length > 0 ? "Filtering by genre…" : "Searching…"}
          </Text>
        </View>
      )}
      {!isLoading && results.length === 0 && (
        <EmptyState query={debouncedQ} active={activeTab} genres={selectedGenres} />
      )}

      <GenreResultHeader genres={selectedGenres} accent={accent} />
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Decorative glow orbs */}
      <View style={styles.orbTopRight} pointerEvents="none" />
      <View style={styles.orbMidLeft}  pointerEvents="none" />

      {/* Single root FlatList — fixes all nested-FlatList layout bugs on Android */}
      <FlatList
        data={isLoading ? [] : results}
        renderItem={renderItem}
        numColumns={numColumns}
        key={`${viewMode}-${numColumns}`}
        contentContainerStyle={styles.listContent}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        ListHeaderComponent={ListHeader}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG     = "#0A0A14";
const BORDER = "rgba(255,255,255,0.07)";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  orbTopRight: {
    position: "absolute", top: -80, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(124,92,252,0.09)",
  },
  orbMidLeft: {
    position: "absolute", top: 220, left: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(18,184,132,0.06)",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 14,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11, fontWeight: "500",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 3,
  },
  title: {
    color: "#FFFFFF", fontSize: 30, fontWeight: "700",
    letterSpacing: -0.8, lineHeight: 36,
  },
  headerActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },

  searchWrap: { marginHorizontal: 16, marginBottom: 14 },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 11 : 7,
  },
  searchInput: {
    flex: 1, color: "#FFFFFF", fontSize: 15,
    paddingVertical: 0, fontWeight: "400",
  },

  // Tabs
  tabsRow:     { flexGrow: 0, marginBottom: 16 },
  tabsContent: { paddingHorizontal: 16, gap: 7, flexDirection: "row" },
  tab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  tabText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12, fontWeight: "500", letterSpacing: 0.1,
  },

  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 9,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.35)", fontSize: 10.5,
    fontWeight: "600", letterSpacing: 0.9, textTransform: "uppercase",
  },

  divider: {
    height: StyleSheet.hairlineWidth, backgroundColor: BORDER,
    marginHorizontal: 16, marginBottom: 18,
  },

  listContent: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 120 },
  gridItem:    { flex: 1, margin: 6 },
  listItem:    { marginHorizontal: 0, marginBottom: 10 },

  loadingWrap: {
    alignItems: "center", justifyContent: "center",
    gap: 14, paddingVertical: 60,
  },
  loadingText: { fontSize: 14, fontWeight: "500" },

  emptyWrap: {
    alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 60,
  },
  emptyIconBox: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  emptyTitle: {
    color: "rgba(255,255,255,0.75)", fontSize: 18,
    fontWeight: "600", letterSpacing: -0.3,
  },
  emptySub: {
    color: "rgba(255,255,255,0.3)", fontSize: 13,
    textAlign: "center", maxWidth: 240, lineHeight: 19,
  },
});

// ─── Genre strip styles ───────────────────────────────────────────────────────

const gs = StyleSheet.create({
  row:       { flexGrow: 0, marginBottom: 14 },
  container: { paddingHorizontal: 16, gap: 7, flexDirection: "row" },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5.5,
    borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11.5, fontWeight: "400", letterSpacing: 0.1,
  },
  clearChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 11, paddingVertical: 5.5,
    borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,70,70,0.35)",
    backgroundColor: "rgba(255,70,70,0.1)", gap: 3,
  },
  clearText: { color: "rgba(255,100,100,0.88)", fontSize: 11.5, fontWeight: "600" },
});

// ─── Randomizer button styles ─────────────────────────────────────────────────

const rs = StyleSheet.create({
  btn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1,
  },
  btnText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
});

// ─── TypeBadge styles ─────────────────────────────────────────────────────────

const tb = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  text:  { fontSize: 9.5, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
});

// ─── Genre result header styles ───────────────────────────────────────────────

const gh = StyleSheet.create({
  wrap:      { paddingBottom: 14 },
  badges:    { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 5 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11.5, fontWeight: "600" },
  sub:       { color: "rgba(255,255,255,0.22)", fontSize: 11 },
});