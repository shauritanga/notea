import Link from "next/link";
import { TabBar } from "@/components/tab-bar";
import { t, type Lang } from "@/i18n/messages";

export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-muted">{children}</p>;
}

export function Note({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-[#2a2218] px-4 py-3 text-sm leading-6 text-[#f3d7a1]">{children}</p>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-white">{children}</h1>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-white">{children}</h2>;
}

export function Stack({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}

export function Card({ children }: { children: React.ReactNode }) {
  return <article className="grid gap-3 rounded-3xl border border-line bg-card px-4 py-4">{children}</article>;
}

export function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue = "",
  placeholder = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-12 rounded-2xl border border-line bg-[#171c18] px-4 text-base font-normal text-white outline-none focus:border-[var(--lime)]"
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}

export function Area({ label, name, required = false, defaultValue = "" }: { label: string; name: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <textarea
        className="min-h-28 rounded-2xl border border-line bg-[#171c18] px-4 py-3 text-base font-normal text-white outline-none focus:border-[var(--lime)]"
        name={name}
        required={required}
        defaultValue={defaultValue}
      />
    </label>
  );
}

export function Choice({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select className="h-12 rounded-2xl border border-line bg-[#171c18] px-4 text-base font-normal text-white" name={name} defaultValue={defaultValue ?? options[0]}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-12 rounded-full bg-[var(--lime)] px-5 text-base font-semibold text-[#111]" type="submit">
      {children}
    </button>
  );
}

export function Ghost({ href, children, solid = false }: { href: string; children: React.ReactNode; solid?: boolean }) {
  return (
    <Link className={solid ? "app-solid" : "app-ghost"} href={href}>
      {children}
    </Link>
  );
}

export function Trust({ verified, lang }: { verified: boolean; lang: Lang }) {
  return <span className="text-xs font-medium text-muted">{verified ? t(lang, "verified") : t(lang, "unverified")}</span>;
}

export function Shell({
  lang,
  name,
  children,
}: {
  lang: Lang;
  name?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const initials = (name || "N")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  return (
    <div className="app-stage">
      <div className="app-screen">
        <header className="app-header">
          {name ? (
            <Link className="app-hello" href="/you">
              <span className="app-avatar" aria-hidden>
                {initials}
              </span>
              <span>
                <small>{t(lang, "hi")}</small>
                <strong>{name}</strong>
              </span>
            </Link>
          ) : (
            <Link className="app-mark" href="/">
              Notea
            </Link>
          )}
          <div className="app-tools">
            <Link href="/discover" aria-label={t(lang, "search")}>
              <SearchIcon />
            </Link>
            <Link href="/notifications" aria-label={t(lang, "alerts")}>
              <BellIcon />
            </Link>
          </div>
        </header>
        <main className="app-main">{children}</main>
        <TabBar lang={lang} />
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function Frame({ children, splash = false }: { children: React.ReactNode; splash?: boolean }) {
  return (
    <div className="app-stage">
      <div className="app-screen">
        {splash ? <div className="app-splash">{children}</div> : <div className="app-auth"><Link className="app-mark" href="/welcome">Notea</Link>{children}</div>}
      </div>
    </div>
  );
}
