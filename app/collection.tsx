import MediaCard from "@/components/MediaCard";
import { useTracker } from "@/contexts/tracker-context";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
    FlatList,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CollectionScreen() {
  const tracker = useTracker();
  const params = useLocalSearchParams<{ name?: string }>();
  const name = decodeURIComponent(params.name ?? "");
  const collection = tracker.collections.find((item) => item.name === name);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Collection</Text>
          <Text style={styles.title}>{collection?.name ?? name}</Text>
          <Text style={styles.sub}>
            {collection
              ? `${collection.items.length} titles inside`
              : "This collection is empty."}
          </Text>
        </View>

        {collection && collection.items.length > 0 ? (
          <FlatList
            data={collection.items}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={({ item }) => (
              <MediaCard item={item} variant="landscape" style={styles.card} />
            )}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No titles yet</Text>
            <Text style={styles.emptySub}>
              Add anime, manga, or light novels to this collection from the
              tracker modal.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0C0C18" },
  scroll: { paddingBottom: 28 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 4 },
  eyebrow: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  title: { color: "#fff", fontSize: 30, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.42)", fontSize: 13 },
  card: { marginHorizontal: 16 },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#141420",
    padding: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: { color: "rgba(255,255,255,0.38)", fontSize: 13, lineHeight: 19 },
});
