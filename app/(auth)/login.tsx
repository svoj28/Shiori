import { useAuth } from "@/contexts/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
  accentGlow: "rgba(108,78,246,0.22)",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.5)",
  textMuted: "rgba(255,255,255,0.25)",
  error: "#EF4444",
};

// ─── Input component ──────────────────────────────────────────────────────────
function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  error,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default";
  autoCapitalize?: "none" | "sentences";
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);

  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View
        style={[
          f.row,
          focused && { borderColor: C.accent + "88" },
          error && { borderColor: C.error + "88" },
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={focused ? C.accentLight : C.textMuted}
          style={{ marginLeft: 14 }}
        />
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          secureTextEntry={secureTextEntry && !shown}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={autoCapitalize ?? "sentences"}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setShown((v) => !v)}
            style={{ paddingHorizontal: 14 }}
          >
            <Ionicons
              name={shown ? "eye-outline" : "eye-off-outline"}
              size={17}
              color={C.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const f = StyleSheet.create({
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
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 14.5,
    paddingVertical: Platform.OS === "ios" ? 14 : 11,
    paddingHorizontal: 10,
  },
});

// ─── Login screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setBusy(true);
    const { error: err } = await signIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />

      {/* Background glow */}
      <View style={s.glowTopRight} pointerEvents="none" />
      <View style={s.glowBotLeft} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoBlock}>
            <LinearGradient
              colors={[C.accent, C.accentLight]}
              style={s.logoGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="play" size={22} color="#fff" />
            </LinearGradient>
            <Text style={s.appName}>S H I O R I</Text>
            <Text style={s.tagline}>Your personal anime & manga tracker</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>
              Sign in to sync your library across devices
            </Text>

            <View style={{ height: 22 }} />

            <Field
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!error}
            />
            <Field
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              error={!!error}
            />

            {error ? (
              <View style={s.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color={C.error}
                />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleLogin}
              disabled={busy}
              style={({ pressed }) => [
                s.primaryBtn,
                pressed && { opacity: 0.78 },
              ]}
            >
              <LinearGradient
                colors={[C.accent, C.accentLight]}
                style={s.primaryBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {busy ? (
                  <Text style={s.primaryBtnText}>Signing in…</Text>
                ) : (
                  <>
                    <Text style={s.primaryBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={s.switchRow}>
              <Text style={s.switchText}>Don't have an account? </Text>
              <Pressable onPress={() => router.push("/signup" as any)}>
                <Text style={s.switchLink}>Create one</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },

  glowTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(108,78,246,0.12)",
  },
  glowBotLeft: {
    position: "absolute",
    bottom: 60,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(108,78,246,0.07)",
  },

  // Logo
  logoBlock: { alignItems: "center", marginBottom: 36, gap: 10 },
  logoGrad: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: { color: C.text, fontSize: 22, fontWeight: "800", letterSpacing: 3 },
  tagline: { color: C.textMuted, fontSize: 12, fontWeight: "500" },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  cardSub: { color: C.textSub, fontSize: 13, marginTop: 5 },

  // Error
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

  // Primary button
  primaryBtn: { borderRadius: 14, overflow: "hidden", marginTop: 6 },
  primaryBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Switch row
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    flexWrap: "wrap",
  },
  switchText: { color: C.textMuted, fontSize: 13 },
  switchLink: { color: C.accentLight, fontSize: 13, fontWeight: "600" },
});
