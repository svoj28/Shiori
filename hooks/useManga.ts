import { useQuery } from '@tanstack/react-query'
import { getTrending } from '@/services/anilist'
import { getMangaChapters, searchManga } from '@/services/mangadex'

export const useTrendingManga = () =>
  useQuery({ queryKey: ['manga', 'trending'], queryFn: () => getTrending('MANGA') })

export const useMangaSearch = (q: string) =>
  useQuery({
    queryKey: ['manga', 'search', q],
    queryFn: () => searchManga(q),
    enabled: q.length > 1
  })

export const useChapters = (mangaId: string) =>
  useQuery({ queryKey: ['chapters', mangaId], queryFn: () => getMangaChapters(mangaId) })