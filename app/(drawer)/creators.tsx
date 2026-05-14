import { useDebounce } from "@/hooks/useDebounce";
import { searchCreators } from "@/services/anilist";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STUDIO_ITEMS = ["MAPPA", "Bones", "A-1 Pictures", "Studio Trigger"];
const AUTHOR_ITEMS = ["ONE", "Tatsuki Fujimoto", "Hiro Mashima", "Mokumokuren"];

type CreatorKind = "studio" | "author";

function sortAlphabetically(items: readonly string[]) {
  return [...items].sort((left, right) => left.localeCompare(right));
}

export default function CreatorsScreen() {
  const router = useRouter();
  const [directoryVisible, setDirectoryVisible] = useState(false);
  const [search, setSearch] = useState("");
  const studios = useMemo(() => sortAlphabetically(STUDIO_ITEMS), []);
  const authors = useMemo(() => sortAlphabetically(AUTHOR_ITEMS), []);
  const debouncedSearch = useDebounce(search.trim(), 350);

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["creator-search", debouncedSearch],
    queryFn: () => searchCreators(debouncedSearch),
    enabled: debouncedSearch.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const openCreator = (kind: CreatorKind, name: string) => {
    setDirectoryVisible(false);
    setTimeout(() => {
      router.push({
        pathname: "/creator",
        params: { kind, name },
      });
    }, 120);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Studios & Authors</Text>
        <Text style={styles.title}>Creator directory</Text>
        <Text style={styles.subtitle}>
          Browse studios and authors in alphabetical order, then open any entry
          to see its works.
        </Text>

        <Pressable
          style={styles.actionBtn}
          onPress={() => setDirectoryVisible(true)}
        >
          <Ionicons name="search-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Quick search</Text>
        </Pressable>

        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push("/all-creators")}
        >
          <Ionicons name="list-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Browse all studios & authors</Text>
        </Pressable>

        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push("/library")}
        >
          <Ionicons name="albums-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Go to Library</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={directoryVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setDirectoryVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setDirectoryVisible(false)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>Alphabetical directory</Text>
                <Text style={styles.sheetTitle}>Studios & Authors</Text>
              </View>
              <Pressable
                onPress={() => setDirectoryVisible(false)}
                hitSlop={10}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="rgba(255,255,255,0.72)"
                />
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={16}
                color="rgba(255,255,255,0.35)"
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search studios or authors"
                placeholderTextColor="rgba(255,255,255,0.28)"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#fff"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color="rgba(255,255,255,0.35)"
                  />
                </Pressable>
              )}
            </View>

            {debouncedSearch.length > 0 ? (
              searchLoading ? (
                <View style={styles.searchState}>
                  <ActivityIndicator color="#7C5CFC" />
                  <Text style={styles.searchStateText}>
                    Searching creators…
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.card}>
                    <View style={styles.sectionHead}>
                      <Ionicons
                        name="videocam-outline"
                        size={18}
                        color="#7C5CFC"
                      />
                      <Text style={styles.sectionTitle}>Studios</Text>
                    </View>
                    {searchResults?.studios?.length ? (
                      searchResults.studios.map((studio: any) => (
                        <Pressable
                          key={`studio-${studio.id}`}
                          style={styles.rowItem}
                          onPress={() => openCreator("studio", studio.name)}
                        >
                          <Text style={styles.rowText}>{studio.name}</Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="rgba(255,255,255,0.35)"
                          />
                        </Pressable>
                      ))
                    ) : (
                      <Text style={styles.emptyHint}>No studios matched.</Text>
                    )}
                  </View>

                  <View style={styles.card}>
                    <View style={styles.sectionHead}>
                      <Ionicons name="book-outline" size={18} color="#EC4899" />
                      <Text style={styles.sectionTitle}>Authors</Text>
                    </View>
                    {searchResults?.staff?.length ? (
                      searchResults.staff.map((author: any) => (
                        <Pressable
                          key={`staff-${author.id}`}
                          style={styles.rowItem}
                          onPress={() =>
                            openCreator("author", author.name.full)
                          }
                        >
                          <Text style={styles.rowText}>{author.name.full}</Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="rgba(255,255,255,0.35)"
                          />
                        </Pressable>
                      ))
                    ) : (
                      <Text style={styles.emptyHint}>No authors matched.</Text>
                    )}
                  </View>
                </>
              )
            ) : (
              <>
                <View style={styles.card}>
                  <View style={styles.sectionHead}>
                    <Ionicons
                      name="videocam-outline"
                      size={18}
                      color="#7C5CFC"
                    />
                    <Text style={styles.sectionTitle}>Studios</Text>
                  </View>
                  {studios.map((studio) => (
                    <Pressable
                      key={studio}
                      style={styles.rowItem}
                      onPress={() => openCreator("studio", studio)}
                    >
                      <Text style={styles.rowText}>{studio}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="rgba(255,255,255,0.35)"
                      />
                    </Pressable>
                  ))}
                </View>

                <View style={styles.card}>
                  <View style={styles.sectionHead}>
                    <Ionicons name="book-outline" size={18} color="#EC4899" />
                    <Text style={styles.sectionTitle}>Authors</Text>
                  </View>
                  {authors.map((author) => (
                    <Pressable
                      key={author}
                      style={styles.rowItem}
                      onPress={() => openCreator("author", author)}
                    >
                      <Text style={styles.rowText}>{author}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="rgba(255,255,255,0.35)"
                      />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0C0C18" },
  content: { padding: 16, paddingBottom: 28, gap: 16 },
  eyebrow: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: "#141420",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 8,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  rowText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  actionBtn: {
    backgroundColor: "#7C5CFC",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 8, 16, 0.72)",
    justifyContent: "flex-end",
    padding: 12,
  },
  sheet: {
    backgroundColor: "#11111D",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    gap: 14,
    maxHeight: "88%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetEyebrow: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sheetTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    paddingVertical: 0,
  },
  searchState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  searchStateText: { color: "rgba(255,255,255,0.45)", fontSize: 13 },
  emptyHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
});
