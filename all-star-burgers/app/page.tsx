import Image from "next/image";
import Link from "next/link";
import FoodParallax from "@/components/hero/FoodParallax";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { menu } from "@/lib/menu";
import { scenes } from "@/lib/scenes";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main id="top">
        <FoodParallax />

        {/* One card per category, each in its hero scene's colours. */}
        <section id="menu" className="scroll-mt-20 px-[clamp(1rem,5vw,5rem)] py-24">
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Pick a category</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2.75rem,6vw,5rem)] leading-none uppercase">
            Explore the menu
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {menu.map((c) => {
              const s = scenes.find((x) => x.key === c.scene)!;
              const count = c.sections.reduce((n, sec) => n + sec.items.length, 0);
              return (
                <Link
                  key={c.slug}
                  href={`/menu/${c.slug}`}
                  className="group relative flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1.5"
                  style={{ background: s.theme.bg, color: s.theme.ink }}
                >
                  <span>
                    <span className="block text-xs font-semibold tracking-[0.16em] uppercase" style={{ color: s.theme.accent }}>
                      {count} items
                    </span>
                    <span className="mt-2 block font-[family-name:var(--font-display)] text-5xl uppercase">{c.name}</span>
                  </span>
                  <Image
                    src={s.image.src}
                    alt=""
                    sizes="(max-width: 768px) 70vw, 25vw"
                    className="mx-auto my-4 h-40 w-auto drop-shadow-[0_18px_22px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="text-sm font-semibold">
                    See {c.name.toLowerCase()} menu <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
