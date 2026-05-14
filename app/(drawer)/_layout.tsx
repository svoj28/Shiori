import { Ionicons } from "@expo/vector-icons";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { Drawer } from "expo-router/drawer";

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#0C0C18" },
        headerTitleStyle: { color: "#fff", fontWeight: "800" },
        headerLeft: () => <DrawerToggleButton tintColor="#fff" />,
        drawerActiveTintColor: "#ffffff",
        drawerInactiveTintColor: "rgba(255,255,255,0.45)",
        drawerStyle: { backgroundColor: "#10101A" },
        drawerLabelStyle: { fontSize: 14, fontWeight: "600" },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Browse",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profile",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="library"
        options={{
          title: "Library",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="albums-outline" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="all-creators"
        options={{
          title: "Browse All Studios & Authors",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size ?? 20} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="creators"
        options={{
          drawerItemStyle: { height: 0 },
        }}
      />
      <Drawer.Screen
        name="edit-profile"
        options={{
          title: "Edit Profile",
          drawerItemStyle: { height: 0 },
        }}
      />
    </Drawer>
  );
}
