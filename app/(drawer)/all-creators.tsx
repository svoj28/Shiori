import { useSearchAuthors, useSearchStudios } from "@/hooks/useAllCreators";
import { useDebounce } from "@/hooks/useDebounce";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CreatorKind = "studio" | "author";
type CreatorType = "studios" | "authors";

interface Creator {
  id: number;
  name: string;
  fullName?: string;
  image?: string;
  isAnimationStudio?: boolean;
  siteUrl?: string;
  staffMedia?: {
    nodes: Array<{
      id: number;
      title: {
        romaji: string;
        english: string;
        userPreferred: string;
      };
      type: string;
      format: string;
    }>;
  };
}

export default function AllCreatorsScreen() {
  const router = useRouter();
  const [creatorType, setCreatorType] = useState<CreatorType>("studios");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 500);

  // Fetch search results
  const {
    data: studiosResults,
    isLoading: studiosLoading,
    error: studiosError,
  } = useSearchStudios(debouncedSearch);
  const {
    data: authorsResults,
    isLoading: authorsLoading,
    error: authorsError,
  } = useSearchAuthors(debouncedSearch);

  const results = creatorType === "studios" ? studiosResults : authorsResults;
  const isLoading = creatorType === "studios" ? studiosLoading : authorsLoading;
  const error = creatorType === "studios" ? studiosError : authorsError;

  const handleCreatorPress = (creator: Creator) => {
    const kind: CreatorKind = creatorType === "studios" ? "studio" : "author";
    const name = creator.name || creator.fullName || "";
    router.push({
      pathname: "/creator",
      params: { kind, name },
    });
  };

  const renderCreatorItem = ({ item }: { item: Creator }) => {
    const displayName = item.name || item.fullName || "";
    const hasWorks = item.staffMedia?.nodes && item.staffMedia.nodes.length > 0;
    const workTitles = hasWorks
      ? item.staffMedia?.nodes
          ?.slice(0, 2)
          .map(
            (w) => w.title.userPreferred || w.title.romaji || w.title.english,
          )
          .join(", ")
      : null;

    return (
      <Pressable
        style={styles.creatorItem}
        onPress={() => handleCreatorPress(item)}
      >
        <View style={styles.creatorContent}>
          <View style={styles.imageContainer}>
            <Text style={styles.imagePlaceholder}>{displayName[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.creatorName} numberOfLines={1}>
              {displayName}
            </Text>
            {item.isAnimationStudio !== undefined && (
              <Text style={styles.creatorType}>
                {item.isAnimationStudio ? "Animation Studio" : "Studio"}
              </Text>
            )}
            {workTitles && (
              <Text style={styles.worksTitleText} numberOfLines={1}>
                {workTitles}
              </Text>
            )}
            {hasWorks &&
              item.staffMedia?.nodes &&
              item.staffMedia.nodes.length > 2 && (
                <Text style={styles.moreWorksText}>
                  +{item.staffMedia.nodes.length - 2} more
                </Text>
              )}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color="rgba(255,255,255,0.35)"
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Studios & Authors</Text>
        <Text style={styles.subtitle}>
          Search for popular animation studios and manga/LN authors
        </Text>
      </View>

      {/* Type Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, creatorType === "studios" && styles.activeTab]}
          onPress={() => {
            setCreatorType("studios");
            setSearch("");
          }}
        >
          <Ionicons name="videocam-outline" size={16} color="#7C5CFC" />
          <Text
            style={[
              styles.tabText,
              creatorType === "studios" && styles.activeTabText,
            ]}
          >
            Studios
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, creatorType === "authors" && styles.activeTab]}
          onPress={() => {
            setCreatorType("authors");
            setSearch("");
          }}
        >
          <Ionicons name="book-outline" size={16} color="#EC4899" />
          <Text
            style={[
              styles.tabText,
              creatorType === "authors" && styles.activeTabText,
            ]}
          >
            Authors
          </Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${creatorType}...`}
          placeholderTextColor="rgba(255,255,255,0.28)"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor="#fff"
          autoFocus
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

      {/* Content */}
      {error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <Text style={styles.emptyTitle}>Search Failed</Text>
          <Text style={styles.emptyText}>
            {error instanceof Error
              ? error.message
              : "An error occurred while searching"}
          </Text>
        </View>
      ) : search.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={
              creatorType === "studios" ? "videocam-outline" : "book-outline"
            }
            size={48}
            color="rgba(255,255,255,0.2)"
          />
          <Text style={styles.emptyTitle}>Start Searching</Text>
          <Text style={styles.emptyText}>
            Type a name to find{" "}
            {creatorType === "studios"
              ? "animation studios"
              : "manga/LN authors"}
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7C5CFC" size="large" />
          <Text style={styles.loadingText}>Searching {creatorType}...</Text>
        </View>
      ) : results && results.length > 0 ? (
        <>
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCreatorItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            ListHeaderComponent={
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {results.length} result{results.length !== 1 ? "s" : ""} found
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={48}
            color="rgba(255,255,255,0.2)"
          />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>
            No {creatorType} found matching "{search}"
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0C0C18",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  activeTab: {
    backgroundColor: "#2A2A3E",
    borderColor: "rgba(255,255,255,0.12)",
  },
  tabText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#141420",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultsHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    marginBottom: 8,
  },
  resultsCount: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
  },
  creatorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
    gap: 12,
  },
  creatorContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#2A2A3E",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: {
    color: "#7C5CFC",
    fontSize: 16,
    fontWeight: "700",
  },
  creatorName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  creatorType: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    marginTop: 2,
  },
  worksTitleText: {
    color: "rgba(124,92,252,0.6)",
    fontSize: 11,
    marginTop: 2,
    fontStyle: "italic",
  },
  moreWorksText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    marginTop: 1,
  },
});
