export interface PhotoResult {
  url: string;
  thumbnailUrl: string;
  photographerName: string;
  photographerUrl: string;
  sourcePageUrl: string;
}

export interface ImageProvider {
  searchPhoto(query: string): Promise<PhotoResult | null>;
}