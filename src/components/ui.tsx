import Link from "next/link";
import { setLanguageAction } from "@/app/actions";
import { t, type CopyKey, type Lang } from "@/i18n/messages";

export function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-muted">{children}</p>;
}

export function Note({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="rounded-2xl bg-[#f3e1d6] px-4 py-3 text-sm leading-6 text-pitch">{children}</p>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-4xl leading-tight text-pitch">{children}</h1>;
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

export function Ghost({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="flex h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-pitch" href={href}>
      {children}
    </Link>
  );
}

export function Trust({ verified, lang }: { verified: boolean; lang: Lang }) {
  return <span className="text-xs font-medium text-muted">{verified ? t(lang, "verified") : t(lang, "unverified")}</span>;
}

export function Shell({
  lang,
  wide = false,
  children,
}: {
  lang: Lang;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const items: Array<[CopyKey, string]> = [
    ["home", "/"],
    ["find", "/discover"],
    ["post", "/compose"],
    ["alerts", "/notifications"],
    ["you", "/you"],
  ];
  return (
    <div className={`mx-auto min-h-dvh w-full ${wide ? "max-w-3xl" : "max-w-lg"} pb-28`}>
      <header className="sticky top-0 z-10 flex items-center justify-between bg-paper/95 px-5 py-4 backdrop-blur">
        <Link className="font-display text-3xl text-pitch" href="/">
          Notea
        </Link>
        <form action={setLanguageAction} className="flex gap-2 text-sm">
          <button className={lang === "sw" ? "font-semibold text-pitch" : "text-muted"} name="lang" value="sw" type="submit">
            SW
          </button>
          <button className={lang === "en" ? "font-semibold text-pitch" : "text-muted"} name="lang" value="en" type="submit">
            EN
          </button>
        </form>
      </header>
      <main className="grid gap-5 px-5">{children}</main>
      {wide ? null : (
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-lg justify-between border-t border-line bg-paper px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
          {items.map(([key, href]) => (
            <Link key={key} className="px-2 py-2 text-sm font-medium text-pitch" href={href}>
              {t(lang, key)}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-5 py-8">
      <Link className="font-display text-3xl text-pitch" href="/welcome">
        Notea
      </Link>
      {children}
    </div>
  );
}
