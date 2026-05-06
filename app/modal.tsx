import { getMediaDetail } from "@/services/anilist";
import { getLightNovelChapters } from "@/services/consumet";
import { searchAnime, getAnimeEpisodes } from '@/services/hianime'
import { getMangaChapters, searchManga } from "@/services/mangadex";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: W, height: H } = Dimensions.get("window");
const BANNER_H = H * 0.38;

// ─── Colour per type ──────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  anime: "#7C5CFC",
  manga: "#16A881",
  lightnovel: "#D4860A",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(str: string) {
  return (
    str
      ?.replace(/<[^>]+>/g, "")
      .replace(/&[^;]+;/g, " ")
      .trim() ?? ""
  );
}

function formatStatus(s: string) {
  return s?.replace(/_/g, " ") ?? "—";
}

// ─── Info chip ────────────────────────────────────────────────────────────────

function Chip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

// ─── Genre pill ───────────────────────────────────────────────────────────────

function GenrePill({ label, accent }: { label: string; accent: string }) {
  return (
    <View
      style={[
        styles.genrePill,
        { borderColor: accent + "55", backgroundColor: accent + "18" },
      ]}
    >
      <Text style={[styles.genreText, { color: accent }]}>{label}</Text>
    </View>
  );
}

// ─── Episode row ──────────────────────────────────────────────────────────────

function EpisodeRow({
  ep,
  accent,
  onPress,
}: {
  ep: any;
  accent: string;
  onPress: () => void;
}) {
  const thumb = ep.image ?? ep.img ?? ep.thumbnail ?? null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.epRow, pressed && styles.pressed]}
    >
      <View style={styles.epThumbWrap}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={styles.epThumb}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.epThumbPlaceholder,
              { backgroundColor: accent + "22" },
            ]}
          >
            <Ionicons name="play" size={22} color={accent} />
          </View>
        )}
        <View
          style={[styles.epPlayOverlay, { backgroundColor: accent + "cc" }]}
        >
          <Ionicons name="play" size={14} color="#fff" />
        </View>
      </View>
      <View style={styles.epInfo}>
        <Text style={styles.epNumber}>
          Episode {ep.order ?? ep.number ?? ep.episode}
        </Text>
        {ep.title && ep.title !== `Episode ${ep.number}` && (
          <Text style={styles.epTitle} numberOfLines={1}>
            {ep.title}
          </Text>
        )}
        {ep.description && (
          <Text style={styles.epDesc} numberOfLines={2}>
            {ep.description}
          </Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color="rgba(255,255,255,0.25)"
      />
    </Pressable>
  );
}

// ─── Chapter row ──────────────────────────────────────────────────────────────

function ChapterRow({
  ch,
  accent,
  onPress,
}: {
  ch: any;
  accent: string;
  onPress: () => void;
}) {
  const attrs = ch.attributes ?? ch;
  const num = attrs.chapter ?? ch.chapter ?? "?";
  const title = attrs.title ?? ch.title ?? null;
  const group =
    ch.relationships?.find((r: any) => r.type === "scanlation_group")
      ?.attributes?.name ?? null;
  const date = attrs.publishAt
    ? new Date(attrs.publishAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chRow, pressed && styles.pressed]}
    >
      <View style={[styles.chNumBadge, { backgroundColor: accent + "22" }]}>
        <Text style={[styles.chNum, { color: accent }]}>{num}</Text>
      </View>
      <View style={styles.chInfo}>
        <Text style={styles.chTitle} numberOfLines={1}>
          {title ? `Ch.${num} — ${title}` : `Chapter ${num}`}
        </Text>
        <View style={styles.chMeta}>
          {group && <Text style={styles.chMetaText}>{group}</Text>}
          {date && <Text style={styles.chMetaText}>{date}</Text>}
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color="rgba(255,255,255,0.25)"
      />
    </Pressable>
  );
}

// ─── LN Chapter row ───────────────────────────────────────────────────────────

function LNChapterRow({
  ch,
  idx,
  accent,
  onPress,
}: {
  ch: any;
  idx: number;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chRow, pressed && styles.pressed]}
    >
      <View style={[styles.chNumBadge, { backgroundColor: accent + "22" }]}>
        <Text style={[styles.chNum, { color: accent }]}>{idx + 1}</Text>
      </View>
      <View style={styles.chInfo}>
        <Text style={styles.chTitle} numberOfLines={1}>
          {ch.title ?? ch.name ?? `Chapter ${idx + 1}`}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color="rgba(255,255,255,0.25)"
      />
    </Pressable>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    type: string;
    title: string;
    cover: string;
  }>();

  const { id, type, cover } = params;
  // Decode title in case it was URI-encoded during navigation
  const title = decodeURIComponent(params.title ?? "");
  const accent = TYPE_COLOR[type] ?? "#A78BFA";

  // ── 1. Anilist: metadata only (score, genres, banner, description) ─────────
  //    This is purely cosmetic — content queries below do NOT wait for this.
  const anilistType = type === "anime" ? "ANIME" : "MANGA";
  const numericId = parseInt(id ?? "", 10);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["detail", id, type],
    queryFn: () => getMediaDetail(numericId, anilistType),
    enabled: type !== "lightnovel" && !isNaN(numericId),
    // Don't retry aggressively — Anilist failure must not block content
    retry: 1,
  });

  // ── 2. AnimePahe: search + episodes ──────────────────────────────────────
  //    Waits for AniList romaji title (AnimePahe uses Japanese romanized names),
  //    then falls back to English title if AniList fails.
    const TRAILING = /\s+(a|an|the|of|in|on|at|to|for|with|by|from|and|or|but)$/i
  const searchTitle = title
    .split(' ').slice(0, 4).join(' ')
    .replace(TRAILING, '').trim().toLowerCase()

  const {
    data: hiAnimeSearch,
    isLoading: animekaiSearchLoading,
  } = useQuery({
    queryKey: ['gogo-search', searchTitle],
    queryFn: async () => {
      let results = await searchAnime(searchTitle)
      if (!results?.length) {
        const short = title.split(' ').slice(0, 2).join(' ').toLowerCase()
        console.warn('[GogoAnime] Retrying with shorter title:', short)
        results = await searchAnime(short)
      }
      if (!results?.length) console.warn('[GogoAnime] No results for:', searchTitle)
      return results
    },
    enabled: type === 'anime' && !!title,
    retry: 2,
  })

  // GogoAnime uses .id not .idanime
  const animeId = hiAnimeSearch?.[0]?.id ?? null

  const {
    data: episodes,
    isLoading: epsLoading,
    isError: epsError,
  } = useQuery({
    queryKey: ['episodes', animeId],
    queryFn: async () => {
      const eps = await getAnimeEpisodes(animeId!)
      if (!eps?.length) console.warn('[GogoAnime] No episodes for:', animeId)
      return eps
    },
    enabled: type === 'anime' && !!animeId,
    retry: 2,
  })

  // ── 3. MangaDex: search + chapters — runs immediately from `title` param ──
  const { data: mangaSearch, isLoading: mangaSearchLoading } = useQuery({
    queryKey: ["mangadex-search", title],
    queryFn: async () => {
      const results = await searchManga(title);
      if (!results?.length) console.warn("[MangaDex] No results for:", title);
      return results;
    },
    enabled: type === "manga" && !!title,
    retry: 2,
  });

  const mangaDexId = mangaSearch?.[0]?.id ?? null;

  const {
    data: chapters,
    isLoading: chsLoading,
    isError: chsError,
  } = useQuery({
    queryKey: ["chapters", mangaDexId],
    queryFn: async () => {
      const chs = await getMangaChapters(mangaDexId!);
      if (!chs?.length)
        console.warn("[MangaDex] No chapters for id:", mangaDexId);
      return chs;
    },
    enabled: type === "manga" && !!mangaDexId,
    retry: 2,
  });

  // ── 4. Consumet: light novel — runs immediately from `title` param ─────────
  const {
    data: lnChapters,
    isLoading: lnLoading,
    isError: lnError,
  } = useQuery({
    queryKey: ["ln-chapters", title],
    queryFn: () => getLightNovelChapters(title),
    enabled: type === "lightnovel" && !!title,
    retry: 2,
  });
  const lnChapterList = lnChapters ?? [];

  // ── Display values ────────────────────────────────────────────────────────
  // Anilist enriches the UI when it loads, but we never block on it
  const displayTitle = detail?.title?.english ?? detail?.title?.romaji ?? title;
  const displayCover =
    detail?.coverImage?.extraLarge ?? detail?.coverImage?.large ?? cover;
  const bannerImage = detail?.bannerImage ?? null;
  const description = detail ? stripHtml(detail.description ?? "") : "";
  const score = detail?.averageScore;
  const studio = detail?.studios?.nodes?.[0]?.name ?? null;
  const season =
    detail?.season && detail?.seasonYear
      ? `${detail.season} ${detail.seasonYear}`
      : null;
  const genres: string[] = detail?.genres ?? [];

  const episodeList = episodes ?? [];
  const chapterList = chapters ?? [];

  // Loading state per type — reflects the actual content source, not Anilist
  const isLoadingContent =
    type === "anime"
      ? animekaiSearchLoading || epsLoading
      : type === "manga"
        ? mangaSearchLoading || chsLoading
        : lnLoading;

  const hasError =
    type === "anime" ? epsError : type === "manga" ? chsError : lnError;

  // ── Navigate to player / reader ───────────────────────────────────────────
  const onEpisodePress = useCallback((ep: any) => {
    router.push({
      pathname: '/player',
      params: {
        episodeId:  ep.id,           // "one-piece-episode-1" — ready to use
        episodeNum: String(ep.number ?? 1),
        animeTitle: displayTitle,
      },
    })
  }, [router, displayTitle])

  const onChapterPress = useCallback(
    (ch: any) => {
      const chId = ch.id ?? ch.chapterId;
      const chNum = ch.attributes?.chapter ?? ch.chapter ?? "?";
      router.push({
        pathname: "/reader",
        params: {
          chapterId: chId,
          chapterNum: String(chNum),
          mangaTitle: displayTitle,
        },
      });
    },
    [router, displayTitle],
  );

  const onLNChapterPress = useCallback(
    (ch: any, idx: number) => {
      router.push({
        pathname: "/reader",
        params: {
          chapterId: ch.id ?? String(idx),
          chapterNum: String(idx + 1),
          mangaTitle: displayTitle,
          isLN: "true",
          url: ch.url ?? "",
        },
      });
    },
    [router, displayTitle],
  );

  // ── Content section label ─────────────────────────────────────────────────
  const contentCount =
    type === "anime"
      ? episodeList.length
      : type === "manga"
        ? chapterList.length
        : lnChapterList.length;

  const contentLabel = type === "anime" ? "Episodes" : "Chapters";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Banner / Cover ───────────────────────────────────────────── */}
        <View style={styles.bannerWrap}>
          <Image
            source={{ uri: bannerImage ?? displayCover }}
            style={styles.banner}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={["rgba(12,12,24,0)", "rgba(12,12,24,0.6)", "#0C0C18"]}
            locations={[0.2, 0.65, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView edges={["top"]} style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* ── Cover + title row ────────────────────────────────────────── */}
        <View style={styles.heroRow}>
          <Image
            source={{ uri: displayCover }}
            style={[styles.coverThumb, { borderColor: accent }]}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.heroInfo}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: accent + "22", borderColor: accent + "55" },
              ]}
            >
              <Text style={[styles.typeBadgeText, { color: accent }]}>
                {type === "lightnovel" ? "LIGHT NOVEL" : type.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={3}>
              {displayTitle}
            </Text>
            {studio && <Text style={styles.heroStudio}>{studio}</Text>}
            {score != null && (
              <View style={styles.scoreRow}>
                <Ionicons name="star" size={13} color="#EAB308" />
                <Text style={styles.scoreText}>{(score / 10).toFixed(1)}</Text>
                <Text style={styles.scoreMax}> / 10</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Info chips (Anilist metadata — loads async, no blocking) ─── */}
        {detail && (
          <View style={styles.chipsRow}>
            {detail.format && (
              <Chip
                label="Format"
                value={formatStatus(detail.format)}
                accent={accent}
              />
            )}
            {detail.status && (
              <Chip
                label="Status"
                value={formatStatus(detail.status)}
                accent={accent}
              />
            )}
            {season && <Chip label="Season" value={season} accent={accent} />}
            {detail.episodes && (
              <Chip
                label="Episodes"
                value={String(detail.episodes)}
                accent={accent}
              />
            )}
            {detail.chapters && (
              <Chip
                label="Chapters"
                value={String(detail.chapters)}
                accent={accent}
              />
            )}
          </View>
        )}

        {/* ── Genres (Anilist) ─────────────────────────────────────────── */}
        {genres.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genresRow}
          >
            {genres.map((g) => (
              <GenrePill key={g} label={g} accent={accent} />
            ))}
          </ScrollView>
        )}

        {/* ── Description (Anilist) ────────────────────────────────────── */}
        {description.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
        )}

        {/* ── Episodes / Chapters (content source) ─────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {contentLabel}
            {contentCount > 0 ? ` (${contentCount})` : ""}
          </Text>

          {isLoadingContent ? (
            <View style={styles.contentLoading}>
              <ActivityIndicator color={accent} />
              <Text style={[styles.loadingText, { color: accent }]}>
                {type === "anime" ? "Loading episodes…" : "Loading chapters…"}
              </Text>
            </View>
          ) : hasError ? (
            <View style={styles.errorWrap}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color="rgba(255,255,255,0.3)"
              />
              <Text style={styles.emptyText}>
                Failed to load {contentLabel.toLowerCase()} from source.
              </Text>
            </View>
          ) : type === "anime" ? (
            episodeList.length === 0 ? (
              <View style={styles.errorWrap}>
                <Ionicons
                  name="tv-outline"
                  size={32}
                  color="rgba(255,255,255,0.2)"
                />
                <Text style={styles.emptyText}>
                  {animeId
                    ? 'No episodes available yet.'
                    : `"${title}" was not found on GogoAnime.`}
                </Text>
              </View>
            ) : (
              episodeList.map((ep: any, i: number) => (
                <EpisodeRow
                  key={ep.id ?? i}
                  ep={ep}
                  accent={accent}
                  onPress={() => onEpisodePress(ep)}
                />
              ))
            )
          ) : type === "manga" ? (
            chapterList.length === 0 ? (
              <View style={styles.errorWrap}>
                <Ionicons
                  name="book-outline"
                  size={32}
                  color="rgba(255,255,255,0.2)"
                />
                <Text style={styles.emptyText}>
                  {mangaDexId
                    ? "No English chapters available yet."
                    : `"${title}" was not found on MangaDex.`}
                </Text>
              </View>
            ) : (
              chapterList.map((ch: any, i: number) => (
                <ChapterRow
                  key={ch.id ?? i}
                  ch={ch}
                  accent={accent}
                  onPress={() => onChapterPress(ch)}
                />
              ))
            )
          ) : lnChapterList.length === 0 ? (
            <View style={styles.errorWrap}>
              <Ionicons
                name="library-outline"
                size={32}
                color="rgba(255,255,255,0.2)"
              />
              <Text style={styles.emptyText}>
                {`"${title}" was not found on Consumet/Libgen.`}
              </Text>
            </View>
          ) : (
            lnChapterList.map((ch: any, i: number) => (
              <LNChapterRow
                key={ch.id ?? i}
                ch={ch}
                idx={i}
                accent={accent}
                onPress={() => onLNChapterPress(ch, i)}
              />
            ))
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0C0C18" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  bannerWrap: { width: W, height: BANNER_H, position: "relative" },
  banner: { width: W, height: BANNER_H },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 8 : 0,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: -60,
    gap: 14,
    alignItems: "flex-end",
    marginBottom: 16,
  },
  coverThumb: {
    width: 110,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
  },
  heroInfo: { flex: 1, paddingBottom: 4, gap: 6 },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  heroTitle: { color: "#fff", fontSize: 17, fontWeight: "700", lineHeight: 22 },
  heroStudio: { color: "rgba(255,255,255,0.45)", fontSize: 12 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  scoreText: { color: "#EAB308", fontSize: 14, fontWeight: "700" },
  scoreMax: { color: "rgba(255,255,255,0.3)", fontSize: 12 },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  chipValue: { color: "#fff", fontSize: 13, fontWeight: "500" },

  genresRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreText: { fontSize: 12, fontWeight: "500" },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  description: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13.5,
    lineHeight: 21,
    letterSpacing: 0.1,
  },

  epRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141420",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  epThumbWrap: { width: 96, height: 60, borderRadius: 8, overflow: "hidden" },
  epThumb: { width: 96, height: 60 },
  epThumbPlaceholder: {
    width: 96,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  epPlayOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  epInfo: { flex: 1, gap: 3 },
  epNumber: { color: "#fff", fontSize: 13, fontWeight: "600" },
  epTitle: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  epDesc: { color: "rgba(255,255,255,0.38)", fontSize: 11, lineHeight: 15 },

  chRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141420",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  chNumBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chNum: { fontSize: 14, fontWeight: "700" },
  chInfo: { flex: 1, gap: 4 },
  chTitle: { color: "#fff", fontSize: 13, fontWeight: "500" },
  chMeta: { flexDirection: "row", gap: 8 },
  chMetaText: { color: "rgba(255,255,255,0.35)", fontSize: 11 },

  errorWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 30,
  },
  contentLoading: { alignItems: "center", gap: 10, paddingVertical: 30 },
  loadingText: { fontSize: 13, fontWeight: "500" },
  emptyText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  pressed: { opacity: 0.75 },
});
