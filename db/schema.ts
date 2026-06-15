import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  isDefault: integer("is_default").notNull().default(0),
  tiktokKeywords: text("tiktok_keywords").notNull().default("[]"),
  tiktokHashtags: text("tiktok_hashtags").notNull().default("[]"),
  threadsKeywords: text("threads_keywords").notNull().default("[]"),
  facebookPageUrls: text("facebook_page_urls").notNull().default("[]"),
  appStoreId: text("app_store_id"),
  appStoreCountry: text("app_store_country").notNull().default("vn"),
  playStoreId: text("play_store_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  sourceUrl: text("source_url"),
  authorHandle: text("author_handle"),
  contentText: text("content_text").notNull(),
  rawJson: text("raw_json").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
  publishedAt: integer("published_at"),
  keyword: text("keyword").notNull(),
  profileId: integer("profile_id").references(() => profiles.id),
});

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id),
  authorHandle: text("author_handle"),
  contentText: text("content_text").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
});

export const classifications = sqliteTable("classifications", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .unique()
    .references(() => posts.id),
  sentiment: text("sentiment").notNull(),
  subcategory: text("subcategory").notNull(),
  confidence: real("confidence").notNull(),
  commentCount: integer("comment_count").notNull().default(0),
  classifiedAt: integer("classified_at").notNull(),
  modelUsed: text("model_used").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
});

export const pipelineState = sqliteTable("pipeline_state", {
  keyword: text("keyword").primaryKey(),
  lastCompletedAt: integer("last_completed_at").notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  subcategory: text("subcategory").notNull(),
  count: integer("count").notNull(),
  windowMinutes: integer("window_minutes").notNull(),
  threshold: integer("threshold").notNull(),
  firedAt: integer("fired_at").notNull(),
  acknowledgedAt: integer("acknowledged_at"),
  samplePostIds: text("sample_post_ids").notNull(),
});
