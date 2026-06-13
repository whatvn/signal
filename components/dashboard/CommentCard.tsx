"use client";

export interface FeedComment {
  id: string;
  postId: string;
  authorHandle: string | null;
  contentText: string;
  fetchedAt: number;
  platform: string;
  postUrl: string | null;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function CommentCard({ comment }: { comment: FeedComment }) {
  const isTikTok = comment.platform === "tiktok";

  return (
    <div className="bg-slate-800 rounded-lg p-4 mb-3 border-l-4 border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                backgroundColor: isTikTok
                  ? "rgba(255,0,80,0.15)"
                  : "rgba(24,119,242,0.15)",
                color: isTikTok ? "#ff0050" : "#1877f2",
              }}
            >
              {isTikTok ? "TikTok" : "Facebook"}
            </span>
            <span className="text-xs text-slate-500">comment</span>
            {comment.authorHandle && (
              <span className="text-xs text-slate-400">@{comment.authorHandle}</span>
            )}
            <span className="text-xs text-slate-500 ml-auto">{timeAgo(comment.fetchedAt)}</span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed line-clamp-3">
            {comment.contentText || <em className="text-slate-500">No content</em>}
          </p>
        </div>

        {comment.postUrl && (
          <a
            href={comment.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-300 shrink-0 mt-1"
            title="View original post"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
