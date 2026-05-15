/**
 * app/(drawer)/_layout.tsx  — Drawer layout with improved profile card
 */

import { useAuth } from "@/contexts/auth-context";
import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerToggleButton,
} from "@react-navigation/drawer";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Pressable, StyleSheet, Text, View } from "react-native";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bg:          "#080810",
  surface:     "#0F0F1E",
  surfaceHigh: "#161628",
  accent:      "#6C4EF6",
  accentLight: "#9B7FFF",
  accentGlow:  "rgba(108,78,246,0.18)",
  border:      "rgba(255,255,255,0.07)",
  text:        "#FFFFFF",
  textSub:     "rgba(255,255,255,0.5)",
  textMuted:   "rgba(255,255,255,0.25)",
};

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({
  avatarUrl,
  displayName,
  size = 56,
}: {
  avatarUrl?: string | null;
  displayName: string;
  size?: number;
}) {
  const radius = size / 2;
  const fontSize = size * 0.38;

  return (
    <View
      style={[
        avatar.ring,
        {
          width: size + 4,
          height: size + 4,
          borderRadius: radius + 2,
        },
      ]}
    >
      <View style={[avatar.inner, { width: size, height: size, borderRadius: radius }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size, borderRadius: radius }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[C.accent, C.accentLight]}
            style={[avatar.placeholder, { width: size, height: size, borderRadius: radius }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[avatar.initial, { fontSize }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
      </View>
    </View>
  );
}

const avatar = StyleSheet.create({
  ring: {
    borderWidth: 2,
    borderColor: "rgba(108,78,246,0.6)",
    alignItems: "center",
    justifyContent: "center",
    // subtle glow
    shadowColor: C.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  inner: {
    overflow: "hidden",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: -0.5,
  },
});

// ─── Profile Card ────────────────────────────────────────────────────────────
function ProfileCard({
  avatarUrl,
  displayName,
  username,
  bio,
  onPress,
}: {
  avatarUrl?: string | null;
  displayName: string;
  username: string;
  bio?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pc.root, pressed && pc.rootPressed]}
    >
      {/* Gradient shimmer background */}
      <LinearGradient
        colors={["rgba(108,78,246,0.22)", "rgba(108,78,246,0.06)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top row: avatar + name block + chevron */}
      <View style={pc.topRow}>
        <Avatar avatarUrl={avatarUrl} displayName={displayName} size={54} />

        <View style={pc.nameBlock}>
          <Text style={pc.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={pc.handleRow}>
            <View style={pc.atDot} />
            <Text style={pc.handle} numberOfLines={1}>
              {username}
            </Text>
          </View>
        </View>

        <View style={pc.chevronWrap}>
          <Ionicons name="chevron-forward" size={14} color="rgba(155,127,255,0.7)" />
        </View>
      </View>

      {/* Bio — only if present */}
      {bio ? (
        <>
          <View style={pc.divider} />
          <Text style={pc.bio} numberOfLines={2}>
            {bio}
          </Text>
        </>
      ) : null}

      {/* Edit hint */}
      <View style={pc.editHint}>
        <Ionicons name="pencil-outline" size={10} color="rgba(155,127,255,0.55)" />
        <Text style={pc.editHintText}>Edit profile</Text>
      </View>
    </Pressable>
  );
}

const pc = StyleSheet.create({
  root: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(108,78,246,0.35)",
    padding: 16,
    overflow: "hidden",
    gap: 10,
  },
  rootPressed: {
    borderColor: "rgba(155,127,255,0.6)",
    opacity: 0.92,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  displayName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  atDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(108,78,246,0.85)",
  },
  handle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(108,78,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(108,78,246,0.3)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  bio: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12.5,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  editHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
  },
  editHintText: {
    color: "rgba(155,127,255,0.55)",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});

// ─── Custom Drawer Content ────────────────────────────────────────────────────
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { profile, user } = useAuth();
  const router = useRouter();

  const displayName =
    profile?.display_name ??
    profile?.username ??
    user?.email?.split("@")[0] ??
    "User";
  const username  = profile?.username ?? user?.email?.split("@")[0] ?? "";
  const bio       = profile?.bio?.trim() ?? "";
  const avatarUrl = profile?.avatar_url;

  return (
    <View style={drawer.root}>
      {/* Top section: app brand + profile card */}
      <View style={drawer.topSection}>
        {/* Subtle top gradient */}
        <LinearGradient
          colors={["rgba(108,78,246,0.28)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
        />

        {/* App wordmark */}
        <View style={drawer.brand}>
          <Text style={drawer.brandWord}>S H I O R I</Text>

        </View>

        {/* Profile card */}
        <ProfileCard
          avatarUrl={avatarUrl}
          displayName={displayName}
          username={username}
          bio={bio}
          onPress={() => router.push("/profile" as any)}
        />
      </View>

      {/* Nav label */}
      <Text style={drawer.sectionLabel}>NAVIGATION</Text>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={drawer.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={drawer.footer}>
        <View style={drawer.footerDivider} />
        <View style={drawer.footerRow}>
          
          <View style={drawer.footerSep} />
          <Text style={drawer.footerTextAccent}>S H I O R I</Text>
          <Text style={drawer.footerText}>powered by Anilist</Text>
        </View>
      </View>
    </View>
  );
}

const drawer = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  topSection:  { paddingTop: 54, paddingBottom: 12, paddingHorizontal: 16, overflow: "hidden", gap: 14 },
  brand:       { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  brandWord:   { color: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: "700", letterSpacing: 3.5 },
  brandDot:    { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent },
  sectionLabel:{ color: C.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  scrollContent:{ paddingTop: 0, paddingHorizontal: 10 },
  footer:      { paddingHorizontal: 20, paddingBottom: 36 },
  footerDivider:{ height: 1, backgroundColor: C.border, marginBottom: 12 },
  footerRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  footerText:  { color: C.textMuted, fontSize: 11, fontWeight: "500" },
  footerSep:   { width: 3, height: 3, borderRadius: 2, backgroundColor: C.textMuted },
  footerTextAccent: { color: "rgba(108,78,246,0.5)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
});

// ─── Drawer Layout ────────────────────────────────────────────────────────────
export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerStyle: {
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          elevation: 0,
          shadowOpacity: 0,
        } as any,
        headerTitleStyle: {
          color: C.text,
          fontWeight: "800",
          fontSize: 17,
          letterSpacing: -0.3,
        },
        headerLeft: () => (
          <View style={{ paddingLeft: 4 }}>
            <DrawerToggleButton tintColor="#fff" />
          </View>
        ),
        headerTintColor: C.text,
        drawerActiveTintColor: C.accentLight,
        drawerInactiveTintColor: "rgba(255,255,255,0.5)",
        drawerStyle: { backgroundColor: C.bg, width: 280, borderRightWidth: 0 },
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: "600",
          letterSpacing: 0.1,
          marginLeft: -8,
        },
        drawerItemStyle: {
          borderRadius: 12,
          marginVertical: 1,
          paddingHorizontal: 4,
        },
        drawerActiveBackgroundColor: C.accentGlow,
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Browse",
          drawerIcon: ({ color, size, focused }) => (
            <View style={focused ? icon.activeWrap : icon.wrap}>
              <Ionicons name={focused ? "grid" : "grid-outline"} size={size ?? 20} color={color} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="library"
        options={{
          title: "Library",
          drawerIcon: ({ color, size, focused }) => (
            <View style={focused ? icon.activeWrap : icon.wrap}>
              <Ionicons name={focused ? "albums" : "albums-outline"} size={size ?? 20} color={color} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="all-creators"
        options={{
          title: "Studios & Authors",
          drawerIcon: ({ color, size, focused }) => (
            <View style={focused ? icon.activeWrap : icon.wrap}>
              <Ionicons name={focused ? "people" : "people-outline"} size={size ?? 20} color={color} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profile",
          drawerItemStyle: { height: 0, overflow: "hidden" },
          drawerIcon: ({ color, size, focused }) => (
            <View style={focused ? icon.activeWrap : icon.wrap}>
              <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={size ?? 20} color={color} />
            </View>
          ),
        }}
      />

      {/* Hidden screens */}
      <Drawer.Screen
        name="creators"
        options={{ drawerItemStyle: { height: 0, overflow: "hidden" } }}
      />
      <Drawer.Screen
        name="edit-profile"
        options={{
          title: "Edit Profile",
          drawerItemStyle: { height: 0, overflow: "hidden" },
        }}
      />
    </Drawer>
  );
}

const icon = StyleSheet.create({
  wrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent",
  },
  activeWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(108,78,246,0.2)",
  },
});