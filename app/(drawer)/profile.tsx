import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#EC4899";

const PROFILE_STATS = [
  { label: "Watching", value: "12" },
  { label: "Completed", value: "84" },
  { label: "Wishlist", value: "23" },
];

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Profile</Text>
            <Text style={styles.title}>Hardcoded account</Text>
          </View>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#fff" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.name}>Shiori Fan</Text>
          <Text style={styles.handle}>@shiori.local</Text>
          <Text style={styles.bio}>
            Anime, manga, and light novel tracker profile shown with placeholder data for now.
          </Text>

          <View style={styles.statsRow}>
            {PROFILE_STATS.map((stat) => (
              <View key={stat.label} style={styles.statTile}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.primaryBtn} onPress={() => router.push("/edit-profile")}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Edit Profile</Text>
          </Pressable>
        </View>

        <View style={styles.drawerCard}>
          <Text style={styles.sectionTitle}>Quick access</Text>
          <Pressable style={styles.linkRow} onPress={() => router.push("/library")}>
            <Ionicons name="albums-outline" size={18} color={ACCENT} />
            <Text style={styles.linkText}>Library</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
          </Pressable>
          <Pressable style={styles.linkRow} onPress={() => router.push("/creators")}>
            <Ionicons name="people-outline" size={18} color={ACCENT} />
            <Text style={styles.linkText}>Studios & Authors</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0C0C18" },
  content: { padding: 16, paddingBottom: 28, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  eyebrow: { color: "rgba(255,255,255,0.45)", fontSize: 12, letterSpacing: 0.4 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 2 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  card: {
    backgroundColor: "#141420",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  name: { color: "#fff", fontSize: 22, fontWeight: "800" },
  handle: { color: ACCENT, fontSize: 13, fontWeight: "700" },
  bio: { color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  statTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.42)", fontSize: 11, fontWeight: "600" },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  drawerCard: {
    backgroundColor: "#141420",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  linkText: { color: "#fff", fontSize: 14, fontWeight: "700", flex: 1 },
});