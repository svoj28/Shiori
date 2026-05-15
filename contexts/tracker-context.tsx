/**
 * tracker-context.tsx  — Supabase-synced version
 *
 * Drop-in replacement for the original local-only tracker context.
 * All mutations optimistically update local state, then sync to Supabase.
 * On mount, data is loaded from Supabase if the user is logged in.
 */

import { supabase } from "@/lib/supabase";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TrackerStatus =
  | "None"
  | "Watching"
  | "Completed"
  | "Rewatching"
  | "Planning"
  | "Considering"
  | "Paused";

export const TRACKER_STATUSES_DISPLAY: TrackerStatus[] = [
  "Watching",
  "Completed",
  "Rewatching",
  "Planning",
  "Considering",
  "Paused",
];

export interface TrackerEntry {
  id: string; // local uuid (matches DB id)
  type: "anime" | "manga" | "lightnovel";
  mediaId: string; // provider-side id
  title: string;
  posterUrl?: string;
  coverImage: string; // alias for posterUrl for MediaItem compatibility (required)
  status: TrackerStatus;
  score?: number;
  progress?: number;
  totalProgress?: number; // total episodes/chapters
  rewatches?: number; // number of times rewatched/reread
  isWishlist: boolean;
  wishlist?: boolean; // backwards compatibility alias used by older screens
  collections?: string[]; // computed convenience field for older screens
  notes?: string;
}

type LegacyModalPayload = {
  id: string;
  type: TrackerEntry["type"];
  title: string;
  coverImage?: string;
  totalProgress?: number | null;
};

export interface Collection {
  id: string;
  name: string;
  items: TrackerEntry[];
}

type TrackerEntryView = TrackerEntry & {
  wishlist: boolean;
  collections: string[];
};

interface TrackerContextValue {
  entries: TrackerEntry[];
  collections: Collection[];
  wishlistEntries: TrackerEntry[];
  totalTracked: number;
  statusCounts: Record<TrackerStatus, number>;

  // Entry CRUD
  upsertEntry: (
    entry: (Omit<TrackerEntry, "id"> & { id?: string }) | LegacyModalPayload,
  ) => Promise<TrackerEntry | undefined>;
  removeEntry: (entryId: string) => Promise<void>;
  removeEntries: (entryIds: string[]) => Promise<void>;
  setWishlist: (entryId: string, value: boolean) => Promise<void>;
  getEntry: (
    mediaId: string,
    type: TrackerEntry["type"],
  ) => TrackerEntryView | undefined;
  mutateEntry: (
    payload: LegacyModalPayload,
    recipe: (current: TrackerEntryView) => TrackerEntryView,
  ) => Promise<void>;

  // Collection CRUD
  createCollection: (name: string) => Promise<void>;
  deleteCollection: (name: string) => Promise<void>;
  addToCollection: (collectionName: string, entryId: string) => Promise<void>;
  removeFromCollection: (
    collectionName: string,
    entryId: string,
  ) => Promise<void>;

  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocal(row: any): TrackerEntry {
  const posterUrl = row.poster_url ?? "";
  return {
    id: row.id,
    type: row.media_type as TrackerEntry["type"],
    mediaId: row.media_id,
    title: row.title,
    posterUrl: posterUrl || undefined,
    coverImage: posterUrl, // alias for MediaItem compatibility (required)
    status: row.status as TrackerStatus,
    score: row.score ?? undefined,
    progress: row.progress ?? undefined,
    totalProgress: row.total_progress ?? undefined,
    rewatches: row.rewatches ?? undefined,
    isWishlist: row.is_wishlist ?? false,
    wishlist: row.is_wishlist ?? false,
    notes: row.notes ?? undefined,
  };
}

function normalizeUpsertInput(
  entry: (Omit<TrackerEntry, "id"> & { id?: string }) | LegacyModalPayload,
): Omit<TrackerEntry, "id"> {
  if ("mediaId" in entry) {
    return {
      ...entry,
      coverImage: entry.coverImage ?? entry.posterUrl ?? "",
      isWishlist: entry.isWishlist ?? false,
      wishlist: entry.wishlist ?? entry.isWishlist ?? false,
      collections: entry.collections ?? [],
    };
  }

  const cover = entry.coverImage ?? "";
  return {
    type: entry.type,
    mediaId: entry.id,
    title: entry.title,
    posterUrl: cover || undefined,
    coverImage: cover,
    status: "None",
    score: undefined,
    progress: 0,
    totalProgress: entry.totalProgress ?? undefined,
    rewatches: 0,
    isWishlist: false,
    wishlist: false,
    collections: [],
    notes: undefined,
  };
}

function toDbRow(entry: Omit<TrackerEntry, "id">, userId: string) {
  return {
    user_id: userId,
    media_id: entry.mediaId,
    media_type: entry.type,
    title: entry.title,
    poster_url: entry.posterUrl ?? null,
    status: entry.status,
    score: entry.score ?? null,
    progress: entry.progress ?? null,
    is_wishlist: entry.isWishlist,
    notes: entry.notes ?? null,
    total_progress: entry.totalProgress ?? null,
    rewatches: entry.rewatches ?? null,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const wishlistEntries = entries.filter((e) => e.isWishlist);
  const totalTracked = entries.filter((e) => e.status !== "None").length;

  const statusCounts = TRACKER_STATUSES_DISPLAY.reduce(
    (acc, s) => {
      acc[s] = entries.filter((e) => e.status === s).length;
      return acc;
    },
    {} as Record<TrackerStatus, number>,
  );

  // ── Load from Supabase ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setCollections([]);
      return;
    }
    setLoading(true);

    // Entries
    const { data: eRows } = await supabase
      .from("tracker_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const loadedEntries: TrackerEntry[] = (eRows ?? []).map(toLocal);
    setEntries(loadedEntries);

    // Collections + items
    const { data: cRows } = await supabase
      .from("collections")
      .select("id, name, collection_items(entry_id)")
      .eq("user_id", user.id)
      .order("created_at");

    const entryMap = Object.fromEntries(loadedEntries.map((e) => [e.id, e]));

    const loadedCols: Collection[] = (cRows ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      items: (c.collection_items ?? [])
        .map((ci: any) => entryMap[ci.entry_id])
        .filter(Boolean),
    }));
    setCollections(loadedCols);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Entry CRUD ────────────────────────────────────────────────────────────
  const upsertEntry = async (
    entry: (Omit<TrackerEntry, "id"> & { id?: string }) | LegacyModalPayload,
  ) => {
    if (!user) return;
    const activeUserId = user.id;

    const normalized = normalizeUpsertInput(entry);
    const dbRowWithOptional = toDbRow(normalized, activeUserId);

    let { data, error } = await supabase
      .from("tracker_entries")
      .upsert(dbRowWithOptional, { onConflict: "user_id,media_id" })
      .select()
      .single();

    // Backward-compat for DBs that don't have optional columns yet.
    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("tracker_entries")
        .upsert(
          {
            user_id: activeUserId,
            media_id: normalized.mediaId,
            media_type: normalized.type,
            title: normalized.title,
            poster_url: normalized.posterUrl ?? null,
            status: normalized.status,
            score: normalized.score ?? null,
            progress: normalized.progress ?? null,
            is_wishlist: normalized.isWishlist,
            notes: normalized.notes ?? null,
          },
          { onConflict: "user_id,media_id" },
        )
        .select()
        .single();
      data = fallbackData;
      error = fallbackError;
    }

    if (!error && data) {
      const local = toLocal(data);
      setEntries((prev) => {
        const idx = prev.findIndex(
          (e) => e.id === local.id || e.mediaId === local.mediaId,
        );
        return idx >= 0
          ? prev.map((e, i) => (i === idx ? local : e))
          : [local, ...prev];
      });
      return local;
    }

    return undefined;
  };

  const removeEntry = async (entryId: string) => {
    if (!user) return;
    await supabase
      .from("tracker_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", user.id);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    setCollections((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.filter((i) => i.id !== entryId),
      })),
    );
  };

  const setWishlist = async (entryId: string, value: boolean) => {
    if (!user) return;
    await supabase
      .from("tracker_entries")
      .update({ is_wishlist: value })
      .eq("id", entryId)
      .eq("user_id", user.id);
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, isWishlist: value } : e)),
    );
  };

  // ── Collection CRUD ───────────────────────────────────────────────────────
  const createCollection = async (name: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("collections")
      .insert({ user_id: user.id, name })
      .select()
      .single();
    if (!error && data) {
      setCollections((prev) => [
        ...prev,
        { id: data.id, name: data.name, items: [] },
      ]);
    }
  };

  const deleteCollection = async (name: string) => {
    if (!user) return;
    const col = collections.find((c) => c.name === name);
    if (!col) return;
    await supabase
      .from("collections")
      .delete()
      .eq("id", col.id)
      .eq("user_id", user.id);
    setCollections((prev) => prev.filter((c) => c.name !== name));
  };

  const addToCollection = async (collectionName: string, entryId: string) => {
    if (!user) return;
    const col = collections.find((c) => c.name === collectionName);
    if (!col) return;
    await supabase
      .from("collection_items")
      .insert({ collection_id: col.id, entry_id: entryId });
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    setCollections((prev) =>
      prev.map((c) =>
        c.id === col.id ? { ...c, items: [...c.items, entry] } : c,
      ),
    );
  };

  const removeFromCollection = async (
    collectionName: string,
    entryId: string,
  ) => {
    if (!user) return;
    const col = collections.find((c) => c.name === collectionName);
    if (!col) return;
    await supabase
      .from("collection_items")
      .delete()
      .eq("collection_id", col.id)
      .eq("entry_id", entryId);
    setCollections((prev) =>
      prev.map((c) =>
        c.id === col.id
          ? { ...c, items: c.items.filter((i) => i.id !== entryId) }
          : c,
      ),
    );
  };

  const getEntry = (mediaId: string, type: TrackerEntry["type"]) => {
    const found = entries.find((e) => e.mediaId === mediaId && e.type === type);
    if (!found) return undefined;
    const entryCollections = collections
      .filter((c) => c.items.some((i) => i.id === found.id))
      .map((c) => c.name);
    return {
      ...found,
      wishlist: found.isWishlist,
      collections: entryCollections,
    } as TrackerEntryView;
  };

  const mutateEntry = async (
    payload: LegacyModalPayload,
    recipe: (current: TrackerEntryView) => TrackerEntryView,
  ) => {
    const activeUserId = user?.id;
    if (!activeUserId) return;

    const current =
      getEntry(payload.id, payload.type) ??
      ({
        id: "",
        type: payload.type,
        mediaId: payload.id,
        title: payload.title,
        posterUrl: payload.coverImage,
        coverImage: payload.coverImage ?? "",
        status: "None",
        progress: 0,
        totalProgress: payload.totalProgress ?? undefined,
        rewatches: 0,
        isWishlist: false,
        wishlist: false,
        collections: [],
      } as TrackerEntryView);

    const next = recipe(current);

    const row = toDbRow(
      {
        ...next,
        mediaId: next.mediaId || payload.id,
        type: next.type || payload.type,
        title: next.title || payload.title,
        posterUrl: next.posterUrl ?? next.coverImage ?? payload.coverImage,
        coverImage: next.coverImage ?? payload.coverImage ?? "",
        isWishlist: next.wishlist ?? next.isWishlist ?? false,
        totalProgress: next.totalProgress ?? payload.totalProgress ?? undefined,
      },
      activeUserId,
    );

    let target: TrackerEntryView | undefined = getEntry(
      payload.id,
      payload.type,
    );

    if (target?.id) {
      const { data, error } = await supabase
        .from("tracker_entries")
        .update(row)
        .eq("id", target.id)
        .eq("user_id", activeUserId)
        .select()
        .single();

      if (error) {
        const { total_progress, rewatches, ...baseRow } = row as any;
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("tracker_entries")
          .update(baseRow)
          .eq("id", target.id)
          .eq("user_id", activeUserId)
          .select()
          .single();
        if (!fallbackError && fallbackData) {
          const local = toLocal(fallbackData) as TrackerEntryView;
          setEntries((prev) =>
            prev.map((e) => (e.id === local.id ? local : e)),
          );
          target = local;
        }
      }

      if (!error && data) {
        const local = toLocal(data) as TrackerEntryView;
        setEntries((prev) => prev.map((e) => (e.id === local.id ? local : e)));
        target = local;
      }
    } else {
      const saved = await upsertEntry({
        ...next,
        mediaId: next.mediaId || payload.id,
        type: next.type || payload.type,
        title: next.title || payload.title,
        posterUrl: next.posterUrl ?? next.coverImage ?? payload.coverImage,
        coverImage: next.coverImage ?? payload.coverImage ?? "",
        isWishlist: next.wishlist ?? next.isWishlist ?? false,
        totalProgress: next.totalProgress ?? payload.totalProgress ?? undefined,
      });
      target = (saved ?? getEntry(payload.id, payload.type)) as
        | TrackerEntryView
        | undefined;
    }

    if (!target?.id) return;

    const before = current.collections ?? [];
    const after = next.collections ?? [];
    const toAdd = after.filter((name) => !before.includes(name));
    const toRemove = before.filter((name) => !after.includes(name));

    for (const name of toAdd) {
      if (!collections.some((c) => c.name === name)) {
        await createCollection(name);
      }
      await addToCollection(name, target.id);
    }

    for (const name of toRemove) {
      await removeFromCollection(name, target.id);
    }
  };

  const removeEntries = async (entryIds: string[]) => {
    const uniqueIds = Array.from(new Set(entryIds));
    for (const entryId of uniqueIds) {
      await removeEntry(entryId);
    }
  };

  return (
    <TrackerContext.Provider
      value={{
        entries,
        collections,
        wishlistEntries,
        totalTracked,
        statusCounts,
        upsertEntry,
        removeEntry,
        removeEntries,
        setWishlist,
        getEntry,
        mutateEntry,
        createCollection,
        deleteCollection,
        addToCollection,
        removeFromCollection,
        loading,
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used inside <TrackerProvider>");
  return ctx;
}
