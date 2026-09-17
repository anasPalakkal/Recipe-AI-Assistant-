import type { ImageProvider, PhotoResult } from "./types.js";

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";

interface PexelsPhoto {
  src: { medium: string; large: string };
  photographer: string;
  photographer_url: string;
  url: string;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

export function createPexelsProvider(apiKey: string): ImageProvider {
  return {
    async searchPhoto(query: string): Promise<PhotoResult | null> {
      const url = new URL(PEXELS_SEARCH_URL);
      url.searchParams.set("query", query);
      url.searchParams.set("per_page", "1");
      url.searchParams.set("orientation", "landscape");

      const res = await fetch(url, {
        headers: { Authorization: apiKey },
      });

      if (!res.ok) {
        throw new Error(`Pexels API returned status ${res.status}`);
      }

      const data = (await res.json()) as PexelsSearchResponse;
      const photo = data.photos[0];
      if (!photo) return null;

      return {
        url: photo.src.large,
        thumbnailUrl: photo.src.medium,
        photographerName: photo.photographer,
        photographerUrl: photo.photographer_url,
        sourcePageUrl: photo.url,
      };
    },
  };
}