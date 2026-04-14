"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface PostCardProps {
  post: {
    id: string;
    content: string | null;
    createdAt: string;
    author: { id: string; displayName: string; avatarUrl: string | null };
    photos: { id: string; url: string }[];
    _count: { comments: number };
    group: { id: string; name: string };
  };
  showGroup?: boolean;
  onUpdate?: () => void;
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

export default function PostCard({ post, showGroup = true, onUpdate }: PostCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isAuthor = session?.user?.id === post.author.id;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleEdit() {
    setSaving(true);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      setEditing(false);
      onUpdate?.();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) {
      onUpdate?.();
    }
  }

  return (
    <div className="border-b border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        {post.author.avatarUrl ? (
          <Image
            src={post.author.avatarUrl}
            alt={post.author.displayName}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold">
            {post.author.displayName[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{post.author.displayName}</span>
            <span className="text-xs text-zinc-500">{timeAgo(post.createdAt)}</span>
          </div>
          {showGroup && (
            <Link href={`/groups/${post.group.id}`} className="text-xs text-zinc-500 hover:text-zinc-300">
              {post.group.name}
            </Link>
          )}
        </div>

        {isAuthor && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-9 z-10 w-32 rounded-xl bg-zinc-800 py-1 shadow-lg ring-1 ring-zinc-700">
                <button
                  onClick={() => { setEditing(true); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => { handleDelete(); setShowMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full resize-none rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setEditing(false); setEditContent(post.content || ""); }}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={saving}
              className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )
      )}

      {post.photos.length > 0 && (
        <div className={`mt-3 gap-1 ${
          post.photos.length === 1 ? "" : "grid grid-cols-2"
        }`}>
          {post.photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-800">
              <Image
                src={photo.url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 512px) 100vw, 512px"
              />
            </div>
          ))}
        </div>
      )}

      <Link
        href={`/posts/${post.id}`}
        className="mt-3 block text-sm text-zinc-500 hover:text-zinc-300"
      >
        {post._count.comments === 0
          ? "Add a comment"
          : `${post._count.comments} comment${post._count.comments !== 1 ? "s" : ""}`}
      </Link>
    </div>
  );
}
