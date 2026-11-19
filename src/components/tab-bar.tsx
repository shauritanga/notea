"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type CopyKey, type Lang } from "@/i18n/messages";

const items: Array<{ key: CopyKey; href: string; icon: IconName; center?: boolean }> = [
  { key: "home", href: "/", icon: "home" },
  { key: "find", href: "/discover", icon: "search" },
  { key: "post", href: "/compose", icon: "plus", center: true },
  { key: "alerts", href: "/notifications", icon: "bell" },
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
          <Link key={item.key} href={item.href} className={active ? "app-tab is-active" : "app-tab"} aria-current={active ? "page" : undefined}>
            <Icon name={item.icon} />
            <span>{t(lang, item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

type IconName = "home" | "search" | "plus" | "bell" | "person";

function Icon({ name }: { name: IconName }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common} strokeWidth={2.2}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
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
