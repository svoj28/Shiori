import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { TrackerProvider } from "@/contexts/tracker-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

// ─── Auth guard ───────────────────────────────────────────────────────────────
// Placed inside AuthProvider so it can read useAuth().
// Redirects unauthenticated users to /login and keeps them out of the app.
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = String(segments[0]) === "(auth)";

    if (!session && !inAuthGroup) {
      // Not signed in → send to login
      router.replace("/(auth)/login" as any);
    } else if (session && inAuthGroup) {
      // Already signed in → send to app
      router.replace("/(drawer)" as any);
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#080810",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#6C4EF6" size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const StackComponent = Stack as any;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TrackerProvider>
            <AuthGuard>
              <Stack
                initialRouteName="(drawer)"
                screenOptions={{ headerShown: false }}
              >
                {/* ── Auth screens ── */}
                <StackComponent.Group screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)/login" />
                  <Stack.Screen name="(auth)/signup" />
                </StackComponent.Group>

                {/* ── Main app ── */}
                <StackComponent.Group screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(drawer)" />
                </StackComponent.Group>

                {/* ── Modals (unchanged from your original) ── */}
                <StackComponent.Group
                  screenOptions={{
                    presentation: "modal",
                    headerShown: false,
                  }}
                >
                  <Stack.Screen
                    name="creator"
                    options={{ animation: "slide_from_bottom" }}
                  />
                  <Stack.Screen
                    name="modal"
                    options={{ animation: "slide_from_bottom" }}
                  />
                  <Stack.Screen
                    name="player"
                    options={{
                      presentation: "fullScreenModal",
                      animation: "fade",
                    }}
                  />
                  <Stack.Screen
                    name="reader"
                    options={{
                      presentation: "fullScreenModal",
                      animation: "slide_from_right",
                    }}
                  />
                </StackComponent.Group>
              </Stack>
            </AuthGuard>
          </TrackerProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
