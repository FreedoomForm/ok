
import {
    calculateIngredientsForMenu,
    CALORIE_MULTIPLIERS,
    MEAL_TYPES,
    MENU_CYCLE_DAYS,
    MENUS,
    getMenu
} from '../src/lib/menuData';

// Mock data to verify 3000 CALORIE SCENARIO
// Client distribution: 1 client for 3000 kcal only
const clientsByCalorie = {
    1200: 0,
    1600: 0,
    2000: 0,
    2500: 0,
    3000: 1  // Target for Verification
};

function verify() {
    console.log("=== Verifying Calorie Calculations (3000 kcal) ===");
    console.log("Multipliers:", JSON.stringify(CALORIE_MULTIPLIERS[3000], null, 2));

    // Pick Menu 1 to test
    const menuNum = 1;
    console.log(`\nTesting Menu ${menuNum} for 1 Client @ 3000 kcal:`);

    const result = calculateIngredientsForMenu(menuNum, clientsByCalorie);

    // 1. Verify Standard Dish Multiplier
    const menu = getMenu(menuNum);
    if (!menu) return;

    const lunchDish = menu.dishes.find(d => d.mealType === 'LUNCH');
    if (lunchDish) {
        console.log(`\nChecking LUNCH Dish: ${lunchDish.name}`);
        console.log(`Expected Multiplier: ${CALORIE_MULTIPLIERS[3000].lunch}`);
        const ing = lunchDish.ingredients[0]; // First ingredient
        if (ing) {
            const calculated = result.get(ing.name);
            const expected = ing.amount * CALORIE_MULTIPLIERS[3000].lunch;
            console.log(`Ingredient: ${ing.name} (Base: ${ing.amount})`);
            console.log(`Expected: ${expected}`);
            console.log(`Calculated: ${calculated?.amount}`);

            if (Math.abs((calculated?.amount || 0) - expected) < 0.1) console.log("✅ Multiplier Match");
            else console.log("❌ Multiplier Mismatch");
        }
    }

    // 2. Verify 6th Meal Inclusion
    // 3000 Calorie clients also get the 6th meal?
    // Let's check the calculateIngredientsForMenu logic in menuData.ts
    // Wait, the logic for adding dishes is inside getMenu, but strictly speaking 2500/3000 implies they GET the meal.
    // Does the calculation filter meal types by Calorie Tier? 
    // Checking code...

    const sixthDish = menu.dishes.find(d => d.mealType === 'SIXTH_MEAL');
    if (sixthDish) {
        console.log(`\nChecking HEX MEAL (6th Meal): ${sixthDish.name}`);
        // Logic check: Does 3000 calorie client consume this?
        // In the current implementation of calculateIngredientsForMenu:
        // It iterates ALL dishes in the menu.
        // And multiplies by client count.
        // It does NOT appear to filter "This dish is ONLY for 2500/3000".
        // HOWEVER, `getMenu` ADDS the 6th meal to the list.
        // So EVERYONE gets the 6th meal if it's in the list?
        // Let's verify if the code handles "Some clients get 6th meal, others don't".

        const ing = sixthDish.ingredients[0];
        if (ing) {
            const calculated = result.get(ing.name);
            console.log(`Ingredient for 6th Meal: ${ing.name}`);
            console.log(`Calculated Amount: ${calculated?.amount}`);
            if (calculated) console.log("✅ 6th Meal Ingredients Included");
            else console.log("❌ 6th Meal Ingredients MISSING (Is logic preventing it?)");
        } else {
            console.log("ℹ️ 6th Meal has no ingredients defined yet.");
        }
    } else {
        console.log("❌ 6th Meal NOT found in Menu object.");
    }
}

verify();
