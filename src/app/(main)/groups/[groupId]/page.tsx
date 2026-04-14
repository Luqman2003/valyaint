"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PostCard from "@/components/PostCard";
import PostForm from "@/components/PostForm";

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  role: string;
  memberships: {
    id: string;
    role: string;
    user: { id: string; displayName: string; avatarUrl: string | null };
  }[];
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

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchPosts = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/groups/${groupId}/posts?${params}`);
    const data = await res.json();

    if (cursor) {
      setPosts((prev) => [...prev, ...data.posts]);
    } else {
      setPosts(data.posts);
    }
    setNextCursor(data.nextCursor);
  }, [groupId]);

  useEffect(() => {
    fetch(`/api/groups/${groupId}`).then((r) => r.json()).then(setGroup);
    fetchPosts();
  }, [groupId, fetchPosts]);

  function copyInvite() {
    if (!group) return;
    const link = `${window.location.origin}/join/${group.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    if (!confirm("Leave this group?")) return;
    const res = await fetch(`/api/groups/${groupId}/members`, { method: "DELETE" });
    if (res.ok) router.push("/groups");
  }

  async function handleDelete() {
    if (!confirm("Delete this group? All posts will be permanently removed.")) return;
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) router.push("/groups");
  }

  if (!group) {
    return <p className="p-8 text-center text-zinc-500">Loading...</p>;
  }

  return (
    <div>
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{group.name}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              {group.memberships.length} members
            </button>
            <button
              onClick={copyInvite}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              {copied ? "Copied!" : "Invite"}
            </button>
            {group.role === "OWNER" ? (
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
              >
                Delete
              </button>
            ) : (
              <button
                onClick={handleLeave}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700"
              >
                Leave
              </button>
            )}
          </div>
        </div>
        {group.description && (
          <p className="mt-1 text-sm text-zinc-400">{group.description}</p>
        )}

        {showMembers && (
          <div className="mt-3 space-y-2">
            {group.memberships.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold">
                  {m.user.displayName[0].toUpperCase()}
                </div>
                <span>{m.user.displayName}</span>
                {m.role === "OWNER" && (
                  <span className="text-[10px] text-zinc-500 uppercase">owner</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PostForm groupId={groupId} onPost={() => fetchPosts()} />

      {posts.length === 0 ? (
        <p className="p-8 text-center text-zinc-500">No posts yet. Be the first!</p>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showGroup={false} onUpdate={() => fetchPosts()} />
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
