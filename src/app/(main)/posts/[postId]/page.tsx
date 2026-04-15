"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import PostCard from "@/components/PostCard";

interface Author {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  replies: Reply[];
}

interface Post {
  id: string;
  content: string | null;
  createdAt: string;
  author: Author;
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
  return `${Math.floor(hrs / 24)}d`;
}

function Avatar({ author, size = 32 }: { author: Author; size?: number }) {
  return author.avatarUrl ? (
    <Image
      src={author.avatarUrl}
      alt={author.displayName}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-zinc-700 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {author.displayName[0].toUpperCase()}
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/posts/${postId}`).then((r) => r.json()).then(setPost);
    fetch(`/api/posts/${postId}/comments`).then((r) => r.json()).then(setComments);
  }, [postId]);

  function toggleThread(commentId: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    const body: Record<string, string> = { content: newComment.trim() };
    if (replyTo) body.parentId = replyTo.id;

    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const comment = await res.json();
      if (replyTo) {
        // Add reply to parent
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id ? { ...c, replies: [...c.replies, comment] } : c
          )
        );
        setExpandedThreads((prev) => new Set([...prev, replyTo.id]));
      } else {
        setComments((prev) => [...prev, { ...comment, replies: [] }]);
      }
      setNewComment("");
      setReplyTo(null);
    }
    setSubmitting(false);
  }

  if (!post) {
    return <p className="p-8 text-center text-zinc-500">Loading...</p>;
  }

  const totalComments = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  return (
    <div>
      <PostCard post={post} />

      <div className="p-4 space-y-4">
        <h3 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">
          Comments ({totalComments})
        </h3>

        {comments.map((comment) => (
          <div key={comment.id} className="space-y-3">
            {/* Top-level comment */}
            <div className="flex gap-3">
              <Avatar author={comment.author} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{comment.author.displayName}</span>
                  <span className="text-xs text-zinc-500">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
                <button
                  onClick={() => setReplyTo({ id: comment.id, name: comment.author.displayName })}
                  className="mt-1 text-xs text-zinc-500 hover:text-white"
                >
                  Reply
                </button>
              </div>
            </div>

            {/* Replies */}
            {comment.replies.length > 0 && (
              <div className="ml-10">
                {!expandedThreads.has(comment.id) ? (
                  <button
                    onClick={() => toggleThread(comment.id)}
                    className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white"
                  >
                    <div className="h-px w-6 bg-zinc-700" />
                    View {comment.replies.length} repl{comment.replies.length === 1 ? "y" : "ies"}
                  </button>
                ) : (
                  <div className="space-y-3 border-l border-zinc-800 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar author={reply.author} size={24} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{reply.author.displayName}</span>
                            <span className="text-xs text-zinc-500">{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => toggleThread(comment.id)}
                      className="text-xs text-zinc-500 hover:text-white"
                    >
                      Hide replies
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Comment input */}
        <form onSubmit={handleComment} className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Replying to {replyTo.name}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Add a comment..."}
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
          </div>
        </form>
      </div>
    </div>
  );
}
