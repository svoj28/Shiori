import axios from 'axios'
import { API } from '@/constants/api'

// ─── Provider: GogoAnime via Consumet ────────────────────────────────────────
// Uses your existing Consumet Railway instance.
// Docs: https://docs.consumet.org/rest-api/Anime/gogoanime
//
// ID format:
//   Search   → results[].id  = "anime-slug"  e.g. "one-piece"
//   Episodes → episodes[].id = "episode-slug" e.g. "one-piece-episode-1"
//   Watch    → pass episode id directly
// ─────────────────────────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: API.CONSUMET,
  timeout: 60000,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HiAnimeResult {
  id:          string
  title:       string
  image:       string
  releaseDate: string
  subOrDub:    string
}

export interface HiAnimeEpisode {
  id:     string  // e.g. "one-piece-episode-1" — pass directly to watch
  number: number
  url:    string
}

export interface HiAnimeSource {
  url:     string
  isM3U8:  boolean
  quality?: string
}

export interface HiAnimeSourcesResponse {
  sources:   HiAnimeSource[]
  subtitles: { lang: string; url: string }[]
  headers?:  Record<string, string>
  anilistID: number | null
  malID:     number | null
}

// Re-export with names the player expects
export type EpisodeSource = HiAnimeSource
export type EpisodeSourcesResponse = HiAnimeSourcesResponse

// ─── 1. Search ────────────────────────────────────────────────────────────────
// GET /anime/gogoanime/{query}

export const searchAnime = async (query: string): Promise<HiAnimeResult[]> => {
  try {
    const res = await client.get(
      `/anime/gogoanime/${encodeURIComponent(query)}`,
      { validateStatus: s => s < 500 },
    )
    if (res.status === 404) return []
    return res.data?.results ?? []
  } catch (e) {
    console.error('[GogoAnime] searchAnime failed:', e)
    return []
  }
}

// ─── 2. Get episode list ──────────────────────────────────────────────────────
// GET /anime/gogoanime/info?id={animeId}

export const getAnimeEpisodes = async (animeId: string): Promise<HiAnimeEpisode[]> => {
  try {
    const res = await client.get('/anime/gogoanime/info', {
      params: { id: animeId },
      validateStatus: s => s < 500,
    })
    if (res.status === 404) return []
    return res.data?.episodes ?? []
  } catch (e) {
    console.error('[GogoAnime] getAnimeEpisodes failed:', animeId, e)
    return []
  }
}

// ─── 3. Get streaming sources ─────────────────────────────────────────────────
// GET /anime/gogoanime/watch/{episodeId}

export const getEpisodeSources = async (
  episodeId: string,
): Promise<HiAnimeSourcesResponse> => {
  try {
    const res = await client.get(
      `/anime/gogoanime/watch/${episodeId}`,
      { validateStatus: s => s < 500 },
    )
    if (res.status === 404) return { sources: [], subtitles: [], anilistID: null, malID: null }
    const data = res.data ?? {}
    return {
      sources: (data.sources ?? []).map((s: any) => ({
        url:     s.url ?? '',
        isM3U8:  s.isM3U8 ?? s.url?.includes('.m3u8') ?? false,
        quality: s.quality ?? 'Auto',
      })),
      subtitles: [],
      headers:   data.headers ?? {},
      anilistID: null,
      malID:     null,
    }
  } catch (e) {
    console.error('[GogoAnime] getEpisodeSources failed:', episodeId, e)
    return { sources: [], subtitles: [], anilistID: null, malID: null }
  }
}