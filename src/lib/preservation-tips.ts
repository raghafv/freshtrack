/**
 * Practical, offline storage advice that helps an item last longer.
 * Matched on the item name first, then on its category.
 */

interface Tip {
  match: RegExp;
  tip: string;
}

const NAME_TIPS: Tip[] = [
  { match: /tomato/i, tip: "Keep tomatoes stem-side down at room temperature — the fridge kills their flavour." },
  { match: /banana/i, tip: "Wrap the crown of the bunch in cling film to slow ripening by a few days." },
  { match: /potato|aloo/i, tip: "Store potatoes dark, cool and dry — never next to onions, they sprout each other." },
  { match: /onion|pyaz|pyaaz/i, tip: "Onions want a dry, airy basket away from potatoes and direct light." },
  { match: /coriander|cilantro|dhania|mint|pudina|parsley/i, tip: "Stand the stems in a glass of water and cover loosely with a bag — lasts over a week." },
  { match: /spinach|palak|lettuce|greens|methi/i, tip: "Wrap leaves in a dry kitchen towel inside a box; moisture is what turns them slimy." },
  { match: /bread|pav|bun/i, tip: "Bread stales fastest in the fridge. Freeze slices instead and toast straight from frozen." },
  { match: /milk|doodh/i, tip: "Keep milk on a middle shelf, not the fridge door — the door is the warmest spot." },
  { match: /paneer/i, tip: "Submerge paneer in fresh water in an airtight box and change the water daily." },
  { match: /curd|yog(h)?urt|dahi/i, tip: "Always use a dry spoon — one wet spoon is what makes curd turn sour early." },
  { match: /cheese/i, tip: "Wrap cheese in paper, then loosely in foil, so it can breathe without drying out." },
  { match: /egg|anda/i, tip: "Keep eggs in their carton pointed-end down; they hold quality far longer." },
  { match: /banana|apple/i, tip: "Apples give off ethylene — keep them away from other fruit to stop early ripening." },
  { match: /ginger|adrak/i, tip: "Freeze ginger whole and grate it frozen — no waste, no mould." },
  { match: /garlic|lehsun/i, tip: "Garlic keeps for months in an open bowl in a dry, dark cupboard." },
  { match: /mushroom/i, tip: "Store mushrooms in a paper bag, never plastic — plastic sweats and rots them." },
  { match: /berr|strawberr|grape/i, tip: "Wash berries only right before eating; water on the skin speeds up mould." },
  { match: /chicken|mutton|fish|meat|prawn/i, tip: "Use within two days or freeze in flat portions — flat packs thaw fast and evenly." },
  { match: /rice|chawal|atta|flour|dal|pulse|lentil/i, tip: "Add a couple of bay leaves to the storage jar to keep weevils out." },
  { match: /oil|ghee/i, tip: "Keep oils away from the stove — heat and light turn them rancid quickly." },
  { match: /lemon|lime|nimbu/i, tip: "Lemons keep for weeks sealed in a box in the fridge instead of loose on the counter." },
  { match: /carrot/i, tip: "Cut the green tops off carrots — the leaves pull moisture out of the root." },
  { match: /coconut|nariyal/i, tip: "Freeze grated coconut in small bags; it goes sour within a day outside." },
];

const CATEGORY_TIPS: Record<string, string> = {
  Produce: "Most vegetables last longest dry and loosely covered — trapped moisture is what spoils them.",
  Fruits: "Keep ripening fruit apart from vegetables; the ethylene they release ages everything nearby.",
  Vegetables: "Store vegetables unwashed and wash only what you're about to cook.",
  Dairy: "Dairy belongs on a middle shelf in the coldest part of the fridge, never the door.",
  Meat: "Keep raw meat on the bottom shelf in a sealed tray so nothing can drip below.",
  Seafood: "Seafood is best used the same day, or frozen flat within a few hours of buying.",
  Bakery: "Baked goods freeze beautifully — freeze what you won't eat in two days.",
  Frozen: "Never refreeze fully thawed food; portion it before freezing instead.",
  Beverages: "Once opened, keep bottles sealed and chilled to hold their taste.",
  Pantry: "Airtight jars in a cool, dark cupboard roughly double the life of dry goods.",
  Grains: "Keep grains and flour airtight and dry; a bay leaf in the jar keeps insects away.",
  Snacks: "Reseal packs tightly with a clip — air is what makes snacks go soft.",
  Condiments: "Check the label: many sauces need refrigeration once opened.",
  Spices: "Spices lose punch in light and heat — store them away from the stove.",
  Other: "Airtight, cool and dark is the safest default for almost anything.",
};

/** Returns the most relevant storage tip for an item, or null. */
export function preservationTip(name: string, category?: string | null): string | null {
  for (const t of NAME_TIPS) if (t.match.test(name)) return t.tip;
  if (category && CATEGORY_TIPS[category]) return CATEGORY_TIPS[category];
  return null;
}
