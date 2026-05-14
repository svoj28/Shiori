import { useSearchAuthors, useSearchStudios } from "@/hooks/useAllCreators";
import { useDebounce } from "@/hooks/useDebounce";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const BG      = "#0A0A14";
const SURFACE = "#111120";
const BORDER  = "rgba(255,255,255,0.07)";

const ACCENT_STUDIO = "#EC4899"; // pink  — matches Library ACCENT
const ACCENT_AUTHOR = "#06B6D4"; // cyan  — matches Library collection badge

type CreatorKind = "studio" | "author";
type CreatorType  = "studios" | "authors";

interface Creator {
  id: number;
  name: string;
  fullName?: string;
  image?: string;
  isAnimationStudio?: boolean;
  siteUrl?: string;
  staffMedia?: {
    nodes: Array<{
      id: number;
      title: { romaji: string; english: string; userPreferred: string };
      type: string;
      format: string;
    }>;
  };
}

// Avatar background pairs cycled from first letter
const AVATAR_PAIRS: [string, string][] = [
  ["#7C3AED", "#4C1D95"],
  ["#BE185D", "#831843"],
  ["#0E7490", "#164E63"],
  ["#1D4ED8", "#1E3A8A"],
  ["#B45309", "#78350F"],
  ["#065F46", "#022C22"],
];
function avatarColors(letter: string): [string, string] {
  const idx =
    ((letter.toUpperCase().charCodeAt(0) - 65) % AVATAR_PAIRS.length +
      AVATAR_PAIRS.length) %
    AVATAR_PAIRS.length;
  return AVATAR_PAIRS[idx];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionHdr}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={s.sectionSub}>{subtitle}</Text> : null}
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function EmptyCard({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIconBox}>
        <Ionicons name={icon} size={24} color="rgba(255,255,255,0.22)" />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{subtitle}</Text>
    </View>
  );
}

// ─── Animated creator row ─────────────────────────────────────────────────────

function CreatorRow({
  item,
  index,
  onPress,
  accent,
}: {
  item: Creator;
  index: number;
  onPress: (c: Creator) => void;
  accent: string;
}) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index * 40, 360),
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressIn  = () =>
    Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, speed: 32 }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1,     useNativeDriver: true, speed: 32 }).start();

  const displayName = item.name || item.fullName || "";
  const letter      = displayName[0] ?? "?";
  const [top, bot]  = avatarColors(letter);

  const hasWorks   = !!item.staffMedia?.nodes?.length;

  // Guard: the API may return title as { full, native, ... } or { romaji, english, userPreferred }
  // Safely extract any string value from whatever shape arrives.
  const extractTitle = (t: any): string => {
    if (!t) return "";
    if (typeof t === "string") return t;
    if (typeof t === "object") {
      return (
        t.userPreferred || t.romaji || t.english || t.full || t.native ||
        Object.values(t).find((v) => typeof v === "string") || ""
      ) as string;
    }
    return "";
  };

  const workTitles = hasWorks
    ? item.staffMedia!.nodes
        .slice(0, 2)
        .map((w) => extractTitle(w.title))
        .filter(Boolean)
        .join(" · ") || null
    : null;
  const extraCount = hasWorks ? Math.max(0, item.staffMedia!.nodes.length - 2) : 0;

  const subtitleLabel =
    item.isAnimationStudio !== undefined
      ? item.isAnimationStudio ? "Animation Studio" : "Production Studio"
      : undefined;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale: scaleAnim },
        ],
      }}
    >
      <Pressable
        onPress={() => onPress(item)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={s.creatorCard}
      >
        {/* Avatar */}
        <View style={[s.avatar, { backgroundColor: top }]}>
          <View style={[s.avatarShade, { backgroundColor: bot }]} />
          <Text style={s.avatarLetter}>{letter.toUpperCase()}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={s.creatorName} numberOfLines={1}>{displayName}</Text>
          <View style={s.metaRow}>
            {subtitleLabel && (
              <View style={[s.badge, { backgroundColor: accent + "22" }]}>
                <Text style={[s.badgeText, { color: accent }]}>{subtitleLabel}</Text>
              </View>
            )}
            {!!workTitles && (
              <Text style={s.workTitles} numberOfLines={1}>
                {String(workTitles)}
                {extraCount > 0 && (
                  <Text style={s.extraCount}>{` +${extraCount}`}</Text>
                )}
              </Text>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.18)" />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AllCreatorsScreen() {
  const router = useRouter();
  const [creatorType, setCreatorType] = useState<CreatorType>("studios");
  const [search, setSearch]           = useState("");
  const debouncedSearch               = useDebounce(search.trim(), 500);

  const accent = creatorType === "studios" ? ACCENT_STUDIO : ACCENT_AUTHOR;

  const { data: studiosResults, isLoading: studiosLoading, error: studiosError } =
    useSearchStudios(debouncedSearch);
  const { data: authorsResults, isLoading: authorsLoading, error: authorsError } =
    useSearchAuthors(debouncedSearch);

  const results   = creatorType === "studios" ? studiosResults : authorsResults;
  const isLoading = creatorType === "studios" ? studiosLoading : authorsLoading;
  const error     = creatorType === "studios" ? studiosError   : authorsError;

  const handleCreatorPress = (creator: Creator) => {
    const kind: CreatorKind = creatorType === "studios" ? "studio" : "author";
    const name = creator.name || creator.fullName || "";
    router.push({ pathname: "/creator", params: { kind, name } });
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Ambient orbs — identical to LibraryScreen */}
      <View style={s.orbTopLeft}  pointerEvents="none" />
      <View style={s.orbMidRight} pointerEvents="none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardDismissMode="on-drag"
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>Discover</Text>
            <Text style={s.title}>Creators</Text>
          </View>
          <View style={[s.headerIconWrap, { backgroundColor: accent + "1F", borderColor: accent + "33" }]}>
            <Ionicons
              name={creatorType === "studios" ? "videocam" : "book"}
              size={19}
              color={accent}
            />
          </View>
        </View>

        {/* ── Hero card ── */}
        <View style={s.heroCard}>
          {/* Tab pills — same pattern as LibraryScreen */}
          <View style={s.tabRow}>
            {(["studios", "authors"] as CreatorType[]).map((tab) => {
              const active     = creatorType === tab;
              const tabAccent  = tab === "studios" ? ACCENT_STUDIO : ACCENT_AUTHOR;
              return (
                <Pressable
                  key={tab}
                  onPress={() => { setCreatorType(tab); setSearch(""); }}
                  style={({ pressed }) => [
                    s.tabPill,
                    active && { backgroundColor: tabAccent, borderColor: tabAccent },
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <Ionicons
                    name={tab === "studios" ? "videocam-outline" : "book-outline"}
                    size={12}
                    color={active ? "#fff" : "rgba(255,255,255,0.42)"}
                  />
                  <Text style={[s.tabText, active && s.tabTextActive]}>
                    {tab === "studios" ? "Studios" : "Authors"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Search box */}
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={15} color="rgba(255,255,255,0.32)" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${creatorType}…`}
              placeholderTextColor="rgba(255,255,255,0.22)"
              style={s.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={accent}
              autoFocus
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={10}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.32)" />
              </Pressable>
            )}
          </View>
        </View>

        <Divider />

        {/* ── Results ── */}
        {error ? (
          <EmptyCard
            icon="alert-circle-outline"
            title="Search Failed"
            subtitle={error instanceof Error ? error.message : "Something went wrong. Try again."}
          />
        ) : search.length === 0 ? (
          <EmptyCard
            icon={creatorType === "studios" ? "videocam-outline" : "book-outline"}
            title="Start Searching"
            subtitle={`Type a name to find ${
              creatorType === "studios" ? "animation studios" : "manga / LN authors"
            }`}
          />
        ) : isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator color={accent} size="large" />
            <Text style={s.loadingText}>Searching {creatorType}…</Text>
          </View>
        ) : results && results.length > 0 ? (
          <>
            <SectionHeader
              title={creatorType === "studios" ? "Studios" : "Authors"}
              subtitle={`${results.length} result${results.length !== 1 ? "s" : ""} found`}
            />
            <View style={s.listWrapper}>
              {results.map((item: Creator, index: number) => (
                <CreatorRow
                  key={String(item.id)}
                  item={item}
                  index={index}
                  onPress={handleCreatorPress}
                  accent={accent}
                />
              ))}
            </View>
          </>
        ) : (
          <EmptyCard
            icon="search-outline"
            title="No Results"
            subtitle={`No ${creatorType} found matching "${search}"`}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 24 },

  // Ambient orbs (identical to LibraryScreen)
  orbTopLeft: {
    position: "absolute",
    top: -60, left: -40,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(236,72,153,0.07)",
  },
  orbMidRight: {
    position: "absolute",
    top: 340, right: -50,
    width: 160, height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(6,182,212,0.05)",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  headerIconWrap: {
    width: 38, height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero card
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: SURFACE,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },

  // Tab pills
  tabRow: { flexDirection: "row", gap: 7 },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabText:       { color: "rgba(255,255,255,0.42)", fontSize: 12, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    paddingVertical: 0,
    letterSpacing: 0.1,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginHorizontal: 16,
    marginBottom: 18,
  },

  // Section header
  sectionHdr:   { paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 3 },
  sectionSub:   { color: "rgba(255,255,255,0.32)", fontSize: 12 },

  // Loading
  loadingContainer: {
    paddingTop: 60,
    alignItems: "center",
    gap: 14,
  },
  loadingText: {
    color: "rgba(255,255,255,0.32)",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // Empty card
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  emptyIconBox: {
    width: 48, height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  emptySub: {
    color: "rgba(255,255,255,0.32)",
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 260,
  },

  // List
  listWrapper: { paddingHorizontal: 16, gap: 2 },

  // Creator card row
  creatorCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 14,
  },

  // Avatar
  avatar: {
    width: 44, height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarShade: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: "50%",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  avatarLetter: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  // Row text
  creatorName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  workTitles: {
    color: "rgba(255,255,255,0.32)",
    fontSize: 11,
    flexShrink: 1,
  },
  extraCount: {
    color: "rgba(255,255,255,0.18)",
    fontSize: 10,
    fontWeight: "600",
  },
});