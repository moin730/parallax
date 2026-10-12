# Plan: Food Parallax Landing Page

## The idea

The homepage is one pinned hero section that you scroll through. Each food takes a
turn in the center of the screen, and the whole page theme changes with it.

| Scroll  | Center of screen                         | Theme                                              |
|---------|------------------------------------------|----------------------------------------------------|
| 0%      | **Pizza** (top-down, rotates with scroll) | Warm red and cream; basil, tomato, flour floating   |
| ~33%    | Pizza slides left, **Burger** comes in    | Amber and charcoal; sesame seeds, lettuce, onion    |
| ~66%    | Burger slides left, **Drink** comes in    | Cool tones; ice cubes, citrus slices, bubbles       |
| 100%    | Pin releases                              | Normal page continues (menu, about, contact)        |

Scroll position drives everything. Scrolling up plays it backward exactly.
Realism comes from real photographs, not illustrations.

## Stack

| Piece            | Choice                                   | Version (checked 2026-10-13) |
|------------------|------------------------------------------|------------------------------|
| Framework        | Next.js, App Router, TypeScript          | next 16.4.0, react 19.3.0    |
| Animation        | GSAP + ScrollTrigger, `useGSAP` hook      | gsap 3.15.0, @gsap/react 2.1.2 |
| Smooth scrolling | Lenis, synced to ScrollTrigger            | lenis 1.3.26                 |
| Styling          | Tailwind for layout; CSS variables for the per-food theme (GSAP blends them) | latest from create-next-app |
| Images           | `next/image`, WebP with alpha             | sharp 0.35.5 (Next uses it)  |
| Asset pipeline   | Python 3.12 venv: `rembg` + Pillow (not shipped with the site) | latest |

Node 25.6 is installed; Next 16 needs >= 20.9, so we're fine.

## Project layout

The current vanilla files move to `legacy/` for reference (they stay in git
history too) and the Next app is created in this folder.

```
all-star-burgers/
├── app/
│   ├── layout.tsx            fonts, metadata, <SmoothScroll>
│   ├── page.tsx              hero + the normal sections
│   └── globals.css           theme variables, base styles
├── components/
│   ├── SmoothScroll.tsx      Lenis + ScrollTrigger sync (client)
│   ├── hero/
│   │   ├── FoodParallax.tsx  pinned stage + the master timeline (client)
│   │   ├── FoodItem.tsx      one cut-out food image
│   │   ├── Particles.tsx     floating depth layers (basil, ice, seeds…)
│   │   └── HeroCopy.tsx      headline/CTA per food, crossfaded
│   └── sections/             Menu, Combos, About, Contact, Footer
├── lib/
│   └── scenes.ts             data per food: image, colors, copy, particles
├── public/images/
│   ├── foods/                pizza.webp, burger.webp, drink.webp
│   └── particles/            basil-01.webp, ice-01.webp, …
├── tools/assets/
│   ├── raw/                  original downloads (git-ignored if large)
│   ├── process.py            cut out → trim → WebP → manifest
│   └── manifest.json         path, source URL, author, license, size
├── ASSETS.md                 human-readable credits and licenses
└── legacy/                   old index.html / style.css / script.js
```

Adding a fourth food later should only mean adding one entry to `lib/scenes.ts`
and its images.

## How the animation works

- **One timeline, one pin.** The hero is pinned for about 300% of the viewport
  height. A single GSAP timeline with `scrub` has a label per food.
- **Food handoff.** The outgoing food moves left, shrinks and fades. The incoming
  food arrives from the right and grows to full size. The overlap keeps it moving
  continuously.
- **Rotation only where it's believable.** The pizza is shot from directly above,
  so it can spin. The burger and drink only tilt slightly; a large rotation would
  give away that they're flat photos.
- **Theme blend.** Background, text and accent colors are CSS variables on the
  stage. GSAP tweens them between foods, so the change is gradual.
- **Parallax depth.** Each particle has a depth value. Far particles are small,
  slow and slightly faded; near ones are larger and faster, with a light blur.
  That depth is what makes it parallax instead of a slideshow.
- **Shadows.** A separate soft contact shadow sits under each food and moves
  with it, so the food looks grounded rather than pasted on.
- **Performance.** Only transforms and opacity are animated. No React state
  changes while scrolling. Hero images load with `priority`, and the timeline is
  built after they load.
- **Resize and mobile.** Distances are functions of the viewport, and
  `invalidateOnRefresh` recalculates them. Mobile gets shorter moves and fewer
  particles.
- **Reduced motion.** `gsap.matchMedia`: no pin and no parallax. The three foods
  appear as simple static panels.

## Phases

Each phase ends with something you can look at. ✋ marks a stop for your review.

### Phase 0: Setup
1. Move the old files to `legacy/`.
2. Scaffold Next 16 (TypeScript, App Router, Tailwind, ESLint).
3. Install gsap, @gsap/react and lenis. Add the SmoothScroll provider.
4. Create the Python venv in `tools/assets/.venv` with rembg and Pillow.

### Phase 1: Real photos ✋
1. Search Unsplash and Pexels (both free for commercial use) for:
   - pizza from directly above, whole, on a plain background
   - burger from the side at eye level, tall and clean
   - a drink in a glass with condensation and ice
   - particles: basil leaves, cherry tomatoes, sesame seeds, lettuce, ice cubes, lemon slices
2. Pick photos with similar lighting (soft, from the upper left) and color warmth.
3. Run `process.py`: remove the background, clean the edges, trim, export WebP,
   and write `manifest.json` and `ASSETS.md`.
4. Make a contact sheet of every cutout on light and dark backgrounds.
   **You approve or reject each one before any animation is built.**

### Phase 2: Hero animation
1. Build `FoodParallax` with the real images: pin, timeline, food handoff.
2. Add the theme color blending and the headline/CTA per food.
3. Add particles and shadows.
4. Tune timing and distances in the browser at desktop size.

### Phase 3: Mobile, reduced motion, polish ✋
1. Mobile distances and particle count; test at 390px wide.
2. Reduced-motion fallback.
3. Preloading and checking for layout shift; make sure reverse scrolling
   returns everything exactly to its start.
4. Record a short screen capture of the scroll for your review.

### Phase 4: The rest of the site
Navigation, menu by category (pizza, burgers, drinks) with prices, combos,
about, customer favorites, contact and footer. Subtle reveal-on-scroll animations
only, so the hero stays the main attraction. Add a front-end cart only if you
want one (no real payments).

### Phase 5: Final browser test
Desktop and mobile layouts, console errors, failed image requests, reverse
scrolling and reduced motion. Fix whatever turns up.

### Later (optional)
- **Exploding burger:** when the burger reaches the center, it splits into
  layers and closes again before moving on. This needs a floating-ingredients
  photo (see the earlier discussion). We can add it once the main flow looks good.

## Decisions still open

| Question                      | Default if you don't answer               |
|-------------------------------|-------------------------------------------|
| Brand name                    | Keep "All Star Burgers" as a placeholder  |
| Foods                         | Pizza, burger, drink                      |
| Exploding burger              | Later, as an optional extra               |
| Cart                          | Front-end only, clearly not real checkout |

## Known risks

- **Matching photos.** Finding three free photos with matching lighting is the
  hardest part. If they don't match well, I'll show you the options rather than
  ship something that looks pasted together.
- **Cutout quality.** rembg handles solid foods well. Melted cheese strings,
  steam and glass edges are harder; a drink's glass may need manual cleanup or a
  photo already shot on a plain background.
- **Smooth scrolling on phones.** Lenis is turned off for touch by default,
  which is right; mobile uses the phone's own scrolling.
