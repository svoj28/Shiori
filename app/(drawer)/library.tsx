import MediaCard from "@/components/MediaCard";
import {
  TRACKER_STATUSES_DISPLAY,
  useTracker,
  type TrackerStatus,
} from "@/contexts/tracker-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#EC4899";

const LIBRARY_TABS = ["Status", "Wishlist", "Collections", "All"] as const;
type LibraryTab = (typeof LIBRARY_TABS)[number];

const STATUS_META: Record<
  TrackerStatus,
  { color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  None:        { color: "#64748B", icon: "ellipse-outline" },
  Watching:    { color: "#38BDF8", icon: "play-circle-outline" },
  Completed:   { color: "#22C55E", icon: "checkmark-circle-outline" },
  Rewatching:  { color: "#A78BFA", icon: "refresh-circle-outline" },
  Planning:    { color: "#F59E0B", icon: "time-outline" },
  Considering: { color: "#F97316", icon: "help-circle-outline" },
  Paused:      { color: "#EF4444", icon: "pause-circle-outline" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={s.summaryTile}>
      <Text style={[s.summaryValue, { color: accent }]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionHdr}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={s.sectionSub}>{subtitle}</Text> : null}
    </View>
  );
}

/** Thin line that separates major sections */
function Divider() {
  return <View style={s.divider} />;
}

// ─── EmptyCard ────────────────────────────────────────────────────────────────

function EmptyCard({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIconBox}>
        <Ionicons name={icon} size={24} color="rgba(255,255,255,0.22)" />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{subtitle}</Text>
    </View>
  );
}

// ─── StatusGrid ───────────────────────────────────────────────────────────────

function StatusGrid({
  selected,
  counts,
  onSelect,
}: {
  selected: TrackerStatus;
  counts: Record<TrackerStatus, number>;
  onSelect: (s: TrackerStatus) => void;
}) {
  return (
    <View style={s.statusGrid}>
      {TRACKER_STATUSES_DISPLAY.map((status) => {
        const { color } = STATUS_META[status];
        const isSelected = selected === status;
        return (
          <Pressable
            key={status}
            onPress={() => onSelect(status)}
            style={({ pressed }) => [
              s.statusTile,
              {
                borderColor: color + (isSelected ? "CC" : "44"),
                backgroundColor: color + (isSelected ? "28" : "12"),
              },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={[s.statusCount, { color }]}>{counts[status]}</Text>
            <Text style={[s.statusLabel, { color: color + (isSelected ? "FF" : "CC") }]}>
              {status}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── CollectionsTab ───────────────────────────────────────────────────────────

function CollectionsTab({
  tracker,
  onShowToast,
  onConfirmDelete,
}: {
  tracker: ReturnType<typeof useTracker>;
  onShowToast: (msg: string) => void;
  onConfirmDelete: (name: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    tracker.createCollection(trimmed);
    setName("");
    onShowToast(`"${trimmed}" created`);
  };

  const canCreate = name.trim().length > 0;

  return (
    <>
      <SectionHeader
        title="Collections"
        subtitle="Create shelves and organise your library"
      />

      {/* Input row */}
      <View style={[s.inputRow, { marginBottom: 16 }]}>
        <TextInput
          placeholder="New collection name…"
          placeholderTextColor="rgba(255,255,255,0.26)"
          value={name}
          onChangeText={setName}
          onSubmitEditing={create}
          returnKeyType="done"
          style={[s.collInput, name.length > 0 && { borderColor: ACCENT + "50" }]}
        />
        <Pressable
          onPress={create}
          disabled={!canCreate}
          style={({ pressed }) => [
            s.addBtn,
            { backgroundColor: canCreate ? ACCENT : "rgba(255,255,255,0.06)" },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Ionicons
            name="add"
            size={22}
            color={canCreate ? "#fff" : "rgba(255,255,255,0.22)"}
          />
        </Pressable>
      </View>

      {tracker.collections.length > 0 ? (
        <View style={s.collGrid}>
          {tracker.collections.map((collection) => (
            <Pressable
              key={collection.name}
              style={({ pressed }) => [s.collCard, pressed && { opacity: 0.78 }]}
              onPress={() =>
                router.push({ pathname: "/collection", params: { name: collection.name } })
              }
            >
              {/* Top row: name + count badge */}
              <View style={s.collTop}>
                <Text style={s.collName} numberOfLines={1}>
                  {collection.name}
                </Text>
                <View style={s.collBadge}>
                  <Text style={s.collBadgeText}>{collection.items.length}</Text>
                </View>
              </View>

              {/* Preview titles */}
              {collection.items.length > 0 ? (
                <Text style={s.collHint} numberOfLines={2}>
                  {collection.items.slice(0, 3).map((i) => i.title).join(" · ")}
                </Text>
              ) : (
                <Text style={s.collEmpty}>No items yet</Text>
              )}

              {/* Footer: arrow + delete */}
              <View style={s.collFooter}>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.18)" />
                <Pressable
                  onPress={(e) => { e.stopPropagation(); onConfirmDelete(collection.name); }}
                  hitSlop={12}
                  style={s.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={13} color="#EF4444" />
                  <Text style={s.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyCard
          icon="albums-outline"
          title="No collections yet"
          subtitle="Type a name above and tap + to create your first shelf."
        />
      )}
    </>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────

function DeleteModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={s.modalOverlay}>
      <View style={s.modalCard}>
        <View style={s.modalIconWrap}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </View>
        <Text style={s.modalTitle}>Delete collection?</Text>
        <Text style={s.modalBody}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>"{name}"</Text>
          {" "}will be permanently removed. Your tracked titles won't be affected.
        </Text>
        <View style={s.modalActions}>
          <Pressable onPress={onCancel} style={[s.modalBtn, s.modalCancel]}>
            <Text style={s.modalCancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={[s.modalBtn, s.modalDelete]}>
            <Text style={s.modalDeleteText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <View style={s.toast} pointerEvents="none">
      <View style={s.toastDot} />
      <Text style={s.toastText}>{message}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const tracker = useTracker();
  const [activeTab, setActiveTab] = useState<LibraryTab>("Status");
  const [selectedStatus, setSelectedStatus] = useState<TrackerStatus>("Watching");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  };

  const handleDeleteConfirmed = () => {
    if (!pendingDelete) return;
    tracker.deleteCollection(pendingDelete);
    showToast(`"${pendingDelete}" deleted`);
    setPendingDelete(null);
  };

  const visibleEntries =
    activeTab === "Wishlist"
      ? tracker.wishlistEntries
      : activeTab === "All"
      ? tracker.entries
      : activeTab === "Status"
      ? tracker.entries.filter((e) => e.status === selectedStatus)
      : tracker.entries.filter((e) => e.status !== "None");

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Ambient glow orbs */}
      <View style={s.orbTopLeft}  pointerEvents="none" />
      <View style={s.orbMidRight} pointerEvents="none" />

      {/* Overlays */}
      {toastMsg ? <Toast message={toastMsg} /> : null}
      {pendingDelete ? (
        <DeleteModal
          name={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDeleteConfirmed}
        />
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardDismissMode="on-drag"
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>Library</Text>
            <Text style={s.title}>Tracker</Text>
          </View>
          <View style={s.headerIconWrap}>
            <Ionicons name="albums" size={19} color={ACCENT} />
          </View>
        </View>

        {/* ── Hero card ────────────────────────────────────────────────── */}
        <View style={s.heroCard}>
          {/* Tab pills */}
          <View style={s.tabRow}>
            {LIBRARY_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setActiveTab(tab);
                    if (tab === "Status") setSelectedStatus("Watching");
                  }}
                  style={({ pressed }) => [
                    s.tabPill,
                    active && { backgroundColor: ACCENT, borderColor: ACCENT },
                    pressed && { opacity: 0.72 },
                  ]}
                >
                  <Text style={[s.tabText, active && s.tabTextActive]}>{tab}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Summary tiles */}
          <View style={s.summaryRow}>
            <SummaryTile label="Tracked"     value={String(tracker.totalTracked)}           accent={ACCENT}    />
            <SummaryTile label="Wishlisted"  value={String(tracker.wishlistEntries.length)} accent="#F472B6"   />
            <SummaryTile label="Collections" value={String(tracker.collections.length)}     accent="#06B6D4"   />
          </View>

          {/* Status grid — only on Status tab */}
          {activeTab === "Status" && (
            <StatusGrid
              selected={selectedStatus}
              counts={tracker.statusCounts}
              onSelect={setSelectedStatus}
            />
          )}
        </View>

        <Divider />

        {/* ── Tab content ──────────────────────────────────────────────── */}
        {activeTab === "Collections" ? (
          <CollectionsTab
            tracker={tracker}
            onShowToast={showToast}
            onConfirmDelete={(name) => setPendingDelete(name)}
          />
        ) : activeTab === "Wishlist" ? (
          <>
            <SectionHeader title="Wishlist" subtitle="Titles you want to get back to" />
            {tracker.wishlistEntries.length > 0 ? (
              <FlatList
                data={tracker.wishlistEntries.slice(0, 8)}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                renderItem={({ item }) => (
                  <MediaCard item={item} variant="landscape" style={s.mediaRow} />
                )}
                scrollEnabled={false}
              />
            ) : (
              <EmptyCard
                icon="bookmark-outline"
                title="No wishlist yet"
                subtitle='Open a title and tap "Add to wishlist" to start collecting priorities.'
              />
            )}
          </>
        ) : activeTab === "Status" ? (
          <>
            <SectionHeader title="Library" subtitle="Your tracked titles by status" />
            {visibleEntries.length > 0 ? (
              <FlatList
                data={visibleEntries.slice(0, 8)}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                renderItem={({ item }) => (
                  <MediaCard item={item} variant="landscape" style={s.mediaRow} />
                )}
                scrollEnabled={false}
              />
            ) : (
              <EmptyCard
                icon="library-outline"
                title="No tracked titles"
                subtitle="Add titles to your wishlist first, then choose a status to track them here."
              />
            )}
          </>
        ) : (
          <>
            <SectionHeader title="Recent activity" subtitle="Latest updated entries" />
            {tracker.entries.length > 0 ? (
              tracker.entries
                .slice(0, 5)
                .map((item) => (
                  <MediaCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    variant="landscape"
                    style={s.mediaRow}
                  />
                ))
            ) : (
              <EmptyCard
                icon="star-outline"
                title="Nothing tracked yet"
                subtitle="Tap any anime, manga, or light novel to create your first tracker entry."
              />
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG      = "#0A0A14";
const SURFACE = "#111120";
const BORDER  = "rgba(255,255,255,0.07)";

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 24 },

  // Ambient orbs
  orbTopLeft: {
    position: "absolute",
    top: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(236,72,153,0.07)",
  },
  orbMidRight: {
    position: "absolute",
    top: 340,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(6,182,212,0.05)",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(236,72,153,0.12)",
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero card
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: SURFACE,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },

  // Tab pills
  tabRow: { flexDirection: "row", gap: 7, marginBottom: 14, flexWrap: "wrap" },
  tabPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabText:       { color: "rgba(255,255,255,0.42)", fontSize: 12, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600" },

  // Summary tiles
  summaryRow: { flexDirection: "row", gap: 9, marginBottom: 14 },
  summaryTile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 13,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryValue: { fontSize: 22, fontWeight: "700", lineHeight: 24 },
  summaryLabel: {
    color: "rgba(255,255,255,0.32)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Status grid
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusTile: {
    width: "31%",
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  statusCount: { fontSize: 20, fontWeight: "700", lineHeight: 22 },
  statusLabel: { fontSize: 10.5, fontWeight: "600", marginTop: 2, lineHeight: 14 },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginHorizontal: 16,
    marginBottom: 18,
  },

  // Section header
  sectionHdr:   { paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 3 },
  sectionSub:   { color: "rgba(255,255,255,0.32)", fontSize: 12 },

  // Media rows
  mediaRow: { marginHorizontal: 16, marginBottom: 10 },

  // Empty card
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  emptySub: {
    color: "rgba(255,255,255,0.32)",
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 260,
  },

  // Collection input
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 16,
  },
  collInput: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    color: "#fff",
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: BORDER,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Collection grid
  collGrid: { paddingHorizontal: 16, gap: 9 },
  collCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  collTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  collName: { color: "#fff", fontSize: 14.5, fontWeight: "600", flex: 1 },
  collBadge: {
    backgroundColor: "rgba(6,182,212,0.14)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  collBadgeText: { color: "#06B6D4", fontSize: 11.5, fontWeight: "700" },
  collHint:  { color: "rgba(255,255,255,0.32)", fontSize: 12, lineHeight: 17 },
  collEmpty: { color: "rgba(255,255,255,0.18)", fontSize: 12, fontStyle: "italic" },
  collFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  deleteBtnText: { color: "#EF4444", fontSize: 11, fontWeight: "600" },

  // Delete modal
  modalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modalCard: {
    marginHorizontal: 32,
    backgroundColor: "#16162A",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
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
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 8 },
  modalBody: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", gap: 10, width: "100%" },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  modalCancel: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  modalCancelText: { color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: "600" },
  modalDelete:     { backgroundColor: "#EF4444" },
  modalDeleteText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Toast
  toast: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#16162A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    zIndex: 200,
  },
  toastDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#22C55E",
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});