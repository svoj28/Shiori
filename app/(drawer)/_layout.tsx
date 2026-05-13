import { Ionicons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Pressable } from "react-native";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function DrawerMenuButton() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  return (
    <Pressable
      onPress={() => navigation.toggleDrawer()}
      style={{ paddingLeft: 16, paddingRight: 16 }}
    >
      <Ionicons name="menu" size={24} color="#fff" />
    </Pressable>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#0C0C18" },
        headerTitleStyle: { color: "#fff", fontWeight: "800" },
        headerLeft: DrawerMenuButton,
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
          headerShown: false,
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
        name="creators"
        options={{
          title: "Studios & Authors",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size ?? 20} color={color} />
          ),
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
