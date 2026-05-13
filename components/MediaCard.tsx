import { useTracker } from "@/contexts/tracker-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

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

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 48) / 2;
const CARD_H = CARD_W * 1.5;

const TYPE_COLOR: Record<MediaType, string> = {
  anime: "#7C5CFC",
  manga: "#16A881",
  lightnovel: "#D4860A",
};

const TYPE_LABEL: Record<MediaType, string> = {
  anime: "ANIME",
  manga: "MANGA",
  lightnovel: "LIGHT NOVEL",
};

const STATUS_COLOR: Record<string, string> = {
  None: "#64748B",
  Completed: "#22C55E",
  Rewatching: "#A78BFA",
  Watching: "#38BDF8",
  Planning: "#F59E0B",
  Considering: "#F97316",
  Paused: "#EF4444",
};

const RELEASE_COLOR: Record<string, string> = {
  RELEASING: "#38BDF8",
  FINISHED: "#22C55E",
  NOT_YET_RELEASED: "#F59E0B",
  HIATUS: "#F97316",
  CANCELLED: "#EF4444",
};

const RELEASE_LABEL: Record<string, string> = {
  RELEASING: "Ongoing",
  FINISHED: "Completed",
  NOT_YET_RELEASED: "Upcoming",
  HIATUS: "Hiatus",
  CANCELLED: "Cancelled",
};

function formatCountdown(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "Now";

  const totalMinutes = Math.ceil(seconds / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

function getAnimeCountdown(item: MediaItem) {
  const raw = item.raw as {
    status?: string;
    nextAiringEpisode?: {
      episode?: number | null;
      airingAt?: number | null;
      timeUntilAiring?: number | null;
    } | null;
  };

  const releaseStatus = raw?.status ?? null;
  const releaseLabel = releaseStatus
    ? (RELEASE_LABEL[releaseStatus] ?? releaseStatus)
    : null;
  const releaseColor = releaseStatus
    ? (RELEASE_COLOR[releaseStatus] ?? "rgba(255,255,255,0.65)")
    : null;

  if (item.type !== "anime") {
    return {
      releaseLabel,
      releaseColor,
      countdown: null,
      releasedEpisode: null as number | null,
      remaining: null as number | null,
    };
  }

  if (raw?.status !== "RELEASING" || !raw?.nextAiringEpisode?.episode) {
    return {
      releaseLabel,
      releaseColor,
      countdown: null,
      releasedEpisode: null,
      remaining: null,
    };
  }

  const nextEpisode = raw.nextAiringEpisode.episode;
  const releasedEpisode = Math.max(0, nextEpisode - 1);
  const remaining = Math.max(
    0,
    (item.episodes ?? nextEpisode) - releasedEpisode,
  );
  return {
    releaseLabel,
    releaseColor,
    releasedEpisode,
    nextEpisode,
    remaining,
    countdown: raw.nextAiringEpisode.airingAt
      ? formatCountdown(
          Math.ceil(
            (raw.nextAiringEpisode.airingAt * 1000 - Date.now()) / 1000,
          ),
        )
      : formatCountdown(raw.nextAiringEpisode.timeUntilAiring),
  };
}

function formatRating(score: number) {
  return `${(score / 10).toFixed(1)}/10`;
}

function RatingBadge({ score, accent }: { score: number; accent: string }) {
  return (
    <View
      style={[
        styles.scoreBadge,
        { borderColor: accent + "88", backgroundColor: accent + "18" },
      ]}
    >
      <Text
        style={[styles.scoreText, { color: accent }]}
      >{`${formatRating(score)}`}</Text>
    </View>
  );
}

function Marquee({
  children,
  style,
  textStyle,
  speed = 40,
}: {
  children: string;
  style?: any;
  textStyle?: any;
  speed?: number; // pixels per second
}) {
  const [containerW, setContainerW] = useState(0);
  const [textW, setTextW] = useState(0);
  const animatedX = React.useRef(new Animated.Value(0)).current;
  const animRef = React.useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animRef.current) {
      animRef.current.stop();
      animatedX.setValue(0);
      animRef.current = null;
    }
    if (containerW > 0 && textW > 0 && textW > containerW) {
      const distance = textW - containerW + 16; // small padding
      const duration = (distance / speed) * 1000;
      const pause = 800;
      const seq = Animated.sequence([
        Animated.timing(animatedX, {
          toValue: -distance,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(animatedX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(pause),
      ]);
      animRef.current = Animated.loop(seq);
      animRef.current.start();
    }
    return () => {
      if (animRef.current) animRef.current.stop();
    };
  }, [containerW, textW, speed, animatedX]);

  // If text fits, render static Text
  if (containerW > 0 && textW > 0 && textW <= containerW) {
    return (
      <View
        style={style}
        onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
      >
        <Text style={textStyle}>{children}</Text>
      </View>
    );
  }

  return (
    <View
      style={[{ overflow: "hidden" }, style]}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      <Animated.Text
        onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
        style={[textStyle, { transform: [{ translateX: animatedX }] }]}
        numberOfLines={1}
      >
        {children}
      </Animated.Text>
    </View>
  );
}

function RankBadge({ rank, context }: { rank: number; context: string }) {
  const isTop3 = rank <= 3;
  const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <View style={[styles.rankBadge, isTop3 && styles.rankBadgeTop]}>
      <Text style={[styles.rankText, isTop3 && styles.rankTextTop]}>
        {isTop3 ? MEDAL[rank] : `#${rank}`}
      </Text>
    </View>
  );
}

function PortraitCard({
  item,
  onPress,
}: {
  item: MediaItem;
  onPress: () => void;
}) {
  const accent = TYPE_COLOR[item.type];
  const meta = item.episodes
    ? `${item.episodes} eps`
    : item.chapters
      ? `${item.chapters} ch`
      : null;
  const countdown = getAnimeCountdown(item);
  const liveCountdownEnabled =
    item.type === "anime" &&
    (
      item.raw as {
        status?: string;
        nextAiringEpisode?: {
          airingAt?: number | null;
          timeUntilAiring?: number | null;
        } | null;
      }
    )?.status === "RELEASING";
  const now = useNow(liveCountdownEnabled);
  const liveCountdown = liveCountdownEnabled
    ? (() => {
        const raw = item.raw as {
          nextAiringEpisode?: {
            episode?: number | null;
            airingAt?: number | null;
            timeUntilAiring?: number | null;
          } | null;
          status?: string;
        };

        if (
          item.type !== "anime" ||
          raw?.status !== "RELEASING" ||
          !raw?.nextAiringEpisode?.episode
        ) {
          return null;
        }

        const secondsUntil = raw.nextAiringEpisode.airingAt
          ? Math.ceil(raw.nextAiringEpisode.airingAt - now / 1000)
          : (raw.nextAiringEpisode.timeUntilAiring ?? null);
        return {
          remainingText: formatCountdown(secondsUntil),
          releasedEpisode: Math.max(0, raw.nextAiringEpisode.episode - 1),
        };
      })()
    : null;
  const tracker = useTracker();
  const entry = tracker.getEntry(String(item.id), item.type);

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
        colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.97)"]}
        locations={[0.4, 0.72, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={[
          styles.typePill,
          { backgroundColor: accent + "25", borderColor: accent + "70" },
        ]}
      >
        <Text style={[styles.typePillText, { color: accent }]}>
          {TYPE_LABEL[item.type]}
        </Text>
      </View>
      {entry && (
        <View style={styles.portraitTopRight}>
          {item.rankings?.[0] && (
            <RankBadge
              rank={item.rankings[0].rank}
              context={item.rankings[0].context}
            />
          )}
          {entry && (
            <View
              style={[
                styles.statusPill,
                {
                  borderColor: STATUS_COLOR[entry.status] + "88",
                  backgroundColor: STATUS_COLOR[entry.status] + "22",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: STATUS_COLOR[entry.status] },
                ]}
              >
                {entry.status}
              </Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.portraitBottom}>
        {item.score != null && (
          <RatingBadge score={item.score} accent={accent} />
        )}
        <Marquee style={{}} textStyle={styles.portraitTitle}>
          {item.title}
        </Marquee>
        {meta && (
          <Marquee style={{}} textStyle={styles.portraitMeta}>
            {meta}
          </Marquee>
        )}
        {countdown?.releaseLabel && (
          <Text
            style={[
              styles.releaseText,
              { color: countdown.releaseColor ?? "rgba(255,255,255,0.65)" },
            ]}
            numberOfLines={1}
          >
            {countdown.releaseLabel}
            {liveCountdown ? ` · Next in ${liveCountdown.remainingText}` : ""}
          </Text>
        )}
        {entry && (
          <Text style={styles.progressText} numberOfLines={1}>
            {entry.totalProgress
              ? `${entry.progress}/${entry.totalProgress}`
              : `Progress ${entry.progress}`}
            {entry.rewatches > 0 ? ` · ${entry.rewatches} rewatches` : ""}
          </Text>
        )}
        {item.genres && item.genres.length > 0 && (
          <Text style={styles.portraitGenre} numberOfLines={1}>
            {item.genres.slice(0, 2).join(" · ")}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function LandscapeCard({
  item,
  onPress,
}: {
  item: MediaItem;
  onPress: () => void;
}) {
  {
    item.rankings?.[0] && (
      <RankBadge
        rank={item.rankings[0].rank}
        context={item.rankings[0].context}
      />
    );
  }
  const accent = TYPE_COLOR[item.type];
  const meta = item.episodes
    ? `${item.episodes} episodes`
    : item.chapters
      ? `${item.chapters} chapters`
      : "—";
  const countdown = getAnimeCountdown(item);
  const raw = item.raw as {
    status?: string;
    nextAiringEpisode?: {
      episode?: number | null;
      airingAt?: number | null;
      timeUntilAiring?: number | null;
    } | null;
  };
  const liveCountdownEnabled =
    item.type === "anime" &&
    raw?.status === "RELEASING" &&
    Boolean(raw?.nextAiringEpisode?.episode);
  const now = useNow(liveCountdownEnabled);
  const liveCountdown =
    liveCountdownEnabled && raw?.nextAiringEpisode
      ? formatCountdown(
          raw.nextAiringEpisode.airingAt
            ? Math.ceil(raw.nextAiringEpisode.airingAt - now / 1000)
            : raw.nextAiringEpisode.timeUntilAiring,
        )
      : null;
  const tracker = useTracker();
  const entry = tracker.getEntry(String(item.id), item.type);

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
        {entry && (
          <View
            style={[
              styles.landscapeStatus,
              { backgroundColor: STATUS_COLOR[entry.status] },
            ]}
          >
            <Text style={styles.landscapeStatusText}>{entry.status}</Text>
          </View>
        )}
      </View>
      <View style={styles.landscapeInfo}>
        <View style={styles.landscapeTopRow}>
          <Text style={[styles.landscapeType, { color: accent }]}>
            {TYPE_LABEL[item.type]}
          </Text>
          {item.score != null && (
            <Text style={[styles.landscapeScore, { color: accent }]}>
              {`rating ${formatRating(item.score)}`}
            </Text>
          )}
        </View>
        <Marquee style={{}} textStyle={styles.landscapeTitle}>
          {item.title}
        </Marquee>
        <Marquee style={{}} textStyle={styles.landscapeMeta}>
          {meta}
        </Marquee>
        {countdown?.releaseLabel && (
          <Text
            style={[
              styles.releaseText,
              { color: countdown.releaseColor ?? "rgba(255,255,255,0.65)" },
            ]}
            numberOfLines={1}
          >
            {countdown.releaseLabel}
            {liveCountdown ? ` · next in ${liveCountdown}` : ""}
          </Text>
        )}
        {entry && (
          <Text style={styles.landscapeProgress} numberOfLines={1}>
            {entry.totalProgress
              ? `${entry.progress}/${entry.totalProgress}`
              : `Progress ${entry.progress}`}
            {entry.rewatches > 0 ? ` · ${entry.rewatches} rewatches` : ""}
          </Text>
        )}
        {item.genres && (
          <Text style={styles.landscapeGenre} numberOfLines={1}>
            {item.genres.slice(0, 3).join(" · ")}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function MediaCard({
  item,
  variant = "portrait",
  style,
  onPress,
}: MediaCardProps) {
  const router = useRouter();
  const handlePress = () => {
    if (onPress) {
      onPress(item);
    } else {
      router.push({
        pathname: "/modal",
        params: {
          id: String(item.id),
          type: item.type,
          title: item.title,
          cover: item.coverImage,
        },
      });
    }
  };
  return (
    <View style={style}>
      {variant === "portrait" ? (
        <PortraitCard item={item} onPress={handlePress} />
      ) : (
        <LandscapeCard item={item} onPress={handlePress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  portraitCard: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
  },

  portraitTopRight: {
    position: "absolute",
    top: 10,
    right: 10,
    alignItems: "flex-end",
    gap: 5,
  },
  rankBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  rankBadgeTop: {
    backgroundColor: "rgba(234,179,8,0.18)",
    borderColor: "rgba(234,179,8,0.55)",
  },
  rankText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "700",
  },
  rankTextTop: {
    color: "#EAB308",
  },
  typePill: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typePillText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  statusPill: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  portraitBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 3,
  },
  scoreBadge: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 3,
  },
  scoreText: { fontSize: 11, fontWeight: "700", backgroundColor: "#fff" },
  portraitTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  portraitMeta: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  releaseText: { fontSize: 10, fontWeight: "700" },
  progressText: { color: "rgba(255,255,255,0.62)", fontSize: 10 },
  portraitGenre: { color: "rgba(255,255,255,0.32)", fontSize: 10 },
  landscapeCard: {
    flexDirection: "row",
    backgroundColor: "#141420",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
    height: 110,
  },
  landscapeThumb: { width: 76, height: 110, position: "relative" },
  landscapeAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  landscapeStatus: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  landscapeStatusText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  landscapeInfo: { flex: 1, padding: 12, justifyContent: "center", gap: 3 },
  landscapeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  landscapeType: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  landscapeScore: { color: "#EAB308", fontSize: 11, fontWeight: "600" },
  landscapeTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  landscapeMeta: { color: "rgba(255,255,255,0.45)", fontSize: 11 },
  landscapeProgress: { color: "rgba(255,255,255,0.62)", fontSize: 10 },
  landscapeGenre: { color: "rgba(255,255,255,0.3)", fontSize: 10 },
});
