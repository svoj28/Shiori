import axios from 'axios'
import { API } from '@/constants/api'

const gql = (query: string, variables = {}) =>
  axios.post(API.ANILIST, { query, variables }).then(r => r.data.data)

export const getTrending = (type: 'ANIME' | 'MANGA', sort = 'TRENDING_DESC') =>
  gql(
    `query($type: MediaType, $sort: [MediaSort]) {
      Page(perPage: 30) {
        media(type: $type, sort: $sort, isAdult: false) {
          id title { romaji english }
          coverImage { large extraLarge }
          averageScore genres episodes chapters
          status format description bannerImage
        }
      }
    }`,
    { type, sort: [sort] }
  ).then((d: any) => d.Page.media)

export const searchAnilist = (search: string, type: 'ANIME' | 'MANGA') =>
  gql(
    `query($search: String, $type: MediaType) {
      Page(perPage: 20) {
        media(search: $search, type: $type, sort: POPULARITY_DESC, isAdult: false) {
          id title { romaji english }
          coverImage { large } averageScore genres episodes chapters
        }
      }
    }`,
    { search, type }
  ).then((d: any) => d.Page.media)

// Full detail for modal
export const getMediaDetail = (id: number, type: 'ANIME' | 'MANGA') =>
  gql(
    `query($id: Int, $type: MediaType) {
      Media(id: $id, type: $type) {
        id
        title { romaji english native }
        coverImage { large extraLarge }
        bannerImage
        description(asHtml: false)
        averageScore meanScore popularity
        genres tags { name }
        episodes chapters volumes
        status format season seasonYear
        studios(isMain: true) { nodes { name } }
        staff(perPage: 4) { edges { role node { name { full } } } }
        startDate { year month day }
      }
    }`,
    { id, type }
  ).then((d: any) => d.Media)