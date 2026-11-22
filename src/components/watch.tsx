"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Action = (formData: FormData) => void | Promise<void>;

export function WatchPost({
  id,
  caption,
  media,
  account,
  state,
  comments,
  commentsOpen,
  labels,
  likeAction,
  saveAction,
  shareAction,
  commentAction,
  followAction,
}: {
  id: string;
  caption: string;
  media: { kind: "video" | "image" | "text"; src: string; poster: string };
  account: { name: string; href: string; avatar: string; initials: string; targetType: string; targetId: string; self: boolean };
  state: { likes: number; liked: boolean; comments: number; saves: number; saved: boolean; shares: number; following: boolean };
  comments: Array<{ id: string; name: string; body: string }>;
  commentsOpen: boolean;
  labels: {
    like: string;
    comment: string;
    save: string;
    share: string;
    follow: string;
    unfollow: string;
    copied: string;
    play: string;
    pause: string;
    progress: string;
    soundOn: string;
    soundOff: string;
  };
  likeAction: Action;
  saveAction: Action;
  shareAction: Action;
  commentAction: Action;
  followAction: Action;
}) {
  const [sheet, setSheet] = useState(commentsOpen ? "comments" : "");
  const [note, setNote] = useState("");
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shareRef = useRef<HTMLFormElement>(null);
  const seeking = useRef(false);
  const back = `/post/${id}`;

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  }

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted) video.volume = 1;
    setMuted(nextMuted);
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (video) video.currentTime = value;
    setCurrent(value);
  }

  async function share() {
    const url = `${window.location.origin}${back}`;
    const nativeShare = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share;
    try {
      if (nativeShare) await nativeShare({ title: account.name, text: caption, url });
      else await navigator.clipboard.writeText(url);
      setNote(labels.copied);
      shareRef.current?.requestSubmit();
    } catch (error) {
      if (nativeShare && error instanceof DOMException && error.name === "AbortError") return;
      setNote(labels.copied);
      shareRef.current?.requestSubmit();
    }
  }

  return (
    <div className="app-tiktok">
      <div className="app-tiktok-media">
        {media.kind === "video" && media.src ? (
          <video
            ref={videoRef}
            src={media.src}
            poster={media.poster || undefined}
            autoPlay
            muted={muted}
            loop
            playsInline
            onClick={togglePlay}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onTimeUpdate={(event) => {
              if (!seeking.current) setCurrent(event.currentTarget.currentTime);
            }}
          />
        ) : media.kind === "image" && media.src ? (
          <img src={media.src} alt="" />
        ) : (
          <div className="app-pitch" data-tone={tone(id)}>
            <p>{caption}</p>
          </div>
        )}
        {paused ? <span className="app-tiktok-pause">❚❚</span> : null}
        {media.kind === "video" && media.src ? (
          <div className="app-tiktok-controls">
            <button type="button" onClick={togglePlay} aria-label={paused ? labels.play : labels.pause}>
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <span>{clock(current)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(current, duration || 0)}
              aria-label={labels.progress}
              onPointerDown={() => {
                seeking.current = true;
              }}
              onPointerUp={() => {
                seeking.current = false;
              }}
              onChange={(event) => seek(Number(event.target.value))}
            />
            <span>{clock(duration)}</span>
            <button type="button" onClick={toggleSound} aria-label={muted ? labels.soundOn : labels.soundOff}>
              {muted ? <MutedIcon /> : <SoundIcon />}
            </button>
          </div>
        ) : null}
      </div>
      <Link className="app-tiktok-back" href="/" aria-label="Close">‹</Link>
      <div className="app-tiktok-rail">
        <div className="app-tiktok-face">
          <Link href={account.href} aria-label={account.name}>
            {account.avatar ? <img src={account.avatar} alt="" /> : <b>{account.initials}</b>}
          </Link>
          {account.self || !account.targetId ? null : (
            <form action={followAction}>
              <input type="hidden" name="targetType" value={account.targetType} />
              <input type="hidden" name="targetId" value={account.targetId} />
              <input type="hidden" name="back" value={back} />
              <button type="submit" aria-label={state.following ? labels.unfollow : labels.follow}>{state.following ? "✓" : "+"}</button>
            </form>
          )}
        </div>
        <CountForm action={likeAction} id={id} label={labels.like} count={state.likes} on={state.liked}>
          <Heart filled={state.liked} />
        </CountForm>
        <button type="button" onClick={() => setSheet("comments")} aria-label={labels.comment}>
          <CommentIcon />
          <span>{state.comments}</span>
        </button>
        <CountForm action={saveAction} id={id} label={labels.save} count={state.saves} on={state.saved} tone="saved">
          <Bookmark filled={state.saved} />
        </CountForm>
        <button type="button" onClick={() => void share()} aria-label={labels.share}>
          <ShareIcon />
          <span>{state.shares}</span>
        </button>
        <form ref={shareRef} action={shareAction} hidden>
          <input type="hidden" name="postId" value={id} />
          <input type="hidden" name="back" value={back} />
        </form>
      </div>
      <div className="app-tiktok-copy">
        <Link href={account.href}>@{account.name}</Link>
        {caption && media.kind !== "text" ? <p>{caption}</p> : null}
        {note ? <small>{note}</small> : null}
      </div>
      {sheet === "comments" ? (
        <div className="app-tiktok-sheet">
          <div className="app-tiktok-sheet-head">
            <strong>{state.comments} {labels.comment}</strong>
            <button type="button" onClick={() => setSheet("")} aria-label="Close">×</button>
          </div>
          <div className="app-tiktok-thread">
            {comments.map((comment) => (
              <p key={comment.id}>
                <b>{initials(comment.name || "N")}</b>
                <span><strong>{comment.name}</strong> {comment.body}</span>
              </p>
            ))}
          </div>
          <form action={commentAction}>
            <input type="hidden" name="postId" value={id} />
            <input type="hidden" name="back" value={`${back}?comments=1`} />
            <input name="body" placeholder={labels.comment} required />
            <button type="submit" aria-label={labels.comment}>
              <SendIcon />
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function CountForm({
  action,
  id,
  label,
  count,
  on,
  tone,
  children,
}: {
  action: Action;
  id: string;
  label: string;
  count: number;
  on: boolean;
  tone?: "liked" | "saved";
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="postId" value={id} />
      <input type="hidden" name="back" value={`/post/${id}`} />
      <button type="submit" className={on ? (tone === "saved" ? "is-saved" : "is-on") : ""} aria-label={label}>
        {children}
        <span>{count}</span>
      </button>
    </form>
  );
}

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M7 5h3.2v14H7zm6.8 0H17v14h-3.2z" />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M4 9h3.2L12 5.2v13.6L7.2 15H4z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M15.5 9.5a3.2 3.2 0 0 1 0 5M17.8 7.2a6.2 6.2 0 0 1 0 9.6" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M4 9h3.2L12 5.2v13.6L7.2 15H4z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M16 10l4 4m0-4-4 4" />
    </svg>
  );
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function tone(id: string) {
  return String([...id].reduce((total, char) => total + char.charCodeAt(0), 0) % 4);
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
    </svg>
  );
}

function Bookmark({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M6 5.5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4.2 3.2A.8.8 0 0 1 5.5 19v-2.5H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 4v10M8 8l4-4 4 4M6 14v4.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V14" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M4 12 20 4l-6 16-2.2-6.2z" />
    </svg>
  );
}
