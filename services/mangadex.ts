import axios from 'axios'
import { API } from '@/constants/api'

// MangaDex has a public REST API — no Consumet needed, no self-hosting.
// Docs: https://api.mangadex.org/docs
const client = axios.create({
  baseURL: API.MANGADEX,
  timeout: 20000,
})

// ─── Search ───────────────────────────────────────────────────────────────────
// GET /manga?title={query}&limit=20&includes[]=cover_art&includes[]=author

export const searchManga = async (title: string): Promise<any[]> => {
  try {
    const res = await client.get('/manga', {
      params: {
        title,
        limit: 20,
        'includes[]': ['cover_art', 'author'],
      },
    })
    return res.data?.data ?? []
  } catch (e) {
    console.error('[MangaDex] searchManga failed:', e)
    return []
  }
}

// ─── Get chapter list ─────────────────────────────────────────────────────────
// GET /manga/{mangaId}/feed
// mangaId is the `id` field from searchManga results (a UUID)
// Returns chapters sorted ascending, English only, up to 100.

export const getMangaChapters = async (mangaId: string): Promise<any[]> => {
  try {
    const res = await client.get(`/manga/${mangaId}/feed`, {
      params: {
        'translatedLanguage[]': 'en',
        'order[chapter]': 'asc',
        limit: 100,
        'includes[]': ['scanlation_group'],
      },
    })
    return res.data?.data ?? []
  } catch (e) {
    console.error('[MangaDex] getMangaChapters failed for id:', mangaId, e)
    return []
  }
}

// ─── Get chapter pages ────────────────────────────────────────────────────────
// GET /at-home/server/{chapterId}
// Returns baseUrl + chapter hash + page filenames to build full image URLs.

export const getChapterPages = async (chapterId: string): Promise<string[]> => {
  try {
    const res = await client.get(`/at-home/server/${chapterId}`)
    const base  = res.data?.baseUrl
    const hash  = res.data?.chapter?.hash
    const pages = res.data?.chapter?.data ?? []
    return pages.map((p: string) => `${base}/data/${hash}/${p}`)
  } catch (e) {
    console.error('[MangaDex] getChapterPages failed for chapter:', chapterId, e)
    return []
  }
}

export const getCoverUrl = (mangaId: string, filename: string) =>
  `${API.MANGADEX_COVER}/${mangaId}/${filename}.256.jpg`