export interface ProfileConfig {
  id: number;
  name: string;
  tiktokKeywords: string[];
  tiktokHashtags: string[];
  threadsKeywords: string[];
  facebookPageUrls: string[];
  appStoreId: string | null;
  appStoreCountry: string;
  playStoreId: string | null;
}
