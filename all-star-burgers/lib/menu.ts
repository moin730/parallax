// Menu content per category. Placeholder data for now: names, prices and
// descriptions are illustrative, not a real menu.
//
// Each category is linked to a hero scene (lib/scenes.ts) by `scene`, which
// supplies its theme colours and photo, so the menu page looks like the
// part of the hero you clicked from.

export type Tag = "Popular" | "Spicy" | "Veg" | "Vegan" | "New";

export type MenuItem = {
  name: string;
  description: string;
  price: number;
  tags?: Tag[];
};

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

export type MenuCategory = {
  slug: string;
  scene: string; // key of the matching hero scene
  name: string;
  intro: string;
  sections: MenuSection[];
};

export const menu: MenuCategory[] = [
  {
    slug: "pizza",
    scene: "pizza",
    name: "Pizza",
    intro: "Dough rested for 48 hours, stretched by hand and blistered in a 450°C wood-fired oven. Every pizza is 12 inches.",
    sections: [
      {
        title: "Classics",
        items: [
          { name: "Margherita", description: "San Marzano tomato, fior di latte, torn basil, extra virgin olive oil.", price: 14, tags: ["Popular", "Veg"] },
          { name: "Marinara", description: "Tomato, garlic, oregano and olive oil. No cheese, all flavour.", price: 12, tags: ["Vegan"] },
          { name: "Pepperoni", description: "Tomato, mozzarella and cupped pepperoni that crisps at the edges.", price: 16, tags: ["Popular"] },
          { name: "Quattro Formaggi", description: "Mozzarella, gorgonzola, fontina and parmesan on a white base.", price: 17, tags: ["Veg"] },
        ],
      },
      {
        title: "House specials",
        items: [
          { name: "Diavola", description: "Spicy salami, chilli oil, tomato and mozzarella.", price: 17, tags: ["Spicy"] },
          { name: "Funghi e Tartufo", description: "Wild mushrooms, truffle cream, mozzarella and thyme.", price: 19, tags: ["Veg"] },
          { name: "Prosciutto & Rocket", description: "Prosciutto di Parma, rocket and shaved parmesan, added after baking.", price: 19 },
          { name: "Nduja & Hot Honey", description: "Spreadable Calabrian nduja, ricotta and a drizzle of chilli honey.", price: 18, tags: ["Spicy", "New"] },
        ],
      },
    ],
  },
  {
    slug: "burgers",
    scene: "burger",
    name: "Burgers",
    intro: "Fresh chuck ground every morning, seared hard on the flat-top and served on a toasted brioche bun.",
    sections: [
      {
        title: "Beef",
        items: [
          { name: "All-Star Bacon Cheeseburger", description: "Seared beef, crispy bacon, cheese, pickles, onion, tomato and lettuce.", price: 12, tags: ["Popular"] },
          { name: "Classic Cheeseburger", description: "Single patty, American cheese, pickles, onion, ketchup and mustard.", price: 10 },
          { name: "Double Smash", description: "Two smashed patties, double cheese, grilled onions and house sauce.", price: 14, tags: ["Popular"] },
          { name: "BBQ Onion Ring", description: "Smoky BBQ glaze, cheddar and a crunchy beer-battered onion ring.", price: 13 },
          { name: "Jalapeño Heat", description: "Pepper jack, pickled jalapeños and chipotle mayo.", price: 13, tags: ["Spicy"] },
        ],
      },
      {
        title: "Chicken & veggie",
        items: [
          { name: "Crispy Chicken", description: "Buttermilk-fried thigh, slaw, pickles and garlic mayo.", price: 11 },
          { name: "Nashville Hot", description: "Fried chicken dunked in cayenne oil, pickles and comeback sauce.", price: 12, tags: ["Spicy"] },
          { name: "Garden Veggie", description: "Black bean and roasted pepper patty, avocado, tomato and lime crema.", price: 11, tags: ["Veg"] },
        ],
      },
      {
        title: "On the side",
        items: [
          { name: "Skin-on Fries", description: "Twice-cooked and sea salted.", price: 4, tags: ["Vegan"] },
          { name: "Onion Rings", description: "Beer-battered, with smoky ketchup.", price: 5, tags: ["Veg"] },
          { name: "Loaded Fries", description: "Cheese sauce, bacon bits, jalapeños and spring onion.", price: 7 },
        ],
      },
    ],
  },
  {
    slug: "drinks",
    scene: "drink",
    name: "Drinks",
    intro: "Teas brewed every morning, lemonade squeezed to order and shakes made with real ice cream.",
    sections: [
      {
        title: "Iced teas & lemonades",
        items: [
          { name: "Lemon Iced Tea", description: "Black tea brewed daily, poured over ice with fresh lemon.", price: 4, tags: ["Popular", "Vegan"] },
          { name: "Peach Iced Tea", description: "Black tea with ripe peach purée and a little mint.", price: 4.5, tags: ["Vegan"] },
          { name: "Fresh Lemonade", description: "Squeezed to order, lightly sweetened.", price: 4, tags: ["Vegan"] },
          { name: "Pink Grapefruit Spritz", description: "Grapefruit, rosemary syrup and sparkling water.", price: 5, tags: ["New", "Vegan"] },
        ],
      },
      {
        title: "Shakes",
        items: [
          { name: "Vanilla Bean", description: "Real vanilla ice cream and whole milk.", price: 6, tags: ["Veg"] },
          { name: "Chocolate Fudge", description: "Chocolate ice cream with a ribbon of hot fudge.", price: 6.5, tags: ["Popular", "Veg"] },
          { name: "Strawberry", description: "Fresh strawberries blended with vanilla ice cream.", price: 6, tags: ["Veg"] },
        ],
      },
      {
        title: "Sodas",
        items: [
          { name: "Cola", description: "Ice cold, on tap.", price: 3, tags: ["Vegan"] },
          { name: "Ginger Beer", description: "Fiery, cloudy and brewed with real ginger.", price: 3.5, tags: ["Vegan"] },
        ],
      },
    ],
  },
];

export function getCategory(slug: string) {
  return menu.find((c) => c.slug === slug);
}

export function formatPrice(price: number) {
  return `$${price % 1 === 0 ? price : price.toFixed(2)}`;
}
