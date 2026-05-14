import { useTracker } from "@/contexts/tracker-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

// ─── Types ──────────────────────────────────────────────────────────────────────
export type MediaType = "anime" | "manga" | "lightnovel";

export interface MediaItem {
  id: string | number;
  title: string;
  coverImage: string;
  type: MediaType;
  score?: number;
  episodes?: number;
  chapters?: number;
  genres?: string[];
  rankings?: Array<{
    rank: number;
    type: string;
    context: string;
    allTime: boolean;
    season: string | null;
    year: number | null;
  }>;
  raw?: Record<string, unknown>;
}

interface MediaCardProps {
  item: MediaItem;
  variant?: "portrait" | "landscape";
  style?: ViewStyle;
  onPress?: (item: MediaItem) => void;
}

// ─── Design Tokens ──────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 48) / 2;
const CARD_H = CARD_W * 1.52;

const TYPE_COLOR: Record<MediaType, string> = {
  anime:      "#7C5CFC",
  manga:      "#16A881",
  lightnovel: "#D4860A",
};

const TYPE_GRADIENT: Record<MediaType, [string, string]> = {
  anime:      ["#7C5CFC", "#A78BFA"],
  manga:      ["#16A881", "#2DD4A8"],
  lightnovel: ["#D4860A", "#F5B040"],
};

const TYPE_LABEL: Record<MediaType, string> = {
  anime:      "ANIME",
  manga:      "MANGA",
  lightnovel: "LN",
};

const STATUS_COLOR: Record<string, string> = {
  None:        "#64748B",
  Completed:   "#22C55E",
  Rewatching:  "#A78BFA",
  Watching:    "#38BDF8",
  Planning:    "#F59E0B",
  Considering: "#F97316",
  Paused:      "#EF4444",
};

const RELEASE_COLOR: Record<string, string> = {
  RELEASING:       "#38BDF8",
  FINISHED:        "#22C55E",
  NOT_YET_RELEASED:"#F59E0B",
  HIATUS:          "#F97316",
  CANCELLED:       "#EF4444",
};

const RELEASE_LABEL: Record<string, string> = {
  RELEASING:       "Airing",
  FINISHED:        "Finished",
  NOT_YET_RELEASED:"Upcoming",
  HIATUS:          "Hiatus",
  CANCELLED:       "Cancelled",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatCountdown(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "Now";
  const totalMinutes = Math.ceil(seconds / 60);
  const days    = Math.floor(totalMinutes / (60 * 24));
  const hours   = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatRating(score: number) {
  return (score / 10).toFixed(1);
}

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return now;
}

type RawItem = {
  status?: string;
  nextAiringEpisode?: {
    episode?: number | null;
    airingAt?: number | null;
    timeUntilAiring?: number | null;
  } | null;
};

function getAnimeCountdown(item: MediaItem) {
  const raw = item.raw as RawItem;
  const releaseStatus = raw?.status ?? null;
  const releaseLabel  = releaseStatus ? (RELEASE_LABEL[releaseStatus] ?? releaseStatus) : null;
  const releaseColor  = releaseStatus ? (RELEASE_COLOR[releaseStatus] ?? "rgba(255,255,255,0.65)") : null;

  if (item.type !== "anime" || raw?.status !== "RELEASING" || !raw?.nextAiringEpisode?.episode) {
    return { releaseLabel, releaseColor, countdown: null, releasedEpisode: null as number | null, remaining: null as number | null };
  }

  const nextEpisode     = raw.nextAiringEpisode.episode;
  const releasedEpisode = Math.max(0, nextEpisode - 1);
  const remaining       = Math.max(0, (item.episodes ?? nextEpisode) - releasedEpisode);

  return {
    releaseLabel, releaseColor, releasedEpisode, nextEpisode, remaining,
    countdown: raw.nextAiringEpisode.airingAt
      ? formatCountdown(Math.ceil((raw.nextAiringEpisode.airingAt * 1000 - Date.now()) / 1000))
      : formatCountdown(raw.nextAiringEpisode.timeUntilAiring),
  };
}

// ─── Marquee ────────────────────────────────────────────────────────────────────
function Marquee({ children, style, textStyle, speed = 38 }: {
  children: string; style?: any; textStyle?: any; speed?: number;
}) {
  const [containerW, setContainerW] = useState(0);
  const [textW,      setTextW]      = useState(0);
  const animatedX = useRef(new Animated.Value(0)).current;
  const animRef   = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animRef.current) { animRef.current.stop(); animatedX.setValue(0); animRef.current = null; }
    if (containerW > 0 && textW > 0 && textW > containerW) {
      const distance = textW - containerW + 16;
      const seq = Animated.sequence([
        Animated.delay(600),
        Animated.timing(animatedX, { toValue: -distance, duration: (distance / speed) * 1000, useNativeDriver: true }),
        Animated.timing(animatedX, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.delay(700),
      ]);
      animRef.current = Animated.loop(seq);
      animRef.current.start();
    }
    return () => { if (animRef.current) animRef.current.stop(); };
  }, [containerW, textW, speed, animatedX]);

  if (containerW > 0 && textW > 0 && textW <= containerW) {
    return (
      <View style={style} onLayout={e => setContainerW(e.nativeEvent.layout.width)}>
        <Text style={textStyle}>{children}</Text>
      </View>
    );
  }

  return (
    <View style={[{ overflow: "hidden" }, style]} onLayout={e => setContainerW(e.nativeEvent.layout.width)}>
      <Animated.Text
        onLayout={e => setTextW(e.nativeEvent.layout.width)}
        style={[textStyle, { transform: [{ translateX: animatedX }] }]}
        numberOfLines={1}
      >
        {children}
      </Animated.Text>
    </View>
  );
}

// ─── Small Badges ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const isTop3  = rank <= 3;
  const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <View style={[badge.rank, isTop3 && badge.rankTop]}>
      <Text style={[badge.rankText, isTop3 && badge.rankTextTop]}>
        {isTop3 ? MEDAL[rank] : `#${rank}`}
      </Text>
    </View>
  );
}

function ScoreBadge({ score, accent }: { score: number; accent: string }) {
  return (
    <View style={[badge.score, { backgroundColor: "rgba(0,0,0,0.55)", borderColor: "rgba(255,255,255,0.12)" }]}>
      <Text style={badge.scoreStar}>★</Text>
      <Text style={[badge.scoreVal, { color: accent }]}>{formatRating(score)}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  rank:        { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  rankTop:     { backgroundColor: "rgba(234,179,8,0.18)", borderColor: "rgba(234,179,8,0.5)" },
  rankText:    { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" },
  rankTextTop: { color: "#EAB308" },
  score:       { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  scoreStar:   { color: "#FBBF24", fontSize: 9 },
  scoreVal:    { fontSize: 11, fontWeight: "800" },
});

// ─── Portrait Card ───────────────────────────────────────────────────────────────
function PortraitCard({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  const accent     = TYPE_COLOR[item.type];
  const gradPair   = TYPE_GRADIENT[item.type];
  const tracker    = useTracker();
  const entry      = tracker.getEntry(String(item.id), item.type);
  const raw        = item.raw as RawItem;
  const isAiring   = item.type === "anime" && raw?.status === "RELEASING" && Boolean(raw?.nextAiringEpisode?.episode);
  const now        = useNow(isAiring);
  const countdown  = getAnimeCountdown(item);

  const liveCountdown = isAiring && raw?.nextAiringEpisode
    ? formatCountdown(
        raw.nextAiringEpisode.airingAt
          ? Math.ceil(raw.nextAiringEpisode.airingAt - now / 1000)
          : raw.nextAiringEpisode.timeUntilAiring,
      )
    : null;

  const meta = item.episodes
    ? `${item.episodes} eps`
    : item.chapters
      ? `${item.chapters} ch`
      : null;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.955, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1,     useNativeDriver: true, speed: 24 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[s.portraitCard, { width: CARD_W, height: CARD_H, transform: [{ scale: scaleAnim }] }]}>
        <Image source={{ uri: item.coverImage }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={250} />

        {/* Deep bottom gradient */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.95)"]}
          locations={[0.38, 0.68, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Accent colour wash at bottom edge */}
        <LinearGradient
          colors={[accent + "00", accent + "28"]}
          locations={[0.6, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Top-left: type pill */}
        <View style={[s.typePill, { backgroundColor: accent + "28", borderColor: accent + "70" }]}>
          <Text style={[s.typePillText, { color: accent }]}>{TYPE_LABEL[item.type]}</Text>
        </View>

        {/* Top-right: rank + status */}
        <View style={s.topRight}>
          {item.rankings?.[0] && <RankBadge rank={item.rankings[0].rank} />}
          {entry && (
            <View style={[s.statusPill, { borderColor: STATUS_COLOR[entry.status] + "80", backgroundColor: STATUS_COLOR[entry.status] + "22" }]}>
              <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[entry.status] }]} />
              <Text style={[s.statusText, { color: STATUS_COLOR[entry.status] }]}>{entry.status}</Text>
            </View>
          )}
        </View>

        {/* Bottom info */}
        <View style={s.portraitBottom}>
          {item.score != null && <ScoreBadge score={item.score} accent={accent} />}

          <Marquee textStyle={s.portraitTitle}>{item.title}</Marquee>

          {meta && <Text style={s.portraitMeta}>{meta}</Text>}

          {countdown?.releaseLabel && (
            <View style={s.releaseRow}>
              <View style={[s.releaseDot, { backgroundColor: countdown.releaseColor ?? "#fff" }]} />
              <Text style={[s.releaseText, { color: countdown.releaseColor ?? "rgba(255,255,255,0.65)" }]} numberOfLines={1}>
                {countdown.releaseLabel}
                {liveCountdown ? ` · ${liveCountdown}` : ""}
              </Text>
            </View>
          )}

          {entry && (
            <Text style={s.progressText} numberOfLines={1}>
              {entry.totalProgress
                ? `${entry.progress} / ${entry.totalProgress}`
                : `Ep ${entry.progress}`}
              {entry.rewatches > 0 ? ` · ×${entry.rewatches}` : ""}
            </Text>
          )}

          {item.genres && item.genres.length > 0 && (
  <Marquee textStyle={s.genreText}>
    {item.genres.slice(0, 2).join(" · ")}
  </Marquee>
)}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Landscape Card ──────────────────────────────────────────────────────────────
function LandscapeCard({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  const accent   = TYPE_COLOR[item.type];
  const gradPair = TYPE_GRADIENT[item.type];
  const tracker  = useTracker();
  const entry    = tracker.getEntry(String(item.id), item.type);
  const raw      = item.raw as RawItem;
  const isAiring = item.type === "anime" && raw?.status === "RELEASING" && Boolean(raw?.nextAiringEpisode?.episode);
  const now      = useNow(isAiring);
  const countdown = getAnimeCountdown(item);

  const liveCountdown = isAiring && raw?.nextAiringEpisode
    ? formatCountdown(
        raw.nextAiringEpisode.airingAt
          ? Math.ceil(raw.nextAiringEpisode.airingAt - now / 1000)
          : raw.nextAiringEpisode.timeUntilAiring,
      )
    : null;

  const meta = item.episodes ? `${item.episodes} episodes` : item.chapters ? `${item.chapters} chapters` : "—";

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 24 }).start();

  const statusColor = entry ? (STATUS_COLOR[entry.status] ?? "#64748B") : null;

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[s.landscapeCard, { transform: [{ scale: scaleAnim }] }]}>

        {/* Thumbnail */}
        <View style={s.landscapeThumb}>
          <Image source={{ uri: item.coverImage }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={250} />
          {/* Accent left bar via gradient */}
          <LinearGradient colors={gradPair} style={s.landscapeBar} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          {/* Slight right edge fade into card */}
          <LinearGradient colors={["transparent", "rgba(19,19,42,0.55)"]} style={StyleSheet.absoluteFillObject} start={{ x: 0.5, y: 0 }} end={{ x: 1, y: 0 }} />
        </View>

        {/* Body */}
        <View style={s.landscapeBody}>
          {/* Top row: type label + score */}
          <View style={s.landscapeTopRow}>
            <View style={[s.landscapeTypePill, { backgroundColor: accent + "22", borderColor: accent + "55" }]}>
              <Text style={[s.landscapeTypeText, { color: accent }]}>{TYPE_LABEL[item.type]}</Text>
            </View>
            {item.score != null && (
              <View style={s.landscapeScoreRow}>
                <Text style={s.landscapeScoreStar}>★</Text>
                <Text style={[s.landscapeScoreVal, { color: accent }]}>{formatRating(item.score)}</Text>
              </View>
            )}
          </View>

          <Marquee textStyle={s.landscapeTitle}>{item.title}</Marquee>

          <Text style={s.landscapeMeta}>{meta}</Text>

          {/* Release / countdown */}
          {countdown?.releaseLabel && (
            <View style={s.releaseRow}>
              <View style={[s.releaseDot, { backgroundColor: countdown.releaseColor ?? "#fff" }]} />
              <Text style={[s.releaseText, { color: countdown.releaseColor ?? "rgba(255,255,255,0.65)" }]} numberOfLines={1}>
                {countdown.releaseLabel}{liveCountdown ? ` · ${liveCountdown}` : ""}
              </Text>
            </View>
          )}

          {/* Progress + status */}
          {entry && (
            <View style={s.landscapeProgressRow}>
              {statusColor && (
                <View style={[s.landscapeStatusDot, { backgroundColor: statusColor }]} />
              )}
              <Text style={s.landscapeProgressText} numberOfLines={1}>
                {entry.status}
                {entry.totalProgress
                  ? ` · ${entry.progress}/${entry.totalProgress}`
                  : entry.progress > 0 ? ` · ${entry.progress}` : ""}
                {entry.rewatches > 0 ? ` · ×${entry.rewatches}` : ""}
              </Text>
            </View>
          )}

          {item.genres && item.genres.length > 0 && (
  <Marquee textStyle={s.genreText}>
    {item.genres.slice(0, 3).join(" · ")}
  </Marquee>
)}
        </View>

        {/* Rank badge — top-right corner */}
        {item.rankings?.[0] && (
          <View style={s.landscapeRank}>
            <RankBadge rank={item.rankings[0].rank} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────────
export default function MediaCard({ item, variant = "portrait", style, onPress }: MediaCardProps) {
  const router = useRouter();
  const handlePress = () => {
    if (onPress) { onPress(item); return; }
    router.push({
      pathname: "/modal",
      params: { id: String(item.id), type: item.type, title: item.title, cover: item.coverImage },
    });
  };
  return (
    <View style={style}>
      {variant === "portrait"
        ? <PortraitCard item={item} onPress={handlePress} />
        : <LandscapeCard item={item} onPress={handlePress} />
      }
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Portrait
  portraitCard:   { borderRadius: 16, overflow: "hidden", backgroundColor: "#12122A" },
  typePill:       { position: "absolute", top: 10, left: 10, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  typePillText:   { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  topRight:       { position: "absolute", top: 10, right: 10, alignItems: "flex-end", gap: 5 },
  statusPill:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, borderWidth: 1 },
  statusDot:      { width: 5, height: 5, borderRadius: 3 },
  statusText:     { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },
  portraitBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 11, gap: 3 },
  portraitTitle:  { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 17 },
  portraitMeta:   { color: "rgba(255,255,255,0.45)", fontSize: 10 },

  // Landscape
  landscapeCard:      { flexDirection: "row", backgroundColor: "#13132A", borderRadius: 16, overflow: "hidden", marginBottom: 10, height: 112, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  landscapeThumb:     { width: 78, height: 112, position: "relative" },
  landscapeBar:       { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  landscapeBody:      { flex: 1, paddingHorizontal: 13, paddingVertical: 11, justifyContent: "center", gap: 3 },
  landscapeTopRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 1 },
  landscapeTypePill:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  landscapeTypeText:  { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  landscapeScoreRow:  { flexDirection: "row", alignItems: "center", gap: 3 },
  landscapeScoreStar: { color: "#FBBF24", fontSize: 10 },
  landscapeScoreVal:  { fontSize: 11, fontWeight: "800" },
  landscapeTitle:     { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 19 },
  landscapeMeta:      { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  landscapeProgressRow:{ flexDirection: "row", alignItems: "center", gap: 5 },
  landscapeStatusDot: { width: 5, height: 5, borderRadius: 3 },
  landscapeProgressText:{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "600", flex: 1 },
  landscapeRank:      { position: "absolute", top: 8, right: 10 },

  // Shared
  releaseRow:  { flexDirection: "row", alignItems: "center", gap: 4 },
  releaseDot:  { width: 5, height: 5, borderRadius: 3 },
  releaseText: { fontSize: 10, fontWeight: "700" },
  progressText:{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "600" },
  genreText:   { color: "rgba(255,255,255,0.27)", fontSize: 10 },
});