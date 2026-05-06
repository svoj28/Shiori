import { useQuery } from '@tanstack/react-query'
import { searchLightNovel, getLightNovelInfo } from '@/services/consumet'

export const useLightNovelSearch = (q: string) =>
  useQuery({
    queryKey: ['ln', 'search', q],
    queryFn: () => searchLightNovel(q),
    enabled: q.length > 1
  })

export const useLightNovelInfo = (id: string) =>
  useQuery({ queryKey: ['ln', id], queryFn: () => getLightNovelInfo(id) })