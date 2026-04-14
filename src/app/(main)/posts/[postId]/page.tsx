"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PostCard from "@/components/PostCard";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
}

interface Post {
  id: string;
  content: string | null;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null };
  photos: { id: string; url: string }[];
  _count: { comments: number };
  group: { id: string; name: string };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}`).then((r) => r.json()).then(setPost);
    fetch(`/api/posts/${postId}/comments`).then((r) => r.json()).then(setComments);
  }, [postId]);

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim() }),
    });

    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    }
    setSubmitting(false);
  }

  if (!post) {
    return <p className="p-8 text-center text-zinc-500">Loading...</p>;
  }

  return (
    <div>
      <PostCard post={post} />

      <div className="p-4 space-y-4">
        <h3 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">
          Comments ({comments.length})
        </h3>

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold">
              {comment.author.displayName[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{comment.author.displayName}</span>
                <span className="text-xs text-zinc-500">{timeAgo(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}

        <form onSubmit={handleComment} className="flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            maxLength={2000}
            className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
