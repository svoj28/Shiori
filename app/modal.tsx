import {
  TRACKER_STATUSES_DISPLAY,
  useTracker,
  type TrackerStatus,
} from "@/contexts/tracker-context";
import { getMediaDetail, getRecommendations } from "@/services/anilist";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import YoutubePlayer from "react-native-youtube-iframe";

import {
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
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

// ─── Design Tokens ──────────────────────────────────────────────────────────────
const BG = "#080810";
const SURFACE = "#0F0F1E";
const CARD = "#13132A";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT = "#FFFFFF";
const TEXT_SUB = "rgba(255,255,255,0.55)";
const TEXT_MUTED = "rgba(255,255,255,0.28)";

const TYPE_COLOR: Record<string, string> = {
  anime: "#7C5CFC",
  manga: "#16A881",
  lightnovel: "#D4860A",
};

const TYPE_GRADIENT: Record<string, [string, string]> = {
  anime: ["#7C5CFC", "#A78BFA"],
  manga: ["#16A881", "#2DD4A8"],
  lightnovel: ["#D4860A", "#F5B040"],
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
function stripHtml(value: string) {
  return (
    value
      ?.replace(/<[^>]+>/g, "")
      .replace(/&[^;]+;/g, " ")
      .trim() ?? ""
  );
}

function getCountdownParts(seconds?: number | null) {
  if (seconds == null || seconds <= 0)
    return { d: 0, h: 0, m: 0, s: 0, expired: true };
  const total = Math.floor(seconds);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    expired: false,
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={sub.sectionHeader}>
      <Text style={sub.sectionTitle}>{title}</Text>
      <View style={sub.sectionLine} />
    </View>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={[sub.statChip, { borderColor: accent + "30" }]}>
      <Text style={[sub.statLabel, { color: accent }]}>{label}</Text>
      <Text style={sub.statValue}>{value}</Text>
    </View>
  );
}

function Stepper({
  label,
  value,
  onChange,
  accent,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  accent: string;
  max?: number | null;
}) {
  const atMax = max != null && value >= max;
  const atMin = value <= 0;

  return (
    <View style={[sub.stepperCard, { borderColor: accent + "20" }]}>
      <View style={sub.stepperTop}>
        <Text style={sub.stepperLabel}>{label}</Text>
        {max != null && (
          <Text style={[sub.stepperMax, { color: accent }]}>/ {max}</Text>
        )}
      </View>
      <View style={sub.stepperRow}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          disabled={atMin}
          style={[
            sub.stepperBtn,
            { borderColor: accent + "50" },
            atMin && sub.stepperBtnDisabled,
          ]}
        >
          <Ionicons
            name="remove"
            size={18}
            color={atMin ? TEXT_MUTED : accent}
          />
        </Pressable>

        <View style={sub.stepperValWrap}>
          <Text style={sub.stepperValue}>{value}</Text>
          {max != null && (
            <View style={[sub.stepperBar, { backgroundColor: accent + "22" }]}>
              <View
                style={[
                  sub.stepperFill,
                  {
                    backgroundColor: accent,
                    width: `${Math.min(100, (value / max) * 100)}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>

        <Pressable
          onPress={() =>
            onChange(max != null ? Math.min(max, value + 1) : value + 1)
          }
          disabled={atMax}
          style={[
            sub.stepperBtn,
            { borderColor: accent + "50" },
            atMax && sub.stepperBtnDisabled,
          ]}
        >
          <Ionicons name="add" size={18} color={atMax ? TEXT_MUTED : accent} />
        </Pressable>
      </View>
    </View>
  );
}

function SkeletonLine({
  width,
  height = 13,
}: {
  width: number | `${number}%`;
  height?: number;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.6],
  });
  return (
    <Animated.View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: CARD,
        width: width as any,
        opacity,
        marginBottom: 8,
      }}
    />
  );
}

const sub = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: CARD_BORDER },

  statChip: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    gap: 6,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: { color: TEXT, fontSize: 15, fontWeight: "800" },

  stepperCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  stepperTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stepperLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stepperMax: { fontSize: 12, fontWeight: "700" },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperValWrap: { alignItems: "center", gap: 8, flex: 1 },
  stepperValue: { color: TEXT, fontSize: 22, fontWeight: "800" },
  stepperBar: { height: 4, borderRadius: 2, width: 80, overflow: "hidden" },
  stepperFill: { height: "100%", borderRadius: 2 },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function ModalScreen() {
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const router = useRouter();
  const tracker = useTracker();
  const trackerCompat = tracker as any;
  const params = useLocalSearchParams<{
    id: string;
    type: string;
    title: string;
    cover: string;
  }>();

  const id = params.id ?? "";
  const type = (params.type ?? "anime") as "anime" | "manga" | "lightnovel";
  const accent = TYPE_COLOR[type] ?? "#A78BFA";
  const gradPair = TYPE_GRADIENT[type] ?? ["#7C5CFC", "#A78BFA"];
  const seedTitle = decodeURIComponent(params.title ?? "");
  const seedCover = params.cover ?? "";

  const anilistType = type === "anime" ? "ANIME" : "MANGA";
  const numericId = Number.parseInt(id, 10);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["tracker-detail", id, type],
    queryFn: () =>
      getMediaDetail(numericId, type === "lightnovel" ? "MANGA" : anilistType),
    enabled: Number.isFinite(numericId),
    retry: 1,
  });

  const { data: recommendations } = useQuery({
    queryKey: ["tracker-recommendations", id, type],
    queryFn: () =>
      getRecommendations(
        numericId,
        type === "lightnovel" ? "MANGA" : anilistType,
      ),
    enabled: Number.isFinite(numericId),
    staleTime: 1000 * 60 * 10,
  });

  const displayTitle =
    detail?.title?.english ?? detail?.title?.romaji ?? seedTitle;
  const displayCover =
    detail?.coverImage?.extraLarge ?? detail?.coverImage?.large ?? seedCover;
  const description = stripHtml(detail?.description ?? "");
  const genres = detail?.genres ?? [];

  const officialLinks = useMemo(() => {
    const links = (detail?.externalLinks ?? []) as Array<{
      site?: string;
      url?: string;
      type?: string;
    }>;
    const preferredType = type === "anime" ? "STREAMING" : "READING";
    const filtered = links.filter(
      (l) => l.url && (!l.type || l.type === preferredType),
    );
    return (filtered.length > 0 ? filtered : links)
      .filter((l) => Boolean(l.url))
      .slice(0, 6);
  }, [detail?.externalLinks, type]);

  const totalProgress =
    type === "anime" ? (detail?.episodes ?? null) : (detail?.chapters ?? null);
  const entry = tracker.getEntry(id, type);
  const entryCompat = entry as any;
  const entryProgress = entry?.progress ?? 0;
  const isWishlisted = Boolean(entryCompat?.wishlist ?? entry?.isWishlist);
  const entryCollections: string[] = (entryCompat?.collections ??
    []) as string[];
  const isTracked = Boolean(entry);
  const releasedProgress =
    type === "anime" &&
    detail?.status === "RELEASING" &&
    detail?.nextAiringEpisode?.episode
      ? Math.max(0, detail.nextAiringEpisode.episode - 1)
      : null;
  const progressLimit = releasedProgress ?? totalProgress;
  const [now, setNow] = useState(() => Date.now());

  // ── Live countdown ticker — always active when anime is releasing ──
  useEffect(() => {
    if (
      type !== "anime" ||
      detail?.status !== "RELEASING" ||
      !detail?.nextAiringEpisode
    )
      return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [detail?.nextAiringEpisode, detail?.status, type]);

  const countdownParts =
    type === "anime" &&
    detail?.status === "RELEASING" &&
    detail?.nextAiringEpisode
      ? getCountdownParts(
          detail.nextAiringEpisode.airingAt
            ? detail.nextAiringEpisode.airingAt - now / 1000
            : detail.nextAiringEpisode.timeUntilAiring,
        )
      : null;

  // Show airing section whenever we have releasing status + any useful data
  const showAiringSection =
    type === "anime" &&
    detail?.status === "RELEASING" &&
    (releasedProgress != null || countdownParts != null);

  const [progressDraft, setProgressDraft] = useState("0");
  const [rewatchDraft, setRewatchDraft] = useState("0");
  const [collectionDraft, setCollectionDraft] = useState("");
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  useEffect(() => {
    const seededProgress = entry?.progress ?? (progressLimit ? 1 : 0);
    setProgressDraft(String(seededProgress));
    setRewatchDraft(String(entry?.rewatches ?? 0));
    setTrailerPlaying(false);
  }, [entry?.progress, entry?.rewatches, progressLimit]);

  const payload = useMemo(
    () => ({
      id,
      type,
      title: displayTitle,
      coverImage: displayCover,
      totalProgress,
    }),
    [displayCover, displayTitle, id, totalProgress, type],
  );

  const save = (recipe: (current: any) => any) =>
    trackerCompat.mutateEntry(payload, recipe);

  const setStatus = (status: TrackerStatus) => {
    if (status === "None") {
      if (!isTracked) {
        setProgressDraft("0");
        setRewatchDraft("0");
        return;
      }
      save((c) => ({
        ...c,
        status,
        wishlist: true,
        isWishlist: true,
        updatedAt: Date.now(),
      }));
      return;
    }
    save((c) => ({
      ...c,
      status,
      wishlist: true,
      isWishlist: true,
      progress:
        status === "Completed" && c.totalProgress
          ? c.totalProgress
          : Math.max(c.progress, Number.parseInt(progressDraft, 10) || 0),
      updatedAt: Date.now(),
    }));
  };

  const toggleWishlist = () => {
    if (isWishlisted) {
      save((c: any) => ({
        ...c,
        wishlist: false,
        isWishlist: false,
        updatedAt: Date.now(),
      }));
    } else {
      save((c: any) => ({
        ...c,
        wishlist: true,
        isWishlist: true,
        updatedAt: Date.now(),
      }));
    }
  };

  const applyProgress = (next: number) => {
    const clamped =
      progressLimit != null
        ? Math.min(progressLimit, Math.max(0, next))
        : Math.max(0, next);
    if (!isTracked) {
      setProgressDraft(String(clamped));
      return;
    }
    save((c) => ({
      ...c,
      progress: clamped,
      wishlist: true,
      isWishlist: true,
      updatedAt: Date.now(),
    }));
    setProgressDraft(String(clamped));
  };

  const applyRewatches = (next: number) => {
    const n = Math.max(0, next);
    if (!isTracked) {
      setRewatchDraft(String(n));
      return;
    }
    save((c) => ({
      ...c,
      rewatches: n,
      wishlist: true,
      isWishlist: true,
      updatedAt: Date.now(),
    }));
    setRewatchDraft(String(n));
  };

  const addCollection = () => {
    const name = collectionDraft.trim();
    if (!name) return;
    save((c) => ({
      ...c,
      collections: Array.from(new Set([...c.collections, name])),
      wishlist: true,
      isWishlist: true,
      updatedAt: Date.now(),
    }));
    setCollectionDraft("");
  };

  const addToExistingCollection = (name: string) => {
    save((c) => ({
      ...c,
      collections: Array.from(new Set([...c.collections, name])),
      wishlist: true,
      isWishlist: true,
      updatedAt: Date.now(),
    }));
    setShowCollectionPicker(false);
  };

  const removeCollection = (name: string) => {
    if (!isTracked) return;
    save((c) => ({
      ...c,
      collections: c.collections.filter((col: string) => col !== name),
      updatedAt: Date.now(),
    }));
  };

  const scoreVal = detail?.averageScore
    ? (detail.averageScore / 10).toFixed(1)
    : null;
  const typeLabel =
    type === "lightnovel"
      ? "Light Novel"
      : type === "anime"
        ? "Anime"
        : "Manga";

  const airingStatusInfo = detail?.status
    ? (() => {
        switch (detail.status) {
          case "RELEASING":
            return { label: "Airing", icon: "radio-outline" as const, color: "#22C55E" };
          case "FINISHED":
            return { label: "Completed", icon: "checkmark-circle-outline" as const, color: "#60A5FA" };
          case "NOT_YET_RELEASED":
            return { label: "Coming Soon", icon: "time-outline" as const, color: "#FBBF24" };
          case "CANCELLED":
            return { label: "Cancelled", icon: "close-circle-outline" as const, color: "#F87171" };
          case "HIATUS":
            return { label: "On Hiatus", icon: "pause-circle-outline" as const, color: "#FB923C" };
          default:
            return null;
        }
      })()
    : null;

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          {/* ── Banner ── */}
          <View style={s.bannerWrap}>
            <Image
              source={{ uri: displayCover }}
              style={s.banner}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(8,8,16,0)", "rgba(8,8,16,0.6)", BG]}
              locations={[0.15, 0.65, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={[accent + "00", accent + "18"]}
              style={StyleSheet.absoluteFillObject}
            />
            <SafeAreaView edges={["top"]} style={s.topBar}>
              <Pressable onPress={() => router.back()} style={s.backBtn}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
              <View style={s.topRight}>
                {isWishlisted && (
                  <View
                    style={[
                      s.wishlistBadge,
                      {
                        backgroundColor: "#F472B6" + "22",
                        borderColor: "#F472B6" + "55",
                      },
                    ]}
                  >
                    <Ionicons name="heart" size={11} color="#F472B6" />
                    <Text style={s.wishlistBadgeText}>Wishlist</Text>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </View>

          {/* ── Hero Row ── */}
          <View style={s.heroRow}>
            <View style={[s.coverShadow, { shadowColor: accent }]}>
              <Image
                source={{ uri: displayCover }}
                style={[s.cover, { borderColor: accent }]}
                contentFit="cover"
              />
            </View>
            <View style={s.heroMeta}>
              <View
                style={[
                  s.typeBadge,
                  {
                    backgroundColor: accent + "22",
                    borderColor: accent + "55",
                  },
                ]}
              >
                <Text style={[s.typeBadgeText, { color: accent }]}>
                  {typeLabel.toUpperCase()}
                </Text>
              </View>

              <Text style={s.heroTitle} numberOfLines={3}>
                {displayTitle}
              </Text>

              {/* Airing status badge */}
              {airingStatusInfo && (
                <View style={[s.airingStatusBadge, { backgroundColor: airingStatusInfo.color + "18", borderColor: airingStatusInfo.color + "40" }]}>
                  <Ionicons name={airingStatusInfo.icon} size={11} color={airingStatusInfo.color} />
                  <Text style={[s.airingStatusText, { color: airingStatusInfo.color }]}>
                    {airingStatusInfo.label}
                  </Text>
                </View>
              )}

              {scoreVal && (
                <View style={s.scoreRow}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={s.scoreText}>{scoreVal}</Text>
                  <Text style={s.scoreMax}>/10</Text>
                </View>
              )}

              {entry ? (
                <View
                  style={[
                    s.entryStatusBadge,
                    {
                      backgroundColor: accent + "18",
                      borderColor: accent + "35",
                    },
                  ]}
                >
                  <View
                    style={[s.entryStatusDot, { backgroundColor: accent }]}
                  />
                  <Text
                    style={[s.entryStatusText, { color: accent }]}
                    numberOfLines={1}
                  >
                    {entry.status}
                    {entry.totalProgress
                      ? ` · ${entryProgress}/${entry.totalProgress}`
                      : entryProgress > 0
                        ? ` · ${entryProgress}`
                        : ""}
                  </Text>
                </View>
              ) : (
                <Text style={s.notTracked}>
                  Choose a status to add this title to your wishlist
                </Text>
              )}
            </View>
          </View>

          {/* ── Overview ── */}
          {(detailLoading || description || genres.length > 0) && (
            <View style={s.section}>
              <SectionHeader title="Overview" />
              {detailLoading ? (
                <View style={{ paddingTop: 4 }}>
                  <SkeletonLine width="100%" />
                  <SkeletonLine width="90%" />
                  <SkeletonLine width="75%" />
                  <SkeletonLine width="55%" height={10} />
                </View>
              ) : (
                <>
                  {description.length > 0 && (
                    <Text style={s.description}>{description}</Text>
                  )}
                  {genres.length > 0 && (
                    <View style={s.genreRow}>
                      {genres.slice(0, 6).map((genre: string) => (
                        <View
                          key={genre}
                          style={[
                            s.genrePill,
                            {
                              borderColor: accent + "55",
                              backgroundColor: accent + "18",
                            },
                          ]}
                        >
                          <Text style={[s.genreText, { color: accent }]}>
                            {genre}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* ── Airing Countdown — always visible, no wishlist gate ── */}
          {showAiringSection && (
            <View style={s.section}>
              <SectionHeader title="Airing" />
              <View style={s.airingCard}>

                {/* Header row */}
                <View style={s.airingHeader}>
                  <View style={[s.airingIconWrap, { backgroundColor: accent + "22" }]}>
                    <Ionicons name="radio-outline" size={15} color={accent} />
                  </View>
                  <View style={s.airingHeaderText}>
                    <Text style={s.airingStatus}>Currently airing</Text>
                    {releasedProgress != null && totalProgress != null && (
                      <Text style={s.airingEpLabel}>
                        Episode {releasedProgress} of {totalProgress} released
                      </Text>
                    )}
                  </View>
                  {releasedProgress != null && totalProgress != null && (
                    <View style={[s.airingPill, { backgroundColor: accent + "22" }]}>
                      <Text style={[s.airingPillText, { color: accent }]}>
                        {Math.max(totalProgress - releasedProgress, 0)} left
                      </Text>
                    </View>
                  )}
                </View>

                {/* Progress bar */}
                {releasedProgress != null && totalProgress != null && (
                  <View style={s.airingProgressWrap}>
                    <View style={[s.airingBarBg, { backgroundColor: accent + "22" }]}>
                      <View
                        style={[
                          s.airingBarFill,
                          {
                            backgroundColor: accent,
                            width: `${Math.min(100, (releasedProgress / totalProgress) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <View style={s.airingBarLabels}>
                      <Text style={s.airingBarLabel}>{releasedProgress} aired</Text>
                      <Text style={s.airingBarLabel}>{totalProgress} total</Text>
                    </View>
                  </View>
                )}

                {/* Countdown tiles */}
                {countdownParts && (
                  <View style={s.airingCountdownWrap}>
                    <Text style={s.airingCountdownTitle}>Next episode in</Text>
                    <View style={s.airingTileRow}>
                      {[
                        { val: countdownParts.d, lbl: "days" },
                        { val: countdownParts.h, lbl: "hrs" },
                        { val: countdownParts.m, lbl: "min" },
                        { val: countdownParts.s, lbl: "sec" },
                      ].map(({ val, lbl }) => (
                        <View key={lbl} style={[s.airingTile, { backgroundColor: accent + "12" }]}>
                          <Text style={[s.airingTileVal, { color: accent }]}>
                            {pad2(val)}
                          </Text>
                          <Text style={s.airingTileLbl}>{lbl}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

              </View>
            </View>
          )}

          {/* ── Trailer ── */}
          {detail?.trailer?.id && (
            <View style={s.section}>
              <SectionHeader title="Trailer" />
              {trailerPlaying ? (
                <YoutubePlayer
                  height={210}
                  videoId={detail.trailer.id}
                  play={true}
                  webViewStyle={{ borderRadius: 16, overflow: "hidden" }}
                />
              ) : (
                <Pressable
                  onPress={() => setTrailerPlaying(true)}
                  style={s.trailerThumb}
                >
                  <Image
                    source={{
                      uri:
                        detail?.trailer?.thumbnail ??
                        detail?.bannerImage ??
                        displayCover,
                    }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)"]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <LinearGradient
                    colors={gradPair}
                    style={s.trailerPlayBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="play" size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={s.trailerLabel}>Watch Trailer</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ── Characters ── */}
          {detail?.characters?.edges?.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                title={type === "anime" ? "Characters & VA" : "Characters"}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.horizRow}
              >
                {detail.characters.edges.map((edge: any) => {
                  const char = edge.node;
                  const va = edge.voiceActors?.[0];
                  return (
                    <View key={char.name.full} style={s.charCard}>
                      <View style={s.charImgRow}>
                        <Image
                          source={{ uri: char.image?.large }}
                          style={s.charImg}
                          contentFit="cover"
                        />
                        {va && (
                          <Image
                            source={{ uri: va.image?.large }}
                            style={s.vaImg}
                            contentFit="cover"
                          />
                        )}
                      </View>
                      <View style={s.charInfo}>
                        <Text style={s.charName} numberOfLines={2}>
                          {char.name.full}
                        </Text>
                        <Text style={[s.charRole, { color: accent }]}>
                          {edge.role === "MAIN" ? "Main" : "Supporting"}
                        </Text>
                        {va && (
                          <Text style={s.vaName} numberOfLines={1}>
                            {va.name.full}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Staff & Studio ── */}
          {(detail?.staff?.edges?.length > 0 ||
            detail?.studios?.nodes?.length > 0) && (
            <View style={s.section}>
              <SectionHeader
                title={type === "anime" ? "Staff & Studio" : "Staff & Author"}
              />
              {detail?.studios?.nodes?.length > 0 && (
                <View
                  style={[
                    s.studioRow,
                    {
                      borderColor: accent + "35",
                      backgroundColor: accent + "0E",
                    },
                  ]}
                >
                  <View
                    style={[
                      s.studioIconWrap,
                      { backgroundColor: accent + "25" },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={14}
                      color={accent}
                    />
                  </View>
                  <View>
                    <Text style={[s.studioLabel, { color: accent }]}>
                      {type === "anime" ? "Studio" : "Publisher"}
                    </Text>
                    <Text style={s.studioName}>
                      {detail.studios.nodes.map((n: any) => n.name).join(", ")}
                    </Text>
                  </View>
                </View>
              )}
              <View style={s.staffGrid}>
                {detail?.staff?.edges?.map((edge: any) => (
                  <View
                    key={edge.node.name.full + edge.role}
                    style={s.staffCard}
                  >
                    <Image
                      source={{ uri: edge.node.image?.large }}
                      style={s.staffImg}
                      contentFit="cover"
                    />
                    <View style={s.staffInfo}>
                      <Text style={s.staffName} numberOfLines={2}>
                        {edge.node.name.full}
                      </Text>
                      <Text
                        style={[s.staffRole, { color: accent }]}
                        numberOfLines={1}
                      >
                        {edge.role}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Where to watch/read ── */}
          {officialLinks.length > 0 && (
            <View style={s.section}>
              <SectionHeader
                title={type === "anime" ? "Where to Watch" : "Where to Read"}
              />
              <View style={s.linksList}>
                {officialLinks.map((link: any) => (
                  <Pressable
                    key={`${link.site}-${link.url}`}
                    onPress={() => Linking.openURL(link.url)}
                    style={({ pressed }) => [
                      s.linkCard,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <LinearGradient
                      colors={[accent + "20", accent + "08"]}
                      style={s.linkIconWrap}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="open-outline" size={15} color={accent} />
                    </LinearGradient>
                    <View style={s.linkInfo}>
                      <Text style={s.linkSite}>
                        {link.site ?? "Official source"}
                      </Text>
                      <Text style={s.linkType}>
                        {link.type ?? "Official link"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={TEXT_MUTED}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* ── Recommendations ── */}
          {recommendations && recommendations.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="Recommendations" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.horizRow}
              >
                {recommendations.map((rec: any) => {
                  const recType =
                    rec.format === "MANGA"
                      ? "manga"
                      : rec.format === "NOVEL"
                        ? "lightnovel"
                        : "anime";
                  const recAccent = TYPE_COLOR[recType] ?? "#A78BFA";
                  const recTitle =
                    rec.title?.english ?? rec.title?.romaji ?? "Unknown";
                  const recCover =
                    rec.coverImage?.extraLarge ?? rec.coverImage?.large;
                  return (
                    <Pressable
                      key={rec.id}
                      style={s.recCard}
                      onPress={() =>
                        router.push({
                          pathname: "/modal",
                          params: {
                            id: String(rec.id),
                            type: recType,
                            title: encodeURIComponent(recTitle),
                            cover: recCover ?? "",
                          },
                        })
                      }
                    >
                      <Image
                        source={{ uri: recCover }}
                        style={s.recCover}
                        contentFit="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.72)"]}
                        style={s.recGrad}
                      />
                      <View
                        style={[
                          s.recBadge,
                          {
                            backgroundColor: recAccent + "22",
                            borderColor: recAccent + "55",
                          },
                        ]}
                      >
                        <Text style={[s.recBadgeText, { color: recAccent }]}>
                          {recType === "lightnovel"
                            ? "LN"
                            : recType.toUpperCase()}
                        </Text>
                      </View>
                      <View style={s.recInfo}>
                        <Text style={s.recTitle} numberOfLines={2}>
                          {recTitle}
                        </Text>
                        {rec.averageScore ? (
                          <View style={s.recScore}>
                            <Ionicons name="star" size={9} color="#FBBF24" />
                            <Text style={s.recScoreText}>
                              {(rec.averageScore / 10).toFixed(1)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Tracking ── */}
          <View style={s.section}>
            <SectionHeader title="Tracking" />

            {/* Wishlist toggle */}
            <Pressable
              onPress={toggleWishlist}
              style={[
                s.wishlistBtn,
                isWishlisted
                  ? {
                      backgroundColor: "#F472B6" + "18",
                      borderColor: "#F472B6" + "55",
                    }
                  : { backgroundColor: CARD, borderColor: CARD_BORDER },
              ]}
            >
              <LinearGradient
                colors={
                  isWishlisted
                    ? ["#F472B6", "#FB7185"]
                    : ["transparent", "transparent"]
                }
                style={s.wishlistIconWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={isWishlisted ? "heart" : "heart-outline"}
                  size={16}
                  color={isWishlisted ? "#fff" : TEXT_SUB}
                />
              </LinearGradient>
              <View style={s.wishlistText}>
                <Text
                  style={[
                    s.wishlistTitle,
                    isWishlisted && { color: "#F472B6" },
                  ]}
                >
                  {isWishlisted ? "In your wishlist" : "Wishlist"}
                </Text>
                <Text style={s.wishlistSub}>
                  {isWishlisted
                    ? "Tap to remove"
                    : "Choose a status to start tracking"}
                </Text>
              </View>
              {isWishlisted && (
                <Ionicons name="checkmark-circle" size={20} color="#F472B6" />
              )}
            </Pressable>

            {/* Tracking panel — only when wishlisted */}
            {isWishlisted && (
              <View>
                {/* Stats row */}
                <View style={s.statsRow}>
                  <StatChip
                    label="Total"
                    value={totalProgress ? String(totalProgress) : "—"}
                    accent={accent}
                  />
                  <StatChip
                    label={
                      type === "anime" && releasedProgress != null
                        ? "Released"
                        : "Status"
                    }
                    value={
                      type === "anime" && releasedProgress != null
                        ? String(releasedProgress)
                        : (entry?.status ?? "None")
                    }
                    accent={accent}
                  />
                  <StatChip
                    label="Lists"
                    value={String(entryCollections.length)}
                    accent={accent}
                  />
                </View>

                {/* Status pills */}
                <Text style={s.fieldLabel}>Status</Text>
                <View style={s.statusGrid}>
                  {TRACKER_STATUSES_DISPLAY.map((status) => {
                    const active = entry?.status === status;
                    return (
                      <Pressable
                        key={status}
                        onPress={() => setStatus(status)}
                        style={[
                          s.statusPill,
                          active && {
                            backgroundColor: accent + "22",
                            borderColor: accent + "88",
                          },
                        ]}
                      >
                        {active && (
                          <View
                            style={[s.statusDot, { backgroundColor: accent }]}
                          />
                        )}
                        <Text
                          style={[
                            s.statusText,
                            active && { color: accent, fontWeight: "700" },
                          ]}
                        >
                          {status}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Progress stepper */}
                <Stepper
                  label={`Current ${type === "anime" ? "Episode" : "Chapter"}`}
                  value={Number.parseInt(progressDraft, 10) || 0}
                  onChange={applyProgress}
                  accent={accent}
                  max={progressLimit}
                />
                <View style={s.inputRow}>
                  <TextInput
                    value={progressDraft}
                    onChangeText={setProgressDraft}
                    onSubmitEditing={() =>
                      applyProgress(Number.parseInt(progressDraft, 10) || 0)
                    }
                    keyboardType="number-pad"
                    placeholder={`Jump to ${type === "anime" ? "episode" : "chapter"}…`}
                    placeholderTextColor={TEXT_MUTED}
                    style={s.textInput}
                  />
                  <Pressable
                    onPress={() =>
                      applyProgress(Number.parseInt(progressDraft, 10) || 0)
                    }
                    style={[s.setBtn, { backgroundColor: accent }]}
                  >
                    <Text style={s.setBtnText}>Set</Text>
                  </Pressable>
                </View>

                {/* Rewatches stepper */}
                <Stepper
                  label="Total rewatches"
                  value={Number.parseInt(rewatchDraft, 10) || 0}
                  onChange={applyRewatches}
                  accent={accent}
                />
                <View style={s.inputRow}>
                  <TextInput
                    value={rewatchDraft}
                    onChangeText={setRewatchDraft}
                    onSubmitEditing={() =>
                      applyRewatches(Number.parseInt(rewatchDraft, 10) || 0)
                    }
                    keyboardType="number-pad"
                    placeholder="Set rewatch count…"
                    placeholderTextColor={TEXT_MUTED}
                    style={s.textInput}
                  />
                  <Pressable
                    onPress={() =>
                      applyRewatches(Number.parseInt(rewatchDraft, 10) || 0)
                    }
                    style={[s.setBtn, { backgroundColor: accent }]}
                  >
                    <Text style={s.setBtnText}>Set</Text>
                  </Pressable>
                </View>

                {/* Collections */}
                <View
                  style={[s.section, { paddingHorizontal: 0, marginBottom: 0 }]}
                >
                  <SectionHeader title="Collections" />
                  <View style={s.inputRow}>
                    <TextInput
                      value={collectionDraft}
                      onChangeText={setCollectionDraft}
                      onSubmitEditing={addCollection}
                      placeholder="New collection name…"
                      placeholderTextColor={TEXT_MUTED}
                      style={s.textInput}
                    />
                    <Pressable
                      onPress={
                        collectionDraft.trim()
                          ? addCollection
                          : () => setShowCollectionPicker(true)
                      }
                      style={[s.setBtn, { backgroundColor: accent }]}
                    >
                      <Text style={s.setBtnText}>
                        {collectionDraft.trim() ? "Add" : "Pick"}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={s.collectionWrap}>
                    {entryCollections.length ? (
                      entryCollections.map((col: string) => (
                        <Pressable
                          key={col}
                          onPress={() => removeCollection(col)}
                          style={s.collectionPill}
                        >
                          <Text style={s.collectionText}>{col}</Text>
                          <Ionicons
                            name="close-circle"
                            size={14}
                            color={TEXT_MUTED}
                          />
                        </Pressable>
                      ))
                    ) : (
                      <Text style={s.emptyHint}>
                        No collections yet. Add a name above to group this title.
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Collection Picker Modal ── */}
      <Modal
        visible={showCollectionPicker}
        animationType="slide"
        onRequestClose={() => setShowCollectionPicker(false)}
      >
        <View style={modal.root}>
          <SafeAreaView edges={["top"]} style={modal.header}>
            <Pressable
              onPress={() => setShowCollectionPicker(false)}
              style={modal.closeBtn}
            >
              <Ionicons name="chevron-down" size={22} color={TEXT} />
            </Pressable>
            <Text style={modal.title}>Add to Collection</Text>
            <View style={{ width: 38 }} />
          </SafeAreaView>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={modal.content}
          >
            {tracker.collections.length > 0 ? (
              <>
                <Text style={modal.sectionLabel}>Your Collections</Text>
                {tracker.collections.map((col: any) => {
                  const inList = entryCollections.includes(col.name);
                  return (
                    <Pressable
                      key={col.name}
                      onPress={() => addToExistingCollection(col.name)}
                      style={[modal.tile, inList && { opacity: 0.5 }]}
                    >
                      <View style={modal.tileMeta}>
                        <Text style={modal.tileName}>{col.name}</Text>
                        <Text style={modal.tileCount}>
                          {col.items.length} items
                        </Text>
                      </View>
                      {inList ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={accent}
                        />
                      ) : (
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color={TEXT_MUTED}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </>
            ) : (
              <Text style={modal.emptyText}>
                No collections yet. Create one by typing a name above.
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 28 },

  bannerWrap: { height: 280, position: "relative" },
  banner: { width: "100%", height: "100%" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  wishlistBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  wishlistBadgeText: { color: "#F472B6", fontSize: 11, fontWeight: "700" },

  heroRow: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    marginTop: -68,
    marginBottom: 20,
    alignItems: "flex-end",
  },
  coverShadow: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  cover: { width: 112, height: 162, borderRadius: 16, borderWidth: 2 },
  heroMeta: { flex: 1, gap: 7, paddingBottom: 4 },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: TEXT, fontSize: 17, fontWeight: "800", lineHeight: 22 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  scoreText: { color: "#FBBF24", fontSize: 13, fontWeight: "800" },
  scoreMax: { color: TEXT_MUTED, fontSize: 11, fontWeight: "600" },
  entryStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  entryStatusDot: { width: 6, height: 6, borderRadius: 3 },
  entryStatusText: { fontSize: 11, fontWeight: "700" },
  notTracked: { color: TEXT_MUTED, fontSize: 12 },

  airingStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  airingStatusText: { fontSize: 11, fontWeight: "700" },

  section: { paddingHorizontal: 16, marginBottom: 22 },

  description: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13.5,
    lineHeight: 21.5,
  },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  genrePill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreText: { fontSize: 12, fontWeight: "600" },

  trailerThumb: {
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  trailerPlayBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  trailerLabel: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  horizRow: { gap: 12, paddingRight: 16 },
  charCard: {
    width: 115,
    borderRadius: 14,
    backgroundColor: CARD,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  charImgRow: { flexDirection: "row", height: 130 },
  charImg: { flex: 1, height: "100%" },
  vaImg: {
    flex: 1,
    height: "100%",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0,0,0,0.4)",
  },
  charInfo: { padding: 9, gap: 2 },
  charName: { color: TEXT, fontSize: 11, fontWeight: "700", lineHeight: 15 },
  charRole: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  vaName: { color: TEXT_MUTED, fontSize: 10, marginTop: 2 },

  studioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  studioIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  studioLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  studioName: { color: TEXT, fontSize: 13, fontWeight: "700", marginTop: 1 },
  staffGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "47%",
    backgroundColor: CARD,
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  staffImg: { width: 40, height: 40, borderRadius: 20 },
  staffInfo: { flex: 1, gap: 2 },
  staffName: { color: TEXT, fontSize: 11, fontWeight: "700", lineHeight: 14 },
  staffRole: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },

  linksList: { gap: 8 },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  linkInfo: { flex: 1, gap: 2 },
  linkSite: { color: TEXT, fontSize: 13, fontWeight: "700" },
  linkType: { color: TEXT_MUTED, fontSize: 11 },

  recCard: {
    width: 122,
    borderRadius: 14,
    backgroundColor: CARD,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  recCover: { width: "100%", height: 170 },
  recGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  recBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  recBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  recInfo: { padding: 9, gap: 4 },
  recTitle: { color: TEXT, fontSize: 11, fontWeight: "700", lineHeight: 15 },
  recScore: { flexDirection: "row", alignItems: "center", gap: 3 },
  recScoreText: { color: "#FBBF24", fontSize: 10, fontWeight: "700" },

  wishlistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  wishlistIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistText: { flex: 1, gap: 2 },
  wishlistTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  wishlistSub: { color: TEXT_MUTED, fontSize: 12 },

  // Airing card
  airingCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },
  airingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  airingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  airingHeaderText: { flex: 1, gap: 2 },
  airingStatus: { color: TEXT, fontSize: 13, fontWeight: "700" },
  airingEpLabel: { color: TEXT_SUB, fontSize: 11 },
  airingPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  airingPillText: { fontSize: 11, fontWeight: "700" },
  airingProgressWrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 6 },
  airingBarBg: { height: 6, borderRadius: 99, overflow: "hidden" },
  airingBarFill: { height: "100%", borderRadius: 99 },
  airingBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  airingBarLabel: { color: TEXT_MUTED, fontSize: 11 },
  airingCountdownWrap: {
    padding: 14,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  airingCountdownTitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  airingTileRow: { flexDirection: "row", gap: 8 },
  airingTile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  airingTileVal: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
    fontVariant: ["tabular-nums"],
  },
  airingTileLbl: { color: TEXT_MUTED, fontSize: 11, fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },

  fieldLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: TEXT_MUTED, fontSize: 12, fontWeight: "600" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT,
    fontSize: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  setBtn: { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14 },
  setBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  collectionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  collectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  collectionText: { color: TEXT, fontSize: 12, fontWeight: "600" },
  emptyHint: { color: TEXT_MUTED, fontSize: 13, lineHeight: 19 },
});

const modal = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  closeBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD,
    borderRadius: 12,
  },
  title: { color: TEXT, fontSize: 16, fontWeight: "800" },
  content: { padding: 16, gap: 10 },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  tileMeta: { flex: 1, gap: 3 },
  tileName: { color: TEXT, fontSize: 14, fontWeight: "700" },
  tileCount: { color: TEXT_MUTED, fontSize: 12 },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 24,
  },
});