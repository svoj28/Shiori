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
  accent: "#6C4EF6",
  accentLight: "#9B7FFF",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.5)",
  textMuted: "rgba(255,255,255,0.25)",
  error: "#EF4444",
  success: "#22C55E",
};

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

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSignup = async () => {
    setError(null);
    if (!email.trim() || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const { error: err } = await signUp(email.trim(), password);
    setBusy(false);

    if (err) {
      setError(err);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <View style={s.successWrap}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={C.success} />
          </View>
          <Text style={s.successTitle}>Check your inbox!</Text>
          <Text style={s.successSub}>
            We sent a confirmation link to{"\n"}
            <Text style={{ color: C.accentLight }}>{email}</Text>.{"\n\n"}Click
            the link to activate your account, then sign in.
          </Text>
          <Pressable
            onPress={() => router.replace("/login" as any)}
            style={s.backBtn}
          >
            <Text style={s.backBtnText}>Go to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />
      <View style={s.glowTop} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable onPress={() => router.back()} style={s.backRow}>
            <Ionicons name="arrow-back" size={18} color={C.textSub} />
            <Text style={s.backText}>Back to login</Text>
          </Pressable>

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
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Create account</Text>
            <Text style={s.cardSub}>
              Track your anime, manga & light novels everywhere
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
              placeholder="Min. 6 characters"
              secureTextEntry
              autoCapitalize="none"
              error={!!error}
            />
            <Field
              label="Confirm Password"
              icon="shield-checkmark-outline"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your password"
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

            {/* Perks */}
            <View style={s.perksRow}>
              {["Cloud sync", "All devices", "Backups"].map((p) => (
                <View key={p} style={s.perk}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={13}
                    color={C.accentLight}
                  />
                  <Text style={s.perkText}>{p}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleSignup}
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
                  <Text style={s.primaryBtnText}>Creating account…</Text>
                ) : (
                  <>
                    <Text style={s.primaryBtnText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={s.switchRow}>
              <Text style={s.switchText}>Already have an account? </Text>
              <Pressable onPress={() => router.push("/login" as any)}>
                <Text style={s.switchLink}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  glowTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(108,78,246,0.1)",
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  backText: { color: C.textSub, fontSize: 13, fontWeight: "500" },

  logoBlock: { alignItems: "center", marginBottom: 28, gap: 10 },
  logoGrad: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: { color: C.text, fontSize: 20, fontWeight: "800", letterSpacing: 3 },

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

  perksRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  perk: { flexDirection: "row", alignItems: "center", gap: 5 },
  perkText: { color: C.textSub, fontSize: 12 },

  primaryBtn: { borderRadius: 14, overflow: "hidden", marginTop: 2 },
  primaryBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  switchText: { color: C.textMuted, fontSize: 13 },
  switchLink: { color: C.accentLight, fontSize: 13, fontWeight: "600" },

  // Success
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successIcon: { marginBottom: 18 },
  successTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  successSub: {
    color: C.textSub,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 30,
  },
  backBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
