/* =================================================================
   script.js: the scroll animation, built with GSAP + ScrollTrigger.

   KEY IDEAS FOR BEGINNERS
   - gsap.to(target, { ... })  animates elements TO new values.
   - A "timeline" is a list of animations placed at points in time.
   - ScrollTrigger with "scrub" links the timeline to the scrollbar:
     scroll down = the timeline plays forward,
     scroll up   = it plays BACKWARDS. Reversing comes for free.
   - "pin" holds the section in place while the timeline plays.
   ================================================================= */


// If GSAP didn't load (e.g. you're offline), stop here. The page still
// shows the hero, burger, fries and drink, just without animation.
if (window.gsap && window.ScrollTrigger) {

  gsap.registerPlugin(ScrollTrigger);

  // Stop phones from re-calculating everything when the address bar
  // slides in/out (that would make the animation jump).
  ScrollTrigger.config({ ignoreMobileResize: true });

  // gsap.matchMedia() runs code only when a media query matches.
  // If the visitor has "reduce motion" turned on, the animated version
  // never runs and they get a calm, static page instead.
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {

    // ---------------------------------------------------------------
    // 1. GRAB THE ELEMENTS
    // gsap.utils.toArray turns a CSS selector into a list of elements.
    // ---------------------------------------------------------------
    const layers = gsap.utils.toArray('.layer');
    const labels = gsap.utils.toArray('.label');

    // How far apart the layers spread. Written as a FUNCTION so it is
    // re-measured if the screen size changes (see invalidateOnRefresh).
    const gap = () => Math.min(window.innerHeight * 0.065, window.innerWidth * 0.14);

    // -----------------------------------------------------------------
    // fit(): keeps the burger from overlapping "The Stack" heading.
    // It measures the free space between the bottom of the heading and
    // the bottom of the screen, then works out how much to SHRINK the
    // burger (scale) and how far to MOVE it down (y) so it sits in the
    // middle of that space.
    //   spread   = extra height added by the exploded gaps (0 = closed)
    //   maxScale = the largest size we're happy with (1 = normal size)
    // We only use layout sizes (offsetTop / offsetHeight), which ignore
    // animations, so the answer is the same at any scroll position.
    // -----------------------------------------------------------------
    const stage = document.querySelector('.stage');
    const burger = document.querySelector('.burger');
    const stackTitle = document.querySelector('.stack-title');

    function fit(spread, maxScale) {
      const margin = 20;                                    // breathing room in px
      const stageH = stage.offsetHeight;
      const burgerH = burger.offsetHeight;

      // The free space: from just under the heading to just above the bottom
      const top = stackTitle.offsetTop + stackTitle.offsetHeight + margin;
      const bottom = stageH - margin;

      // Shrink if the (exploded) burger is taller than the space, never below 40%
      const scale = Math.max(0.4, Math.min(maxScale, (bottom - top) / (burgerH + spread)));

      // Where the burger's centre is now. The .scene is placed at 50% and
      // pulled up by 45% of its height in style.css, so its centre ends
      // up 5% of its height below the middle of the stage.
      const currentCentre = stageH / 2 + burgerH * 0.05;
      const targetCentre = (top + bottom) / 2;

      return { scale: scale, y: targetCentre - currentCentre };
    }
    const exploded = () => fit(5 * gap(), 0.85);  // 5 gaps between 6 layers
    const closed = () => fit(0, 1);

    // Starting state for the labels: invisible and nudged sideways
    // (right-hand labels start a bit to the left, and vice versa).
    gsap.set(labels, {
      autoAlpha: 0,   // autoAlpha = opacity + visibility together
      x: (i, el) => (el.classList.contains('right') ? -20 : 20),
    });


    // ---------------------------------------------------------------
    // 2. THE MASTER TIMELINE (linked to scrolling)
    // ---------------------------------------------------------------
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '.stage',
        start: 'top top',       // begin when the stage's top hits the screen top
        end: '+=300%',          // last for 3 screen-heights of scrolling
        pin: true,              // hold the stage in place meanwhile
        scrub: 1,               // follow the scrollbar (1s of smoothing)
        anticipatePin: 1,       // avoids a tiny jump when pinning starts
        invalidateOnRefresh: true, // re-run the function values (gap) on resize
      },
    });

    // Numbers after each animation (0, 0.5, 1.2...) are its START TIME
    // on the timeline. That's how we choreograph the different "acts".

    // ----- ACT 1: the burger explodes (time 0 → 1.2) -----
    tl.to('.hero-copy', { autoAlpha: 0, y: -50, duration: 0.5 }, 0)
      .to('.hero-cta',  { autoAlpha: 0, y: 50, duration: 0.5 }, 0)
      // shrink and move the burger so the spread-out layers fit below the
      // heading (the numbers come from fit(), above)
      .to('.burger', { scale: () => exploded().scale, y: () => exploded().y, duration: 1 }, 0)
      // the shadow would float in mid-air between the layers, so hide it
      .to('.burger-shadow', { autoAlpha: 0, duration: 0.4 }, 0)
      // Move each layer up or down from the middle. i is the layer's
      // position (0 = top bun ... 5 = bottom bun); 2.5 is the centre,
      // so the top layers go up (negative y) and the bottom ones go down.
      .to(layers, { y: (i) => (i - 2.5) * gap(), duration: 1.2 }, 0)
      // labels fade in one after another ("stagger")
      .to(labels, { autoAlpha: 0.9, x: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' }, 0.6);

    // ----- ACT 2: dark → light, "The Stack" appears (time 1.4 → 2.4) -----
    // GSAP can animate CSS variables. Everything using --bg / --ink
    // (stage, nav, labels, headings) changes colour together.
    tl.to(document.documentElement, { '--bg': '#fff3dc', '--ink': '#1b120d', duration: 1, ease: 'none' }, 1.4)
      .fromTo('.stack-title',
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 1.7);

    // ----- ACT 3: rebuild + fries & drink slide in (time 2.6 → 3.8) -----
    tl.to(labels, { autoAlpha: 0, duration: 0.3, stagger: 0.04 }, 2.6)
      .to(layers, { y: 0, duration: 1.1, ease: 'power3.inOut' }, 2.7)
      // The heading is still showing, so the closed burger is also fitted below it
      .to('.burger', { scale: () => closed().scale, y: () => closed().y, duration: 1.1 }, 2.7)
      // bring the shadow back just as the layers land on each other
      .to('.burger-shadow', { autoAlpha: 1, duration: 0.4 }, 3.4)

      // PARALLAX: the drink starts much farther away than the fries but
      // arrives at the same moment, so it races in faster. Objects moving
      // at different speeds feel like they're at different depths.
      .fromTo('.fries',
        { x: () => -window.innerWidth * 0.7, rotation: -25 },
        { x: 0, rotation: -6, duration: 1.1, ease: 'power2.out' }, 2.7)
      .fromTo('.drink',
        { x: () => window.innerWidth * 1.3, rotation: 20 },
        { x: 0, rotation: 5, duration: 1.1, ease: 'power3.out' }, 2.7)

      // a short pause at the end so the finished scene can be admired
      .to({}, { duration: 0.4 });


    // ---------------------------------------------------------------
    // 3. MENU CARDS: pop up as they scroll into view
    // toggleActions: "onEnter onLeave onEnterBack onLeaveBack".
    // "reverse" on the last one hides them again when you scroll up.
    // ---------------------------------------------------------------
    gsap.from('.card', {
      autoAlpha: 0,
      y: 60,
      duration: 0.7,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.cards',
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });

    // The heading font loads from the internet and can change the heading's
    // height, so re-measure everything once all fonts have arrived.
    if (document.fonts) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    // Returning a function from mm.add is optional; GSAP automatically
    // undoes everything above if the media query stops matching
    // (e.g. the user switches on "reduce motion" while the page is open).
  });
}
