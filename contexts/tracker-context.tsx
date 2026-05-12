import type { MediaItem, MediaType } from "@/components/MediaCard";
import * as SecureStore from "expo-secure-store";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

export type TrackerStatus =
  | "None"
  | "Completed"
  | "Rewatching"
  | "Watching"
  | "Planning"
  | "Considering"
  | "Paused";

export const TRACKER_STATUSES: TrackerStatus[] = [
  "None",
  "Completed",
  "Rewatching",
  "Watching",
  "Planning",
  "Considering",
  "Paused",
];

export const TRACKER_STATUSES_DISPLAY: Exclude<TrackerStatus, "None">[] = [
  "Completed",
  "Rewatching",
  "Watching",
  "Planning",
  "Considering",
  "Paused",
];

export const STATUS_COMPLETED = "Completed" as const;
export const STATUS_REWATCHING = "Rewatching" as const;
export const STATUS_WATCHING = "Watching" as const;
export const STATUS_PLANNING = "Planning" as const;
export const STATUS_CONSIDERING = "Considering" as const;
export const STATUS_PAUSED = "Paused" as const;
export const STATUS_NONE = "None" as const;

export type TrackerEntry = {
  id: string;
  type: MediaType;
  title: string;
  coverImage: string;
  status: TrackerStatus;
  wishlist: boolean;
  collections: string[];
  progress: number;
  totalProgress: number | null;
  rewatches: number;
  updatedAt: number;
};

type TrackerEntryInput = Pick<
  MediaItem,
  "id" | "title" | "coverImage" | "type"
> & {
  totalProgress?: number | null;
};

type TrackerState = {
  entries: Record<string, TrackerEntry>;
  collectionNames: string[];
};

type TrackerContextValue = {
  entries: TrackerEntry[];
  wishlistEntries: TrackerEntry[];
  collections: { name: string; items: TrackerEntry[] }[];
  statusCounts: Record<TrackerStatus, number>;
  totalTracked: number;
  ready: boolean;
  upsertEntry: (item: TrackerEntryInput) => TrackerEntry;
  mutateEntry: (
    item: TrackerEntryInput,
    recipe: (entry: TrackerEntry) => TrackerEntry,
  ) => void;
  removeEntry: (id: string, type: MediaType) => void;
  setStatus: (id: string, type: MediaType, status: TrackerStatus) => void;
  setWishlist: (id: string, type: MediaType, wishlist: boolean) => void;
  toggleWishlist: (item: TrackerEntryInput) => void;
  setCollections: (id: string, type: MediaType, collections: string[]) => void;
  addCollection: (item: TrackerEntryInput, collection: string) => void;
  removeCollection: (id: string, type: MediaType, collection: string) => void;
  setProgress: (
    id: string,
    type: MediaType,
    progress: number,
    totalProgress?: number | null,
  ) => void;
  setRewatches: (id: string, type: MediaType, rewatches: number) => void;
  getEntry: (id: string, type: MediaType) => TrackerEntry | undefined;
  createCollection: (name: string) => void;
  deleteCollection: (name: string) => void;
};

const STORAGE_KEY = "shiori.tracker.v1";
const TrackerContext = createContext<TrackerContextValue | null>(null);

function makeKey(id: string | number, type: MediaType) {
  return `${type}:${String(id)}`;
}

function clampInt(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function normaliseCollections(collections: string[]) {
  return Array.from(
    new Set(collections.map((collection) => collection.trim()).filter(Boolean)),
  );
}

function createEntry(item: TrackerEntryInput): TrackerEntry {
  return {
    id: String(item.id),
    type: item.type,
    title: item.title,
    coverImage: item.coverImage,
    status: "None",
    wishlist: false,
    collections: [],
    progress: 0,
    totalProgress: item.totalProgress ?? null,
    rewatches: 0,
    updatedAt: Date.now(),
  };
}

function mergeEntry(
  entry: TrackerEntry | undefined,
  item: TrackerEntryInput,
): TrackerEntry {
  const base = entry ?? createEntry(item);
  return {
    ...base,
    title: item.title,
    coverImage: item.coverImage,
    totalProgress: item.totalProgress ?? base.totalProgress,
    updatedAt: Date.now(),
  };
}

function toStatusCounts(entries: TrackerEntry[]) {
  return TRACKER_STATUSES.reduce(
    (acc, status) => {
      acc[status] = entries.filter((entry) => entry.status === status).length;
      return acc;
    },
    {} as Record<TrackerStatus, number>,
  );
}

function buildCollections(entries: TrackerEntry[], storedNames: string[] = []) {
  const names = Array.from(
    new Set([...storedNames, ...entries.flatMap((entry) => entry.collections)]),
  ).sort((left, right) => left.localeCompare(right));

  return names.map((name) => ({
    name,
    items: entries.filter((entry) => entry.collections.includes(name)),
  }));
}

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TrackerState>({
    entries: {},
    collectionNames: [],
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) {
          setReady(true);
          return;
        }

        try {
          const parsed = JSON.parse(raw) as Partial<TrackerState>;
          if (parsed?.entries && typeof parsed.entries === "object") {
            setState({
              entries: parsed.entries as Record<string, TrackerEntry>,
              collectionNames: Array.isArray(parsed.collectionNames)
                ? parsed.collectionNames
                : [],
            });
          }
        } catch {
          // Ignore malformed persistence and start clean.
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // Persistence is best-effort; the in-memory state still works.
    });
  }, [ready, state]);

  const actions = useMemo(() => {
    const update = (
      id: string,
      type: MediaType,
      recipe: (entry: TrackerEntry) => TrackerEntry,
    ) => {
      const key = makeKey(id, type);
      setState((current) => {
        const entry = current.entries[key];
        if (!entry) return current;
        return {
          entries: {
            ...current.entries,
            [key]: recipe(entry),
          },
        };
      });
    };

    return {
      upsertEntry: (item: TrackerEntryInput) => {
        const key = makeKey(item.id, item.type);
        let created: TrackerEntry | null = null;

        setState((current) => {
          const entry = mergeEntry(current.entries[key], item);
          created = entry;
          return {
            entries: {
              ...current.entries,
              [key]: entry,
            },
          };
        });

        return created ?? createEntry(item);
      },
      mutateEntry: (
        item: TrackerEntryInput,
        recipe: (entry: TrackerEntry) => TrackerEntry,
      ) => {
        const key = makeKey(item.id, item.type);
        setState((current) => {
          const entry = mergeEntry(current.entries[key], item);
          return {
            entries: {
              ...current.entries,
              [key]: recipe(entry),
            },
          };
        });
      },
      removeEntry: (id: string, type: MediaType) => {
        const key = makeKey(id, type);
        setState((current) => {
          if (!current.entries[key]) return current;
          const next = { ...current.entries };
          delete next[key];
          return { entries: next };
        });
      },
      setStatus: (id: string, type: MediaType, status: TrackerStatus) => {
        update(id, type, (entry) => ({
          ...entry,
          status,
          updatedAt: Date.now(),
        }));
      },
      setWishlist: (id: string, type: MediaType, wishlist: boolean) => {
        update(id, type, (entry) => ({
          ...entry,
          wishlist,
          updatedAt: Date.now(),
        }));
      },
      toggleWishlist: (item: TrackerEntryInput) => {
        const key = makeKey(item.id, item.type);
        setState((current) => {
          const entry = mergeEntry(current.entries[key], item);
          const nextWishlist = !entry.wishlist;
          return {
            entries: {
              ...current.entries,
              [key]: {
                ...entry,
                wishlist: nextWishlist,
                status:
                  nextWishlist && entry.status === "Planning"
                    ? "Planning"
                    : entry.status,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
      setCollections: (id: string, type: MediaType, collections: string[]) => {
        update(id, type, (entry) => ({
          ...entry,
          collections: normaliseCollections(collections),
          updatedAt: Date.now(),
        }));
      },
      addCollection: (item: TrackerEntryInput, collection: string) => {
        const name = collection.trim();
        if (!name) return;

        const key = makeKey(item.id, item.type);
        setState((current) => {
          const entry = mergeEntry(current.entries[key], item);
          const collections = normaliseCollections([
            ...entry.collections,
            name,
          ]);
          return {
            entries: {
              ...current.entries,
              [key]: {
                ...entry,
                collections,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
      removeCollection: (id: string, type: MediaType, collection: string) => {
        update(id, type, (entry) => ({
          ...entry,
          collections: entry.collections.filter((item) => item !== collection),
          updatedAt: Date.now(),
        }));
      },
      setProgress: (
        id: string,
        type: MediaType,
        progress: number,
        totalProgress?: number | null,
      ) => {
        update(id, type, (entry) => ({
          ...entry,
          progress:
            totalProgress != null
              ? Math.min(totalProgress, clampInt(progress, entry.progress))
              : clampInt(progress, entry.progress),
          totalProgress: totalProgress ?? entry.totalProgress,
          updatedAt: Date.now(),
        }));
      },
      setRewatches: (id: string, type: MediaType, rewatches: number) => {
        update(id, type, (entry) => ({
          ...entry,
          rewatches: clampInt(rewatches, entry.rewatches),
          updatedAt: Date.now(),
        }));
      },
      createCollection: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        setState((current) => {
          // Avoid duplicates
          if (current.collectionNames.includes(trimmed)) return current;
          return {
            ...current,
            collectionNames: [...current.collectionNames, trimmed].sort(
              (left, right) => left.localeCompare(right),
            ),
          };
        });
      },
      deleteCollection: (name: string) => {
        // Remove the collection from collectionNames and all entries
        setState((current) => {
          const entries = Object.entries(current.entries).reduce(
            (acc, [key, entry]) => {
              acc[key] = {
                ...entry,
                collections: entry.collections.filter((c) => c !== name),
                updatedAt: Date.now(),
              };
              return acc;
            },
            {} as Record<string, TrackerEntry>,
          );
          return {
            entries,
            collectionNames: current.collectionNames.filter((c) => c !== name),
          };
        });
      },
    };
  }, []);

  const entries = useMemo(
    () =>
      Object.values(state.entries).sort(
        (left, right) => right.updatedAt - left.updatedAt,
      ),
    [state.entries],
  );

  const value = useMemo<TrackerContextValue>(() => {
    const wishlistEntries = entries.filter((entry) => entry.wishlist);
    const collections = buildCollections(entries, state.collectionNames);
    const statusCounts = toStatusCounts(entries);

    return {
      entries,
      wishlistEntries,
      collections,
      statusCounts,
      totalTracked: entries.length,
      ready,
      ...actions,
      getEntry: (id: string, type: MediaType) =>
        state.entries[makeKey(id, type)],
    };
  }, [actions, entries, ready, state.entries, state.collectionNames]);

  return (
    <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
  );
}

export function useTracker() {
  const value = useContext(TrackerContext);
  if (!value) {
    throw new Error("useTracker must be used within a TrackerProvider");
  }
  return value;
}
