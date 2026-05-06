import {
    getEpisodeSources,
    type HiAnimeSource as EpisodeSource,
    type HiAnimeSourcesResponse as EpisodeSourcesResponse,
} from "@/services/hianime";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const { width: W } = Dimensions.get("window");
const ACCENT = "#7C5CFC";

export default function PlayerScreen() {
  const router = useRouter();
  const { episodeId, episodeNum, animeTitle } = useLocalSearchParams<{
    episodeId: string;
    episodeNum: string;
    animeTitle: string;
  }>();

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<EpisodeSourcesResponse>({
    queryKey: ["sources", episodeId],
    queryFn: async () => {
      const result = await getEpisodeSources(episodeId);
      // Auto-select first source on load
      if (result.sources.length > 0 && !selectedUrl) {
        setSelectedUrl(result.sources[0].url);
      }
      return result;
    },
  });

  const sourceList: EpisodeSource[] = data?.sources ?? [];
  const videoUrl = selectedUrl ?? sourceList[0]?.url ?? null;

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* ── Video area ─────────────────────────────────────────────────────── */}
      <View style={styles.videoContainer}>
        {isLoading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={[styles.placeholderText, { color: ACCENT }]}>
              Loading stream…
            </Text>
          </View>
        ) : isError || !videoUrl ? (
          <View style={styles.placeholder}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color="rgba(255,255,255,0.3)"
            />
            <Text style={styles.errorTitle}>Stream unavailable</Text>
            <Text style={styles.errorSub}>
              This source may be down or geo-blocked.
            </Text>
          </View>
        ) : (
          <WebView
            source={{ uri: videoUrl }}
            style={styles.webview}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            allowsFullscreenVideo
          />
        )}

        {/* Back + title overlay */}
        <SafeAreaView edges={["top"]} style={styles.topOverlay}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.overlayTitle} numberOfLines={1}>
              {animeTitle}
            </Text>
            <Text style={styles.overlaySub}>Episode {episodeNum}</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Info + quality selector ───────────────────────────────────────── */}
      <View style={styles.infoArea}>
        <Text style={styles.infoTitle}>{animeTitle}</Text>
        <Text style={styles.infoEp}>Episode {episodeNum}</Text>

        {sourceList.length > 1 && (
          <View style={styles.qualitySection}>
            <Text style={styles.qualityHeading}>Quality</Text>
            <View style={styles.qualityRow}>
              {sourceList.map((src, i) => {
                const active = src.url === videoUrl;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedUrl(src.url)}
                    style={[
                      styles.qualityPill,
                      active && {
                        backgroundColor: ACCENT,
                        borderColor: ACCENT,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.qualityText,
                        active && { color: "#fff", fontWeight: "600" },
                      ]}
                    >
                      {src.quality ?? `Source ${i + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0C0C18" },

  videoContainer: {
    width: W,
    height: W * (9 / 16),
    backgroundColor: "#000",
    position: "relative",
  },
  webview: { flex: 1, backgroundColor: "#000" },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  placeholderText: { fontSize: 14, fontWeight: "500" },
  errorTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: "600",
  },
  errorSub: { color: "rgba(255,255,255,0.35)", fontSize: 13 },

  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1 },
  overlayTitle: { color: "#fff", fontSize: 13, fontWeight: "600" },
  overlaySub: { color: "rgba(255,255,255,0.5)", fontSize: 11 },

  infoArea: { flex: 1, padding: 20 },
  infoTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoEp: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 20 },

  qualitySection: {},
  qualityHeading: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  qualityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qualityPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  qualityText: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
});
