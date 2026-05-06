import { useAnimeSearch } from "@/hooks/useAnime";
import { useDebounce } from "@/hooks/useDebounce";
import { useLightNovelSearch } from "@/hooks/useLightNovel";
import { useMangaSearch } from "@/hooks/useManga";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import MediaCard, { MediaItem, MediaType } from "../../components/MediaCard";

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

function normaliseMangaDex(item: any): MediaItem {
  const attrs = item.attributes ?? {};
  const title =
    attrs.title?.en ?? Object.values(attrs.title ?? {})[0] ?? "Unknown";
  const coverRel = item.relationships?.find((r: any) => r.type === "cover_art");
  const filename = coverRel?.attributes?.fileName;
  const cover = filename
    ? `https://uploads.mangadex.org/covers/${item.id}/${filename}.256.jpg`
    : "";
  return {
    id: item.id,
    title: String(title),
    coverImage: cover,
    type: "manga",
    chapters: attrs.lastChapter ? Number(attrs.lastChapter) : undefined,
    genres: [],
    raw: item,
  };
}

function normaliseConsumet(item: any): MediaItem {
  return {
    id: item.id ?? item.title,
    title: item.title ?? "Unknown",
    coverImage: item.image ?? item.cover ?? "",
    type: "lightnovel",
    raw: item,
  };
}

// ─── Empty / placeholder states ───────────────────────────────────────────────

function EmptyState({ query, active }: { query: string; active: FilterTab }) {
  const color = ACCENT[active];
  return (
    <View style={styles.emptyWrap}>
      <Ionicons
        name="search-outline"
        size={52}
        color={color}
        style={{ opacity: 0.4 }}
      />
      {query.length > 0 ? (
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [activeTab, setTab] = useState<FilterTab>("all");
  const [viewMode, setView] = useState<"grid" | "list">("grid");

  const debouncedQ = useDebounce(query, 400);
  const accent = ACCENT[activeTab];

  // Fetch from all three sources in parallel; each hook is enabled only when
  // we actually need it (matching active tab or "all")
  const needsAnime = activeTab === "all" || activeTab === "anime";
  const needsManga = activeTab === "all" || activeTab === "manga";
  const needsLN = activeTab === "all" || activeTab === "lightnovel";

  const animeQ = useAnimeSearch(needsAnime ? debouncedQ : "");
  const mangaQ = useMangaSearch(needsManga ? debouncedQ : "");
  const lnQ = useLightNovelSearch(needsLN ? debouncedQ : "");

  // Normalise and merge results
  const results = useMemo<MediaItem[]>(() => {
    const out: MediaItem[] = [];

    if (needsAnime && animeQ.data) {
      animeQ.data.forEach((i: any) => out.push(normaliseAnilist(i, "anime")));
    }
    if (needsManga) {
      if (mangaQ.data) {
        // MangaDex returns raw objects
        mangaQ.data.forEach((i: any) => out.push(normaliseMangaDex(i)));
      }
    }
    if (needsLN && lnQ.data?.results) {
      lnQ.data.results.forEach((i: any) => out.push(normaliseConsumet(i)));
    }

    return out;
  }, [animeQ.data, mangaQ.data, lnQ.data, needsAnime, needsManga, needsLN]);

  const isLoading =
    (needsAnime && animeQ.isLoading) ||
    (needsManga && mangaQ.isLoading) ||
    (needsLN && lnQ.isLoading);

  const handleClear = useCallback(() => {
    setQuery("");
    Keyboard.dismiss();
  }, []);

  // ── Render item (grid or list) ─────────────────────────────────────────────
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>

        {/* View toggle */}
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
          placeholder="Search titles…"
          placeholderTextColor="rgba(255,255,255,0.28)"
          value={query}
          onChangeText={setQuery}
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
              onPress={() => setTab(tab.key)}
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

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {isLoading && debouncedQ.length > 1 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={accent} size="large" />
          <Text style={[styles.loadingText, { color: accent }]}>
            Searching…
          </Text>
        </View>
      ) : results.length === 0 ? (
        <EmptyState query={debouncedQ} active={activeTab} />
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
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0C0C18",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
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

  // Search
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
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    paddingVertical: 0,
  },

  // Tabs
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

  // Results
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  gridItem: {
    flex: 1,
    margin: 6,
  },
  listItem: {
    marginHorizontal: 0,
  },

  // States
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
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
  emptySub: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
  },
});
