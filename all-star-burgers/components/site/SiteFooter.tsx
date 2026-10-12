// CC BY 2.0 requires visible attribution. Full list: ASSETS.md
export default function SiteFooter() {
  return (
    <footer className="px-[clamp(1rem,5vw,5rem)] py-8 text-xs opacity-70">
      Photos:{" "}
      <a className="underline" href="https://www.flickr.com/photos/33993074@N00/9138383894">
        Margherita pizza
      </a>{" "}
      by joyosity,{" "}
      <a className="underline" href="https://www.flickr.com/photos/72949902@N00/5076312359">
        Iced Tea
      </a>{" "}
      by TheCulinaryGeek,{" "}
      <a className="underline" href="https://www.flickr.com/photos/127365614@N08/15686963356">
        citrus slices
      </a>{" "}
      by ProFlowers.com (all{" "}
      <a className="underline" href="https://creativecommons.org/licenses/by/2.0/">
        CC BY 2.0
      </a>
      , cut out and resized). Burger:{" "}
      <a className="underline" href="https://unsplash.com/photos/burger-with-lettuce-and-tomato-E94j3rMcxlw">
        David (foodphototasty) on Unsplash
      </a>
      . Tomatoes and lettuce: CC0 via rawpixel.
    </footer>
  );
}
