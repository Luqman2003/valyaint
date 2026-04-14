"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Failed to create group");
      setLoading(false);
      return;
    }

    const group = await res.json();
    router.push(`/groups/${group.id}`);
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Create a Group</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
        )}

        <input
          name="name"
          type="text"
          placeholder="Group name"
          required
          maxLength={100}
          className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
        />

        <textarea
          name="description"
          placeholder="Description (optional)"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create group"}
        </button>
      </form>
    </div>
  );
}
