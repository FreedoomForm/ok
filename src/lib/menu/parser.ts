import fs from 'fs';
import path from 'path';
import { ParsedMenuData, CalorieGroupMenus, Menu, Dish, Ingredient } from './types';

/**
 * Parse the text file and extract menu data for all calorie groups.
 */
export function parseMenuFile(filePath: string): ParsedMenuData {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // We'll split the content into sections based on "DASTUR:" or "**X-MENYU**"
  // For simplicity, we'll parse each calorie group manually because the format is known.
  // We'll define start and end lines for each group.

  // Determine indices of each group
  const groups: Array<{ name: string; start: number; end?: number }> = [];

  // Base group (1000-1200) starts at line 4 (0-indexed) and ends before "### **DASTUR: SLIM"
  const baseStart = lines.findIndex(line => line.includes('**1-MENYU**'));
  const slimStart = lines.findIndex(line => line.includes('### **DASTUR: SLIM'));
  const massStart = lines.findIndex(line => line.includes('### **DASTUR: MASS & POWER'));
  const sportStart = lines.findIndex(line => line.includes('### **DASTUR: SPORT'));
  const hulkStart = lines.findIndex(line => line.includes('### **DASTUR: HULK'));

  // We'll assume each group continues until the next group start or end of file.
  groups.push({ name: '1000-1200', start: baseStart });
  groups.push({ name: '1400-1600', start: slimStart });
  groups.push({ name: '2200-2500', start: massStart });
  groups.push({ name: '1800-2000', start: sportStart });
  groups.push({ name: '3000-3200', start: hulkStart });

  // Sort by start index and assign end indices
  groups.sort((a, b) => a.start - b.start);
  for (let i = 0; i < groups.length; i++) {
    const nextStart = i + 1 < groups.length ? groups[i + 1].start : lines.length;
    groups[i].end = nextStart;
  }

  const calorieGroups: CalorieGroupMenus[] = [];

  for (const group of groups) {
    if (group.start === -1) continue;
    const sectionLines = lines.slice(group.start, group.end);
    const menus = parseSection(sectionLines, group.name);
    calorieGroups.push({
      calorieGroup: group.name,
      menus,
    });
  }

  return { groups: calorieGroups };
}

/**
 * Parse a section of lines containing 21 menus.
 */
function parseSection(lines: string[], calorieGroup: string): Menu[] {
  const menus: Menu[] = [];
  let currentDay = 0;
  let currentDishes: Dish[] = [];
  let currentDish: Dish | null = null;
  let currentIngredients: Ingredient[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect menu day header like "**1-MENYU**"
    const dayMatch = line.match(/\*\*(\d+)-MENYU\*\*/);
    if (dayMatch) {
      // Save previous dish if any
      if (currentDish) {
        currentDish.ingredients = currentIngredients;
        currentDishes.push(currentDish);
        currentDish = null;
        currentIngredients = [];
      }
      // Save previous menu if any
      if (currentDay > 0) {
        menus.push({
          day: currentDay,
          dishes: currentDishes,
        });
      }
      // Start new menu
      currentDay = parseInt(dayMatch[1], 10);
      currentDishes = [];
      continue;
    }

    // Detect dish line: starts with "*   **" (bold) or "*   " (maybe with meal type)
    // Example: "*   **Balish (Pirog):**" or "*   **Balish (Pirog):** Xamir: 100 gr, Tovuq filesi: 64 gr, Piyoz: 60 gr"
    if (line.startsWith('*   **') && line.includes(':**')) {
      // Save previous dish if any
      if (currentDish) {
        currentDish.ingredients = currentIngredients;
        currentDishes.push(currentDish);
        currentIngredients = [];
      }
      // Extract dish name
      const dishName = line.replace('*   **', '').split(':**')[0] + '**'; // keep bold? we'll strip later
      // Remove any trailing ** and trim
      const cleanName = dishName.replace(/\*\*/g, '').trim();
      currentDish = {
        name: cleanName,
        ingredients: [],
      };
      // Check if the line contains ingredients after colon
      const afterColon = line.split(':**')[1];
      if (afterColon && afterColon.trim()) {
        // Parse inline ingredients (comma separated)
        const ingredientStrings = afterColon.split(',').map(s => s.trim()).filter(Boolean);
        for (const ingStr of ingredientStrings) {
          const ingredient = parseIngredient(ingStr);
          if (ingredient) {
            currentIngredients.push(ingredient);
          }
        }
      }
      continue;
    }

    // Detect ingredient line: starts with "    *   " (nested bullet)
    if (line.startsWith('    *   ')) {
      const ingStr = line.replace('    *   ', '').trim();
      const ingredient = parseIngredient(ingStr);
      if (ingredient) {
        currentIngredients.push(ingredient);
      }
      continue;
    }

    // Detect ingredient line with different indentation (maybe "     *   ")
    if (line.startsWith('     *   ')) {
      const ingStr = line.replace('     *   ', '').trim();
      const ingredient = parseIngredient(ingStr);
      if (ingredient) {
        currentIngredients.push(ingredient);
      }
      continue;
    }

    // Empty line indicates end of dish? Not reliable.
  }

  // Finish last dish
  if (currentDish) {
    currentDish.ingredients = currentIngredients;
    currentDishes.push(currentDish);
  }
  // Finish last menu
  if (currentDay > 0) {
    menus.push({
      day: currentDay,
      dishes: currentDishes,
    });
  }

  // Ensure we have 21 menus
  if (menus.length < 21) {
    console.warn(`Only parsed ${menus.length} menus for ${calorieGroup}`);
  }

  return menus;
}

/**
 * Parse ingredient string like "Xamir (Margarin/Qatiq/Un): 71.4 gr" or "Tovuq filesi: 45.7 gr"
 * Returns Ingredient or null.
 */
function parseIngredient(text: string): Ingredient | null {
  // Split by colon
  const colonIndex = text.indexOf(':');
  if (colonIndex === -1) return null;
  const name = text.substring(0, colonIndex).trim();
  const amount = text.substring(colonIndex + 1).trim();
  return { name, amount };
}

// For testing
if (require.main === module) {
  const data = parseMenuFile(path.join(__dirname, '../../../Taomnomalarning Mahsulot Gramlari.txt'));
  console.log(JSON.stringify(data, null, 2));
}