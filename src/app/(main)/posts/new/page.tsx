"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PostForm from "@/components/PostForm";

export default function NewPostPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/groups").then((r) => r.json()).then(setGroups);
  }, []);

  if (groups.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500">
        <p>Join or create a group first</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">New Post</h2>
      <PostForm groups={groups} onPost={() => router.push("/feed")} />
    </div>
  );
}
