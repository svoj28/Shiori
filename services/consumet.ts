import axios from 'axios'
import { API } from '@/constants/api'

// Light Novels go through Consumet's "readlightnovels.net" provider.
// Same cold-start caveat as Animekai — 60s timeout for the Render free tier.
const client = axios.create({
  baseURL: API.CONSUMET,
  timeout: 60000,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LNChapter {
  id:    string
  title: string
  url:   string
}

export interface LNNovel {
  id:          string
  title:       string
  url:         string
  image:       string
  description: string
  chapters:    LNChapter[]
}

// ─── Search ───────────────────────────────────────────────────────────────────
// GET /light-novels/readlightnovels.net/{query}
// Returns { currentPage, hasNextPage, results: LNNovel[] }

export const searchLightNovel = async (query: string): Promise<{ results: LNNovel[] }> => {
  try {
    const res = await client.get(
      `/light-novels/readlightnovels.net/${encodeURIComponent(query)}`
    )
    return { results: res.data?.results ?? [] }
  } catch (e) {
    console.error('[LightNovel] searchLightNovel failed:', e)
    return { results: [] }
  }
}

// ─── Get novel info + full chapter list ──────────────────────────────────────
// GET /light-novels/readlightnovels.net/info?id={novelId}
// novelId comes from the `id` field in search results.
// The full chapter list is embedded in the response.

export const getLightNovelInfo = async (novelId: string): Promise<LNNovel | null> => {
  try {
    const res = await client.get('/light-novels/readlightnovels.net/info', {
      params: { id: novelId },
    })
    return res.data ?? null
  } catch (e) {
    console.error('[LightNovel] getLightNovelInfo failed for id:', novelId, e)
    return null
  }
}

// ─── Convenience: search → info → chapters in one call ───────────────────────
// Use this in modal.tsx instead of searchLightNovel.

export const getLightNovelChapters = async (query: string): Promise<LNChapter[]> => {
  try {
    const { results } = await searchLightNovel(query)
    if (!results.length) return []
    const info = await getLightNovelInfo(results[0].id)
    return info?.chapters ?? []
  } catch (e) {
    console.error('[LightNovel] getLightNovelChapters failed:', e)
    return []
  }
}

// ─── Read a chapter ───────────────────────────────────────────────────────────
// GET /light-novels/readlightnovels.net/read?chapterId={chapterId}

export const readLightNovelChapter = async (chapterId: string): Promise<string> => {
  try {
    const res = await client.get('/light-novels/readlightnovels.net/read', {
      params: { chapterId },
    })
    return res.data?.content ?? res.data?.text ?? ''
  } catch (e) {
    console.error('[LightNovel] readLightNovelChapter failed:', e)
    return ''
  }
}