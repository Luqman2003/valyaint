"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const body = {
      email: form.get("email"),
      password: form.get("password"),
      displayName: form.get("displayName"),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setErrors(data.error || {});
      setLoading(false);
      return;
    }

    // Auto sign in after register
    await signIn("credentials", {
      email: body.email,
      password: body.password,
      redirect: false,
    });

    router.push("/feed");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">valyaint</h1>
          <p className="mt-2 text-zinc-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.email && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {errors.email[0]}
            </div>
          )}

          <input
            name="displayName"
            type="text"
            placeholder="Display name"
            required
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          />

          <input
            name="password"
            type="password"
            placeholder="Password (min 8 characters)"
            required
            minLength={8}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-white underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
