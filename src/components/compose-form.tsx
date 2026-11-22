"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Area, Choice, Note } from "@/components/ui";

type Kind = "text" | "image" | "video";

export function ComposeForm({
  kinds,
  photoLabel,
  videoLabel,
  coverLabel,
  storyLabel,
  categoryLabel,
  regionLabel,
  publishLabel,
  uploadingLabel,
  categories,
  regions,
}: {
  kinds: Record<Kind, string>;
  photoLabel: string;
  videoLabel: string;
  coverLabel: string;
  storyLabel: string;
  categoryLabel: string;
  regionLabel: string;
  publishLabel: string;
  uploadingLabel: string;
  categories: string[];
  regions: string[];
}) {
  const [kind, setKind] = useState<Kind>("image");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file || !file.type.startsWith("video/")) {
      setVideoPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!cover) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || busy.current) return;
    busy.current = true;
    setError("");
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/posts");
    xhr.setRequestHeader("accept", "application/json");
    xhr.upload.onprogress = (upload) => {
      if (upload.lengthComputable) setProgress(Math.min(100, Math.round((upload.loaded / upload.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        window.location.assign("/");
        return;
      }
      busy.current = false;
      setProgress(null);
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string };
        setError(body.error || "Please try again");
      } catch {
        setError("Please try again");
      }
    };
    xhr.onerror = () => {
      busy.current = false;
      setProgress(null);
      setError("Please try again");
    };
    xhr.send(new FormData(form));
  }

  const sending = progress !== null;

  return (
    <form className="app-compose" action="/api/posts" method="post" onSubmit={onSubmit}>
      <Note>{error}</Note>
      <div className="app-lang">
        {(["image", "video", "text"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={kind === item ? "is-on" : ""}
            disabled={sending}
            onClick={() => {
              setKind(item);
              setFile(null);
              setCover(null);
            }}
          >
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
            disabled={sending}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {preview ? <img src={preview} alt="" /> : videoPreview ? <video src={videoPreview} muted playsInline /> : <span>{file ? file.name : kind === "image" ? photoLabel : videoLabel}</span>}
        </label>
      )}
      {kind === "video" ? (
        <label className="app-gallery">
          <input
            name="cover"
            type="file"
            accept="image/*"
            required
            disabled={sending}
            onChange={(event) => setCover(event.target.files?.[0] ?? null)}
          />
          {coverPreview ? <img src={coverPreview} alt="" /> : <span>{cover ? cover.name : coverLabel}</span>}
        </label>
      ) : null}
      <Area label={storyLabel} name="body" />
      <Choice label={categoryLabel} name="category" options={categories} />
      <Choice label={regionLabel} name="region" options={regions} />
      <button className="app-publish" type="submit" disabled={sending} style={{ ["--progress" as string]: `${progress ?? 0}%` }}>
        <span>{sending ? `${uploadingLabel} ${progress}%` : publishLabel}</span>
      </button>
    </form>
  );
}
