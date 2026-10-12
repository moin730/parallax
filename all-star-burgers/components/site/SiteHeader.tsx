import Link from "next/link";
import { menu } from "@/lib/menu";

// Colours come from the theme variables, so the header follows the hero's
// blend on the home page and the category theme on menu pages.
export default function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-[clamp(1rem,5vw,5rem)] py-5 text-ink">
      <Link href="/" className="font-[family-name:var(--font-display)] text-xl tracking-wide uppercase">
        All Star
      </Link>
      <nav aria-label="Menu categories" className="flex items-center gap-6 text-sm font-medium">
        {menu.map((c) => (
          <Link
            key={c.slug}
            href={`/menu/${c.slug}`}
            aria-current={current === c.slug ? "page" : undefined}
            className="hidden opacity-75 transition-opacity hover:opacity-100 aria-[current=page]:opacity-100 aria-[current=page]:underline aria-[current=page]:underline-offset-4 sm:inline"
          >
            {c.name}
          </Link>
        ))}
        <Link href="/#menu" className="rounded-full border border-current px-4 py-2 transition-colors hover:bg-ink hover:text-bg">
          Menu
        </Link>
      </nav>
    </header>
  );
}
