import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { formatPrice, getCategory, menu, type Tag } from "@/lib/menu";
import { scenes } from "@/lib/scenes";

// All categories are known ahead of time, so every menu page is built
// statically; any other /menu/<slug> is a 404.
export function generateStaticParams() {
  return menu.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/menu/[category]">): Promise<Metadata> {
  const category = getCategory((await params).category);
  if (!category) return {};
  return {
    title: `${category.name} menu · All Star`,
    description: category.intro,
  };
}

const tagStyle: Record<Tag, string> = {
  Popular: "bg-accent text-bg border-transparent",
  New: "border-accent text-accent",
  Spicy: "border-current",
  Veg: "border-current",
  Vegan: "border-current",
};

export default async function MenuPage({ params }: PageProps<"/menu/[category]">) {
  const category = getCategory((await params).category);
  if (!category) notFound();
  const scene = scenes.find((s) => s.key === category.scene)!;
  const itemCount = category.sections.reduce((n, s) => n + s.items.length, 0);
  let delay = 0; // staggers the items' entrance

  return (
    <div
      className="min-h-screen bg-bg text-ink"
      style={
        {
          "--bg": scene.theme.bg,
          "--ink": scene.theme.ink,
          "--accent": scene.theme.accent,
          "--glow": scene.theme.glow,
        } as React.CSSProperties
      }
    >
      <SiteHeader current={category.slug} />

      <main>
        {/* ---- Category header: same photo and colours as its hero scene ---- */}
        <section className="relative overflow-hidden px-[clamp(1rem,5vw,5rem)] pt-28 pb-14 md:pt-32">
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-[family-name:var(--font-display)] text-[clamp(6rem,22vw,22rem)] leading-none whitespace-nowrap text-ink/[0.06] select-none"
          >
            {scene.word}
          </p>

          <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <div className="rise">
              <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
                Menu · {itemCount} items
              </p>
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(3.5rem,9vw,7.5rem)] leading-[0.9] uppercase">
                {category.name}
              </h1>
              <p className="mt-5 max-w-md leading-relaxed opacity-80">{category.intro}</p>

              <nav aria-label="Switch category" className="mt-8 flex flex-wrap gap-2">
                {menu.map((c) => {
                  const active = c.slug === category.slug;
                  return (
                    <Link
                      key={c.slug}
                      href={`/menu/${c.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-bg"
                          : "rounded-full border border-ink/25 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-ink"
                      }
                    >
                      {c.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="rise relative flex justify-center [animation-delay:120ms]">
              <div
                aria-hidden="true"
                className="absolute inset-[-10%] rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent_70%)]"
              />
              <Image
                src={scene.image.src}
                alt={scene.image.alt}
                sizes="(max-width: 768px) 80vw, 40vw"
                loading="eager"
                fetchPriority="high"
                className="relative h-auto max-h-[52vh] w-auto max-w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </section>

        {/* ---- Items ---- */}
        <div className="px-[clamp(1rem,5vw,5rem)] pb-20">
          {category.sections.map((section) => (
            <section key={section.title} className="mt-12 first:mt-0">
              <h2 className="font-[family-name:var(--font-display)] text-3xl uppercase md:text-4xl">{section.title}</h2>
              <ul className="mt-6 grid gap-x-12 md:grid-cols-2">
                {section.items.map((item) => (
                  <li
                    key={item.name}
                    className="rise border-t border-ink/15 py-5"
                    style={{ animationDelay: `${150 + delay++ * 40}ms` }}
                  >
                    <div className="flex items-baseline gap-3">
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <span aria-hidden="true" className="mb-1 flex-1 border-b border-dotted border-ink/30" />
                      <span className="font-semibold text-accent tabular-nums">{formatPrice(item.price)}</span>
                    </div>
                    <p className="mt-1.5 max-w-prose text-sm leading-relaxed opacity-75">{item.description}</p>
                    {item.tags && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
                        {item.tags.map((tag) => (
                          <li
                            key={tag}
                            className={`rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase ${tagStyle[tag]}`}
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* ---- Other categories ---- */}
          <nav aria-label="Other categories" className="mt-20 grid gap-4 sm:grid-cols-2">
            {menu
              .filter((c) => c.slug !== category.slug)
              .map((c) => {
                const s = scenes.find((x) => x.key === c.scene)!;
                return (
                  <Link
                    key={c.slug}
                    href={`/menu/${c.slug}`}
                    className="group flex items-center justify-between gap-4 overflow-hidden rounded-2xl p-6 transition-transform hover:-translate-y-1"
                    style={{ background: s.theme.bg, color: s.theme.ink }}
                  >
                    <span>
                      <span className="block text-xs font-semibold tracking-[0.16em] uppercase" style={{ color: s.theme.accent }}>
                        Next up
                      </span>
                      <span className="mt-1 block font-[family-name:var(--font-display)] text-4xl uppercase">{c.name} →</span>
                    </span>
                    <Image
                      src={s.image.src}
                      alt=""
                      sizes="160px"
                      className="h-24 w-auto transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                );
              })}
          </nav>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
