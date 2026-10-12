"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { menu } from "@/lib/menu";
import { scenes } from "@/lib/scenes";
import styles from "./FoodParallax.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Timeline units per food: it holds still for HOLD, then hands over to the
// next food during MOVE. Scroll distance is proportional to the total.
const HOLD = 0.4;
const MOVE = 0.6;
const SCROLL_PER_UNIT = 1.15; // viewport heights of scrolling per timeline unit

export default function FoodParallax() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const n = scenes.length;
        const html = document.documentElement;
        const vw = () => window.innerWidth;
        const vh = () => window.innerHeight;
        const sel = (i: number, part: string) =>
          root.current!.querySelectorAll<HTMLElement>(`[data-scene="${i}"] [data-part="${part}"]`);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${vh() * (n - 1 + HOLD * 2) * SCROLL_PER_UNIT}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        // Timeline window during which scene i is (at least partly) on screen.
        const enterAt = (i: number) => (i === 0 ? 0 : (i - 1) + HOLD);
        const leaveEnd = (i: number) => (i === n - 1 ? n - 1 + HOLD * 2 : i + HOLD + MOVE);

        scenes.forEach((scene, i) => {
          const food = sel(i, "food");
          const spin = sel(i, "spin");
          const copy = sel(i, "copy");
          const word = sel(i, "word");
          const particles = sel(i, "particle");
          const visible = leaveEnd(i) - enterAt(i);

          // --- Continuous motion while on screen ------------------------
          // The pizza turns; standing foods only sway a few degrees.
          tl.fromTo(spin, { rotation: -scene.spin / 2 }, { rotation: scene.spin / 2, duration: visible }, enterAt(i));

          // Particles drift upward at a speed set by their depth: near
          // ones move further than far ones, which is what reads as depth.
          particles.forEach((p) => {
            const depth = Number(p.dataset.depth);
            tl.fromTo(
              p,
              { y: () => vh() * (0.15 + depth * 0.35) },
              { y: () => -vh() * (0.15 + depth * 0.35), rotation: `+=${(depth - 0.5) * 60}`, duration: visible },
              enterAt(i),
            );
          });

          // --- Entering (every food after the first) -------------------
          if (i > 0) {
            const at = enterAt(i);
            tl.fromTo(food, { x: () => vw() * 0.6, scale: 0.6, autoAlpha: 0 }, { x: 0, scale: 1, autoAlpha: 1, duration: MOVE * 0.8, ease: "power2.out" }, at + MOVE * 0.2);
            tl.fromTo(word, { x: () => vw() * 0.25, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: MOVE, ease: "power1.out" }, at);
            tl.fromTo(copy, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: MOVE * 0.5, ease: "power2.out" }, at + MOVE * 0.5);
            tl.fromTo(particles, { autoAlpha: 0 }, { autoAlpha: 1, duration: MOVE * 0.6 }, at + MOVE * 0.2);
            tl.to(html, { "--bg": scene.theme.bg, "--ink": scene.theme.ink, "--accent": scene.theme.accent, "--glow": scene.theme.glow, duration: MOVE, ease: "power1.inOut" }, at);
          }

          // --- Leaving (every food but the last) -----------------------
          // It slides off to the left and shrinks, as if moving away.
          if (i < n - 1) {
            const at = i + HOLD;
            tl.to(food, { x: () => -vw() * 0.62, scale: 0.45, duration: MOVE * 0.75, ease: "power2.in" }, at);
            tl.to(food, { autoAlpha: 0, duration: MOVE * 0.3 }, at + MOVE * 0.45);
            tl.to(word, { x: () => -vw() * 0.25, autoAlpha: 0, duration: MOVE, ease: "power1.in" }, at);
            tl.to(copy, { y: -30, autoAlpha: 0, duration: MOVE * 0.4, ease: "power2.in" }, at);
            tl.to(particles, { autoAlpha: 0, duration: MOVE * 0.5 }, at + MOVE * 0.3);
          }
        });

        tl.fromTo(`.${styles.progressBar}`, { scaleX: 0 }, { scaleX: 1, duration: n - 1 + HOLD * 2 }, 0);
        tl.to(`.${styles.hint}`, { autoAlpha: 0, duration: 0.15 }, 0);

        return () => {
          // Put the starting theme back so a reverted timeline (resize to
          // reduced motion, hot reload) doesn't leave the page mid-blend.
          gsap.set(html, { clearProps: "--bg,--ink,--accent,--glow" });
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.stage} aria-label="Our menu highlights">
      <div className={styles.glow} aria-hidden="true" />

      {scenes.map((scene, i) => (
        <div
          key={scene.key}
          data-scene={i}
          className={styles.scene}
          style={
            {
              "--scene-bg": scene.theme.bg,
              "--scene-ink": scene.theme.ink,
              "--scene-accent": scene.theme.accent,
              "--scene-glow": scene.theme.glow,
            } as React.CSSProperties
          }
        >
          <p data-part="word" className={styles.word} aria-hidden="true">
            {scene.word}
          </p>

          {scene.particles.map((p, j) => (
            // The slot positions and centres the piece with CSS; GSAP only
            // ever animates the inner element, so the centring can't be
            // baked into pixel values that go stale on resize.
            <div
              key={j}
              className={p.y > 55 ? `${styles.particleSlot} ${styles.particleLow}` : styles.particleSlot}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `calc(${p.w}px * var(--particle-scale))`,
                rotate: `${p.r}deg`,
                zIndex: p.depth > 0.6 ? 4 : 1,
              }}
              aria-hidden="true"
            >
              <div data-part="particle" data-depth={p.depth}>
                {/* Depth cues live on the image, because GSAP owns the
                    wrapper's opacity for the fade in/out. Far = fainter and
                    softer, near = slightly out of focus, like a shallow lens. */}
                <Image
                  src={p.src}
                  alt=""
                  sizes={`${p.w}px`}
                  loading="eager"
                  style={{
                    height: "auto",
                    opacity: 0.6 + p.depth * 0.4,
                    filter: p.depth > 0.75 ? `blur(${((p.depth - 0.75) * 12).toFixed(1)}px)` : p.depth < 0.2 ? "blur(0.6px)" : undefined,
                  }}
                />
              </div>
            </div>
          ))}

          <div className={styles.foodSlot} style={{ "--size": scene.size, "--aspect": scene.image.src.width / scene.image.src.height } as React.CSSProperties}>
            <div data-part="food" className={styles.food}>
              <div className={scene.shadow === "disc" ? styles.shadowDisc : styles.shadowFloor} aria-hidden="true" />
              <div data-part="spin" className={styles.spin}>
                <Image
                  src={scene.image.src}
                  alt={scene.image.alt}
                  sizes="(max-width: 768px) 80vw, 60vh"
                  fetchPriority={i === 0 ? "high" : "auto"}
                  loading="eager"
                  className={styles.foodImg}
                  style={{ width: "auto" }}
                />
              </div>
            </div>
          </div>

          <div data-part="copy" className={styles.copy}>
            <p className={styles.eyebrow}>{scene.eyebrow}</p>
            {i === 0 ? <h1 className={styles.title}>{scene.title}</h1> : <h2 className={styles.title}>{scene.title}</h2>}
            <p className={styles.blurb}>{scene.blurb}</p>
            <div className={styles.actions}>
              <Link href={`/menu/${menu.find((c) => c.scene === scene.key)?.slug ?? ""}`} className={styles.cta}>
                {scene.cta}
              </Link>
              <span className={styles.price}>from {scene.price}</span>
            </div>
          </div>
        </div>
      ))}

      <p className={styles.hint} aria-hidden="true">
        Scroll to explore ↓
      </p>
      <div className={styles.progress} aria-hidden="true">
        <div className={styles.progressBar} />
      </div>
    </section>
  );
}
