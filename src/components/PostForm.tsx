"use client";

import { useState, useRef } from "react";

interface PostFormProps {
  groupId?: string;
  groups?: { id: string; name: string }[];
  onPost?: () => void;
}

export default function PostForm({ groupId, groups, onPost }: PostFormProps) {
  const [content, setContent] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(groupId || "");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 4 - photoFiles.length);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));

    setPhotoFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(previews[index]);
    setPhotoFiles((prev) => prev.filter((_, j) => j !== index));
    setPreviews((prev) => prev.filter((_, j) => j !== index));
  }

  async function uploadFile(file: File): Promise<string | null> {
    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!presignRes.ok) return null;
      const { presignedUrl, publicUrl } = await presignRes.json();

      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      return uploadRes.ok ? publicUrl : null;
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroup || (!content.trim() && photoFiles.length === 0)) return;

    setPosting(true);

    // Upload photos now
    const photoUrls: string[] = [];
    for (const file of photoFiles) {
      const url = await uploadFile(file);
      if (url) photoUrls.push(url);
    }

    const res = await fetch(`/api/groups/${selectedGroup}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.trim() || undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      }),
    });

    if (res.ok) {
      setContent("");
      previews.forEach((p) => URL.revokeObjectURL(p));
      setPhotoFiles([]);
      setPreviews([]);
      onPost?.();
    }
    setPosting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-zinc-800 p-4 space-y-3">
      {!groupId && groups && (
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white ring-1 ring-zinc-800"
        >
          <option value="">Select group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        maxLength={5000}
        className="w-full resize-none rounded-xl bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
      />

      {previews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {previews.map((url, i) => (
            <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden bg-zinc-800">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={posting || photoFiles.length >= 4}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            Photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhoto}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={posting || (!content.trim() && photoFiles.length === 0) || !selectedGroup}
          className="rounded-xl bg-white px-5 py-1.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
