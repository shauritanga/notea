"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function SnapReel({
  start,
  count,
  locked = false,
  label,
  hrefs,
  children,
}: {
  start: number;
  count: number;
  locked?: boolean;
  label: string;
  hrefs?: string[];
  children: (active: number) => React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const [active, setActive] = useState(start);
  const [ready, setReady] = useState(false);

  function place(node: HTMLDivElement | null) {
    if (!node) return;
    const slide = node.children[start] as HTMLElement | undefined;
    if (slide) node.scrollTop = slide.offsetTop;
  }

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const slide = scroller.children[start] as HTMLElement | undefined;
    if (slide) scroller.scrollTop = slide.offsetTop;
    readyRef.current = true;
    setReady(true);
  }, [start]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!readyRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible || visible.intersectionRatio < 0.6) return;
        const index = Number((visible.target as HTMLElement).dataset.index);
        if (Number.isFinite(index)) setActive(index);
      },
      { root: scroller, threshold: [0.6, 0.85] },
    );
    for (const child of scroller.children) observer.observe(child);
    return () => observer.disconnect();
  }, [count, start]);

  useEffect(() => {
    if (!ready) return;
    const path = hrefs?.[active];
    if (!path || window.location.pathname === path) return;
    window.history.replaceState(null, "", path);
  }, [active, hrefs, ready]);

  return (
    <div
      ref={(node) => {
        scrollerRef.current = node;
        if (!readyRef.current) place(node);
      }}
      className="app-reel"
      data-ready={ready ? "1" : "0"}
      aria-label={label}
      style={locked ? { overflow: "hidden" } : undefined}
    >
      {children(active)}
    </div>
  );
}
