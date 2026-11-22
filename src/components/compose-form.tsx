"use client";

import { useEffect, useState } from "react";
import { Area, Choice, Submit } from "@/components/ui";

type Kind = "text" | "image" | "video";

export function ComposeForm({
  action,
  kinds,
  photoLabel,
  videoLabel,
  storyLabel,
  categoryLabel,
  regionLabel,
  publishLabel,
  categories,
  regions,
}: {
  action: (formData: FormData) => void | Promise<void>;
  kinds: Record<Kind, string>;
  photoLabel: string;
  videoLabel: string;
  storyLabel: string;
  categoryLabel: string;
  regionLabel: string;
  publishLabel: string;
  categories: string[];
  regions: string[];
}) {
  const [kind, setKind] = useState<Kind>("image");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <form className="app-compose" action={action}>
      <div className="app-lang">
        {(["image", "video", "text"] as const).map((item) => (
          <button key={item} type="button" className={kind === item ? "is-on" : ""} onClick={() => { setKind(item); setFile(null); }}>
            {kinds[item]}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />
      {kind === "text" ? null : (
        <label className="app-gallery">
          <input
            key={kind}
            name="file"
            type="file"
            accept={kind === "image" ? "image/*" : "video/*"}
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {preview ? <img src={preview} alt="" /> : <span>{file ? file.name : kind === "image" ? photoLabel : videoLabel}</span>}
        </label>
      )}
      <Area label={storyLabel} name="body" />
      <Choice label={categoryLabel} name="category" options={categories} />
      <Choice label={regionLabel} name="region" options={regions} />
      <Submit>{publishLabel}</Submit>
    </form>
  );
}
