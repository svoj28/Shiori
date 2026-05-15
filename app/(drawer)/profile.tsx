import { useAuth } from "@/contexts/auth-context";
import { useTracker } from "@/contexts/tracker-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#080810",
  surface: "#0F0F1E",
  surfaceHigh: "#161628",
  accent: "#6C4EF6",
  accentLight: "#9B7FFF",
  accentGlow: "rgba(108,78,246,0.18)",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.5)",
  textMuted: "rgba(255,255,255,0.25)",
  error: "#EF4444",
};

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={st.tile}>
      <Text style={[st.value, { color }]}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  value: { fontSize: 24, fontWeight: "700", lineHeight: 26 },
  label: {
    color: "rgba(255,255,255,0.32)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },
});

// ─── Avatar placeholder ───────────────────────────────────────────────────────
function AvatarPlaceholder({
  name,
  avatarUrl,
  size = 72,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
}) {
  const letter = name?.charAt(0).toUpperCase() ?? "?";
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.2)",
        }}
        contentFit="cover"
      />
    );
  }
  return (
    <LinearGradient
      colors={[C.accent, C.accentLight]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontWeight: "700" }}>
        {letter}
      </Text>
    </LinearGradient>
  );
}

// ─── Profile screen ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { profile, user, signOut, updateProfile, uploadAvatar } = useAuth();
  const tracker = useTracker();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    setSaveError(null);
    if (!displayName.trim()) {
      setSaveError("Display name cannot be empty.");
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      display_name: displayName.trim(),
      username: username.trim() || null,
      bio: bio.trim() || null,
    });
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "You'll need to sign in again to access your cloud library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/login" as any);
          },
        },
      ],
    );
  };

  const handleAvatarPick = async () => {
    setSaveError(null);

    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    setAvatarUploading(true);
    const { error } = await uploadAvatar(result.assets[0].uri);
    setAvatarUploading(false);

    if (error) {
      setSaveError(error);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const statusCounts = tracker.statusCounts;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <View style={s.glow} pointerEvents="none" />

      {/* Success toast */}
      {saved ? (
        <View style={s.toast} pointerEvents="none">
          <View style={s.toastDot} />
          <Text style={s.toastText}>Profile saved</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.eyebrow}>My Account</Text>
            <Text style={s.title}>Profile</Text>
            
          </View>

          {/* Avatar + Identity */}
          <View style={s.identityCard}>
            <LinearGradient
              colors={["rgba(108,78,246,0.2)", "transparent"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              pointerEvents="none"
            />
            <Pressable
              onPress={handleAvatarPick}
              style={s.avatarPress}
              disabled={avatarUploading}
            >
              <AvatarPlaceholder
                name={profile?.display_name ?? profile?.username}
                avatarUrl={profile?.avatar_url}
                size={72}
              />
              <View style={s.avatarBadge}>
                <Ionicons
                  name={avatarUploading ? "time-outline" : "camera-outline"}
                  size={12}
                  color="#fff"
                />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.displayName} numberOfLines={1}>
                {profile?.display_name || profile?.username || "Shiori User"}
              </Text>
              <Text style={s.usernameText} numberOfLines={1}>
                @{profile?.username || user?.email?.split("@")[0] || "—"}
              </Text>
              <Text style={s.emailText} numberOfLines={1}>
                {user?.email}
              </Text>
              <Text style={s.avatarHint} numberOfLines={1}>
                {avatarUploading
                  ? "Uploading avatar..."
                  : "Tap avatar to change"}
              </Text>
            </View>
            <Pressable onPress={() => setEditing((v) => !v)} style={s.editBtn}>
              <Ionicons
                name={editing ? "close-outline" : "pencil-outline"}
                size={16}
                color={C.accentLight}
              />
            </Pressable>
          </View>

          {/* Edit form */}
          {editing && (
            <View style={s.editCard}>
              <Text style={s.editHeading}>Edit Profile</Text>

              {[
                {
                  label: "Display Name",
                  value: displayName,
                  onChange: setDisplayName,
                  placeholder: "Your name",
                  icon: "person-outline" as const,
                },
                {
                  label: "Username",
                  value: username,
                  onChange: setUsername,
                  placeholder: "your_username",
                  icon: "at-outline" as const,
                },
              ].map(({ label, value, onChange, placeholder, icon }) => (
                <View key={label} style={ef.wrap}>
                  <Text style={ef.label}>{label}</Text>
                  <View style={ef.row}>
                    <Ionicons
                      name={icon}
                      size={16}
                      color={C.textMuted}
                      style={{ marginLeft: 12 }}
                    />
                    <TextInput
                      style={ef.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder={placeholder}
                      placeholderTextColor={C.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              ))}

              {/* Bio */}
              <View style={ef.wrap}>
                <Text style={ef.label}>Bio</Text>
                <TextInput
                  style={[ef.row, ef.bioInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself…"
                  placeholderTextColor={C.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {saveError ? (
                <View style={s.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={13}
                    color={C.error}
                  />
                  <Text style={s.errorText}>{saveError}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  s.saveBtn,
                  pressed && { opacity: 0.78 },
                ]}
              >
                <LinearGradient
                  colors={[C.accent, C.accentLight]}
                  style={s.saveBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {saving ? (
                    <Text style={s.saveBtnText}>Saving…</Text>
                  ) : (
                    <>
                      <Text style={s.saveBtnText}>Save Changes</Text>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* Bio display (when not editing) */}
          {!editing && profile?.bio ? (
            <View style={s.bioCard}>
              <Text style={s.bioLabel}>Bio</Text>
              <Text style={s.bioText}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* Stats */}
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>Library Stats</Text>
          </View>

          <View style={s.statsRow}>
            <StatTile
              label="Tracked"
              value={tracker.totalTracked}
              color="#6C4EF6"
            />
            <StatTile
              label="Wishlisted"
              value={tracker.wishlistEntries.length}
              color="#EC4899"
            />
            <StatTile
              label="Collections"
              value={tracker.collections.length}
              color="#06B6D4"
            />
          </View>

          <View style={[s.statsRow, { marginTop: 8 }]}>
            <StatTile
              label="Watching"
              value={statusCounts["Watching"]}
              color="#38BDF8"
            />
            <StatTile
              label="Completed"
              value={statusCounts["Completed"]}
              color="#22C55E"
            />
            <StatTile
              label="Planning"
              value={statusCounts["Planning"]}
              color="#F59E0B"
            />
          </View>

          {/* Account info */}
          <View style={s.sectionHdr}>
            <Text style={s.sectionTitle}>Account</Text>
          </View>

          <View style={s.infoCard}>
            {[
              {
                label: "Email",
                value: user?.email ?? "—",
                icon: "mail-outline" as const,
              },
              {
                label: "Member since",
                value: user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })
                  : "—",
                icon: "calendar-outline" as const,
              },
              // {
              //   label: "User ID",
              //   value: user?.id ? user.id.slice(0, 12) + "…" : "—",
              //   icon: "key-outline" as const,
              // },
            ].map(({ label, value, icon }, i, arr) => (
              <React.Fragment key={label}>
                <View style={s.infoRow}>
                  <View style={s.infoIconWrap}>
                    <Ionicons name={icon} size={15} color={C.accentLight} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>{label}</Text>
                    <Text style={s.infoValue} numberOfLines={1}>
                      {value}
                    </Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={s.infoDivider} />}
              </React.Fragment>
            ))}
          </View>
<Pressable onPress={handleSignOut} style={s.signOutBtn}>
              <Ionicons name="log-out-outline" size={17} color={C.error} />
              <Text style={s.signOutText}>Sign Out</Text>
            </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Edit form styles ─────────────────────────────────────────────────────────
const ef = StyleSheet.create({
  wrap: { gap: 7, marginBottom: 14 },
  label: {
    color: C.textSub,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginLeft: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    paddingHorizontal: 10,
  },
  bioInput: {
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    color: C.text,
    fontSize: 14,
  },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 24 },
  glow: {
    position: "absolute",
    top: -40,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(108,78,246,0.08)",
  },

  // Toast
  toast: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#16162A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    zIndex: 200,
  },
  toastDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
  },
  toastText: { color: C.text, fontSize: 13, fontWeight: "600" },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 70, paddingBottom: 16 },
  eyebrow: {
    color: C.textMuted,
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    color: C.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  signOutBtn: {
    position: "absolute",
    right: 20,
    top: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)",
  },
  signOutText: { color: C.error, fontSize: 12.5, fontWeight: "600" },

  // Identity card
  identityCard: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surfaceHigh,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  displayName: { color: C.text, fontSize: 17, fontWeight: "700" },
  avatarPress: { position: "relative" },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  usernameText: {
    color: C.accentLight,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  emailText: { color: C.textMuted, fontSize: 11.5, marginTop: 2 },
  avatarHint: {
    color: C.textMuted,
    fontSize: 10.5,
    marginTop: 5,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.accentGlow,
    alignItems: "center",
    justifyContent: "center",
  },

  // Edit card
  editCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  editHeading: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    marginBottom: 14,
  },
  errorText: { color: C.error, fontSize: 12.5, flex: 1 },
  saveBtn: { borderRadius: 13, overflow: "hidden" },
  saveBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  saveBtnText: { color: "#fff", fontSize: 14.5, fontWeight: "700" },

  // Bio card
  bioCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  bioLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  bioText: { color: C.textSub, fontSize: 13.5, lineHeight: 20 },

  // Stats
  sectionHdr: { paddingHorizontal: 20, marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, marginHorizontal: 16 },

  // Info card
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 10,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.accentGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  infoValue: { color: C.text, fontSize: 13.5, fontWeight: "500", marginTop: 2 },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 14,
  },
});
