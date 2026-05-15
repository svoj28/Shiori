import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { decode as decodeBase64 } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (
    updates: Partial<Omit<Profile, "id">>,
  ) => Promise<{ error: string | null }>;
  uploadAvatar: (
    imageUri: string,
  ) => Promise<{ error: string | null; avatarUrl?: string }>;
  refreshProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);
const AVATAR_BUCKET = "avatars";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch profile ────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) setProfile(data as Profile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  // ── Bootstrap session ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(
        ({ data: { session: s } }: { data: { session: Session | null } }) => {
          setSession(s);
          setUser(s?.user ?? null);
          if (s?.user) fetchProfile(s.user.id);
          setLoading(false);
        },
      );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Auth actions ─────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Omit<Profile, "id">>) => {
    if (!user) return { error: "Not logged in" };
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (!error) await fetchProfile(user.id);
    return { error: error?.message ?? null };
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!user) return { error: "Not logged in" };

    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        return { error: "Selected file is not accessible." };
      }

      const readAsStringAsyncAny = FileSystem.readAsStringAsync as any;
      const base64 = await readAsStringAsyncAny(imageUri, {
        encoding: "base64",
      });
      const arrayBuffer = decodeBase64(base64);

      const fileExtFromUri = imageUri.split(".").pop()?.toLowerCase();
      const guessedExt =
        fileExtFromUri && fileExtFromUri.length <= 5
          ? fileExtFromUri
          : imageUri.toLowerCase().includes("png")
            ? "png"
            : "jpg";

      const contentType = guessedExt === "png" ? "image/png" : "image/jpeg";
      const filePath = `${user.id}/avatar-${Date.now()}.${guessedExt}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, arrayBuffer, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });

      if (uploadError) {
        const msg = uploadError.message ?? "Failed to upload avatar.";
        if (/bucket.*not\s*found/i.test(msg)) {
          return {
            error:
              'Storage bucket "avatars" was not found. Create it in Supabase Storage first.',
          };
        }
        return { error: msg };
      }

      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);
      const avatarUrl = data.publicUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (profileError) {
        return { error: profileError.message ?? "Failed to save avatar URL." };
      }

      await fetchProfile(user.id);
      return { error: null, avatarUrl };
    } catch (e: any) {
      return { error: e?.message ?? "Avatar upload failed." };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        uploadAvatar,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
