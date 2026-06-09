
import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'Taomnomalarning Mahsulot Gramlari.txt');
const content = fs.readFileSync(inputFile, 'utf-8');

const MEAL_TYPES = [
    'BREAKFAST',
    'SECOND_BREAKFAST',
    'LUNCH',
    'SNACK',
    'DINNER'
];

function parseMenus() {
    const lines = content.split('\n');
    const menus: any[] = [];
    let currentMenu: any = null;
    let currentDish: any = null;
    let dishCount = 0;

    // We only care about the first section (1200 kcal base)
    // It ends around line 421 or when we hit "PDF dagi..."

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('PDF dagi')) break;

        const menuMatch = trimmed.match(/\*\*(\d+)-MENYU\*\*/);
        if (menuMatch) {
            if (currentMenu) menus.push(currentMenu);
            currentMenu = {
                menuNumber: parseInt(menuMatch[1]),
                dishes: []
            };
            dishCount = 0;
            continue;
        }

        if (trimmed.startsWith('*   **')) {
            // New dish
            const nameMatch = trimmed.match(/\*   \*\*(.*?):\*\*/);
            if (nameMatch) {
                const name = nameMatch[1];
                currentDish = {
                    id: (currentMenu.menuNumber * 10) + dishCount, // generate simple ID
                    name: name,
                    mealType: MEAL_TYPES[dishCount] || 'UNKNOWN',
                    ingredients: []
                };
                currentMenu.dishes.push(currentDish);
                dishCount++;
            }
        } else if (trimmed.startsWith('*   ') && !trimmed.startsWith('*   **')) {
            // Ingredient
            // Format: *   Ingredient: Amount Unit
            // Example: *   Xamir (Margarin/Qatiq/Un): 71.4 gr
            const parts = trimmed.replace('*   ', '').split(':');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const amountPart = parts[1].trim();

                // Extract amount and unit
                const amountMatch = amountPart.match(/([\d.]+)\s*(.*)/);
                if (amountMatch) {
                    currentDish.ingredients.push({
                        name: name,
                        amount: parseFloat(amountMatch[1]),
                        unit: amountMatch[2] || 'gr'
                    });
                }
            }
        }
    }
    if (currentMenu) menus.push(currentMenu);

    const output = 'export const MENUS: DailyMenu[] = ' + JSON.stringify(menus, null, 2) + ';';
    const outputPath = path.join(process.cwd(), 'src/lib/menuData.parsed.ts');
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log('Successfully wrote parsed menus to', outputPath);
}

parseMenus();
