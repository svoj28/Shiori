import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#EC4899";

export default function EditProfileScreen() {
  const [name, setName] = React.useState("Shiori Fan");
  const [handle, setHandle] = React.useState("@shiori.local");
  const [bio, setBio] = React.useState(
    "Anime, manga, and light novel tracker profile shown with placeholder data for now.",
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Edit Profile</Text>
        <Text style={styles.title}>Hardcoded settings</Text>
        <Text style={styles.subtitle}>These fields are local placeholders for now.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Display name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor="rgba(255,255,255,0.3)" />

          <Text style={styles.label}>Handle</Text>
          <TextInput value={handle} onChangeText={setHandle} style={styles.input} placeholderTextColor="rgba(255,255,255,0.3)" />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
        </View>

        <Pressable style={styles.saveBtn}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0C0C18" },
  content: { padding: 16, paddingBottom: 28, gap: 16 },
  eyebrow: { color: "rgba(255,255,255,0.45)", fontSize: 12, letterSpacing: 0.4 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 13 },
  card: {
    backgroundColor: "#141420",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "700" },
  input: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});