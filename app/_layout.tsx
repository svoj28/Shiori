import { TrackerProvider } from "@/contexts/tracker-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 min
    },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <TrackerProvider>
          <Stack
            initialRouteName="(drawer)"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Group screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            </Stack.Group>
            <Stack.Group
              screenOptions={{
                presentation: "modal",
                headerShown: false,
              }}
            >
              <Stack.Screen
                name="creator"
                options={{
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="modal"
                options={{
                  animation: "slide_from_bottom",
                }}
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
            </Stack.Group>
          </Stack>
        </TrackerProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
