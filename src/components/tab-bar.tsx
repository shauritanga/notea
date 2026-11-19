"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type CopyKey, type Lang } from "@/i18n/messages";

const items: Array<{ key: CopyKey; href: string; icon: IconName; center?: boolean }> = [
  { key: "home", href: "/", icon: "home" },
  { key: "find", href: "/discover", icon: "calendar" },
  { key: "post", href: "/compose", icon: "video", center: true },
  { key: "alerts", href: "/notifications", icon: "grid" },
  { key: "you", href: "/you", icon: "person" },
];

export function TabBar({ lang }: { lang: Lang }) {
  const path = usePathname();
  return (
    <nav className="app-tabbar" aria-label="Notea">
      {items.map((item) => {
        const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`);
        if (item.center) {
          return (
            <Link key={item.key} href={item.href} className="app-tab-center" aria-label={t(lang, item.key)}>
              <Icon name={item.icon} />
            </Link>
          );
        }
        return (
          <Link key={item.key} href={item.href} className={active ? "app-tab is-active" : "app-tab"} aria-label={t(lang, item.key)} aria-current={active ? "page" : undefined}>
            <Icon name={item.icon} />
          </Link>
        );
      })}
    </nav>
  );
}

type IconName = "home" | "calendar" | "video" | "grid" | "person";

function Icon({ name }: { name: IconName }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3.5v3M16 3.5v3M4 10h16" />
      </svg>
    );
  }
  if (name === "video") {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M8 7.5h6.2a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 15V9A1.5 1.5 0 0 1 8 7.5z" />
        <path d="m16 10.2 3.2-1.8v7.2L16 13.8z" />
      </svg>
    );
  }
  if (name === "grid") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    </svg>
  );
}
