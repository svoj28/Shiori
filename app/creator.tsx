import MediaCard, { MediaItem, MediaType } from "@/components/MediaCard";
import { getAuthorDetail, getStudioDetail } from "@/services/anilist";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
    FlatList,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CreatorKind = "studio" | "author";

function toMediaType(format?: string | null, type?: string | null): MediaType {
  if (type === "ANIME") return "anime";
  if (format === "NOVEL") return "lightnovel";
  return "manga";
}

function normaliseWork(item: any): MediaItem {
  return {
    id: item.id,
    title: item.title?.english ?? item.title?.romaji ?? "Unknown",
    coverImage: item.coverImage?.large ?? item.coverImage?.extraLarge ?? "",
    type: toMediaType(item.format, item.type),
    score: item.averageScore ?? undefined,
    episodes: item.episodes ?? undefined,
    chapters: item.chapters ?? undefined,
    genres: item.genres ?? [],
    rankings: item.rankings ?? [],
    raw: item,
  };
}

export default function CreatorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; name?: string }>();
  const kind = (params.kind ?? "studio") as CreatorKind;
  const name = decodeURIComponent(params.name ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["creator-detail", kind, name],
    queryFn: () =>
      kind === "studio" ? getStudioDetail(name) : getAuthorDetail(name),
    enabled: name.length > 0,
    retry: 1,
  });

  const works = useMemo(() => {
    const nodes = data?.media?.nodes ?? data?.staffMedia?.nodes ?? [];
    const seen = new Set<string>();
    return nodes
      .map(normaliseWork)
      .filter((item) => {
        const key = `${item.type}-${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => {
        const popularityDiff =
          (right.raw?.popularity ?? 0) - (left.raw?.popularity ?? 0);
        if (popularityDiff !== 0) return popularityDiff;
        return left.title.localeCompare(right.title);
      });
  }, [data?.media?.nodes, data?.staffMedia?.nodes]);

  const title =
    kind === "studio" ? (data?.name ?? name) : (data?.name?.full ?? name);
  const subtitle =
    kind === "studio"
      ? data?.isAnimationStudio
        ? "Animation studio"
        : "Studio"
      : "Author";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{subtitle}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>
            {isLoading
              ? "Loading works…"
              : `${works.length} works sorted by popularity`}
          </Text>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={works}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => (
          <MediaCard item={item} variant="landscape" style={styles.card} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No works found</Text>
            <Text style={styles.emptySub}>
              AniList did not return any titles for this creator.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0C0C18" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.42)", fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { marginHorizontal: 0 },
  emptyCard: {
    backgroundColor: "#141420",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 18,
    gap: 6,
  },
  emptyTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptySub: { color: "rgba(255,255,255,0.42)", fontSize: 13, lineHeight: 18 },
});
