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
import React, { useEffect, useMemo, useState } from "react";
import YoutubePlayer from "react-native-youtube-iframe";

import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
    Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TYPE_COLOR: Record<string, string> = {
  anime: "#7C5CFC",
  manga: "#16A881",
  lightnovel: "#D4860A",
};

function stripHtml(value: string) {
  return (
    value
      ?.replace(/<[^>]+>/g, "")
      .replace(/&[^;]+;/g, " ")
      .trim() ?? ""
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
    <View style={styles.statChip}>
      <Text style={[styles.statLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

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

function Stepper({
  label,
  value,
  onChange,
  accent,
  max,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  accent: string;
  max?: number | null;
}) {
  return (
    <View style={styles.stepperCard}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          style={[styles.stepperButton, { borderColor: accent + "55" }]}
        >
          <Ionicons name="remove" size={18} color={accent} />
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={() =>
            onChange(max != null ? Math.min(max, value + 1) : value + 1)
          }
          style={[
            styles.stepperButton,
            { borderColor: accent + "55" },
            max != null && value >= max && { opacity: 0.4 },
          ]}
          disabled={max != null && value >= max}
        >
          <Ionicons name="add" size={18} color={accent} />
        </Pressable>
      </View>
    </View>
  );
}

export default function ModalScreen() {
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const router = useRouter();
  const tracker = useTracker();
  const params = useLocalSearchParams<{
    id: string;
    type: string;
    title: string;
    cover: string;
  }>();

  const id = params.id ?? "";
  const type = (params.type ?? "anime") as "anime" | "manga" | "lightnovel";
  const accent = TYPE_COLOR[type] ?? "#A78BFA";
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
  const totalProgress =
    type === "anime"
      ? (detail?.episodes ?? null)
      : type === "manga"
        ? (detail?.chapters ?? null)
        : (detail?.chapters ?? null);
  const entry = tracker.getEntry(id, type);
  const isTracked = Boolean(entry);
  const releasedProgress =
    type === "anime" &&
    detail?.status === "RELEASING" &&
    detail?.nextAiringEpisode?.episode
      ? Math.max(0, detail.nextAiringEpisode.episode - 1)
      : null;
  const progressLimit = releasedProgress ?? totalProgress;
  const [now, setNow] = useState(() => Date.now());

const trailerUrl = useMemo(() => {
  const t = detail?.trailer;
  if (!t?.id) return null;
  if (t.site === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${t.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
  }
  if (t.site === "dailymotion") {
    return `https://www.dailymotion.com/embed/video/${t.id}?autoplay=1`;
  }
  return null;
}, [detail?.trailer]);

const trailerAppUrl = useMemo(() => {
  const t = detail?.trailer;
  if (!t?.id || t.site !== "youtube") return null;
  return `https://www.youtube.com/watch?v=${t.id}`;
}, [detail?.trailer]);

  useEffect(() => {
    if (
      type !== "anime" ||
      detail?.status !== "RELEASING" ||
      !detail?.nextAiringEpisode
    ) {
      return;
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [detail?.nextAiringEpisode, detail?.status, type]);

  const nextReleaseLabel =
    type === "anime" &&
    detail?.status === "RELEASING" &&
    detail?.nextAiringEpisode
      ? formatCountdown(
          detail.nextAiringEpisode.airingAt
            ? Math.ceil(detail.nextAiringEpisode.airingAt - now / 1000)
            : detail.nextAiringEpisode.timeUntilAiring,
        )
      : null;

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

  const save = (recipe: (current: any) => any) => {
    tracker.mutateEntry(payload, recipe);
  };

  const setStatus = (status: TrackerStatus) => {
    if (status === "None") {
      if (!isTracked) {
        setProgressDraft("0");
        setRewatchDraft("0");
        return;
      }

      save((current) => ({
        ...current,
        status,
        updatedAt: Date.now(),
      }));
      return;
    }

    if (!isTracked) {
      tracker.upsertEntry(payload);
    }

    save((current) => ({
      ...current,
      status,
      progress:
        status === "Completed" && current.totalProgress
          ? current.totalProgress
          : Math.max(current.progress, Number.parseInt(progressDraft, 10) || 0),
      updatedAt: Date.now(),
    }));
  };

  const toggleWishlist = () => {
    if (!isTracked) {
      tracker.upsertEntry(payload);
      save((current) => ({
        ...current,
        wishlist: true,
        updatedAt: Date.now(),
      }));
      return;
    }

    save((current) => ({
      ...current,
      wishlist: !current.wishlist,
      updatedAt: Date.now(),
    }));
  };

  const unlockStatuses = Boolean(entry?.wishlist);

  const applyProgress = (next: number) => {
    if (!isTracked) {
      setProgressDraft(String(Math.max(0, next)));
      return;
    }

    const clampedNext =
      progressLimit != null
        ? Math.min(progressLimit, Math.max(0, next))
        : Math.max(0, next);
    save((current) => ({
      ...current,
      progress: clampedNext,
      updatedAt: Date.now(),
    }));
    setProgressDraft(String(clampedNext));
  };

  const applyRewatches = (next: number) => {
    if (!isTracked) {
      setRewatchDraft(String(Math.max(0, next)));
      return;
    }

    save((current) => ({
      ...current,
      rewatches: Math.max(0, next),
      updatedAt: Date.now(),
    }));
    setRewatchDraft(String(Math.max(0, next)));
  };

  const addCollection = () => {
    const name = collectionDraft.trim();
    if (!name) return;
    if (!isTracked) {
      tracker.upsertEntry(payload);
    }

    save((current) => ({
      ...current,
      collections: Array.from(new Set([...current.collections, name])),
      updatedAt: Date.now(),
    }));
    setCollectionDraft("");
  };

  const addToExistingCollection = (collectionName: string) => {
    if (!isTracked) {
      tracker.upsertEntry(payload);
    }

    save((current) => ({
      ...current,
      collections: Array.from(
        new Set([...current.collections, collectionName]),
      ),
      updatedAt: Date.now(),
    }));
    setShowCollectionPicker(false);
  };

  const removeCollection = (name: string) => {
    if (!isTracked) return;

    save((current) => ({
      ...current,
      collections: current.collections.filter(
        (collection: string) => collection !== name,
      ),
      updatedAt: Date.now(),
    }));
  };

  const removeEntry = () => {
    if (isTracked) {
      tracker.removeEntry(id, type);
    }
    router.back();
  };

  const loading = detailLoading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.bannerWrap}>
            <Image
              source={{ uri: displayCover }}
              style={styles.banner}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(12,12,24,0)", "rgba(12,12,24,0.75)", "#0C0C18"]}
              locations={[0.2, 0.72, 1]}
              style={StyleSheet.absoluteFillObject}
            />
            <SafeAreaView edges={["top"]} style={styles.topBar}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </Pressable>
              <View style={styles.topTitleWrap}>
                <Text style={styles.topTitle} numberOfLines={1}>
                  {displayTitle}
                </Text>
                <Text style={[styles.topSub, { color: accent }]}>
                  {type === "lightnovel" ? "Light Novel" : type.toUpperCase()}{" "}
                  tracker
                </Text>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.heroRow}>
            <Image
              source={{ uri: displayCover }}
              style={[styles.cover, { borderColor: accent }]}
              contentFit="cover"
            />
            <View style={styles.heroInfo}>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: accent + "22",
                    borderColor: accent + "55",
                  },
                ]}
              >
                <Text style={[styles.typeBadgeText, { color: accent }]}>
                  {type === "lightnovel" ? "LIGHT NOVEL" : type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={3}>
                {displayTitle}
              </Text>
              {entry ? (
                <Text style={styles.heroSummary} numberOfLines={2}>
                  {entry.status}
                  {entry.wishlist ? " · Wishlist" : ""}
                  {entry.totalProgress
                    ? ` · ${entry.progress}/${entry.totalProgress}`
                    : entry.progress > 0
                      ? ` · ${entry.progress}`
                      : ""}
                  {entry.rewatches > 0 ? ` · ${entry.rewatches} rewatches` : ""}
                </Text>
              ) : (
                <Text style={styles.heroSummary}>Not yet tracked</Text>
              )}
            </View>
          </View>

          {(description || genres.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={accent} />
                  <Text style={[styles.loadingText, { color: accent }]}>
                    Loading metadata…
                  </Text>
                </View>
              ) : (
                <>
                  {description.length > 0 && (
                    <Text style={styles.description}>{description}</Text>
                  )}
                  {genres.length > 0 && (
                    <View style={styles.genreRow}>
                      {genres.slice(0, 6).map((genre: string) => (
                        <View
                          key={genre}
                          style={[
                            styles.genrePill,
                            {
                              borderColor: accent + "55",
                              backgroundColor: accent + "18",
                            },
                          ]}
                        >
                          <Text style={[styles.genreText, { color: accent }]}>
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

{/* {detail?.trailer?.id && type === "anime" && isTracked && ( */}
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Trailer</Text>
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
        style={styles.trailerThumb}
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
        <View style={styles.trailerOverlay} />
        <View style={[styles.trailerPlayBtn, { backgroundColor: accent }]}>
          <Ionicons name="play" size={22} color="#fff" />
        </View>
        <Text style={styles.trailerLabel}>Watch trailer</Text>
      </Pressable>
    )}
  </View>
{/* Characters */}
{detail?.characters?.edges?.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>
      {type === "anime" ? "Characters & Voice Actors" : "Characters"}
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.recsRow}
    >
      {detail.characters.edges.map((edge: any) => {
        const char = edge.node;
        const va = edge.voiceActors?.[0];
        return (
          <View key={char.name.full} style={styles.charCard}>
            <View style={styles.charImgRow}>
              <Image
                source={{ uri: char.image?.large }}
                style={styles.charImg}
                contentFit="cover"
              />
              {va && (
                <Image
                  source={{ uri: va.image?.large }}
                  style={styles.vaImg}
                  contentFit="cover"
                />
              )}
            </View>
            <View style={styles.charInfo}>
              <Text style={styles.charName} numberOfLines={2}>
                {char.name.full}
              </Text>
              <Text style={[styles.charRole, { color: accent }]}>
                {edge.role === "MAIN" ? "Main" : "Supporting"}
              </Text>
              {va && (
                <Text style={styles.vaName} numberOfLines={1}>
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
{/* Staff & Studio */}
{(detail?.staff?.edges?.length > 0 || detail?.studios?.nodes?.length > 0) && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>
      {type === "anime" ? "Staff & Studio" : "Staff & Author"}
    </Text>

    {/* Studio / Publisher */}
    {detail?.studios?.nodes?.length > 0 && (
      <View style={styles.studioRow}>
        <Ionicons name="business-outline" size={13} color={accent} />
        <Text style={[styles.studioLabel, { color: accent }]}>
          {type === "anime" ? "Studio" : "Publisher"}
        </Text>
        <Text style={styles.studioName}>
          {detail.studios.nodes.map((s: any) => s.name).join(", ")}
        </Text>
      </View>
    )}

    <View style={styles.staffGrid}>
      {detail?.staff?.edges?.map((edge: any) => (
        <View key={edge.node.name.full + edge.role} style={styles.staffCard}>
          <Image
            source={{ uri: edge.node.image?.large }}
            style={styles.staffImg}
            contentFit="cover"
          />
          <View style={styles.staffInfo}>
            <Text style={styles.staffName} numberOfLines={2}>
              {edge.node.name.full}
            </Text>
            <Text style={[styles.staffRole, { color: accent }]} numberOfLines={1}>
              {edge.role}
            </Text>
          </View>
        </View>
      ))}
    </View>
  </View>
)}
  {recommendations && recommendations.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Recommendations</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.recsRow}
    >
      {recommendations.map((rec) => {
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
            style={styles.recCard}
            onPress={() =>
              router.push({
                pathname: "/modal",   // or whatever your actual route is
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
              style={styles.recCover}
              contentFit="cover"
            />
            <View
              style={[
                styles.recTypeBadge,
                { backgroundColor: recAccent + "22", borderColor: recAccent + "55" },
              ]}
            >
              <Text style={[styles.recTypeText, { color: recAccent }]}>
                {recType === "lightnovel" ? "LN" : recType.toUpperCase()}
              </Text>
            </View>
            <View style={styles.recInfo}>
              <Text style={styles.recTitle} numberOfLines={2}>
                {recTitle}
              </Text>
              {rec.averageScore ? (
                <View style={styles.recScoreRow}>
                  <Ionicons name="star" size={10} color="#FBBF24" />
                  <Text style={styles.recScore}>
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
{/* )} */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracking</Text>
            <View style={styles.actionRow}>
  <Pressable
    onPress={toggleWishlist}
    style={[
      styles.actionButton,
      entry?.wishlist && {
        backgroundColor: "#F472B6" + "22",
        borderColor: "#F472B6" + "88",
      },
    ]}
  >
    <Ionicons
      name={entry?.wishlist ? "heart" : "heart-outline"}
      size={16}
      color={entry?.wishlist ? "#F472B6" : "rgba(255,255,255,0.7)"}
    />
    <Text
      style={[
        styles.actionText,
        entry?.wishlist && { color: "#F472B6" },
      ]}
    >
      {entry?.wishlist ? "Remove from wishlist" : "Add to wishlist"}
    </Text>
  </Pressable>
  {/* <Pressable
    onPress={removeEntry}
    style={[styles.actionButton, styles.dangerButton]}
  >
    <Ionicons name="trash-outline" size={16} color="#EF4444" />
    <Text style={[styles.actionText, styles.dangerText]}>Remove</Text>
  </Pressable> */}
</View>

{entry?.wishlist && (
  <>
    <View style={styles.statsGrid}>
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
        label="Collections"
        value={String(entry?.collections.length ?? 0)}
        accent={accent}
      />
    </View>

    {type === "anime" &&
      releasedProgress != null &&
      totalProgress != null && (
        <View style={styles.countdownBox}>
          <Text style={[styles.countdownLabel, { color: accent }]}>
            Ongoing countdown
          </Text>
          <Text style={styles.countdownValue}>
            {releasedProgress}/{totalProgress} released ·{" "}
            {Math.max(totalProgress - releasedProgress, 0)} left
            {nextReleaseLabel ? ` · next in ${nextReleaseLabel}` : ""}
          </Text>
        </View>
      )}

    <Text style={styles.sectionLabel}>Status</Text>
    <View style={styles.statusGrid}>
      {TRACKER_STATUSES_DISPLAY.map((status) => {
        const active = entry?.status === status;
        return (
          <Pressable
            key={status}
            onPress={() => setStatus(status)}
            style={[
              styles.statusPill,
              active && {
                backgroundColor: accent + "22",
                borderColor: accent + "88",
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                active && { color: accent, fontWeight: "700" },
              ]}
            >
              {status}
            </Text>
          </Pressable>
        );
      })}
    </View>

    <Stepper
      label={`Current ${type === "anime" ? "Episode" : "Chapter"}`}
      value={Number.parseInt(progressDraft, 10) || 0}
      onChange={applyProgress}
      accent={accent}
      max={progressLimit}
    />
    <View style={styles.inlineInputRow}>
      <TextInput
        value={progressDraft}
        onChangeText={setProgressDraft}
        onSubmitEditing={() =>
          applyProgress(Number.parseInt(progressDraft, 10) || 0)
        }
        keyboardType="number-pad"
        placeholder="Episode / chapter"
        placeholderTextColor="rgba(255,255,255,0.24)"
        style={styles.inlineInput}
      />
      <Pressable
        onPress={() =>
          applyProgress(Number.parseInt(progressDraft, 10) || 0)
        }
        style={[styles.inlineButton, { backgroundColor: accent }]}
      >
        <Text style={styles.inlineButtonText}>Set</Text>
      </Pressable>
    </View>

    
  </>
)}

            <Stepper
              label="Total rewatches"
              value={Number.parseInt(rewatchDraft, 10) || 0}
              onChange={applyRewatches}
              accent={accent}
            />
            <View style={styles.inlineInputRow}>
              <TextInput
                value={rewatchDraft}
                onChangeText={setRewatchDraft}
                onSubmitEditing={() =>
                  applyRewatches(Number.parseInt(rewatchDraft, 10) || 0)
                }
                keyboardType="number-pad"
                placeholder="Rewatches"
                placeholderTextColor="rgba(255,255,255,0.24)"
                style={styles.inlineInput}
              />
              <Pressable
                onPress={() =>
                  applyRewatches(Number.parseInt(rewatchDraft, 10) || 0)
                }
                style={[styles.inlineButton, { backgroundColor: accent }]}
              >
                <Text style={styles.inlineButtonText}>Set</Text>
              </Pressable>
            </View>
          </View>

                

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collections</Text>
            <View style={styles.inlineInputRow}>
              <TextInput
                value={collectionDraft}
                onChangeText={setCollectionDraft}
                onSubmitEditing={addCollection}
                placeholder="New collection name"
                placeholderTextColor="rgba(255,255,255,0.24)"
                style={styles.inlineInput}
              />
              <Pressable
                onPress={
                  collectionDraft.trim()
                    ? addCollection
                    : () => setShowCollectionPicker(true)
                }
                style={[styles.inlineButton, { backgroundColor: accent }]}
              >
                <Text style={styles.inlineButtonText}>
                  {collectionDraft.trim() ? "Add" : "Pick"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.collectionWrap}>
              {entry?.collections.length ? (
                entry.collections.map((collection) => (
                  <Pressable
                    key={collection}
                    onPress={() => removeCollection(collection)}
                    style={styles.collectionPill}
                  >
                    <Text style={styles.collectionText}>{collection}</Text>
                    <Ionicons
                      name="close"
                      size={12}
                      color="rgba(255,255,255,0.5)"
                    />
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No collections yet. Add one to group related titles together.
                </Text>
              )}
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showCollectionPicker}
        animationType="slide"
        onRequestClose={() => setShowCollectionPicker(false)}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView edges={["top"]} style={styles.modalHeader}>
            <Pressable
              onPress={() => setShowCollectionPicker(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.modalTitle}>Add to Collection</Text>
            <View style={{ width: 32 }} />
          </SafeAreaView>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            {tracker.collections.length > 0 ? (
              <>
                <Text style={styles.modalSectionTitle}>
                  Existing Collections
                </Text>
                <View style={styles.modalGrid}>
                  {tracker.collections.map((collection) => (
                    <Pressable
                      key={collection.name}
                      onPress={() => addToExistingCollection(collection.name)}
                      style={[
                        styles.modalCollectionTile,
                        entry?.collections.includes(collection.name) && {
                          opacity: 0.5,
                        },
                      ]}
                    >
                      <Text style={styles.modalCollectionName}>
                        {collection.name}
                      </Text>
                      <Text style={styles.modalCollectionCount}>
                        {collection.items.length} items
                      </Text>
                      {entry?.collections.includes(collection.name) && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={accent}
                          style={styles.modalCheckmark}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.modalEmptyText}>
                No collections yet. Create one in the Library or add a new name
                above.
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0C0C18" },
  scrollContent: { paddingBottom: 28 },

  recsRow: {
  paddingRight: 16,
  gap: 12,
},

// Characters
charCard: {
  width: 110,
  borderRadius: 14,
  backgroundColor: "#141420",
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.07)",
},
charImgRow: {
  flexDirection: "row",
  height: 130,
},
charImg: {
  flex: 1,
  height: "100%",
},
vaImg: {
  flex: 1,
  height: "100%",
  borderLeftWidth: 1,
  borderLeftColor: "rgba(0,0,0,0.4)",
},
charInfo: {
  padding: 8,
  gap: 2,
},
charName: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "700",
  lineHeight: 15,
},
charRole: {
  fontSize: 10,
  fontWeight: "700",
  letterSpacing: 0.4,
},
vaName: {
  color: "rgba(255,255,255,0.45)",
  fontSize: 10,
  marginTop: 2,
},

// Staff
studioRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginBottom: 14,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 12,
  backgroundColor: "rgba(255,255,255,0.04)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.07)",
},
studioLabel: {
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 0.5,
  textTransform: "uppercase",
},
studioName: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "600",
  flex: 1,
},
staffGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
},
staffCard: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  width: "47%",
  backgroundColor: "#141420",
  borderRadius: 12,
  padding: 10,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.07)",
},
staffImg: {
  width: 40,
  height: 40,
  borderRadius: 20,
},
staffInfo: {
  flex: 1,
  gap: 2,
},
staffName: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "700",
  lineHeight: 14,
},
staffRole: {
  fontSize: 10,
  fontWeight: "600",
  letterSpacing: 0.3,
},
recCard: {
  width: 120,
  borderRadius: 14,
  backgroundColor: "#141420",
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.07)",
},
recCover: {
  width: "100%",
  height: 168,
},
recTypeBadge: {
  position: "absolute",
  top: 8,
  left: 8,
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 6,
  borderWidth: 1,
},
recTypeText: {
  fontSize: 9,
  fontWeight: "800",
  letterSpacing: 0.6,
},
recInfo: {
  padding: 8,
  gap: 4,
},
recTitle: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "700",
  lineHeight: 15,
},
recScoreRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
},
recScore: {
  color: "#FBBF24",
  fontSize: 10,
  fontWeight: "700",
},
    trailerFrame: {
  height: 210,
  borderRadius: 16,
  overflow: "hidden",
  backgroundColor: "#000",
},
trailerWebView: {
  flex: 1,
  backgroundColor: "#000",
},
trailerThumb: {
  height: 210,
  borderRadius: 16,
  overflow: "hidden",
  backgroundColor: "#141420",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.07)",
},
trailerOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0,0,0,0.42)",
},
trailerPlayBtn: {
  width: 56,
  height: 56,
  borderRadius: 28,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},
trailerLabel: {
  color: "rgba(255,255,255,0.85)",
  fontSize: 13,
  fontWeight: "700",
  letterSpacing: 0.3,
},
  bannerWrap: { height: 260, position: "relative" },
  banner: { width: "100%", height: "100%" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitleWrap: { flex: 1 },
  topTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  topSub: { fontSize: 11, fontWeight: "600", marginTop: 2 },

  heroRow: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    marginTop: -56,
    marginBottom: 18,
    alignItems: "flex-end",
  },
  cover: { width: 108, height: 156, borderRadius: 14, borderWidth: 2 },
  heroInfo: { flex: 1, gap: 8, paddingBottom: 4 },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 23 },
  heroSummary: { color: "rgba(255,255,255,0.55)", fontSize: 12 },

  section: { paddingHorizontal: 16, marginBottom: 18 },
  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  description: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13.5,
    lineHeight: 21,
  },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreText: { fontSize: 12, fontWeight: "600" },

  loadingBox: { alignItems: "center", gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 13, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  actionText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  dangerButton: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.25)",
  },
  dangerText: { color: "#EF4444" },

  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statChip: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statValue: { color: "#fff", fontSize: 14, fontWeight: "700" },

  countdownBox: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(124,92,252,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,92,252,0.28)",
    gap: 4,
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  countdownValue: { color: "#fff", fontSize: 13, fontWeight: "700" },

  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  statusPillText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "600",
  },

  lockedBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
    gap: 4,
  },
  lockedTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  lockedText: { color: "rgba(255,255,255,0.58)", fontSize: 13, lineHeight: 18 },

  stepperCard: {
    backgroundColor: "#141420",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  stepperValue: { color: "#fff", fontSize: 18, fontWeight: "800" },

  inlineInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: "#141420",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
  },
  inlineButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  inlineButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" },

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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  collectionText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  emptyText: { color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 18 },

  modalContainer: { flex: 1, backgroundColor: "#0C0C18" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalContent: { padding: 16 },
  modalSectionTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  modalGrid: {
    gap: 10,
  },
  modalCollectionTile: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalCollectionName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalCollectionCount: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 4,
  },
  modalCheckmark: { position: "absolute", top: 10, right: 10 },
  modalEmptyText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 20,
  },
});
