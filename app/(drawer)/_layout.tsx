import { Ionicons } from "@expo/vector-icons";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design Tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:           "#080810",
  surface:      "#0F0F1E",
  surfaceHigh:  "#161628",
  accent:       "#6C4EF6",
  accentLight:  "#9B7FFF",
  accentGlow:   "rgba(108,78,246,0.18)",
  border:       "rgba(255,255,255,0.07)",
  text:         "#FFFFFF",
  textSub:      "rgba(255,255,255,0.5)",
  textMuted:    "rgba(255,255,255,0.25)",
  headerBg:     "#08080F",
};

// ─── Custom Drawer Content ──────────────────────────────────────────────────────
function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <View style={drawer.root}>
      {/* Top brand block */}
      <View style={drawer.brandBlock}>
        <LinearGradient
          colors={["rgba(108,78,246,0.35)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          pointerEvents="none"
        />
        <View style={drawer.logoWrap}>
          <LinearGradient
            colors={[C.accent, C.accentLight]}
            style={drawer.logoGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="play" size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={drawer.appName}>S H I O R I</Text>
            <Text style={drawer.appTagline}>Anime, Manga, and Light Novel</Text>
            <Text style={drawer.appTagline}>Tracker</Text>
          </View>
        </View>
      </View>

      {/* Section label */}
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
        <Text style={drawer.footerText}>v1.0.0 · S H I O R I</Text>
      </View>
    </View>
  );
}

const drawer = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  brandBlock:  { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, overflow: "hidden" },
  logoWrap:    { flexDirection: "row", alignItems: "center", gap: 12 },
  logoGrad:    { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  appName:     { color: C.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
  appTagline:  { color: C.textMuted, fontSize: 11, fontWeight: "500", marginTop: 1, letterSpacing: 0.2 },
  sectionLabel:{ color: C.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  scrollContent:{ paddingTop: 0, paddingHorizontal: 10 },
  footer:      { paddingHorizontal: 20, paddingBottom: 36 },
  footerDivider:{ height: 1, backgroundColor: C.border, marginBottom: 12 },
  footerText:  { color: C.textMuted, fontSize: 11, fontWeight: "500" },
});

// ─── Drawer Layout ──────────────────────────────────────────────────────────────
export default function DrawerLayout() {
  const insets = useSafeAreaInsets();
  return (
    
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        // Header styling
        headerStyle: {
          
          // backgroundColor: 'transparent',
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

        // Drawer item styling
        drawerActiveTintColor:   C.accentLight,
        drawerInactiveTintColor: C.textSub,
        drawerStyle: {
          backgroundColor: C.bg,
          width: 280,
          borderRightWidth: 0,
        },
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
        name="profile"
        options={{
          title: "Settings",
          drawerIcon: ({ color, size, focused }) => (
            <View style={focused ? iconStyle.activeWrap : iconStyle.wrap}>
              <Ionicons name={focused ? "settings" : "settings-outline"} size={size ?? 20} color={color} />
            </View>
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Browse",
          drawerIcon: ({ color, size, focused }) => (
            <View style={focused ? iconStyle.activeWrap : iconStyle.wrap}>
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
            <View style={focused ? iconStyle.activeWrap : iconStyle.wrap}>
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
            <View style={focused ? iconStyle.activeWrap : iconStyle.wrap}>
              <Ionicons name={focused ? "people" : "people-outline"} size={size ?? 20} color={color} />
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

const iconStyle = StyleSheet.create({
  wrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  activeWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(108,78,246,0.2)",
  },
});