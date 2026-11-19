import Link from "next/link";
import { TabBar } from "@/components/tab-bar";
import { t, type Lang } from "@/i18n/messages";

export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-muted">{children}</p>;
}

export function Note({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm leading-6 text-warn-ink">{children}</p>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-ink">{children}</h1>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-ink">{children}</h2>;
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
        className="h-12 rounded-2xl border border-line bg-fill px-4 text-base font-normal text-ink outline-none focus:border-[var(--lime)]"
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
        className="min-h-28 rounded-2xl border border-line bg-fill px-4 py-3 text-base font-normal text-ink outline-none focus:border-[var(--lime)]"
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
      <select className="h-12 rounded-2xl border border-line bg-fill px-4 text-base font-normal text-ink" name={name} defaultValue={defaultValue ?? options[0]}>
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
    <button className="h-12 rounded-full bg-[var(--lime)] px-5 text-base font-semibold text-on-lime" type="submit">
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

export function Check({ label, name }: { label: string; name: string }) {
  return (
    <label className="app-check">
      <input name={name} type="checkbox" required />
      <span>{label}</span>
    </label>
  );
}

export function AuthFoot({ children }: { children: React.ReactNode }) {
  return <div className="app-foot">{children}</div>;
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

export function Frame({
  children,
  back,
  corner,
  bg,
}: {
  children: React.ReactNode;
  back?: string;
  corner?: React.ReactNode;
  bg?: string;
}) {
  return (
    <div className="app-stage">
      <div className="app-screen">
        {bg ? <div className="app-auth-bg" style={{ backgroundImage: `url(${bg})` }} /> : null}
        <div className="app-auth">
          <div className="app-auth-top">
            {back ? (
              <Link className="app-auth-back" href={back} aria-label="Back">
                <BackIcon />
              </Link>
            ) : null}
            <Link className="app-mark" href="/welcome">
              Notea
            </Link>
            {corner ? <div className="app-auth-corner">{corner}</div> : null}
          </div>
          <div className="app-auth-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
