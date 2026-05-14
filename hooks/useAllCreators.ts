import { searchAuthors, searchStudios } from "@/services/anilist";
import { useQuery } from "@tanstack/react-query";

export const useSearchStudios = (search: string) =>
  useQuery({
    queryKey: ["search-studios", search],
    queryFn: () => searchStudios(search),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: search.length > 0, // Only fetch when search has content
  });

export const useSearchAuthors = (search: string) =>
  useQuery({
    queryKey: ["search-authors", search],
    queryFn: () => searchAuthors(search),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: search.length > 0, // Only fetch when search has content
  });
