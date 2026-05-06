import { getTrending, searchAnilist } from "@/services/anilist";
import { getAnimeEpisodes } from "@/services/hianime";
import { useQuery } from "@tanstack/react-query";

export const useTrendingAnime = () =>
  useQuery({
    queryKey: ["anime", "trending"],
    queryFn: () => getTrending("ANIME"),
  });

export const useAnimeSearch = (q: string) =>
  useQuery({
    queryKey: ["anime", "search", q],
    queryFn: () => searchAnilist(q, "ANIME"),
    enabled: q.length > 1,
  });

export const useEpisodes = (id: string) =>
  useQuery({ queryKey: ["episodes", id], queryFn: () => getAnimeEpisodes(id) });
