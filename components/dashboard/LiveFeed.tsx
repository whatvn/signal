"use client";

import { useEffect, useRef, useState } from "react";
import { PostCard, ClassifiedPost } from "./PostCard";
import { CommentCard, FeedComment } from "./CommentCard";

const MAX_POSTS = 100;

type Tab = "posts" | "comments";

export function LiveFeed() {
  const [tab, setTab] = useState<Tab>("posts");

  const [posts, setPosts] = useState<ClassifiedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "negative" | "positive">("all");

  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/posts?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts ?? []);
        setPostsLoading(false);
      })
      .catch(() => setPostsLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "comments" && !commentsLoaded) {
      setCommentsLoading(true);
      fetch("/api/comments?limit=50")
        .then((r) => r.json())
        .then((data) => {
          setComments(data.comments ?? []);
          setCommentsLoading(false);
          setCommentsLoaded(true);
        })
        .catch(() => setCommentsLoading(false));
    }
  }, [tab, commentsLoaded]);

  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "new_post") {
          setPosts((prev) => {
            const next = [event.post as ClassifiedPost, ...prev];
            return next.slice(0, MAX_POSTS);
          });
          setCommentsLoaded(false);
        }
      } catch {
        // ignore malformed events
      }
    };

    return () => es.close();
  }, []);

  const filteredPosts =
    filter === "all" ? posts : posts.filter((p) => p.sentiment === filter);

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`text-xs px-3 py-1 rounded-full transition-colors ${
        tab === t
          ? "bg-slate-600 text-slate-200"
          : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Live Feed
        </h2>
        <span className="text-xs bg-slate-700 text-slate-400 rounded-full px-2 py-0.5">
          {tab === "posts" ? filteredPosts.length : comments.length}
        </span>

        {/* Tab switcher */}
        <div className="flex gap-1">
          {tabBtn("posts", "Posts")}
          {tabBtn("comments", "Comments")}
        </div>

        {/* Sentiment filter — only relevant for posts tab */}
        {tab === "posts" && (
          <div className="ml-auto flex gap-1">
            {(["all", "negative", "positive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filter === f
                    ? f === "negative"
                      ? "bg-coral/20 text-coral"
                      : f === "positive"
                      ? "bg-teal-brand/20 text-teal-brand"
                      : "bg-slate-600 text-slate-200"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={feedRef} className="flex-1 overflow-y-auto pr-1">
        {tab === "posts" ? (
          postsLoading ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
              Loading posts...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
              <span>No posts yet</span>
              <span className="text-xs">Run the pipeline to fetch data</span>
            </div>
          ) : (
            filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
          )
        ) : commentsLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
            <span>No comments yet</span>
            <span className="text-xs">Run the pipeline to fetch data</span>
          </div>
        ) : (
          comments.map((c) => <CommentCard key={c.id} comment={c} />)
        )}
      </div>
    </div>
  );
}
