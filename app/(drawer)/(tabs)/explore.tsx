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
} from "@/services/anilist"; // adjust path to your anilist service
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
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
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = MediaType | "all";

const TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "apps" },
  { key: "anime", label: "Anime", icon: "play-circle" },
  { key: "manga", label: "Manga", icon: "book" },
  { key: "lightnovel", label: "Light Novel", icon: "library" },
];

const ACCENT: Record<FilterTab, string> = {
  all: "#A78BFA",
  anime: "#7C5CFC",
  manga: "#16A881",
  lightnovel: "#D4860A",
};

// Genre pools per tab
const GENRE_POOL: Record<FilterTab, readonly string[]> = {
  all: Array.from(new Set([...ANIME_GENRES, ...MANGA_GENRES, ...NOVEL_GENRES])),
  anime: ANIME_GENRES,
  manga: MANGA_GENRES,
  lightnovel: NOVEL_GENRES,
};

// ─── Normalise API shapes to MediaItem ───────────────────────────────────────

function normaliseAnilist(item: any, type: MediaType): MediaItem {
  return {
    id: item.id,
    title: item.title?.english ?? item.title?.romaji ?? "Unknown",
    coverImage: item.coverImage?.large ?? "",
    type,
    score: item.averageScore ?? undefined,
    episodes: item.episodes ?? undefined,
    chapters: item.chapters ?? undefined,
    genres: item.genres ?? [],
    raw: item,
  };
}

function normaliseAnilistManga(item: any): MediaItem {
  return {
    id: item.id,
    title: item.title?.english ?? item.title?.romaji ?? "Unknown",
    coverImage: item.coverImage?.large ?? "",
    type: "manga",
    score: item.averageScore ?? undefined,
    chapters: item.chapters ?? undefined,
    genres: item.genres ?? [],
    raw: item,
  };
}

function normaliseAnilistNovel(item: any): MediaItem {
  return {
    id: item.id,
    title: item.title?.english ?? item.title?.romaji ?? item.title ?? "Unknown",
    coverImage: item.coverImage?.large ?? item.coverImage?.extraLarge ?? "",
    type: "lightnovel",
    score: item.averageScore ?? undefined,
    chapters: item.chapters ?? undefined,
    genres: item.genres ?? [],
    raw: item,
  };
}

// ─── Genre chip strip ─────────────────────────────────────────────────────────

interface GenreStripProps {
  genres: readonly string[];
  selected: string[];
  accent: string;
  onToggle: (g: string) => void;
  onClear: () => void;
}

function GenreStrip({
  genres,
  selected,
  accent,
  onToggle,
  onClear,
}: GenreStripProps) {
  return (
    <View style={genreStyles.row}>
      <FlatList
        data={genres as string[]}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(g) => g}
        contentContainerStyle={genreStyles.container}
        ListHeaderComponent={
          selected.length > 0 ? (
            <Pressable
              onPress={onClear}
              style={[genreStyles.chip, genreStyles.clearChip]}
            >
              <Ionicons
                name="close"
                size={11}
                color="#fff"
                style={{ marginRight: 3 }}
              />
              <Text style={genreStyles.clearText}>Clear</Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item: genre }) => {
          const active = selected.includes(genre);
          return (
            <Pressable
              onPress={() => onToggle(genre)}
              style={[
                genreStyles.chip,
                active && {
                  backgroundColor: accent + "30",
                  borderColor: accent,
                },
              ]}
            >
              <Text
                style={[
                  genreStyles.chipText,
                  active && { color: accent, fontWeight: "600" },
                ]}
              >
                {genre}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

// ─── Randomizer button ────────────────────────────────────────────────────────

interface RandomizerProps {
  accent: string;
  activeTab: FilterTab;
  onRandomize: () => void;
  spinning: boolean;
}

function RandomizerButton({
  accent,
  activeTab,
  onRandomize,
  spinning,
}: RandomizerProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    if (spinning) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [spinning]);

  return (
    <View style={randStyles.wrap}>
      <Pressable
        onPress={onRandomize}
        style={({ pressed }) => [
          randStyles.btn,
          { borderColor: accent + "55", backgroundColor: accent + "15" },
          pressed && { opacity: 0.75 },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="shuffle" size={14} color={accent} />
        </Animated.View>
        <Text style={[randStyles.btnText, { color: accent }]}>Random</Text>
      </Pressable>
    </View>
  );
}

// ─── Empty / placeholder states ───────────────────────────────────────────────

function EmptyState({
  query,
  active,
  genres,
}: {
  query: string;
  active: FilterTab;
  genres: string[];
}) {
  const color = ACCENT[active];
  const hasGenres = genres.length > 0;
  return (
    <View style={styles.emptyWrap}>
      <Ionicons
        name={hasGenres ? "filter-outline" : "search-outline"}
        size={52}
        color={color}
        style={{ opacity: 0.4 }}
      />
      {query.length > 0 || hasGenres ? (
        <>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySub}>Try a different title or filter</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Search SHIORI</Text>
          <Text style={styles.emptySub}>
            Find anime, manga, and light novels
          </Text>
        </>
      )}
    </View>
  );
}

// ─── Genre badge header shown above results ───────────────────────────────────

function GenreResultHeader({
  genres,
  accent,
}: {
  genres: string[];
  accent: string;
}) {
  if (genres.length === 0) return null;
  return (
    <View style={headerStyles.wrap}>
      <View style={headerStyles.inner}>
        {genres.map((g) => (
          <View
            key={g}
            style={[headerStyles.badge, { backgroundColor: accent + "25" }]}
          >
            <Text style={[headerStyles.badgeText, { color: accent }]}>{g}</Text>
          </View>
        ))}
      </View>
      <Text style={headerStyles.sub}>Browsing by genre</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [activeTab, setTab] = useState<FilterTab>("all");
  const [viewMode, setView] = useState<"grid" | "list">("grid");

  // Genre state
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreResults, setGenreResults] = useState<MediaItem[]>([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [randSpinning, setRandSpinning] = useState(false);
  const [randomizedResults, setRandomizedResults] = useState<
    MediaItem[] | null
  >(null);

  const debouncedQ = useDebounce(query, 400);
  const accent = ACCENT[activeTab];

  // Fetch from all three sources in parallel
  const needsAnime = activeTab === "all" || activeTab === "anime";
  const needsManga = activeTab === "all" || activeTab === "manga";
  const needsLN = activeTab === "all" || activeTab === "lightnovel";

  const animeQ = useAnimeSearch(
    needsAnime && !selectedGenres.length ? debouncedQ : "",
  );
  const mangaQ = useMangaSearch(
    needsManga && !selectedGenres.length ? debouncedQ : "",
  );
  const lnQ = useLightNovelSearch(
    needsLN && !selectedGenres.length ? debouncedQ : "",
  );

  // Normalise and merge search results
  const searchResults = useMemo<MediaItem[]>(() => {
    const out: MediaItem[] = [];
    if (needsAnime && animeQ.data)
      animeQ.data.forEach((i: any) => out.push(normaliseAnilist(i, "anime")));
    if (needsManga && mangaQ.data)
      mangaQ.data.forEach((i: any) => out.push(normaliseAnilistManga(i)));
    if (needsLN && lnQ.data)
      lnQ.data.forEach((i: any) => out.push(normaliseAnilistNovel(i)));
    return out;
  }, [animeQ.data, mangaQ.data, lnQ.data, needsAnime, needsManga, needsLN]);

  const isSearchLoading =
    (needsAnime && animeQ.isLoading) ||
    (needsManga && mangaQ.isLoading) ||
    (needsLN && lnQ.isLoading);

  // ── Genre toggle ────────────────────────────────────────────────────────────
  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  }, []);

  const clearGenres = useCallback(() => {
    setSelectedGenres([]);
    setGenreResults([]);
    setRandomizedResults(null);
  }, []);

  // ── Fetch by genre whenever selectedGenres changes ─────────────────────────
  useEffect(() => {
    if (selectedGenres.length === 0) {
      setGenreResults([]);
      return;
    }

    let cancelled = false;
    setGenreLoading(true);

    const fetches: Promise<MediaItem[]>[] = [];

    if (activeTab === "all" || activeTab === "anime") {
      fetches.push(
        getByGenre("ANIME", selectedGenres).then((items: any[]) =>
          items.map((i) => normaliseAnilist(i, "anime")),
        ),
      );
    }
    if (activeTab === "all" || activeTab === "manga") {
      fetches.push(
        getByGenre("MANGA", selectedGenres).then((items: any[]) =>
          items.map((i) => normaliseAnilistManga(i)),
        ),
      );
    }
    if (activeTab === "all" || activeTab === "lightnovel") {
      fetches.push(
        getByGenre("MANGA", selectedGenres, "NOVEL").then((items: any[]) =>
          items.map((i) => normaliseAnilistNovel(i)),
        ),
      );
    }

    Promise.all(fetches)
      .then((chunks) => {
        if (!cancelled) setGenreResults(chunks.flat());
      })
      .finally(() => {
        if (!cancelled) setGenreLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenres, activeTab]);

  // ── Randomizer ─────────────────────────────────────────────────────────────
  const handleRandomize = useCallback((genres: string[]) => {
    void genres;
  }, []);

  const randomizeResults = useCallback(() => {
    const source = selectedGenres.length > 0 ? genreResults : searchResults;
    if (source.length === 0) return;

    setRandSpinning(true);
    setTimeout(() => setRandSpinning(false), 700);
    setRandomizedResults([...source].sort(() => Math.random() - 0.5));
  }, [genreResults, searchResults, selectedGenres.length]);

  useEffect(() => {
    setRandomizedResults(null);
  }, [activeTab, debouncedQ, selectedGenres]);

  // ── What to display ─────────────────────────────────────────────────────────
  const results =
    randomizedResults ??
    (selectedGenres.length > 0 ? genreResults : searchResults);
  const isLoading =
    selectedGenres.length > 0
      ? genreLoading
      : isSearchLoading && debouncedQ.length > 1;

  const handleClear = useCallback(() => {
    setQuery("");
    setRandomizedResults(null);
    Keyboard.dismiss();
  }, []);

  const handleTabChange = useCallback((tab: FilterTab) => {
    setTab(tab);
    setSelectedGenres([]);
    setGenreResults([]);
    setRandomizedResults(null);
  }, []);

  // ── Render item ─────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <MediaCard
        item={item}
        variant={viewMode === "grid" ? "portrait" : "landscape"}
        style={viewMode === "grid" ? styles.gridItem : styles.listItem}
      />
    ),
    [viewMode],
  );

  const numColumns = viewMode === "grid" ? 2 : 1;
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Search and track</Text>
          <Text style={styles.headerTitle}>Discover</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.viewToggle}
          >
            <Ionicons name="menu" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <Pressable
            onPress={() => setView((v) => (v === "grid" ? "list" : "grid"))}
            style={styles.viewToggle}
          >
            <Ionicons
              name={viewMode === "grid" ? "list-outline" : "grid-outline"}
              size={20}
              color="rgba(255,255,255,0.6)"
            />
          </Pressable>
        </View>
      </View>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={16}
          color="rgba(255,255,255,0.35)"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search titles to track…"
          placeholderTextColor="rgba(255,255,255,0.28)"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (t.length > 0) clearGenres();
          }}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor={accent}
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={16}
              color="rgba(255,255,255,0.35)"
            />
          </Pressable>
        )}
      </View>

      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <FlatList
        data={TABS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(t) => t.key}
        contentContainerStyle={styles.tabsContainer}
        renderItem={({ item: tab }) => {
          const isActive = activeTab === tab.key;
          const col = ACCENT[tab.key];
          return (
            <Pressable
              onPress={() => handleTabChange(tab.key)}
              style={[
                styles.tab,
                isActive && {
                  backgroundColor: col + "22",
                  borderColor: col + "88",
                },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={13}
                color={isActive ? col : "rgba(255,255,255,0.4)"}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.tabText,
                  isActive && { color: col, fontWeight: "600" },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        }}
        style={styles.tabsRow}
      />

      {/* ── Genre strip ────────────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Browse by Genre</Text>
        <RandomizerButton
          accent={accent}
          activeTab={activeTab}
          onRandomize={randomizeResults}
          spinning={randSpinning}
        />
      </View>
      <GenreStrip
        genres={GENRE_POOL[activeTab]}
        selected={selectedGenres}
        accent={accent}
        onToggle={(g) => {
          setQuery(""); // clear text search when genre tapped
          toggleGenre(g);
        }}
        onClear={clearGenres}
      />

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={accent} size="large" />
          <Text style={[styles.loadingText, { color: accent }]}>
            {selectedGenres.length > 0 ? "Filtering by genre…" : "Searching…"}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          query={debouncedQ}
          active={activeTab}
          genres={selectedGenres}
        />
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          numColumns={numColumns}
          key={`${viewMode}-${numColumns}`}
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          ListHeaderComponent={
            <GenreResultHeader genres={selectedGenres} accent={accent} />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0C0C18" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  viewToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 15, paddingVertical: 0 },

  tabsRow: { flexGrow: 0, marginBottom: 14 },
  tabsContainer: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  tabText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  // Genre section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  gridItem: { flex: 1, margin: 6 },
  listItem: { marginHorizontal: 0 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, fontWeight: "500" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 60,
  },
  emptyTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySub: { color: "rgba(255,255,255,0.3)", fontSize: 13 },
});

// Genre strip styles
const genreStyles = StyleSheet.create({
  row: { marginBottom: 14 },
  container: { paddingHorizontal: 16, gap: 7 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  clearChip: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "rgba(255,80,80,0.4)",
    backgroundColor: "rgba(255,80,80,0.12)",
  },
  clearText: {
    color: "rgba(255,100,100,0.9)",
    fontSize: 11,
    fontWeight: "600",
  },
});

// Randomizer styles
const randStyles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 6 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
});

// Genre result header styles
const headerStyles = StyleSheet.create({
  wrap: { paddingBottom: 12 },
  inner: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  sub: { color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 2 },
});
