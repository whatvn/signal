export interface RawPost {
  id: string;
  platform: "facebook" | "tiktok" | "threads";
  authorHandle: string;
  contentText: string;
  sourceUrl: string;
  rawJson: string;
  publishedAt?: number;
  feedbackId?: string;
}

export interface RawComment {
  id: string;
  authorHandle: string;
  contentText: string;
}

export interface SFSearchResult {
  data: unknown[];
  nextPage?: number;
}
