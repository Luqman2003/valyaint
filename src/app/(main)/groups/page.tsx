"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description: string | null;
  role: string;
  memberCount: number;
  postCount: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => {
        setGroups(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="p-8 text-center text-zinc-500">Loading...</p>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Your Groups</h2>
        {groups.length < 3 && (
          <Link
            href="/groups/new"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            Create
          </Link>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl bg-zinc-900 p-8 text-center ring-1 ring-zinc-800">
          <p className="text-zinc-400">No groups yet</p>
          <p className="mt-1 text-sm text-zinc-500">Create one or join with an invite link</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800 hover:ring-zinc-600 transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{group.name}</h3>
                {group.role === "OWNER" && (
                  <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">
                    Owner
                  </span>
                )}
              </div>
              {group.description && (
                <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{group.description}</p>
              )}
              <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                <span>{group.memberCount} member{group.memberCount !== 1 ? "s" : ""}</span>
                <span>{group.postCount} post{group.postCount !== 1 ? "s" : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
