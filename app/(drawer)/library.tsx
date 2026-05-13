import MediaCard from "@/components/MediaCard";
import {
    TRACKER_STATUSES_DISPLAY,
    useTracker,
    type TrackerStatus,
} from "@/contexts/tracker-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    FlatList,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#EC4899";
const LIBRARY_TABS = ["Status", "Wishlist", "Collections", "All"] as const;
type LibraryTab = (typeof LIBRARY_TABS)[number];

const STATUS_COLORS: Record<TrackerStatus, string> = {
  None: "#64748B",
  Completed: "#22C55E",
  Rewatching: "#A78BFA",
  Watching: "#38BDF8",
  Planning: "#F59E0B",
  Considering: "#F97316",
  Paused: "#EF4444",
};

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={styles.summaryTile}>
      <Text style={[styles.summaryValue, { color: accent }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export default function LibraryScreen() {
  const tracker = useTracker();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<LibraryTab>("Status");
  const [selectedStatus, setSelectedStatus] =
    React.useState<TrackerStatus>("Watching");
  const [newCollectionName, setNewCollectionName] = React.useState("");
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  };

  const visibleEntries =
    activeTab === "Wishlist"
      ? tracker.wishlistEntries
      : activeTab === "All"
        ? tracker.entries
        : activeTab === "Status" && selectedStatus
          ? tracker.entries.filter((entry) => entry.status === selectedStatus)
          : tracker.entries.filter((entry) => entry.status !== "None");

  const createCollection = () => {
    const name = newCollectionName.trim();
    if (!name) return;
    tracker.createCollection(name);
    setNewCollectionName("");
    showToast(`"${name}" created`);
  };

  const confirmDelete = (name: string) => {
    setPendingDelete(name);
  };

  const handleDeleteConfirmed = () => {
    if (!pendingDelete) return;
    tracker.deleteCollection(pendingDelete);
    showToast(`"${pendingDelete}" deleted`);
    setPendingDelete(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {toastMsg && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {pendingDelete && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Delete collection?</Text>
            <Text style={styles.modalBody}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                "{pendingDelete}"
              </Text>{" "}
              will be permanently removed. Your tracked titles won't be
              affected.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setPendingDelete(null)}
                style={[styles.modalBtn, styles.modalBtnCancel]}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteConfirmed}
                style={[styles.modalBtn, styles.modalBtnDelete]}
              >
                <Text style={styles.modalBtnDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerEyebrow}>Library</Text>
            <Text style={styles.headerTitle}>Tracker dashboard</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Ionicons name="albums" size={20} color={ACCENT} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.tabRow}>
            {LIBRARY_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setActiveTab(tab);
                    if (tab === "Status") {
                      setSelectedStatus("Watching");
                    }
                  }}
                  style={[
                    styles.tabPill,
                    active && { backgroundColor: ACCENT, borderColor: ACCENT },
                  ]}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.summaryRow}>
            <SummaryTile
              label="Tracked"
              value={String(tracker.totalTracked)}
              accent={ACCENT}
            />
            <SummaryTile
              label="Wishlisted"
              value={String(tracker.wishlistEntries.length)}
              accent="#F472B6"
            />
            <SummaryTile
              label="Collections"
              value={String(tracker.collections.length)}
              accent="#06B6D4"
            />
          </View>

          {activeTab === "Status" && (
            <View style={styles.statusGrid}>
              {TRACKER_STATUSES_DISPLAY.map((status) => {
                const isSelected = selectedStatus === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    style={[
                      styles.statusTile,
                      {
                        borderColor:
                          STATUS_COLORS[status] + (isSelected ? "CC" : "55"),
                        backgroundColor:
                          STATUS_COLORS[status] + (isSelected ? "25" : "15"),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusCount,
                        {
                          color: STATUS_COLORS[status],
                          fontWeight: isSelected ? "700" : "600",
                        },
                      ]}
                    >
                      {tracker.statusCounts[status]}
                    </Text>
                    <Text
                      style={[
                        styles.statusLabel,
                        {
                          color: STATUS_COLORS[status],
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {activeTab === "Collections" ? (
          <>
            <SectionTitle
              title="Collections"
              subtitle="Create shelves and organize your library"
            />
            <View style={[styles.inputRow, { marginBottom: 16 }]}>
              <TextInput
                placeholder="New collection name…"
                placeholderTextColor="rgba(255,255,255,0.30)"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                onSubmitEditing={createCollection}
                returnKeyType="done"
                style={styles.collectionInput}
              />
              <Pressable
                onPress={createCollection}
                disabled={!newCollectionName.trim()}
                style={[
                  styles.createButton,
                  {
                    backgroundColor: newCollectionName.trim()
                      ? ACCENT
                      : "rgba(255,255,255,0.08)",
                  },
                ]}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={
                    newCollectionName.trim() ? "#fff" : "rgba(255,255,255,0.3)"
                  }
                />
              </Pressable>
            </View>

            {tracker.collections.length > 0 ? (
              <View style={styles.collectionGrid}>
                {tracker.collections.map((collection) => (
                  <Pressable
                    key={collection.name}
                    style={({ pressed }) => [
                      styles.collectionCard,
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/collection",
                        params: { name: collection.name },
                      })
                    }
                  >
                    <View style={styles.collectionTopRow}>
                      <Text style={styles.collectionName} numberOfLines={1}>
                        {collection.name}
                      </Text>
                      <View style={styles.collectionCountBadge}>
                        <Text style={styles.collectionCountText}>
                          {collection.items.length}
                        </Text>
                      </View>
                    </View>

                    {collection.items.length > 0 ? (
                      <Text style={styles.collectionHint} numberOfLines={2}>
                        {collection.items
                          .slice(0, 3)
                          .map((item) => item.title)
                          .join(" · ")}
                      </Text>
                    ) : (
                      <Text style={styles.collectionEmpty}>No items yet</Text>
                    )}

                    <View style={styles.collectionFooter}>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="rgba(255,255,255,0.2)"
                      />
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          confirmDelete(collection.name);
                        }}
                        hitSlop={12}
                        style={styles.deleteIconBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#EF4444"
                        />
                        <Text style={styles.deleteIconLabel}>Delete</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="albums-outline"
                  size={28}
                  color="rgba(255,255,255,0.18)"
                  style={{ marginBottom: 8 }}
                />
                <Text style={styles.emptyTitle}>No collections yet</Text>
                <Text style={styles.emptySub}>
                  Type a name above and tap + to create your first shelf.
                </Text>
              </View>
            )}
          </>
        ) : activeTab === "Wishlist" ? (
          <>
            <SectionTitle
              title="Wishlist"
              subtitle="Titles you want to get back to"
            />
            {tracker.wishlistEntries.length > 0 ? (
              <FlatList
                data={tracker.wishlistEntries.slice(0, 8)}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                renderItem={({ item }) => (
                  <MediaCard
                    item={item}
                    variant="landscape"
                    style={styles.mediaRow}
                  />
                )}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No wishlist yet</Text>
                <Text style={styles.emptySub}>
                  Open a title and tap Add to wishlist to start collecting
                  priorities.
                </Text>
              </View>
            )}
          </>
        ) : activeTab === "Status" ? (
          <>
            <SectionTitle
              title="Library"
              subtitle="Your tracked titles by status"
            />
            {visibleEntries.length > 0 ? (
              <FlatList
                data={visibleEntries.slice(0, 8)}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                renderItem={({ item }) => (
                  <MediaCard
                    item={item}
                    variant="landscape"
                    style={styles.mediaRow}
                  />
                )}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No tracked titles</Text>
                <Text style={styles.emptySub}>
                  Add titles to your wishlist first, then choose a status to
                  track them here.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <SectionTitle
              title="Recent activity"
              subtitle="Latest updated entries"
            />
            {tracker.entries.length > 0 ? (
              tracker.entries
                .slice(0, 5)
                .map((item) => (
                  <MediaCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    variant="landscape"
                    style={styles.mediaRow}
                  />
                ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nothing tracked yet</Text>
                <Text style={styles.emptySub}>
                  Tap any anime, manga, or light novel to create your first
                  tracker entry.
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0C0C18" },
  scroll: { paddingBottom: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#141420",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabText: { color: "rgba(255,255,255,0.52)", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  summaryLabel: {
    color: "rgba(255,255,255,0.44)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusTile: {
    width: "31%",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  statusCount: { fontSize: 20, fontWeight: "800" },
  statusLabel: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginTop: 4,
  },
  mediaRow: { marginHorizontal: 16 },
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: "#141420",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 16,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  collectionInput: {
    flex: 1,
    backgroundColor: "#141420",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionGrid: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 6,
  },
  collectionCard: {
    backgroundColor: "#141420",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    gap: 8,
  },
  collectionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  collectionName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  collectionCountBadge: {
    backgroundColor: "rgba(6,182,212,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  collectionCountText: {
    color: "#06B6D4",
    fontSize: 12,
    fontWeight: "700",
  },
  collectionHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    lineHeight: 17,
  },
  collectionEmpty: {
    color: "rgba(255,255,255,0.20)",
    fontSize: 12,
    fontStyle: "italic",
  },
  collectionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  deleteIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  deleteIconLabel: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "600",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modalCard: {
    marginHorizontal: 32,
    backgroundColor: "#1A1A2E",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalBody: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalBtnCancelText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "700",
  },
  modalBtnDelete: {
    backgroundColor: "#EF4444",
  },
  modalBtnDeleteText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  toast: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A1A2E",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    zIndex: 200,
  },
  toastText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});