"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

type PostItem = {
  id: string;
  content: string | null;
  createdAt: string;
  photos: { id: string; url: string }[];
  group: { id: string; name: string };
  _count: { comments: number };
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"photos" | "text">("photos");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups").then((r) => r.json()).then(setGroups);
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setPosts([]);
    const params = new URLSearchParams({ filter });
    if (selectedGroup) params.set("groupId", selectedGroup);
    const res = await fetch(`/api/users/me/posts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts);
    }
    setLoading(false);
  }, [filter, selectedGroup]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  if (!session) return null;

  const avatar = session.user.image;

  async function ensureJpeg(file: File): Promise<File> {
    if (file.type === "image/jpeg" || file.type === "image/png") return file;
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 1.0)
    );
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploading(true);

    try {
      const file = await ensureJpeg(rawFile);
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!presignRes.ok) { setUploading(false); return; }
      const { presignedUrl, publicUrl } = await presignRes.json();

      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) { setUploading(false); return; }

      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });

      await update();
    } catch {}
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 pb-0">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative group shrink-0"
        >
          {avatar ? (
            <Image
              src={avatar}
              alt="Profile"
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-zinc-700 text-2xl font-bold">
              {session.user.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition">
            <span className="text-xs font-medium">
              {uploading ? "..." : "Edit"}
            </span>
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{session.user.name}</h2>
          <p className="text-sm text-zinc-400 truncate">{session.user.email}</p>
        </div>
      </div>

      {/* Group filter */}
      {groups.length > 0 && (
        <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedGroup("")}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              selectedGroup === ""
                ? "bg-white text-black"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            All
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                selectedGroup === g.id
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Type filter */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setFilter("photos")}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition ${
            filter === "photos"
              ? "border-white text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Photos
        </button>
        <button
          onClick={() => setFilter("text")}
          className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition ${
            filter === "text"
              ? "border-white text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Text
        </button>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 py-12">
          No {filter === "photos" ? "photo" : "text"} posts yet
        </p>
      ) : filter === "photos" ? (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.filter((p) => p.photos.length > 0).map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <div className="relative aspect-square bg-zinc-800">
                <Image
                  src={post.photos[0].url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
                {post.photos.length > 1 && (
                  <div className="absolute top-1.5 right-1.5">
                    <svg className="h-4 w-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                    </svg>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-0">
          {posts.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`} className="block border-b border-zinc-800 px-4 py-3 hover:bg-zinc-900/50 transition">
              <p className="text-[15px] leading-relaxed line-clamp-3 whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                <span>{post.group.name}</span>
                <span>{timeAgo(post.createdAt)}</span>
                {post._count.comments > 0 && (
                  <span>{post._count.comments} comment{post._count.comments !== 1 ? "s" : ""}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Sign out */}
      <div className="px-4 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-red-400 ring-1 ring-zinc-800 hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    </div>
  );
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
