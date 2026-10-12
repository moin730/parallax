// Everything the hero needs per food. Adding a food = adding an entry here
// (plus its images); FoodParallax builds the scroll timeline from this list.

import type { StaticImageData } from "next/image";

// Static imports give every image a content-hashed URL, so re-cut photos
// are never served stale from the image optimizer or the browser cache.
import pizzaImg from "@/assets/images/foods/pizza.webp";
import burgerImg from "@/assets/images/foods/burger.webp";
import drinkImg from "@/assets/images/foods/drink.webp";
import citrus03 from "@/assets/images/particles/citrus-03.webp";
import citrus09 from "@/assets/images/particles/citrus-09.webp";
import citrus11 from "@/assets/images/particles/citrus-11.webp";
import citrus13 from "@/assets/images/particles/citrus-13.webp";
import citrus19 from "@/assets/images/particles/citrus-19.webp";
import citrus28 from "@/assets/images/particles/citrus-28.webp";
import lettuce00 from "@/assets/images/particles/lettuce-00.webp";
import tomato02 from "@/assets/images/particles/tomato-02.webp";
import tomato04 from "@/assets/images/particles/tomato-04.webp";
import tomato09 from "@/assets/images/particles/tomato-09.webp";
import tomato11 from "@/assets/images/particles/tomato-11.webp";
import tomato16 from "@/assets/images/particles/tomato-16.webp";

export type Particle = {
  src: StaticImageData;
  w: number; // rendered width in px (desktop; scaled down on mobile)
  x: number; // % of stage width
  y: number; // % of stage height
  r: number; // starting rotation, degrees
  depth: number; // 0 = far (small, slow, faint) .. 1 = near (big, fast, blurred)
};

export type Scene = {
  key: string;
  word: string; // giant background word
  eyebrow: string;
  title: string;
  blurb: string;
  price: string;
  cta: string; // links to this food's category menu (lib/menu.ts)
  theme: { bg: string; ink: string; accent: string; glow: string };
  image: { src: StaticImageData; alt: string };
  // Size of the food: fraction of the viewport's smaller side.
  size: number;
  // Shape of the contact shadow: "disc" sits under a top-down plate,
  // "floor" is a flat ellipse under something standing up.
  shadow: "disc" | "floor";
  // Whole degrees the food turns while it's on screen. Only the top-down
  // pizza turns a lot; standing items only tilt, so they don't look flat.
  spin: number;
  particles: Particle[];
};

export const scenes: Scene[] = [
  {
    key: "pizza",
    word: "PIZZA",
    eyebrow: "Wood-fired · 48h dough",
    title: "Margherita, the way Naples meant it",
    blurb: "San Marzano tomato, fior di latte and torn basil on a blistered, airy crust.",
    price: "$14",
    cta: "See pizza menu",
    theme: { bg: "#f3e7d6", ink: "#3b1610", accent: "#c4301c", glow: "rgba(196, 48, 28, 0.18)" },
    image: { src: pizzaImg, alt: "Top-down margherita pizza with basil and mozzarella" },
    size: 0.78,
    shadow: "disc",
    spin: 140,
    particles: [
      { src: tomato02, w: 64, x: 12, y: 18, r: 0, depth: 0.15 },
      { src: tomato09, w: 92, x: 80, y: 14, r: 40, depth: 0.55 },
      { src: tomato04, w: 70, x: 88, y: 56, r: -20, depth: 0.3 },
      { src: tomato11, w: 120, x: 40, y: 94, r: 15, depth: 0.85 },
      { src: tomato16, w: 56, x: 62, y: 86, r: 80, depth: 0.1 },
      { src: tomato02, w: 130, x: 72, y: 74, r: -60, depth: 0.95 },
      { src: tomato09, w: 48, x: 34, y: 8, r: 10, depth: 0.05 },
    ],
  },
  {
    key: "burger",
    word: "BURGER",
    eyebrow: "Smashed to order",
    title: "The All-Star bacon cheeseburger",
    blurb: "Seared beef, crispy bacon, melted cheese, pickles, onion, tomato and crisp lettuce on a glossy brioche bun.",
    price: "$12",
    cta: "See burger menu",
    theme: { bg: "#1e1511", ink: "#f7e9d4", accent: "#f2a516", glow: "rgba(242, 165, 22, 0.22)" },
    image: { src: burgerImg, alt: "Bacon cheeseburger with melted cheese, lettuce, tomato, onion and pickles on a sesame brioche bun" },
    size: 0.62,
    shadow: "floor",
    spin: 6,
    particles: [
      { src: lettuce00, w: 110, x: 8, y: 10, r: -25, depth: 0.6 },
      { src: lettuce00, w: 90, x: 86, y: 62, r: 35, depth: 0.25 },
      { src: tomato04, w: 66, x: 80, y: 12, r: 0, depth: 0.2 },
      { src: tomato11, w: 110, x: 36, y: 94, r: 30, depth: 0.9 },
      { src: tomato16, w: 54, x: 60, y: 90, r: -40, depth: 0.1 },
      { src: lettuce00, w: 140, x: 90, y: 24, r: 150, depth: 0.98 },
    ],
  },
  {
    key: "drink",
    word: "CHILL",
    eyebrow: "Brewed fresh daily",
    title: "Lemon iced tea, ice cold",
    blurb: "Black tea brewed every morning, poured over ice with a squeeze of fresh lemon.",
    price: "$4",
    cta: "See drinks menu",
    theme: { bg: "#0f3a37", ink: "#e8f5f0", accent: "#f4c63d", glow: "rgba(244, 198, 61, 0.2)" },
    image: { src: drinkImg, alt: "Tall glass of iced tea with ice cubes and a lemon wedge" },
    size: 0.8,
    shadow: "floor",
    spin: 4,
    particles: [
      { src: citrus11, w: 96, x: 14, y: 16, r: 0, depth: 0.45 },
      { src: citrus19, w: 150, x: 82, y: 18, r: 30, depth: 0.75 },
      { src: citrus03, w: 60, x: 88, y: 64, r: -10, depth: 0.15 },
      { src: citrus13, w: 120, x: 36, y: 94, r: 20, depth: 0.9 },
      { src: citrus28, w: 70, x: 64, y: 88, r: 45, depth: 0.2 },
      { src: citrus09, w: 190, x: 76, y: 78, r: -25, depth: 0.98 },
      { src: citrus03, w: 50, x: 32, y: 6, r: 10, depth: 0.05 },
    ],
  },
];
