"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function JoinPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [group, setGroup] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login`);
      return;
    }
    if (status !== "authenticated") return;

    fetch(`/api/join/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGroup(data);
        setLoading(false);
      });
  }, [code, status, router]);

  async function handleJoin() {
    if (!group) return;
    setJoining(true);

    const res = await fetch(`/api/groups/${group.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: code }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setJoining(false);
      return;
    }

    router.push(`/groups/${group.id}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Link href="/feed" className="text-zinc-400 underline">Go to feed</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Join group</h1>
        <div className="rounded-2xl bg-zinc-900 p-6 ring-1 ring-zinc-800">
          <h2 className="text-xl font-semibold">{group?.name}</h2>
          {group?.description && (
            <p className="mt-2 text-zinc-400">{group.description}</p>
          )}
        </div>
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {joining ? "Joining..." : "Join group"}
        </button>
      </div>
    </div>
  );
}
