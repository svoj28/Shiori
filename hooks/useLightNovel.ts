import { getMediaDetail, getTrending, searchAnilist } from "@/services/anilist";
import { useQuery } from "@tanstack/react-query";

export const useLightNovelSearch = (q: string) =>
  useQuery({
    queryKey: ["ln", "search", q],
    queryFn: () => searchAnilist(q, "MANGA", "NOVEL"),
    enabled: q.length > 1,
  });

export const useLightNovelInfo = (id: string) =>
  useQuery({
    queryKey: ["ln", id],
    queryFn: () => getMediaDetail(Number(id), "MANGA"),
  });

export const useTrendingLightNovel = () =>
  useQuery({
    queryKey: ["ln", "trending"],
    queryFn: () => getTrending("MANGA", "TRENDING_DESC", undefined, "NOVEL"),
  });
