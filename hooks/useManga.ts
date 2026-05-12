import { getTrending, searchAnilist } from "@/services/anilist";
import { useQuery } from "@tanstack/react-query";

export const useTrendingManga = () =>
  useQuery({
    queryKey: ["manga", "trending"],
    queryFn: () => getTrending("MANGA"),
  });

export const useMangaSearch = (q: string) =>
  useQuery({
    queryKey: ["manga", "search", q],
    queryFn: () => searchAnilist(q, "MANGA"),
    enabled: q.length > 1,
  });
