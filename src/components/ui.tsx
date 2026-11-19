import Link from "next/link";
import { setLanguageAction } from "@/app/actions";
import { TabBar } from "@/components/tab-bar";
import { t, type Lang } from "@/i18n/messages";

export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-muted">{children}</p>;
}

export function Note({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-[#f3e1d6] px-4 py-3 text-sm leading-6 text-pitch">{children}</p>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-pitch">{children}</h1>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-pitch">{children}</h2>;
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
        className="h-12 rounded-2xl border border-line bg-white px-4 text-base font-normal outline-none focus:border-pitch"
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
        className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 text-base font-normal outline-none focus:border-pitch"
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
      <select className="h-12 rounded-2xl border border-line bg-white px-4 text-base font-normal" name={name} defaultValue={defaultValue ?? options[0]}>
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
    <button className="h-12 rounded-full bg-clay px-5 text-base font-semibold text-white" type="submit">
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
  children,
}: {
  lang: Lang;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="app-stage">
      <div className="app-screen">
        <header className="app-header">
          <Link className="app-mark" href="/">
            Notea
          </Link>
          <form action={setLanguageAction} className="app-lang">
            <button className={lang === "sw" ? "is-on" : ""} name="lang" value="sw" type="submit">
              SW
            </button>
            <button className={lang === "en" ? "is-on" : ""} name="lang" value="en" type="submit">
              EN
            </button>
          </form>
        </header>
        <main className="app-main">{children}</main>
        <TabBar lang={lang} />
      </div>
    </div>
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
