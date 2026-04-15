"use client";

import { useState, useEffect, useCallback } from "react";
import PostCard from "@/components/PostCard";
import PostForm from "@/components/PostForm";

interface Group {
  id: string;
  name: string;
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

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (selectedGroup) params.set("groupId", selectedGroup);

    const res = await fetch(`/api/feed?${params}`);
    const data = await res.json();

    if (cursor) {
      setPosts((prev) => [...prev, ...data.posts]);
    } else {
      setPosts(data.posts);
    }
    setNextCursor(data.nextCursor);
    setLoading(false);
  }, [selectedGroup]);

  useEffect(() => {
    fetch("/api/groups").then((r) => r.json()).then(setGroups);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div>
      {/* Unified group selector — filters feed + sets post target */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white ring-1 ring-zinc-800"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <PostForm
        groupId={selectedGroup || undefined}
        groups={groups}
        hideGroupSelector
        onPost={() => fetchPosts()}
      />

      {loading ? (
        <p className="p-8 text-center text-zinc-500">Loading...</p>
      ) : posts.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          <p>No posts yet</p>
          <p className="mt-1 text-sm">Create a group and start posting!</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={() => fetchPosts()} />
          ))}
          {nextCursor && (
            <button
              onClick={() => fetchPosts(nextCursor)}
              className="w-full py-4 text-sm text-zinc-400 hover:text-white"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
