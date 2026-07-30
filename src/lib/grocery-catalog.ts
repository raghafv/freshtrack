import { toISODate, type StorageType } from "@/lib/freshtrack";

/** Shelf life in days per storage location. */
export interface ShelfLife {
  Fridge?: number;
  Freezer?: number;
  Pantry?: number;
}

/** How a product is measured by default. */
export type ProductForm = "solid" | "liquid" | "count";

export function formForUnit(unit: string): ProductForm {
  if (unit === "mL" || unit === "L") return "liquid";
  if (unit === "g" || unit === "kg") return "solid";
  return "count";
}

/** Measure units offered for a product form — weight/volume plus piece count. */
export function unitOptionsFor(form: ProductForm): string[] {
  if (form === "liquid") return ["mL", "L", "pcs"];
  if (form === "solid") return ["g", "kg", "pcs"];
  return ["pcs", "g", "kg"];
}

export function stepForUnit(unit: string): number {
  if (unit === "g" || unit === "mL") return 50;
  if (unit === "kg" || unit === "L") return 0.5;
  return 1;
}

export interface GroceryProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  form: ProductForm;
  storage: StorageType;
  shelf: ShelfLife;
  /** Lower rank = more popular. */
  rank: number;
  aliases: string[];
}


/**
 * Compact tuple form: [name, category, unit, defaultStorage, shelfLife, aliases?]
 * Order in this list defines popularity ranking.
 */
type Row = [string, string, string, StorageType, ShelfLife, string[]?];

const ROWS: Row[] = [
  /* ---------------------------------- Dairy --------------------------------- */
  ["Milk", "Dairy", "L", "Fridge", { Fridge: 7, Freezer: 90, Pantry: 1 }, ["doodh", "toned milk"]],
  ["Curd", "Dairy", "g", "Fridge", { Fridge: 7, Freezer: 30, Pantry: 1 }, ["dahi", "yogurt"]],
  ["Paneer", "Dairy", "g", "Fridge", { Fridge: 5, Freezer: 120, Pantry: 1 }, ["cottage cheese"]],
  ["Butter", "Dairy", "g", "Fridge", { Fridge: 60, Freezer: 270, Pantry: 5 }, ["makhan"]],
  ["Cheese Slices", "Dairy", "pcs", "Fridge", { Fridge: 30, Freezer: 120, Pantry: 1 }],
  ["Cheddar Cheese", "Dairy", "g", "Fridge", { Fridge: 45, Freezer: 180, Pantry: 1 }],
  ["Mozzarella", "Dairy", "g", "Fridge", { Fridge: 21, Freezer: 180, Pantry: 1 }],
  ["Ghee", "Dairy", "g", "Pantry", { Pantry: 365, Fridge: 540 }, ["clarified butter"]],
  ["Fresh Cream", "Dairy", "mL", "Fridge", { Fridge: 7, Freezer: 60, Pantry: 1 }, ["malai"]],
  ["Buttermilk", "Dairy", "mL", "Fridge", { Fridge: 5, Freezer: 30, Pantry: 1 }, ["chaas"]],
  ["Lassi", "Dairy", "mL", "Fridge", { Fridge: 4, Freezer: 30, Pantry: 1 }],
  ["Condensed Milk", "Dairy", "g", "Pantry", { Pantry: 365, Fridge: 14 }, ["milkmaid"]],
  ["Milk Powder", "Dairy", "g", "Pantry", { Pantry: 300, Fridge: 365 }],
  ["Flavoured Yogurt", "Dairy", "g", "Fridge", { Fridge: 14, Freezer: 60, Pantry: 1 }],
  ["Khoya", "Dairy", "g", "Fridge", { Fridge: 4, Freezer: 60, Pantry: 1 }, ["mawa"]],
  ["Eggs", "Dairy", "pcs", "Fridge", { Fridge: 28, Pantry: 7 }, ["anda"]],
  ["Whipping Cream", "Dairy", "mL", "Fridge", { Fridge: 10, Freezer: 60, Pantry: 1 }],
  ["Processed Cheese Block", "Dairy", "g", "Fridge", { Fridge: 40, Freezer: 150, Pantry: 1 }],

  /* --------------------------------- Fruits --------------------------------- */
  ["Bananas", "Fruits", "pcs", "Pantry", { Pantry: 5, Fridge: 8, Freezer: 60 }, ["kela"]],
  ["Apples", "Fruits", "pcs", "Fridge", { Fridge: 30, Pantry: 7, Freezer: 240 }, ["seb"]],
  ["Oranges", "Fruits", "pcs", "Fridge", { Fridge: 21, Pantry: 7, Freezer: 180 }, ["santra"]],
  ["Mangoes", "Fruits", "pcs", "Pantry", { Pantry: 5, Fridge: 10, Freezer: 180 }, ["aam"]],
  ["Grapes", "Fruits", "g", "Fridge", { Fridge: 10, Pantry: 3, Freezer: 180 }, ["angoor"]],
  ["Papaya", "Fruits", "pcs", "Fridge", { Fridge: 7, Pantry: 4, Freezer: 150 }, ["papita"]],
  ["Watermelon", "Fruits", "pcs", "Fridge", { Fridge: 10, Pantry: 5, Freezer: 90 }, ["tarbooj"]],
  ["Pomegranate", "Fruits", "pcs", "Fridge", { Fridge: 25, Pantry: 7, Freezer: 180 }, ["anar"]],
  ["Guava", "Fruits", "pcs", "Fridge", { Fridge: 8, Pantry: 4, Freezer: 120 }, ["amrud"]],
  ["Pineapple", "Fruits", "pcs", "Fridge", { Fridge: 7, Pantry: 4, Freezer: 180 }],
  ["Strawberries", "Fruits", "g", "Fridge", { Fridge: 5, Pantry: 1, Freezer: 240 }],
  ["Blueberries", "Fruits", "g", "Fridge", { Fridge: 8, Pantry: 2, Freezer: 300 }],
  ["Kiwi", "Fruits", "pcs", "Fridge", { Fridge: 20, Pantry: 6, Freezer: 180 }],
  ["Pears", "Fruits", "pcs", "Fridge", { Fridge: 20, Pantry: 5, Freezer: 180 }],
  ["Sweet Lime", "Fruits", "pcs", "Fridge", { Fridge: 14, Pantry: 6, Freezer: 120 }, ["mosambi"]],
  ["Lemons", "Fruits", "pcs", "Fridge", { Fridge: 28, Pantry: 10, Freezer: 120 }, ["nimbu"]],
  ["Coconut", "Fruits", "pcs", "Pantry", { Pantry: 14, Fridge: 30, Freezer: 180 }, ["nariyal"]],
  ["Chikoo", "Fruits", "pcs", "Fridge", { Fridge: 8, Pantry: 3, Freezer: 90 }, ["sapota"]],
  ["Custard Apple", "Fruits", "pcs", "Fridge", { Fridge: 5, Pantry: 3, Freezer: 90 }, ["sitaphal"]],
  ["Dates", "Fruits", "g", "Pantry", { Pantry: 180, Fridge: 365, Freezer: 540 }, ["khajoor"]],

  /* ------------------------------- Vegetables ------------------------------- */
  ["Tomatoes", "Vegetables", "g", "Pantry", { Pantry: 5, Fridge: 10, Freezer: 180 }, ["tamatar"]],
  ["Onions", "Vegetables", "g", "Pantry", { Pantry: 45, Fridge: 60, Freezer: 240 }, ["pyaz"]],
  ["Potatoes", "Vegetables", "g", "Pantry", { Pantry: 40, Fridge: 60, Freezer: 300 }, ["aloo"]],
  ["Spinach", "Vegetables", "g", "Fridge", { Fridge: 5, Pantry: 1, Freezer: 240 }, ["palak"]],
  ["Carrots", "Vegetables", "g", "Fridge", { Fridge: 21, Pantry: 5, Freezer: 300 }, ["gajar"]],
  ["Cauliflower", "Vegetables", "pcs", "Fridge", { Fridge: 8, Pantry: 3, Freezer: 240 }, ["gobi"]],
  ["Cabbage", "Vegetables", "pcs", "Fridge", { Fridge: 21, Pantry: 5, Freezer: 240 }, ["patta gobi"]],
  ["Capsicum", "Vegetables", "g", "Fridge", { Fridge: 12, Pantry: 4, Freezer: 240 }, ["bell pepper", "shimla mirch"]],
  ["Green Peas", "Vegetables", "g", "Fridge", { Fridge: 7, Pantry: 2, Freezer: 300 }, ["matar"]],
  ["Cucumber", "Vegetables", "pcs", "Fridge", { Fridge: 8, Pantry: 3, Freezer: 60 }, ["kheera"]],
  ["Brinjal", "Vegetables", "g", "Fridge", { Fridge: 7, Pantry: 3, Freezer: 180 }, ["baingan", "eggplant"]],
  ["Lady Finger", "Vegetables", "g", "Fridge", { Fridge: 5, Pantry: 2, Freezer: 240 }, ["bhindi", "okra"]],
  ["Bottle Gourd", "Vegetables", "pcs", "Fridge", { Fridge: 10, Pantry: 4, Freezer: 180 }, ["lauki"]],
  ["Ridge Gourd", "Vegetables", "pcs", "Fridge", { Fridge: 7, Pantry: 3, Freezer: 150 }, ["turai"]],
  ["Bitter Gourd", "Vegetables", "g", "Fridge", { Fridge: 7, Pantry: 3, Freezer: 150 }, ["karela"]],
  ["Pumpkin", "Vegetables", "g", "Pantry", { Pantry: 30, Fridge: 14, Freezer: 240 }, ["kaddu"]],
  ["Beetroot", "Vegetables", "g", "Fridge", { Fridge: 21, Pantry: 7, Freezer: 240 }, ["chukandar"]],
  ["Radish", "Vegetables", "g", "Fridge", { Fridge: 10, Pantry: 3, Freezer: 180 }, ["mooli"]],
  ["Coriander Leaves", "Vegetables", "g", "Fridge", { Fridge: 6, Pantry: 1, Freezer: 120 }, ["dhaniya", "cilantro"]],
  ["Mint Leaves", "Vegetables", "g", "Fridge", { Fridge: 6, Pantry: 1, Freezer: 120 }, ["pudina"]],
  ["Curry Leaves", "Vegetables", "g", "Fridge", { Fridge: 10, Pantry: 2, Freezer: 180 }, ["kadi patta"]],
  ["Green Chillies", "Vegetables", "g", "Fridge", { Fridge: 12, Pantry: 4, Freezer: 240 }, ["hari mirch"]],
  ["Ginger", "Vegetables", "g", "Fridge", { Fridge: 21, Pantry: 10, Freezer: 180 }, ["adrak"]],
  ["Garlic", "Vegetables", "g", "Pantry", { Pantry: 60, Fridge: 90, Freezer: 240 }, ["lehsun"]],
  ["Mushrooms", "Vegetables", "g", "Fridge", { Fridge: 6, Pantry: 1, Freezer: 240 }, ["khumb"]],
  ["Sweet Corn", "Vegetables", "g", "Fridge", { Fridge: 5, Pantry: 2, Freezer: 300 }, ["bhutta"]],
  ["French Beans", "Vegetables", "g", "Fridge", { Fridge: 7, Pantry: 2, Freezer: 240 }],
  ["Broccoli", "Vegetables", "pcs", "Fridge", { Fridge: 7, Pantry: 2, Freezer: 300 }],
  ["Sweet Potato", "Vegetables", "g", "Pantry", { Pantry: 30, Fridge: 45, Freezer: 240 }, ["shakarkandi"]],
  ["Spring Onion", "Vegetables", "g", "Fridge", { Fridge: 8, Pantry: 2, Freezer: 180 }],
  ["Lettuce", "Vegetables", "g", "Fridge", { Fridge: 7, Pantry: 1, Freezer: 60 }],
  ["Drumstick", "Vegetables", "pcs", "Fridge", { Fridge: 7, Pantry: 3, Freezer: 150 }, ["sahjan"]],

  /* ----------------------------- Meat & Seafood ----------------------------- */
  ["Chicken", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 180, Pantry: 1 }, ["murgi"]],
  ["Chicken Breast", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 180, Pantry: 1 }],
  ["Chicken Mince", "Meat & Seafood", "g", "Fridge", { Fridge: 1, Freezer: 120, Pantry: 1 }, ["keema"]],
  ["Mutton", "Meat & Seafood", "g", "Fridge", { Fridge: 3, Freezer: 180, Pantry: 1 }, ["goat meat"]],
  ["Fish Fillet", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 150, Pantry: 1 }, ["machli"]],
  ["Prawns", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 150, Pantry: 1 }, ["jhinga"]],
  ["Rohu Fish", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 120, Pantry: 1 }],
  ["Pomfret", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 150, Pantry: 1 }],
  ["Crab", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 120, Pantry: 1 }],
  ["Squid", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 120, Pantry: 1 }],
  ["Bacon", "Meat & Seafood", "g", "Fridge", { Fridge: 7, Freezer: 90, Pantry: 1 }],
  ["Sausages", "Meat & Seafood", "g", "Fridge", { Fridge: 7, Freezer: 90, Pantry: 1 }],
  ["Salami", "Meat & Seafood", "g", "Fridge", { Fridge: 14, Freezer: 90, Pantry: 1 }],
  ["Fish Curry Cut", "Meat & Seafood", "g", "Fridge", { Fridge: 2, Freezer: 150, Pantry: 1 }],

  /* --------------------------------- Frozen --------------------------------- */
  ["Frozen Peas", "Frozen", "g", "Freezer", { Freezer: 300, Fridge: 3, Pantry: 1 }],
  ["Frozen Mixed Vegetables", "Frozen", "g", "Freezer", { Freezer: 300, Fridge: 3, Pantry: 1 }],
  ["Ice Cream", "Frozen", "mL", "Freezer", { Freezer: 180, Fridge: 1, Pantry: 1 }],
  ["Frozen Parathas", "Frozen", "pcs", "Freezer", { Freezer: 180, Fridge: 5, Pantry: 1 }],
  ["Frozen French Fries", "Frozen", "g", "Freezer", { Freezer: 270, Fridge: 3, Pantry: 1 }],
  ["Frozen Nuggets", "Frozen", "g", "Freezer", { Freezer: 180, Fridge: 3, Pantry: 1 }],
  ["Frozen Momos", "Frozen", "pcs", "Freezer", { Freezer: 150, Fridge: 3, Pantry: 1 }],
  ["Frozen Corn", "Frozen", "g", "Freezer", { Freezer: 300, Fridge: 3, Pantry: 1 }],
  ["Frozen Berries", "Frozen", "g", "Freezer", { Freezer: 300, Fridge: 3, Pantry: 1 }],
  ["Frozen Fish Fingers", "Frozen", "g", "Freezer", { Freezer: 180, Fridge: 2, Pantry: 1 }],
  ["Frozen Pizza", "Frozen", "pcs", "Freezer", { Freezer: 180, Fridge: 3, Pantry: 1 }],
  ["Frozen Roti", "Frozen", "pcs", "Freezer", { Freezer: 120, Fridge: 4, Pantry: 1 }],

  /* --------------------------------- Bakery --------------------------------- */
  ["Bread", "Bakery", "pcs", "Pantry", { Pantry: 4, Fridge: 10, Freezer: 90 }, ["double roti"]],
  ["Brown Bread", "Bakery", "pcs", "Pantry", { Pantry: 4, Fridge: 10, Freezer: 90 }],
  ["Pav", "Bakery", "pcs", "Pantry", { Pantry: 3, Fridge: 7, Freezer: 60 }, ["buns"]],
  ["Burger Buns", "Bakery", "pcs", "Pantry", { Pantry: 4, Fridge: 8, Freezer: 60 }],
  ["Croissant", "Bakery", "pcs", "Pantry", { Pantry: 2, Fridge: 5, Freezer: 60 }],
  ["Cake", "Bakery", "pcs", "Fridge", { Fridge: 5, Pantry: 2, Freezer: 60 }],
  ["Muffins", "Bakery", "pcs", "Pantry", { Pantry: 4, Fridge: 8, Freezer: 60 }],
  ["Rusk", "Bakery", "g", "Pantry", { Pantry: 90, Fridge: 120 }, ["toast"]],
  ["Pizza Base", "Bakery", "pcs", "Pantry", { Pantry: 5, Fridge: 12, Freezer: 90 }],
  ["Doughnuts", "Bakery", "pcs", "Pantry", { Pantry: 2, Fridge: 5, Freezer: 45 }],
  ["Cookies", "Bakery", "g", "Pantry", { Pantry: 120, Fridge: 150 }],
  ["Puff Pastry", "Bakery", "pcs", "Freezer", { Freezer: 120, Fridge: 5, Pantry: 1 }],

  /* -------------------------------- Beverages ------------------------------- */
  ["Orange Juice", "Beverages", "mL", "Fridge", { Fridge: 7, Freezer: 120, Pantry: 2 }],
  ["Apple Juice", "Beverages", "mL", "Fridge", { Fridge: 7, Freezer: 120, Pantry: 2 }],
  ["Mango Juice", "Beverages", "mL", "Pantry", { Pantry: 180, Fridge: 10 }, ["maaza", "frooti"]],
  ["Cola", "Beverages", "mL", "Pantry", { Pantry: 270, Fridge: 300 }, ["soft drink", "soda"]],
  ["Lemon Soda", "Beverages", "mL", "Pantry", { Pantry: 270, Fridge: 300 }],
  ["Drinking Water", "Beverages", "L", "Pantry", { Pantry: 365, Fridge: 365 }],
  ["Tea Leaves", "Beverages", "g", "Pantry", { Pantry: 365, Fridge: 365 }, ["chai patti"]],
  ["Green Tea", "Beverages", "g", "Pantry", { Pantry: 365, Fridge: 365 }],
  ["Instant Coffee", "Beverages", "g", "Pantry", { Pantry: 365, Fridge: 365 }],
  ["Coffee Beans", "Beverages", "g", "Pantry", { Pantry: 180, Fridge: 240, Freezer: 365 }],
  ["Energy Drink", "Beverages", "mL", "Pantry", { Pantry: 240, Fridge: 270 }],
  ["Coconut Water", "Beverages", "mL", "Fridge", { Fridge: 5, Pantry: 2, Freezer: 90 }],
  ["Buttermilk Packet", "Beverages", "mL", "Fridge", { Fridge: 5, Pantry: 1, Freezer: 30 }],
  ["Health Drink Powder", "Beverages", "g", "Pantry", { Pantry: 300, Fridge: 365 }, ["horlicks", "bournvita"]],
  ["Soy Milk", "Beverages", "mL", "Fridge", { Fridge: 7, Pantry: 90, Freezer: 90 }],
  ["Almond Milk", "Beverages", "mL", "Fridge", { Fridge: 7, Pantry: 90, Freezer: 90 }],

  /* --------------------------------- Snacks --------------------------------- */
  ["Potato Chips", "Snacks", "g", "Pantry", { Pantry: 120, Fridge: 120 }],
  ["Namkeen Mixture", "Snacks", "g", "Pantry", { Pantry: 120, Fridge: 150 }],
  ["Biscuits", "Snacks", "g", "Pantry", { Pantry: 180, Fridge: 200 }],
  ["Chocolate Bar", "Snacks", "g", "Pantry", { Pantry: 180, Fridge: 240, Freezer: 365 }],
  ["Peanuts", "Snacks", "g", "Pantry", { Pantry: 120, Fridge: 240, Freezer: 365 }, ["moongphali"]],
  ["Almonds", "Snacks", "g", "Pantry", { Pantry: 180, Fridge: 365, Freezer: 540 }, ["badam"]],
  ["Cashews", "Snacks", "g", "Pantry", { Pantry: 150, Fridge: 300, Freezer: 450 }, ["kaju"]],
  ["Walnuts", "Snacks", "g", "Pantry", { Pantry: 120, Fridge: 300, Freezer: 450 }, ["akhrot"]],
  ["Raisins", "Snacks", "g", "Pantry", { Pantry: 180, Fridge: 365 }, ["kishmish"]],
  ["Popcorn Kernels", "Snacks", "g", "Pantry", { Pantry: 365, Fridge: 365 }],
  ["Bhujia", "Snacks", "g", "Pantry", { Pantry: 90, Fridge: 120 }],
  ["Khakhra", "Snacks", "g", "Pantry", { Pantry: 90, Fridge: 120 }],
  ["Granola Bar", "Snacks", "pcs", "Pantry", { Pantry: 150, Fridge: 200 }],
  ["Wafers", "Snacks", "g", "Pantry", { Pantry: 120, Fridge: 150 }],
  ["Murukku", "Snacks", "g", "Pantry", { Pantry: 60, Fridge: 90 }, ["chakli"]],
  ["Dry Fruit Mix", "Snacks", "g", "Pantry", { Pantry: 150, Fridge: 300, Freezer: 450 }],

  /* ---------------------------- Grains & Pasta ------------------------------ */
  ["Rice", "Grains & Pasta", "kg", "Pantry", { Pantry: 365, Fridge: 400, Freezer: 540 }, ["chawal", "basmati"]],
  ["Brown Rice", "Grains & Pasta", "kg", "Pantry", { Pantry: 180, Fridge: 300, Freezer: 400 }],
  ["Wheat Flour", "Grains & Pasta", "kg", "Pantry", { Pantry: 180, Fridge: 240, Freezer: 365 }, ["atta"]],
  ["Maida", "Grains & Pasta", "kg", "Pantry", { Pantry: 180, Fridge: 240 }, ["refined flour"]],
  ["Semolina", "Grains & Pasta", "g", "Pantry", { Pantry: 150, Fridge: 240 }, ["sooji", "rava"]],
  ["Poha", "Grains & Pasta", "g", "Pantry", { Pantry: 120, Fridge: 180 }, ["flattened rice"]],
  ["Oats", "Grains & Pasta", "g", "Pantry", { Pantry: 240, Fridge: 300 }],
  ["Pasta", "Grains & Pasta", "g", "Pantry", { Pantry: 365, Fridge: 365 }],
  ["Noodles", "Grains & Pasta", "g", "Pantry", { Pantry: 240, Fridge: 300 }, ["maggi"]],
  ["Vermicelli", "Grains & Pasta", "g", "Pantry", { Pantry: 180, Fridge: 240 }, ["sevai"]],
  ["Toor Dal", "Grains & Pasta", "kg", "Pantry", { Pantry: 365, Fridge: 400 }, ["arhar"]],
  ["Moong Dal", "Grains & Pasta", "kg", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Chana Dal", "Grains & Pasta", "kg", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Masoor Dal", "Grains & Pasta", "kg", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Urad Dal", "Grains & Pasta", "kg", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Rajma", "Grains & Pasta", "kg", "Pantry", { Pantry: 365, Fridge: 400 }, ["kidney beans"]],
  ["Chickpeas", "Grains & Pasta", "kg", "Pantry", { Pantry: 365, Fridge: 400 }, ["chana", "kabuli"]],
  ["Besan", "Grains & Pasta", "g", "Pantry", { Pantry: 150, Fridge: 240 }, ["gram flour"]],
  ["Quinoa", "Grains & Pasta", "g", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Millet", "Grains & Pasta", "kg", "Pantry", { Pantry: 240, Fridge: 300 }, ["bajra", "ragi"]],
  ["Corn Flour", "Grains & Pasta", "g", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Bread Crumbs", "Grains & Pasta", "g", "Pantry", { Pantry: 120, Fridge: 180, Freezer: 270 }],
  ["Sabudana", "Grains & Pasta", "g", "Pantry", { Pantry: 365, Fridge: 400 }, ["sago"]],
  ["Idli Rava", "Grains & Pasta", "g", "Pantry", { Pantry: 120, Fridge: 180 }],

  /* ------------------------------- Condiments ------------------------------- */
  ["Tomato Ketchup", "Condiments", "g", "Pantry", { Pantry: 270, Fridge: 365 }],
  ["Mayonnaise", "Condiments", "g", "Fridge", { Fridge: 60, Pantry: 120 }],
  ["Mustard Sauce", "Condiments", "g", "Fridge", { Fridge: 180, Pantry: 240 }],
  ["Soy Sauce", "Condiments", "mL", "Pantry", { Pantry: 365, Fridge: 540 }],
  ["Vinegar", "Condiments", "mL", "Pantry", { Pantry: 540, Fridge: 540 }],
  ["Chilli Sauce", "Condiments", "mL", "Pantry", { Pantry: 240, Fridge: 365 }],
  ["Mango Pickle", "Condiments", "g", "Pantry", { Pantry: 365, Fridge: 540 }, ["achar"]],
  ["Jam", "Condiments", "g", "Pantry", { Pantry: 180, Fridge: 270 }],
  ["Peanut Butter", "Condiments", "g", "Pantry", { Pantry: 180, Fridge: 270 }],
  ["Honey", "Condiments", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["shahad"]],
  ["Sugar", "Condiments", "kg", "Pantry", { Pantry: 730, Fridge: 730 }, ["cheeni"]],
  ["Jaggery", "Condiments", "g", "Pantry", { Pantry: 365, Fridge: 400 }, ["gur"]],
  ["Salt", "Condiments", "kg", "Pantry", { Pantry: 1095, Fridge: 1095 }, ["namak"]],
  ["Cooking Oil", "Condiments", "L", "Pantry", { Pantry: 365, Fridge: 400 }, ["refined oil"]],
  ["Mustard Oil", "Condiments", "L", "Pantry", { Pantry: 365, Fridge: 400 }, ["sarson"]],
  ["Olive Oil", "Condiments", "mL", "Pantry", { Pantry: 540, Fridge: 540 }],
  ["Coconut Oil", "Condiments", "mL", "Pantry", { Pantry: 540, Fridge: 540 }],
  ["Tahini", "Condiments", "g", "Pantry", { Pantry: 180, Fridge: 270 }],
  ["Schezwan Chutney", "Condiments", "g", "Fridge", { Fridge: 90, Pantry: 120 }],
  ["Green Chutney", "Condiments", "g", "Fridge", { Fridge: 5, Freezer: 60, Pantry: 1 }],
  ["Curd Dressing", "Condiments", "g", "Fridge", { Fridge: 7, Pantry: 1 }],
  ["Baking Powder", "Condiments", "g", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Baking Soda", "Condiments", "g", "Pantry", { Pantry: 730, Fridge: 730 }],
  ["Yeast", "Condiments", "g", "Fridge", { Fridge: 180, Freezer: 365, Pantry: 60 }],
  ["Cocoa Powder", "Condiments", "g", "Pantry", { Pantry: 540, Fridge: 540 }],
  ["Tomato Puree", "Condiments", "g", "Pantry", { Pantry: 240, Fridge: 7 }],
  ["Coconut Milk", "Condiments", "mL", "Pantry", { Pantry: 270, Fridge: 5, Freezer: 90 }],

  /* --------------------------------- Spices --------------------------------- */
  ["Turmeric Powder", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["haldi"]],
  ["Red Chilli Powder", "Spices", "g", "Pantry", { Pantry: 540, Fridge: 540 }, ["lal mirch"]],
  ["Coriander Powder", "Spices", "g", "Pantry", { Pantry: 540, Fridge: 540 }, ["dhaniya powder"]],
  ["Cumin Seeds", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["jeera"]],
  ["Mustard Seeds", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["rai"]],
  ["Garam Masala", "Spices", "g", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Black Pepper", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["kali mirch"]],
  ["Cardamom", "Spices", "g", "Pantry", { Pantry: 540, Fridge: 730 }, ["elaichi"]],
  ["Cloves", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["laung"]],
  ["Cinnamon", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["dalchini"]],
  ["Bay Leaf", "Spices", "g", "Pantry", { Pantry: 365, Fridge: 400 }, ["tej patta"]],
  ["Fenugreek Seeds", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["methi dana"]],
  ["Asafoetida", "Spices", "g", "Pantry", { Pantry: 540, Fridge: 540 }, ["hing"]],
  ["Chaat Masala", "Spices", "g", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Sambar Powder", "Spices", "g", "Pantry", { Pantry: 270, Fridge: 365 }],
  ["Kitchen King Masala", "Spices", "g", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Kasuri Methi", "Spices", "g", "Pantry", { Pantry: 365, Fridge: 400 }],
  ["Saffron", "Spices", "g", "Pantry", { Pantry: 540, Fridge: 730 }, ["kesar"]],
  ["Star Anise", "Spices", "g", "Pantry", { Pantry: 540, Fridge: 540 }],
  ["Carom Seeds", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["ajwain"]],
  ["Fennel Seeds", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["saunf"]],
  ["Dry Red Chilli", "Spices", "g", "Pantry", { Pantry: 540, Fridge: 540 }],
  ["Nutmeg", "Spices", "g", "Pantry", { Pantry: 730, Fridge: 730 }, ["jaiphal"]],
  ["Pav Bhaji Masala", "Spices", "g", "Pantry", { Pantry: 365, Fridge: 400 }],

  /* ---------------------------------- Other --------------------------------- */
  ["Tofu", "Other", "g", "Fridge", { Fridge: 7, Freezer: 150, Pantry: 1 }],
  ["Soya Chunks", "Other", "g", "Pantry", { Pantry: 240, Fridge: 300 }],
  ["Sprouts", "Other", "g", "Fridge", { Fridge: 4, Pantry: 1, Freezer: 60 }],
  ["Ready-to-Eat Curry", "Other", "g", "Pantry", { Pantry: 240, Fridge: 300 }],
  ["Instant Soup", "Other", "g", "Pantry", { Pantry: 300, Fridge: 365 }],
  ["Baby Food", "Other", "g", "Pantry", { Pantry: 180, Fridge: 240 }],
  ["Pet Food", "Other", "kg", "Pantry", { Pantry: 180, Fridge: 240 }],
  ["Protein Powder", "Other", "g", "Pantry", { Pantry: 365, Fridge: 400 }],
];

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export const GROCERY_CATALOG: GroceryProduct[] = ROWS.map(
  ([name, category, unit, storage, shelf, aliases], index) => ({
    id: slug(name),
    name,
    category,
    unit,
    form: formForUnit(unit),
    storage,

    shelf,
    rank: index,
    aliases: aliases ?? [],
  }),
);

export const CATALOG_BY_ID = new Map(GROCERY_CATALOG.map((p) => [p.id, p]));

export const CATALOG_CATEGORIES = Array.from(
  new Set(GROCERY_CATALOG.map((p) => p.category)),
);

export function findProduct(nameOrId: string): GroceryProduct | undefined {
  const key = slug(nameOrId);
  const direct = CATALOG_BY_ID.get(key);
  if (direct) return direct;
  const n = nameOrId.trim().toLowerCase();
  return GROCERY_CATALOG.find(
    (p) => p.name.toLowerCase() === n || p.aliases.some((a) => a.toLowerCase() === n),
  );
}

export function searchCatalog(query: string, limit = 40): GroceryProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { p: GroceryProduct; score: number }[] = [];
  for (const p of GROCERY_CATALOG) {
    const name = p.name.toLowerCase();
    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (p.aliases.some((a) => a.toLowerCase().startsWith(q))) score = 3;
    else if (p.aliases.some((a) => a.toLowerCase().includes(q))) score = 4;
    else if (p.category.toLowerCase().includes(q)) score = 5;
    if (score >= 0) scored.push({ p, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.p.rank - b.p.rank)
    .slice(0, limit)
    .map((s) => s.p);
}

export function popularProducts(limit = 12): GroceryProduct[] {
  return [...GROCERY_CATALOG].sort((a, b) => a.rank - b.rank).slice(0, limit);
}

/** Storage locations that make sense for this product. */
export function recommendedStorages(product: GroceryProduct): StorageType[] {
  return (["Fridge", "Freezer", "Pantry"] as StorageType[]).filter((s) => {
    const days = product.shelf[s];
    return days != null && days >= 2;
  });
}

export function isUnusualStorage(product: GroceryProduct, storage: string): boolean {
  return !recommendedStorages(product).includes(storage as StorageType);
}

/** Days of shelf life for the given product + storage, with a safe fallback. */
export function shelfLifeDays(product: GroceryProduct, storage: string): number {
  const exact = product.shelf[storage as StorageType];
  if (exact != null) return exact;
  const values = Object.values(product.shelf).filter((v): v is number => v != null);
  return values.length ? Math.min(...values) : 7;
}

export function expiryForProduct(
  product: GroceryProduct,
  storage: string,
  purchaseDate: string,
): string {
  const base = new Date(`${purchaseDate}T00:00:00`);
  base.setDate(base.getDate() + shelfLifeDays(product, storage));
  return toISODate(base);
}
