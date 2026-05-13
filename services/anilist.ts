import { API } from "@/constants/api";
import axios from "axios";

const gql = (query: string, variables = {}) =>
  axios.post(API.ANILIST, { query, variables }).then((r) => r.data.data);

// ─── Genre constants ──────────────────────────────────────────────────────────

export const ANIME_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
] as const;

export const MANGA_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
] as const;

export const NOVEL_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Supernatural",
  "Thriller",
] as const;

export type AnimeGenre = (typeof ANIME_GENRES)[number];
export type MangaGenre = (typeof MANGA_GENRES)[number];
export type NovelGenre = (typeof NOVEL_GENRES)[number];
export type AnyGenre = AnimeGenre | MangaGenre | NovelGenre;

// ─── Browse by genre(s) ───────────────────────────────────────────────────────

/**
 * Fetch media filtered by one or more genres.
 * genres: string[]  — AniList supports multi-genre AND filtering natively.
 * sort: default POPULARITY_DESC, pass "SCORE_DESC" or "TRENDING_DESC" if needed.
 */
export const getByGenre = (
  type: "ANIME" | "MANGA",
  genres: string[],
  format?: "NOVEL",
  sort = "POPULARITY_DESC",
  perPage = 30,
) =>
  gql(
    `query($type: MediaType, $genres: [String], $sort: [MediaSort], $format: MediaFormat, $perPage: Int) {
      Page(perPage: $perPage) {
        media(
          type: $type,
          genre_in: $genres,
          sort: $sort,
          format: $format,
          isAdult: false
        ) {
          id title { romaji english }
          coverImage { large extraLarge }
          averageScore popularity genres episodes chapters
          nextAiringEpisode { episode airingAt timeUntilAiring }
          status format description bannerImage
        }
      }
    }`,
    { type, genres, sort: [sort], format, perPage },
  ).then((d: any) => d.Page.media);

// ─── Random pick helper ───────────────────────────────────────────────────────

/**
 * Returns `count` random genres from the given pool (no duplicates).
 */
export function pickRandomGenres<T extends string>(
  pool: readonly T[],
  count = 1,
): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const getTrending = (
  type: "ANIME" | "MANGA" | "NOVEL",
  sort = "TRENDING_DESC",
  status?: "RELEASING",
  format?: "NOVEL",
) =>
  gql(
    `query($type: MediaType, $sort: [MediaSort], $status: MediaStatus, $format: MediaFormat) {
      Page(perPage: 30) {
        media(type: $type, sort: $sort, status: $status, format: $format, isAdult: false) {
          id title { romaji english }
          coverImage { large extraLarge }
          averageScore popularity genres episodes chapters
          nextAiringEpisode { episode airingAt timeUntilAiring }
          status format description bannerImage
          rankings { rank type context allTime season year }
        }
      }
    }`,
    { type, sort: [sort], status, format },
  ).then((d: any) => d.Page.media);

export const searchAnilist = (
  search: string,
  type: "ANIME" | "MANGA" | "NOVEL",
  format?: "NOVEL",
) =>
  gql(
    `query($search: String, $type: MediaType, $format: MediaFormat) {
      Page(perPage: 20) {
        media(search: $search, type: $type, format: $format, sort: POPULARITY_DESC, isAdult: false) {
          id title { romaji english }
          coverImage { large } averageScore popularity genres episodes chapters
          nextAiringEpisode { episode airingAt timeUntilAiring }
          status
        }
      }
    }`,
    { search, type, format },
  ).then((d: any) => d.Page.media);

// Full detail for modal
export const getMediaDetail = (id: number, type: "ANIME" | "MANGA" | "NOVEL") =>
  gql(
    `query($id: Int, $type: MediaType) {
      Media(id: $id, type: $type) {
        id
        title { romaji english native }
        coverImage { large extraLarge }
        bannerImage
        description(asHtml: false)
        averageScore meanScore popularity
        externalLinks { site url type }
        genres tags { name }
        episodes chapters volumes
        nextAiringEpisode { episode airingAt timeUntilAiring }
        status format season seasonYear
        studios(isMain: true) { nodes { name } }
        staff(perPage: 6) { edges { role node { name { full } image { large } } } }
        characters(perPage: 12, sort: ROLE) {
          edges {
            role
            node { name { full } image { large } }
            voiceActors(language: JAPANESE) { name { full } image { large } }
          }
        }
        rankings { rank type context allTime season year }
        startDate { year month day }
        trailer { id site thumbnail }
      }
    }`,
    { id, type },
  ).then((d: any) => d.Media);

export const getRecommendations = (id: number, type: "ANIME" | "MANGA") =>
  gql(
    `query($id: Int, $type: MediaType) {
      Media(id: $id, type: $type) {
        recommendations(perPage: 10, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large extraLarge }
              averageScore popularity genres episodes chapters
              status format
            }
          }
        }
      }
    }`,
    { id, type },
  ).then((d: any) =>
    (d.Media.recommendations.nodes as any[])
      .map((n: any) => n.mediaRecommendation)
      .filter(Boolean),
  );

const CREATOR_WORK_FIELDS = `
  id
  title { romaji english }
  coverImage { large extraLarge }
  type
  format
  averageScore
  popularity
  genres
  episodes
  chapters
  rankings { rank type context allTime season year }
`;

export const getStudioDetail = (search: string) =>
  gql(
    `query($search: String) {
      Studio(search: $search) {
        id
        name
        isAnimationStudio
        siteUrl
        media(sort: POPULARITY_DESC) {
          nodes {
            ${CREATOR_WORK_FIELDS}
          }
        }
      }
    }`,
    { search },
  ).then((d: any) => d.Studio);

export const getAuthorDetail = (search: string) =>
  gql(
    `query($search: String) {
      Staff(search: $search) {
        id
        name { full }
        siteUrl
        image { large }
        description(asHtml: false)
        staffMedia(sort: POPULARITY_DESC) {
          nodes {
            ${CREATOR_WORK_FIELDS}
          }
        }
      }
    }`,
    { search },
  ).then((d: any) => d.Staff);

export const searchCreators = (search: string) =>
  gql(
    `query($search: String) {
      Page(perPage: 10) {
        studios(search: $search, sort: SEARCH_MATCH) {
          id
          name
          isAnimationStudio
          siteUrl
        }
        staff(search: $search, sort: SEARCH_MATCH) {
          id
          name { full }
          siteUrl
          image { large }
        }
      }
    }`,
    { search },
  ).then((d: any) => d.Page);
