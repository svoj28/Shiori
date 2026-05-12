export const API = {
  // Anilist — public GraphQL API, no key needed
  ANILIST: "https://graphql.anilist.co",

  // Consumet — Light Novels only now
  CONSUMET: "https://consumet.till.im",

  // HiAnime (aniwatch-api) — self-hosted on Railway
  // Deploy: docker run -d -p 4000:4000 ghcr.io/ghoshritesh12/aniwatch
  // Set env: ANIWATCH_API_DEPLOYMENT_ENV=railway
  // Then paste your Railway URL here:
  HIANIME: "https://aniwatchapi-snowy.vercel.app",
} as const;
