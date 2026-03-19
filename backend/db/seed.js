/**
 * FitTrack Pro — Global Food Database Seed
 * Greek + International cuisines
 * Run with: node db/seed.js
 * Macros are per serving_size unless noted
 */
require('dotenv').config();
const pool = require('./pool');

const greekFoods = [
  // ── Fast food / Street food ─────────────────────────────────────────────
  { name: 'Gyros Pita (chicken)', name_el: 'Γύρος πίτα κοτόπουλο', calories: 280, protein: 18, carbs: 30, fat: 9, fiber: 2, serving_size: 300, serving_unit: 'g' },
  { name: 'Gyros Pita (pork)', name_el: 'Γύρος πίτα χοιρινό', calories: 310, protein: 17, carbs: 30, fat: 13, fiber: 2, serving_size: 300, serving_unit: 'g' },
  { name: 'Souvlaki skewer (pork)', name_el: 'Σουβλάκι χοιρινό (σουβλάκι)', calories: 220, protein: 22, carbs: 0, fat: 14, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Souvlaki skewer (chicken)', name_el: 'Σουβλάκι κοτόπουλο (σουβλάκι)', calories: 165, protein: 24, carbs: 0, fat: 7, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Pita bread (Greek)', name_el: 'Πίτα αραβική / σουβλάκι', calories: 275, protein: 8, carbs: 55, fat: 3, fiber: 2, serving_size: 80, serving_unit: 'g' },

  // ── Traditional dishes ──────────────────────────────────────────────────
  { name: 'Moussaka', name_el: 'Μουσακάς', calories: 180, protein: 10, carbs: 12, fat: 10, fiber: 2, serving_size: 300, serving_unit: 'g' },
  { name: 'Pastitsio', name_el: 'Παστίτσιο', calories: 220, protein: 12, carbs: 25, fat: 8, fiber: 1, serving_size: 300, serving_unit: 'g' },
  { name: 'Spanakopita', name_el: 'Σπανακόπιτα', calories: 310, protein: 9, carbs: 28, fat: 18, fiber: 2, serving_size: 150, serving_unit: 'g' },
  { name: 'Tiropita', name_el: 'Τυρόπιτα', calories: 380, protein: 14, carbs: 30, fat: 22, fiber: 1, serving_size: 150, serving_unit: 'g' },
  { name: 'Dolmades (stuffed vine leaves)', name_el: 'Ντολμαδάκια γιαλαντζί', calories: 120, protein: 4, carbs: 14, fat: 6, fiber: 2, serving_size: 100, serving_unit: 'g' },
  { name: 'Fasolada (bean soup)', name_el: 'Φασολάδα', calories: 110, protein: 6, carbs: 17, fat: 3, fiber: 5, serving_size: 350, serving_unit: 'g' },
  { name: 'Lentil soup (Fakes)', name_el: 'Φακές σούπα', calories: 115, protein: 9, carbs: 18, fat: 2, fiber: 6, serving_size: 350, serving_unit: 'g' },
  { name: 'Horiatiki salad (Greek salad)', name_el: 'Χωριάτικη σαλάτα', calories: 180, protein: 5, carbs: 8, fat: 14, fiber: 2, serving_size: 300, serving_unit: 'g' },
  { name: 'Gemista (stuffed tomatoes)', name_el: 'Γεμιστά', calories: 130, protein: 3, carbs: 20, fat: 5, fiber: 2, serving_size: 300, serving_unit: 'g' },
  { name: 'Stifado (beef stew)', name_el: 'Στιφάδο', calories: 200, protein: 16, carbs: 8, fat: 12, fiber: 1, serving_size: 300, serving_unit: 'g' },
  { name: 'Bifteki (Greek burger)', name_el: 'Μπιφτέκι', calories: 280, protein: 20, carbs: 8, fat: 18, fiber: 0, serving_size: 150, serving_unit: 'g' },
  { name: 'Souvlaki sandwich (complete)', name_el: 'Σάντουιτς σουβλάκι', calories: 420, protein: 25, carbs: 42, fat: 16, fiber: 2, serving_size: 220, serving_unit: 'g' },

  // ── Dairy & Cheese ──────────────────────────────────────────────────────
  { name: 'Feta cheese', name_el: 'Φέτα', calories: 264, protein: 14, carbs: 4, fat: 21, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Greek yogurt (2% fat)', name_el: 'Στραγγιστό γιαούρτι 2%', calories: 73, protein: 10, carbs: 4, fat: 2, fiber: 0, serving_size: 200, serving_unit: 'g' },
  { name: 'Greek yogurt (0% fat)', name_el: 'Στραγγιστό γιαούρτι 0%', calories: 59, protein: 10, carbs: 4, fat: 0, fiber: 0, serving_size: 200, serving_unit: 'g' },
  { name: 'Greek yogurt (full fat)', name_el: 'Στραγγιστό γιαούρτι πλήρες', calories: 115, protein: 9, carbs: 4, fat: 7, fiber: 0, serving_size: 200, serving_unit: 'g' },
  { name: 'Graviera cheese', name_el: 'Γραβιέρα', calories: 400, protein: 27, carbs: 1, fat: 32, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Halloumi', name_el: 'Χαλούμι', calories: 320, protein: 22, carbs: 2, fat: 25, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Kasseri cheese', name_el: 'Κασέρι', calories: 380, protein: 26, carbs: 2, fat: 30, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Mizithra (fresh)', name_el: 'Μυζήθρα φρέσκια', calories: 120, protein: 8, carbs: 4, fat: 8, fiber: 0, serving_size: 100, serving_unit: 'g' },

  // ── Dips & Sauces ───────────────────────────────────────────────────────
  { name: 'Tzatziki', name_el: 'Τζατζίκι', calories: 95, protein: 5, carbs: 5, fat: 6, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Taramosalata', name_el: 'Ταραμοσαλάτα', calories: 250, protein: 4, carbs: 12, fat: 20, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Hummus', name_el: 'Χούμους', calories: 165, protein: 8, carbs: 14, fat: 9, fiber: 4, serving_size: 100, serving_unit: 'g' },
  { name: 'Melitzanosalata (eggplant dip)', name_el: 'Μελιτζανοσαλάτα', calories: 70, protein: 1, carbs: 8, fat: 4, fiber: 2, serving_size: 100, serving_unit: 'g' },
  { name: 'Skordalia (garlic dip)', name_el: 'Σκορδαλιά', calories: 200, protein: 3, carbs: 28, fat: 9, fiber: 2, serving_size: 100, serving_unit: 'g' },

  // ── Bread & Pastries ────────────────────────────────────────────────────
  { name: 'Koulouri Thessalonikis', name_el: 'Κουλούρι Θεσσαλονίκης', calories: 310, protein: 10, carbs: 58, fat: 5, fiber: 3, serving_size: 100, serving_unit: 'g' },
  { name: 'Tsoureki (sweet bread)', name_el: 'Τσουρέκι', calories: 370, protein: 9, carbs: 58, fat: 12, fiber: 1, serving_size: 100, serving_unit: 'g' },
  { name: 'Paximadi (barley rusk)', name_el: 'Παξιμάδι κριθαρένιο', calories: 350, protein: 11, carbs: 70, fat: 3, fiber: 8, serving_size: 100, serving_unit: 'g' },
  { name: 'Loukoumades (honey balls)', name_el: 'Λουκουμάδες', calories: 390, protein: 6, carbs: 52, fat: 18, fiber: 1, serving_size: 100, serving_unit: 'g' },
  { name: 'Bougatsa (custard pastry)', name_el: 'Μπουγάτσα κρέμα', calories: 290, protein: 7, carbs: 38, fat: 13, fiber: 1, serving_size: 180, serving_unit: 'g' },
  { name: 'Cheese pie (small)', name_el: 'Τυροπιτάκι', calories: 280, protein: 9, carbs: 28, fat: 15, fiber: 1, serving_size: 100, serving_unit: 'g' },

  // ── Seafood ─────────────────────────────────────────────────────────────
  { name: 'Grilled octopus', name_el: 'Χταπόδι σχάρας', calories: 82, protein: 15, carbs: 2, fat: 1, fiber: 0, serving_size: 200, serving_unit: 'g' },
  { name: 'Fried calamari', name_el: 'Καλαμαράκια τηγανητά', calories: 220, protein: 16, carbs: 14, fat: 11, fiber: 0, serving_size: 200, serving_unit: 'g' },
  { name: 'Grilled sea bass', name_el: 'Λαβράκι σχάρας', calories: 140, protein: 24, carbs: 0, fat: 5, fiber: 0, serving_size: 200, serving_unit: 'g' },
  { name: 'Grilled sea bream', name_el: 'Τσιπούρα σχάρας', calories: 130, protein: 22, carbs: 0, fat: 4, fiber: 0, serving_size: 200, serving_unit: 'g' },

  // ── Meat ────────────────────────────────────────────────────────────────
  { name: 'Kleftiko (lamb)', name_el: 'Κλέφτικο αρνί', calories: 280, protein: 24, carbs: 2, fat: 19, fiber: 0, serving_size: 300, serving_unit: 'g' },
  { name: 'Kokoretsi', name_el: 'Κοκορέτσι', calories: 310, protein: 20, carbs: 1, fat: 24, fiber: 0, serving_size: 100, serving_unit: 'g' },
  { name: 'Soutzoukakia (meatballs in sauce)', name_el: 'Σουτζουκάκια', calories: 230, protein: 16, carbs: 8, fat: 15, fiber: 1, serving_size: 250, serving_unit: 'g' },

  // ── Olive oil & Olives ──────────────────────────────────────────────────
  { name: 'Olive oil (extra virgin)', name_el: 'Ελαιόλαδο εξαιρετικό παρθένο', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, serving_size: 15, serving_unit: 'ml' },
  { name: 'Kalamata olives', name_el: 'Ελιές Καλαμών', calories: 145, protein: 1, carbs: 4, fat: 15, fiber: 2, serving_size: 100, serving_unit: 'g' },
  { name: 'Green olives', name_el: 'Πράσινες ελιές', calories: 145, protein: 1, carbs: 4, fat: 15, fiber: 2, serving_size: 100, serving_unit: 'g' },

  // ── Legumes ─────────────────────────────────────────────────────────────
  { name: 'Gigantes plaki (baked giant beans)', name_el: 'Γίγαντες πλακί', calories: 120, protein: 6, carbs: 18, fat: 3, fiber: 5, serving_size: 300, serving_unit: 'g' },
  { name: 'Revithia (chickpea soup)', name_el: 'Ρεβύθια σούπα', calories: 130, protein: 7, carbs: 20, fat: 3, fiber: 5, serving_size: 350, serving_unit: 'g' },

  // ── Desserts ────────────────────────────────────────────────────────────
  { name: 'Baklava', name_el: 'Μπακλαβάς', calories: 430, protein: 6, carbs: 55, fat: 22, fiber: 2, serving_size: 80, serving_unit: 'g' },
  { name: 'Galaktoboureko', name_el: 'Γαλακτομπούρεκο', calories: 310, protein: 6, carbs: 42, fat: 14, fiber: 0, serving_size: 150, serving_unit: 'g' },
  { name: 'Rizogalo (rice pudding)', name_el: 'Ρυζόγαλο', calories: 130, protein: 4, carbs: 24, fat: 3, fiber: 0, serving_size: 200, serving_unit: 'g' },
  { name: 'Halva', name_el: 'Χαλβάς', calories: 500, protein: 12, carbs: 55, fat: 28, fiber: 3, serving_size: 60, serving_unit: 'g' },
  { name: 'Melomakarona', name_el: 'Μελομακάρονα', calories: 440, protein: 5, carbs: 65, fat: 18, fiber: 2, serving_size: 50, serving_unit: 'g' },
  { name: 'Kourabiedes', name_el: 'Κουραμπιέδες', calories: 530, protein: 7, carbs: 55, fat: 32, fiber: 2, serving_size: 50, serving_unit: 'g' },

  // ── Drinks ──────────────────────────────────────────────────────────────
  { name: 'Greek coffee (sketos)', name_el: 'Ελληνικός καφές σκέτος', calories: 2, protein: 0, carbs: 0, fat: 0, fiber: 0, serving_size: 60, serving_unit: 'ml' },
  { name: 'Frappé (with milk & sugar)', name_el: 'Φραπέ γάλα/ζάχαρη', calories: 90, protein: 3, carbs: 14, fat: 2, fiber: 0, serving_size: 250, serving_unit: 'ml' },
  { name: 'Freddo espresso', name_el: 'Φρέντο εσπρέσο', calories: 15, protein: 1, carbs: 2, fat: 0, fiber: 0, serving_size: 150, serving_unit: 'ml' },
];

// ═══════════════════════════════════════════════════════════════════════════
// INTERNATIONAL FOODS
// ═══════════════════════════════════════════════════════════════════════════
const internationalFoods = [

  // ── 🇮🇹 ITALIAN ──────────────────────────────────────────────────────────
  { name: 'Pizza Margherita', name_el: 'Πίτσα Μαργαρίτα', calories: 250, protein: 11, carbs: 32, fat: 9, fiber: 2, serving_size: 200, serving_unit: 'g', source: 'italian' },
  { name: 'Pizza Pepperoni', name_el: 'Πίτσα Πεπερόνι', calories: 300, protein: 13, carbs: 30, fat: 14, fiber: 2, serving_size: 200, serving_unit: 'g', source: 'italian' },
  { name: 'Spaghetti Bolognese', name_el: 'Σπαγγέτι Μπολονέζ', calories: 420, protein: 22, carbs: 52, fat: 12, fiber: 3, serving_size: 350, serving_unit: 'g', source: 'italian' },
  { name: 'Spaghetti Carbonara', name_el: 'Σπαγγέτι Καρμπονάρα', calories: 520, protein: 20, carbs: 55, fat: 22, fiber: 2, serving_size: 350, serving_unit: 'g', source: 'italian' },
  { name: 'Pasta Arrabiata', name_el: 'Αραμπιάτα', calories: 380, protein: 12, carbs: 60, fat: 10, fiber: 4, serving_size: 350, serving_unit: 'g', source: 'italian' },
  { name: 'Lasagna (beef)', name_el: 'Λαζάνια με κιμά', calories: 350, protein: 19, carbs: 30, fat: 16, fiber: 2, serving_size: 300, serving_unit: 'g', source: 'italian' },
  { name: 'Risotto (mushroom)', name_el: 'Ριζότο μανιτάρια', calories: 380, protein: 10, carbs: 58, fat: 12, fiber: 2, serving_size: 300, serving_unit: 'g', source: 'italian' },
  { name: 'Tiramisu', name_el: 'Τιραμισού', calories: 380, protein: 6, carbs: 38, fat: 22, fiber: 0, serving_size: 120, serving_unit: 'g', source: 'italian' },
  { name: 'Bruschetta', name_el: 'Μπρουσκέτα', calories: 180, protein: 5, carbs: 28, fat: 6, fiber: 2, serving_size: 100, serving_unit: 'g', source: 'italian' },
  { name: 'Mozzarella (fresh)', name_el: 'Μοτσαρέλα φρέσκια', calories: 280, protein: 18, carbs: 3, fat: 22, fiber: 0, serving_size: 100, serving_unit: 'g', source: 'italian' },
  { name: 'Parmesan cheese', name_el: 'Παρμεζάνα', calories: 431, protein: 38, carbs: 4, fat: 29, fiber: 0, serving_size: 30, serving_unit: 'g', source: 'italian' },
  { name: 'Prosciutto', name_el: 'Προσσούτο', calories: 145, protein: 22, carbs: 0, fat: 6, fiber: 0, serving_size: 60, serving_unit: 'g', source: 'italian' },
  { name: 'Pesto sauce (basil)', name_el: 'Σάλτσα πέστο βασιλικός', calories: 290, protein: 6, carbs: 4, fat: 28, fiber: 2, serving_size: 50, serving_unit: 'g', source: 'italian' },
  { name: 'Focaccia', name_el: 'Φοκάτσια', calories: 280, protein: 8, carbs: 40, fat: 10, fiber: 2, serving_size: 100, serving_unit: 'g', source: 'italian' },

  // ── 🇺🇸 AMERICAN / FAST FOOD ─────────────────────────────────────────────
  { name: 'Cheeseburger (regular)', name_el: 'Τσίζμπεργκερ', calories: 535, protein: 28, carbs: 40, fat: 28, fiber: 1, serving_size: 200, serving_unit: 'g', source: 'american' },
  { name: 'Big Mac', name_el: 'Μπιγκ Μακ', calories: 550, protein: 25, carbs: 45, fat: 30, fiber: 3, serving_size: 212, serving_unit: 'g', source: 'american' },
  { name: 'French Fries (medium)', name_el: 'Τηγανητές πατάτες (medium)', calories: 365, protein: 4, carbs: 48, fat: 17, fiber: 4, serving_size: 117, serving_unit: 'g', source: 'american' },
  { name: 'Chicken McNuggets (6pc)', name_el: 'Μακνάγκετς (6 τμχ)', calories: 280, protein: 16, carbs: 18, fat: 16, fiber: 1, serving_size: 108, serving_unit: 'g', source: 'american' },
  { name: 'Hot Dog', name_el: 'Χοτ Ντογκ', calories: 290, protein: 11, carbs: 23, fat: 17, fiber: 1, serving_size: 100, serving_unit: 'g', source: 'american' },
  { name: 'Pancakes (3 stack, no syrup)', name_el: 'Πάνκεϊκς (3 τμχ)', calories: 360, protein: 10, carbs: 60, fat: 8, fiber: 2, serving_size: 180, serving_unit: 'g', source: 'american' },
  { name: 'Waffles (2 pieces)', name_el: 'Βάφλες (2 τμχ)', calories: 310, protein: 8, carbs: 50, fat: 9, fiber: 1, serving_size: 140, serving_unit: 'g', source: 'american' },
  { name: 'Mac and Cheese', name_el: 'Μακαρόνια με τυρί', calories: 380, protein: 14, carbs: 52, fat: 14, fiber: 1, serving_size: 250, serving_unit: 'g', source: 'american' },
  { name: 'BBQ Ribs', name_el: 'Παϊδάκια BBQ', calories: 310, protein: 22, carbs: 10, fat: 20, fiber: 0, serving_size: 200, serving_unit: 'g', source: 'american' },
  { name: 'Caesar Salad', name_el: 'Σαλάτα Καίσαρα', calories: 360, protein: 22, carbs: 14, fat: 24, fiber: 3, serving_size: 300, serving_unit: 'g', source: 'american' },
  { name: 'Club Sandwich', name_el: 'Κλαμπ Σάντουιτς', calories: 560, protein: 35, carbs: 40, fat: 26, fiber: 3, serving_size: 260, serving_unit: 'g', source: 'american' },
  { name: 'Cheesecake (slice)', name_el: 'Τσίζκεϊκ (φέτα)', calories: 400, protein: 7, carbs: 38, fat: 24, fiber: 1, serving_size: 130, serving_unit: 'g', source: 'american' },
  { name: 'Brownie', name_el: 'Μπράουνι', calories: 466, protein: 5, carbs: 60, fat: 24, fiber: 2, serving_size: 100, serving_unit: 'g', source: 'american' },
  { name: 'Peanut butter (regular)', name_el: 'Βούτυρο αράπικου φιστικιού', calories: 595, protein: 25, carbs: 20, fat: 50, fiber: 6, serving_size: 32, serving_unit: 'g', source: 'american' },

  // ── 🇯🇵 JAPANESE ──────────────────────────────────────────────────────────
  { name: 'Salmon sushi (nigiri, 1pc)', name_el: 'Σολωμός νιγκίρι (1 τμχ)', calories: 65, protein: 4, carbs: 9, fat: 1, fiber: 0, serving_size: 30, serving_unit: 'g', source: 'japanese' },
  { name: 'Tuna sushi (nigiri, 1pc)', name_el: 'Τόνος νιγκίρι (1 τμχ)', calories: 60, protein: 4, carbs: 9, fat: 0, fiber: 0, serving_size: 28, serving_unit: 'g', source: 'japanese' },
  { name: 'California Roll (8pc)', name_el: 'Καλιφόρνια ρολ (8 τμχ)', calories: 250, protein: 9, carbs: 38, fat: 7, fiber: 3, serving_size: 180, serving_unit: 'g', source: 'japanese' },
  { name: 'Salmon Roll (8pc)', name_el: 'Ρολ σολωμού (8 τμχ)', calories: 260, protein: 13, carbs: 32, fat: 8, fiber: 2, serving_size: 180, serving_unit: 'g', source: 'japanese' },
  { name: 'Ramen (chicken broth)', name_el: 'Ράμεν κοτόπουλο', calories: 430, protein: 20, carbs: 60, fat: 10, fiber: 3, serving_size: 500, serving_unit: 'ml' },
  { name: 'Miso Soup', name_el: 'Σούπα μίσο', calories: 40, protein: 3, carbs: 5, fat: 1, fiber: 1, serving_size: 240, serving_unit: 'ml' },
  { name: 'Edamame (shelled)', name_el: 'Εντάμαμε', calories: 120, protein: 11, carbs: 9, fat: 5, fiber: 5, serving_size: 100, serving_unit: 'g', source: 'japanese' },
  { name: 'Chicken Teriyaki', name_el: 'Κοτόπουλο τεριγιάκι', calories: 300, protein: 28, carbs: 18, fat: 12, fiber: 0, serving_size: 250, serving_unit: 'g', source: 'japanese' },
  { name: 'Tempura (shrimp, 3pc)', name_el: 'Τεμπούρα γαρίδες (3 τμχ)', calories: 180, protein: 8, carbs: 20, fat: 8, fiber: 1, serving_size: 90, serving_unit: 'g', source: 'japanese' },
  { name: 'Onigiri (salmon)', name_el: 'Ονιγκίρι σολωμός', calories: 185, protein: 8, carbs: 36, fat: 2, fiber: 1, serving_size: 110, serving_unit: 'g', source: 'japanese' },
  { name: 'Gyoza (6pc pan-fried)', name_el: 'Γκιόζα τηγανητά (6 τμχ)', calories: 210, protein: 10, carbs: 22, fat: 9, fiber: 1, serving_size: 120, serving_unit: 'g', source: 'japanese' },
  { name: 'Sashimi salmon (5pc)', name_el: 'Σασίμι σολωμός (5 τμχ)', calories: 130, protein: 18, carbs: 0, fat: 6, fiber: 0, serving_size: 85, serving_unit: 'g', source: 'japanese' },

  // ── 🇨🇳 CHINESE ──────────────────────────────────────────────────────────
  { name: 'Fried Rice (chicken)', name_el: 'Τηγανητό ρύζι κοτόπουλο', calories: 420, protein: 18, carbs: 62, fat: 10, fiber: 2, serving_size: 350, serving_unit: 'g', source: 'chinese' },
  { name: 'Spring Rolls (2pc, fried)', name_el: 'Σπρινγκ ρολς (2 τμχ)', calories: 190, protein: 5, carbs: 22, fat: 10, fiber: 2, serving_size: 120, serving_unit: 'g', source: 'chinese' },
  { name: 'Kung Pao Chicken', name_el: 'Κοτόπουλο Κουνγκ Πάο', calories: 380, protein: 26, carbs: 22, fat: 20, fiber: 2, serving_size: 300, serving_unit: 'g', source: 'chinese' },
  { name: 'Sweet and Sour Pork', name_el: 'Γλυκόξινο χοιρινό', calories: 420, protein: 20, carbs: 45, fat: 18, fiber: 2, serving_size: 300, serving_unit: 'g', source: 'chinese' },
  { name: 'Dim Sum (4pc ha gow)', name_el: 'Ντιμ Σαμ γαρίδα (4 τμχ)', calories: 140, protein: 8, carbs: 18, fat: 4, fiber: 1, serving_size: 90, serving_unit: 'g', source: 'chinese' },
  { name: 'Wonton Soup', name_el: 'Σούπα γουόντον', calories: 180, protein: 10, carbs: 20, fat: 6, fiber: 1, serving_size: 350, serving_unit: 'ml' },
  { name: 'Peking Duck (with pancakes)', name_el: 'Πεκίνος παπάκι', calories: 440, protein: 26, carbs: 32, fat: 24, fiber: 1, serving_size: 200, serving_unit: 'g', source: 'chinese' },
  { name: 'Mapo Tofu', name_el: 'Μάπο Τόφου', calories: 220, protein: 14, carbs: 8, fat: 14, fiber: 2, serving_size: 250, serving_unit: 'g', source: 'chinese' },

  // ── 🇲🇽 MEXICAN ──────────────────────────────────────────────────────────
  { name: 'Beef Taco (2pc)', name_el: 'Τάκο μοσχάρι (2 τμχ)', calories: 360, protein: 18, carbs: 34, fat: 16, fiber: 4, serving_size: 180, serving_unit: 'g', source: 'mexican' },
  { name: 'Chicken Burrito', name_el: 'Μπουρίτο κοτόπουλο', calories: 580, protein: 32, carbs: 68, fat: 18, fiber: 6, serving_size: 380, serving_unit: 'g', source: 'mexican' },
  { name: 'Guacamole', name_el: 'Γκουακαμόλε', calories: 160, protein: 2, carbs: 9, fat: 14, fiber: 7, serving_size: 100, serving_unit: 'g', source: 'mexican' },
  { name: 'Nachos with cheese', name_el: 'Νάτσος με τυρί', calories: 520, protein: 14, carbs: 58, fat: 28, fiber: 4, serving_size: 180, serving_unit: 'g', source: 'mexican' },
  { name: 'Quesadilla (cheese)', name_el: 'Κεσαντίγια τυρί', calories: 480, protein: 22, carbs: 44, fat: 24, fiber: 2, serving_size: 200, serving_unit: 'g', source: 'mexican' },
  { name: 'Chicken Fajitas', name_el: 'Φαχίτας κοτόπουλο', calories: 350, protein: 28, carbs: 32, fat: 12, fiber: 4, serving_size: 250, serving_unit: 'g', source: 'mexican' },
  { name: 'Refried Beans', name_el: 'Μαγειρεμένα φασόλια', calories: 140, protein: 8, carbs: 22, fat: 3, fiber: 6, serving_size: 150, serving_unit: 'g', source: 'mexican' },
  { name: 'Salsa (tomato)', name_el: 'Σάλσα ντομάτας', calories: 30, protein: 1, carbs: 7, fat: 0, fiber: 2, serving_size: 100, serving_unit: 'g', source: 'mexican' },
  { name: 'Corn Tortilla (2pc)', name_el: 'Τορτίγια καλαμποκιού (2 τμχ)', calories: 100, protein: 3, carbs: 20, fat: 1, fiber: 3, serving_size: 46, serving_unit: 'g', source: 'mexican' },
  { name: 'Enchiladas (beef, 2pc)', name_el: 'Ετσιλάδας μοσχάρι (2 τμχ)', calories: 430, protein: 22, carbs: 42, fat: 18, fiber: 4, serving_size: 250, serving_unit: 'g', source: 'mexican' },

  // ── 🇮🇳 INDIAN ───────────────────────────────────────────────────────────
  { name: 'Chicken Tikka Masala', name_el: 'Κοτόπουλο Τίκα Μασάλα', calories: 380, protein: 28, carbs: 18, fat: 20, fiber: 3, serving_size: 350, serving_unit: 'g', source: 'indian' },
  { name: 'Butter Chicken (Murgh Makhani)', name_el: 'Κοτόπουλο Βούτυρο', calories: 420, protein: 28, carbs: 16, fat: 26, fiber: 2, serving_size: 350, serving_unit: 'g', source: 'indian' },
  { name: 'Naan bread', name_el: 'Ψωμί Νάαν', calories: 310, protein: 9, carbs: 56, fat: 6, fiber: 2, serving_size: 130, serving_unit: 'g', source: 'indian' },
  { name: 'Basmati rice (cooked)', name_el: 'Ρύζι Μπασμάτι (μαγειρεμένο)', calories: 150, protein: 3, carbs: 33, fat: 0, fiber: 0, serving_size: 150, serving_unit: 'g', source: 'indian' },
  { name: 'Dal (lentil curry)', name_el: 'Ντάλ (φακές κάρι)', calories: 190, protein: 12, carbs: 28, fat: 4, fiber: 8, serving_size: 300, serving_unit: 'g', source: 'indian' },
  { name: 'Samosa (2pc, fried)', name_el: 'Σαμόσα (2 τμχ)', calories: 260, protein: 5, carbs: 28, fat: 14, fiber: 3, serving_size: 100, serving_unit: 'g', source: 'indian' },
  { name: 'Palak Paneer', name_el: 'Σπανάκι με τυρί πανίρ', calories: 280, protein: 14, carbs: 12, fat: 20, fiber: 4, serving_size: 300, serving_unit: 'g', source: 'indian' },
  { name: 'Biryani (chicken)', name_el: 'Μπιριάνι κοτόπουλο', calories: 480, protein: 25, carbs: 58, fat: 14, fiber: 3, serving_size: 400, serving_unit: 'g', source: 'indian' },
  { name: 'Mango Lassi', name_el: 'Μάνγκο Λάσι', calories: 180, protein: 5, carbs: 36, fat: 3, fiber: 1, serving_size: 300, serving_unit: 'ml' },
  { name: 'Chapati (1pc)', name_el: 'Τσαπάτι (1 τμχ)', calories: 100, protein: 3, carbs: 18, fat: 2, fiber: 3, serving_size: 40, serving_unit: 'g', source: 'indian' },

  // ── 🇹🇷 MIDDLE EASTERN / TURKISH ─────────────────────────────────────────
  { name: 'Falafel (4pc)', name_el: 'Φαλάφελ (4 τμχ)', calories: 250, protein: 10, carbs: 26, fat: 12, fiber: 6, serving_size: 120, serving_unit: 'g', source: 'middle_eastern' },
  { name: 'Shawarma wrap (chicken)', name_el: 'Σαουαρμά κοτόπουλο', calories: 520, protein: 28, carbs: 50, fat: 22, fiber: 4, serving_size: 300, serving_unit: 'g', source: 'middle_eastern' },
  { name: 'Kebab (lamb, 1 skewer)', name_el: 'Κεμπάπ αρνί (1 σουβλάκι)', calories: 240, protein: 20, carbs: 2, fat: 16, fiber: 0, serving_size: 120, serving_unit: 'g', source: 'middle_eastern' },
  { name: 'Tabouleh', name_el: 'Ταμπουλέ', calories: 110, protein: 3, carbs: 14, fat: 5, fiber: 3, serving_size: 150, serving_unit: 'g', source: 'middle_eastern' },
  { name: 'Fattoush salad', name_el: 'Σαλάτα Φατούς', calories: 130, protein: 3, carbs: 18, fat: 6, fiber: 3, serving_size: 200, serving_unit: 'g', source: 'middle_eastern' },
  { name: 'Pita bread (Arabic)', name_el: 'Πίτα αραβική', calories: 165, protein: 5, carbs: 33, fat: 1, fiber: 1, serving_size: 60, serving_unit: 'g', source: 'middle_eastern' },
  { name: 'Labneh (strained yogurt)', name_el: 'Λάμπνε (στραγγιστό)', calories: 150, protein: 8, carbs: 5, fat: 11, fiber: 0, serving_size: 100, serving_unit: 'g', source: 'middle_eastern' },
  { name: 'Kibbeh (2pc baked)', name_el: 'Κιμπέ ψητό (2 τμχ)', calories: 230, protein: 14, carbs: 20, fat: 10, fiber: 2, serving_size: 130, serving_unit: 'g', source: 'middle_eastern' },
  { name: 'Turkish Doner (wrap)', name_el: 'Ντόνερ τουρκικό', calories: 560, protein: 26, carbs: 50, fat: 26, fiber: 3, serving_size: 300, serving_unit: 'g', source: 'middle_eastern' },

  // ── 🇹🇭 THAI ────────────────────────────────────────────────────────────
  { name: 'Pad Thai (chicken)', name_el: 'Παντ Τάι κοτόπουλο', calories: 480, protein: 22, carbs: 62, fat: 14, fiber: 3, serving_size: 350, serving_unit: 'g', source: 'thai' },
  { name: 'Green Curry (chicken)', name_el: 'Πράσινο κάρι κοτόπουλο', calories: 380, protein: 22, carbs: 18, fat: 24, fiber: 3, serving_size: 350, serving_unit: 'g', source: 'thai' },
  { name: 'Tom Yum Soup', name_el: 'Σούπα Τομ Γιαμ', calories: 90, protein: 8, carbs: 8, fat: 3, fiber: 2, serving_size: 350, serving_unit: 'ml' },
  { name: 'Mango Sticky Rice', name_el: 'Μάνγκο με κολλώδες ρύζι', calories: 350, protein: 4, carbs: 68, fat: 8, fiber: 3, serving_size: 250, serving_unit: 'g', source: 'thai' },
  { name: 'Spring Roll (Thai, 2pc)', name_el: 'Σπρινγκ ρολ Ταϊλανδέζικο (2 τμχ)', calories: 140, protein: 4, carbs: 20, fat: 5, fiber: 2, serving_size: 100, serving_unit: 'g', source: 'thai' },

  // ── 🇰🇷 KOREAN ───────────────────────────────────────────────────────────
  { name: 'Bibimbap (beef)', name_el: 'Μπιμπιμπάπ με βοδινό', calories: 480, protein: 22, carbs: 68, fat: 12, fiber: 4, serving_size: 400, serving_unit: 'g', source: 'korean' },
  { name: 'Korean BBQ Beef (Bulgogi)', name_el: 'Κορεάτικο BBQ βοδινό', calories: 280, protein: 24, carbs: 12, fat: 14, fiber: 0, serving_size: 200, serving_unit: 'g', source: 'korean' },
  { name: 'Kimchi', name_el: 'Κίμτσι', calories: 23, protein: 2, carbs: 4, fat: 0, fiber: 2, serving_size: 100, serving_unit: 'g', source: 'korean' },
  { name: 'Korean Fried Chicken', name_el: 'Κορεάτικο τηγανητό κοτόπουλο', calories: 380, protein: 28, carbs: 22, fat: 20, fiber: 1, serving_size: 200, serving_unit: 'g', source: 'korean' },
  { name: 'Japchae (glass noodles)', name_el: 'Τζάπτσε (γυάλινα νούντλς)', calories: 320, protein: 10, carbs: 48, fat: 8, fiber: 3, serving_size: 250, serving_unit: 'g', source: 'korean' },

  // ── 🥩 BASIC PROTEINS (universal) ────────────────────────────────────────
  { name: 'Chicken breast (grilled)', name_el: 'Στήθος κοτόπουλο (σχάρα)', calories: 165, protein: 31, carbs: 0, fat: 3, fiber: 0, serving_size: 150, serving_unit: 'g', source: 'basic' },
  { name: 'Chicken thigh (grilled)', name_el: 'Μπούτι κοτόπουλο (σχάρα)', calories: 210, protein: 26, carbs: 0, fat: 11, fiber: 0, serving_size: 150, serving_unit: 'g', source: 'basic' },
  { name: 'Beef steak (sirloin)', name_el: 'Μπριζόλα σιρλόιν', calories: 270, protein: 26, carbs: 0, fat: 17, fiber: 0, serving_size: 200, serving_unit: 'g', source: 'basic' },
  { name: 'Salmon (grilled)', name_el: 'Σολωμός (σχάρα)', calories: 200, protein: 25, carbs: 0, fat: 10, fiber: 0, serving_size: 150, serving_unit: 'g', source: 'basic' },
  { name: 'Tuna (canned in water)', name_el: 'Τόνος κονσέρβα στο νερό', calories: 110, protein: 25, carbs: 0, fat: 1, fiber: 0, serving_size: 85, serving_unit: 'g', source: 'basic' },
  { name: 'Eggs (whole, 2 large)', name_el: 'Αυγά (2 μεγάλα)', calories: 140, protein: 12, carbs: 1, fat: 10, fiber: 0, serving_size: 100, serving_unit: 'g', source: 'basic' },
  { name: 'Egg white (3 large)', name_el: 'Ασπράδι αυγού (3 τμχ)', calories: 51, protein: 11, carbs: 1, fat: 0, fiber: 0, serving_size: 100, serving_unit: 'g', source: 'basic' },
  { name: 'Cottage cheese', name_el: 'Τυρί κότατζ', calories: 98, protein: 11, carbs: 3, fat: 4, fiber: 0, serving_size: 200, serving_unit: 'g', source: 'basic' },
  { name: 'Shrimp (boiled)', name_el: 'Γαρίδες βραστές', calories: 99, protein: 21, carbs: 0, fat: 1, fiber: 0, serving_size: 150, serving_unit: 'g', source: 'basic' },

  // ── 🥦 BASIC VEGGIES & CARBS (universal) ──────────────────────────────────
  { name: 'Broccoli (steamed)', name_el: 'Μπρόκολο (βραστό)', calories: 35, protein: 3, carbs: 6, fat: 0, fiber: 3, serving_size: 150, serving_unit: 'g', source: 'basic' },
  { name: 'Brown rice (cooked)', name_el: 'Καστανό ρύζι (μαγειρεμένο)', calories: 215, protein: 5, carbs: 45, fat: 2, fiber: 3, serving_size: 180, serving_unit: 'g', source: 'basic' },
  { name: 'White rice (cooked)', name_el: 'Άσπρο ρύζι (μαγειρεμένο)', calories: 205, protein: 4, carbs: 45, fat: 0, fiber: 1, serving_size: 180, serving_unit: 'g', source: 'basic' },
  { name: 'Oats (dry)', name_el: 'Νιφάδες βρώμης (ωμές)', calories: 370, protein: 13, carbs: 66, fat: 7, fiber: 10, serving_size: 80, serving_unit: 'g', source: 'basic' },
  { name: 'Sweet potato (baked)', name_el: 'Γλυκοπατάτα (ψητή)', calories: 130, protein: 3, carbs: 30, fat: 0, fiber: 4, serving_size: 150, serving_unit: 'g', source: 'basic' },
  { name: 'Banana (medium)', name_el: 'Μπανάνα (μεσαία)', calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3, serving_size: 118, serving_unit: 'g', source: 'basic' },
  { name: 'Apple (medium)', name_el: 'Μήλο (μεσαίο)', calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4, serving_size: 182, serving_unit: 'g', source: 'basic' },
  { name: 'Avocado (half)', name_el: 'Αβοκάντο (μισό)', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, serving_size: 100, serving_unit: 'g', source: 'basic' },
  { name: 'Almonds', name_el: 'Αμύγδαλα', calories: 580, protein: 21, carbs: 20, fat: 49, fiber: 13, serving_size: 28, serving_unit: 'g', source: 'basic' },
  { name: 'Whey Protein (1 scoop)', name_el: 'Πρωτεΐνη ορού γάλακτος (1 μέρτρο)', calories: 120, protein: 24, carbs: 3, fat: 2, fiber: 0, serving_size: 30, serving_unit: 'g', source: 'basic' },

  // ── 🥤 DRINKS ─────────────────────────────────────────────────────────────
  { name: 'Coca-Cola (can)', name_el: 'Κόκα Κόλα (κουτί)', calories: 140, protein: 0, carbs: 39, fat: 0, fiber: 0, serving_size: 330, serving_unit: 'ml' },
  { name: 'Orange juice (fresh)', name_el: 'Χυμός πορτοκάλι (φρέσκος)', calories: 112, protein: 2, carbs: 26, fat: 0, fiber: 0, serving_size: 250, serving_unit: 'ml' },
  { name: 'Whole milk', name_el: 'Γάλα πλήρες', calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0, serving_size: 250, serving_unit: 'ml' },
  { name: 'Skim milk', name_el: 'Γάλα αποβουτυρωμένο', calories: 90, protein: 9, carbs: 13, fat: 0, fiber: 0, serving_size: 250, serving_unit: 'ml' },
  { name: 'Almond milk (unsweetened)', name_el: 'Γάλα αμυγδάλου (χωρίς ζάχαρη)', calories: 40, protein: 1, carbs: 2, fat: 3, fiber: 1, serving_size: 250, serving_unit: 'ml' },
  { name: 'Espresso (single shot)', name_el: 'Εσπρέσο (μονό)', calories: 5, protein: 0, carbs: 1, fat: 0, fiber: 0, serving_size: 30, serving_unit: 'ml' },
  { name: 'Cappuccino (standard)', name_el: 'Καπουτσίνο', calories: 80, protein: 4, carbs: 8, fat: 3, fiber: 0, serving_size: 180, serving_unit: 'ml' },
  { name: 'Latte (standard)', name_el: 'Λάτε', calories: 130, protein: 7, carbs: 13, fat: 5, fiber: 0, serving_size: 300, serving_unit: 'ml' },
  { name: 'Beer (regular, 330ml)', name_el: 'Μπίρα (330ml)', calories: 145, protein: 1, carbs: 13, fat: 0, fiber: 0, serving_size: 330, serving_unit: 'ml' },
  { name: 'Red wine (glass)', name_el: 'Κόκκινο κρασί (ποτήρι)', calories: 125, protein: 0, carbs: 4, fat: 0, fiber: 0, serving_size: 150, serving_unit: 'ml' },
  { name: 'Protein shake (standard)', name_el: 'Πρωτεϊνούχο ρόφημα', calories: 200, protein: 30, carbs: 10, fat: 4, fiber: 2, serving_size: 400, serving_unit: 'ml' },
];

async function seed() {
  console.log('🌱 Seeding FitTrack Pro global food database...');
  let inserted = 0;
  const allFoods = [...greekFoods, ...internationalFoods];
  for (const food of allFoods) {
    try {
      const dbSource = food.source || 'greek_db';
      await pool.query(
        `INSERT INTO foods (name, name_el, serving_size, serving_unit, calories, protein, carbs, fat, fiber, source, verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         ON CONFLICT DO NOTHING`,
        [food.name, food.name_el, food.serving_size, food.serving_unit,
         food.calories, food.protein, food.carbs, food.fat, food.fiber, dbSource]
      );
      inserted++;
    } catch (err) {
      console.error(`Failed to insert ${food.name}:`, err.message);
    }
  }
  console.log(`✅ Inserted ${inserted}/${allFoods.length} foods (Greek + International)`);
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
