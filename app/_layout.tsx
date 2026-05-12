import { TrackerProvider } from "@/contexts/tracker-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

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
    <QueryClientProvider client={queryClient}>
      <TrackerProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{
              headerShown: false,
              presentation: "card", // full screen slide-up
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="player"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="reader"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
              animation: "slide_from_right",
            }}
          />
        </Stack>
      </TrackerProvider>
    </QueryClientProvider>
  );
}
