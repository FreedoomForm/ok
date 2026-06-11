export interface Ingredient {
  name: string;
  amount: string; // e.g., "71.4 gr", "150 gr", "2 dona"
}

export interface Dish {
  name: string;
  mealType?: string; // optional: "Nonushta", "Tushlik", etc.
  ingredients: Ingredient[];
}

export interface Menu {
  day: number; // 1-21
  dishes: Dish[];
}

export interface CalorieGroupMenus {
  calorieGroup: string; // e.g., "1000-1200", "1400-1600"
  menus: Menu[]; // length 21, index 0 = day 1
}

export interface ParsedMenuData {
  groups: CalorieGroupMenus[];
}

// For date calculations
export interface DateMenuInfo {
  day: number;
  menu: Menu;
  calorieGroup: string;
}