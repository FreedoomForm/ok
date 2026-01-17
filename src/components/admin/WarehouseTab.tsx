'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Package,
    Calculator,
    ShoppingCart,
    Save,
    Plus,
    Minus,
    Calendar,
    ChefHat,
    Loader2,
    RefreshCw,
    Utensils,
    AlertTriangle,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import {
    getTomorrowsMenuNumber,
    getTomorrowsMenu,
    getMenu,
    getMenuNumber,
    getDishImageUrl,
    calculateIngredientsForMenu,
    calculateShoppingList,
    getAllIngredients,
    scaleIngredients,
    CALORIE_MULTIPLIERS,
    MEAL_TYPES,
    type DailyMenu,
    type Dish,
} from '@/lib/menuData';
import { DishesManager } from './warehouse/DishesManager';
import { IngredientsManager } from './warehouse/IngredientsManager';
import { CookingManager } from './warehouse/CookingManager'; // Integrated
import { useLanguage } from '@/contexts/LanguageContext';

interface WarehouseTabProps {
    className?: string;
}

interface DishQuantity {
    dishId: number;
    quantity: number;
}

interface InventoryItem {
    name: string;
    amount: number;
    unit: string;
}

export function WarehouseTab({ className }: WarehouseTabProps) {
    const { t } = useLanguage();
    const [activeSubTab, setActiveSubTab] = useState('cooking');
    const [tomorrowMenu, setTomorrowMenu] = useState<DailyMenu | undefined>(undefined);
    const [tomorrowMenuNumber, setTomorrowMenuNumber] = useState<number>(0);
    const [dishQuantities, setDishQuantities] = useState<Record<number, number>>({});
    const [inventory, setInventory] = useState<Record<string, number>>({});
    const [clientsByCalorie, setClientsByCalorie] = useState<Record<number, number>>({
        1200: 0,
        1600: 0,
        2000: 0,
        2500: 0,
        3000: 0,
    });
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

    // Calculation state
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [calculatedIngredients, setCalculatedIngredients] = useState<Map<string, { amount: number; unit: string }>>(new Map());
    const [shoppingList, setShoppingList] = useState<Map<string, { amount: number; unit: string }>>(new Map());

    // Load tomorrow's menu on mount
    useEffect(() => {
        const menuNumber = getTomorrowsMenuNumber();
        setTomorrowMenuNumber(menuNumber);
        const menu = getTomorrowsMenu();
        setTomorrowMenu(menu);

        // Note: dish quantities will be set after clientsByCalorie is loaded
        // See the effect below that depends on both menu and clientsByCalorie

        // Fetch data from API
        fetchData();
    }, [tomorrowMenuNumber]);

    // Set default dish quantities based on total active clients
    useEffect(() => {
        if (!tomorrowMenu) return;
        const totalClients = Object.values(clientsByCalorie).reduce((sum, count) => sum + count, 0);

        // Only set quantities if clients have been loaded (totalClients > 0)
        // If totalClients is 0, either no clients exist or data hasn't loaded yet
        // In practice, this should update once fetchClientCalories completes
        if (totalClients === 0) return;

        const initialQuantities: Record<number, number> = {};
        tomorrowMenu.dishes.forEach(dish => {
            // Default to total clients, but user can adjust
            initialQuantities[dish.id] = totalClients;
        });
        setDishQuantities(initialQuantities);
    }, [tomorrowMenu, clientsByCalorie]);

    // Fetch client calorie distribution from database
    const fetchClientCalories = useCallback(async () => {
        setIsLoadingClients(true);
        try {
            const response = await fetch('/api/admin/clients');
            if (response.ok) {
                const clients = await response.json();
                const distribution: Record<number, number> = {
                    1200: 0,
                    1600: 0,
                    2000: 0,
                    2500: 0,
                    3000: 0,
                };

                // Calculate tomorrow's day of week
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const dayOfWeek = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

                clients.forEach((client: { calories?: number; isActive?: boolean; deliveryDays?: Record<string, boolean> }) => {
                    if (client.isActive !== false) {
                        // Filter by delivery day if available
                        if (client.deliveryDays && client.deliveryDays[dayOfWeek as keyof typeof client.deliveryDays] === false) {
                            return;
                        }

                        const calories = client.calories || 2000;
                        // Map to nearest tier
                        if (calories <= 1400) distribution[1200]++;
                        else if (calories <= 1800) distribution[1600]++;
                        else if (calories <= 2200) distribution[2000]++;
                        else if (calories <= 2800) distribution[2500]++;
                        else distribution[3000]++;
                    }
                });

                setClientsByCalorie(distribution);
                toast.success('Данные клиентов обновлены');
            }
        } catch (error) {
            console.error('Error fetching client data:', error);
            toast.error('Ошибка загрузки данных клиентов');
        } finally {
            setIsLoadingClients(false);
        }
    }, []);

    useEffect(() => {
        fetchClientCalories();
    }, [fetchClientCalories]);

    const fetchInventory = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/warehouse/ingredients');
            if (response.ok) {
                const data = await response.json();
                // Convert array to record: { "Rice": 500, ... }
                const invRecord: Record<string, number> = {};
                data.forEach((item: { name: string, amount: number }) => {
                    invRecord[item.name] = item.amount;
                });
                setInventory(invRecord);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    }, []);

    const fetchData = async () => {
        try {
            fetchInventory();


            // Fetch cooking plan for tomorrow (based on tomorrowMenuNumber and date)
            // We need the date for tomorrow. getTomorrowsMenuNumber() implies +1 day from today roughly, 
            // but let's be precise. The menu cycle starts Dec 4.
            // Actually, we can just save/load by date.
            // Let's assume tomorrow's date for the query.
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            const planResponse = await fetch(`/api/admin/warehouse/cooking-plan?date=${dateStr}`);
            if (planResponse.ok) {
                const data = await planResponse.json();
                if (data.dishes) {
                    setDishQuantities(data.dishes);
                }
            }
        } catch (error) {
            console.error('Error fetching warehouse data:', error);
            toast.error('Ошибка загрузки данных склада');
        }
    };

    const handleImageError = (dishId: number) => {
        setImageErrors(prev => new Set(prev).add(dishId));
    };

    const updateDishQuantity = (dishId: number, delta: number) => {
        setDishQuantities(prev => ({
            ...prev,
            [dishId]: Math.max(0, (prev[dishId] || 0) + delta),
        }));
    };

    const handleQuantityChange = (dishId: number, value: string) => {
        const num = parseInt(value) || 0;
        setDishQuantities(prev => ({
            ...prev,
            [dishId]: Math.max(0, num),
        }));
    };


    // updateInventory removed




    const calculateForTomorrow = () => {
        const ingredients = calculateIngredientsForMenu(
            tomorrowMenuNumber,
            clientsByCalorie,
            dishQuantities
        );
        setCalculatedIngredients(ingredients);

        const shopping = calculateShoppingList(ingredients, inventory);
        setShoppingList(shopping);

        toast.success(`Расчёт для меню ${tomorrowMenuNumber} выполнен`);
    };

    const calculateForPeriod = () => {
        if (selectedDates.length === 0) {
            toast.error('Выберите даты для расчёта');
            return;
        }

        const totalIngredients = new Map<string, { amount: number; unit: string }>();

        for (const dateStr of selectedDates) {
            const date = new Date(dateStr);
            const menuNumber = getMenuNumber(date);
            const menuIngredients = calculateIngredientsForMenu(
                menuNumber,
                clientsByCalorie,
                dishQuantities
            );

            for (const [name, { amount, unit }] of menuIngredients) {
                const existing = totalIngredients.get(name);
                if (existing) {
                    existing.amount = Math.round((existing.amount + amount) * 10) / 10;
                } else {
                    totalIngredients.set(name, { amount, unit });
                }
            }
        }

        setCalculatedIngredients(totalIngredients);
        const shopping = calculateShoppingList(totalIngredients, inventory);
        setShoppingList(shopping);

        toast.success(`Расчёт для ${selectedDates.length} дней выполнен`);
    };

    const handleDateToggle = (dateStr: string) => {
        setSelectedDates(prev => {
            if (prev.includes(dateStr)) {
                return prev.filter(d => d !== dateStr);
            }
            return [...prev, dateStr];
        });
    };

    // Generate next 14 days for selection
    const getNext14Days = (): Array<{ date: string; label: string; menuNumber: number }> => {
        const days: Array<{ date: string; label: string; menuNumber: number }> = [];
        const today = new Date();
        for (let i = 1; i <= 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push({
                date: date.toISOString().split('T')[0],
                label: date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }),
                menuNumber: getMenuNumber(date),
            });
        }
        return days;
    };

    const mealTypeIcons: Record<keyof typeof MEAL_TYPES, string> = {
        BREAKFAST: '🌅',
        SECOND_BREAKFAST: '🥐',
        LUNCH: '🍽️',
        SNACK: '🍎',
        DINNER: '🌙',
        SIXTH_MEAL: '🥗',
    };

    // Calculate required ingredients with CALORIE-SCALED amounts
    // For each dish, sum ingredients across all calorie tiers based on client distribution
    const requiredIngredients = useMemo(() => {
        if (!tomorrowMenu) return new Map<string, { amount: number; unit: string }>();
        const required = new Map<string, { amount: number; unit: string }>();

        // For each dish, calculate total ingredients needed across all calorie tiers
        for (const dish of tomorrowMenu.dishes) {
            const dishQty = dishQuantities[dish.id] || 0;
            if (dishQty <= 0) continue;

            // Calculate proportionally based on client distribution
            // Example: 2 clients at 1200kcal, 1 at 2000kcal = 3 total
            // Each calorie tier gets its scaled ingredients
            const totalClients = Object.values(clientsByCalorie).reduce((sum, c) => sum + c, 0);

            if (totalClients === 0) continue;

            // For each calorie tier
            for (const [calorieStr, clientCount] of Object.entries(clientsByCalorie)) {
                if (clientCount <= 0) continue;

                const calories = parseInt(calorieStr);
                const mealType = dish.mealType as keyof typeof MEAL_TYPES;

                // Get scaled ingredients for this calorie tier
                const scaledIngredients = scaleIngredients(
                    dish.ingredients,
                    calories,
                    mealType,
                    1 // per portion
                );

                // Calculate how many portions for this tier
                // If dishQty matches totalClients, each tier gets clientCount portions
                // If user overrides dishQty, distribute proportionally
                const portionsForTier = Math.round((dishQty / totalClients) * clientCount);

                for (const ing of scaledIngredients) {
                    const existing = required.get(ing.name);
                    const amount = ing.amount * portionsForTier;
                    if (existing) {
                        existing.amount = Math.round((existing.amount + amount) * 10) / 10;
                    } else {
                        required.set(ing.name, { amount: Math.round(amount * 10) / 10, unit: ing.unit });
                    }
                }
            }
        }
        return required;
    }, [tomorrowMenu, dishQuantities, clientsByCalorie]);

    // Check which ingredients are insufficient
    // Inventory check disabled - handled by server
    // const insufficientIngredients = useMemo(() => { ... }, []);
    // const hasEnoughStock = true;
    const totalDishesToCook = Object.values(dishQuantities).reduce((sum, qty) => sum + qty, 0);

    return (
        <div className={`space-y-6 ${className}`}>
            <Card className="glass-card border-none">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Package className="w-5 h-5 text-primary" />
                                {t.warehouse.title}
                            </CardTitle>
                            <CardDescription>
                                {t.warehouse.description}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex items-center gap-1 px-3 py-1.5 bg-primary/5">
                                <ChefHat className="w-4 h-4" />
                                <span>{t.warehouse.menuFor} {tomorrowMenuNumber}</span>
                            </Badge>
                            <Button variant="outline" size="sm" onClick={fetchClientCalories} disabled={isLoadingClients}>
                                {isLoadingClients ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                        <TabsList className="grid w-full grid-cols-4 mb-6">
                            <TabsTrigger value="cooking" className="flex items-center gap-2">
                                <ChefHat className="w-4 h-4" />
                                <span className="hidden sm:inline">{t.warehouse.cooking}</span>
                            </TabsTrigger>
                            <TabsTrigger value="inventory" className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                <span className="hidden sm:inline">{t.warehouse.inventory}</span>
                            </TabsTrigger>
                            <TabsTrigger value="calculator" className="flex items-center gap-2">
                                <Calculator className="w-4 h-4" />
                                <span className="hidden sm:inline">{t.warehouse.calculator}</span>
                            </TabsTrigger>
                            <TabsTrigger value="dishes" className="flex items-center gap-2">
                                <Utensils className="w-4 h-4" />
                                <span className="hidden sm:inline">{t.warehouse.dishes}</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Cooking Tab - Dishes to prepare for tomorrow */}
                        <TabsContent value="cooking" className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                                <strong>{t.warehouse.cookingInfo.replace('{number}', tomorrowMenuNumber.toString())}</strong>
                            </div>

                            {/* Client distribution info */}
                            <div className="grid grid-cols-5 gap-2 p-3 bg-slate-50 rounded-lg">
                                {Object.entries(clientsByCalorie).map(([cal, count]) => (
                                    <div key={cal} className="text-center">
                                        <div className="text-xs text-slate-500">{cal} {t.warehouse.kcal}</div>
                                        <div className="font-semibold text-lg">{count}</div>
                                        <div className="text-xs text-slate-400">{t.warehouse.clients}</div>
                                    </div>
                                ))}
                            </div>

                            {/* NEW: Detailed Cooking Manager */}
                            <CookingManager
                                date={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]} // Tomorrow
                                menuNumber={tomorrowMenuNumber}
                                clientsByCalorie={clientsByCalorie}
                                onCook={fetchData} // Refresh inventory on cook
                            />
                        </TabsContent>

                        {/* Inventory Tab - Managed by IngredientsManager */}
                        <TabsContent value="inventory" className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                {t.warehouse.inventoryInfo}
                            </div>

                            <IngredientsManager onUpdate={fetchData} />
                        </TabsContent>

                        {/* Calculator Tab - Multi-day calculation */}
                        <TabsContent value="calculator" className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Date selection */}
                                <div className="space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                                        {t.warehouse.calcDaysInfo}
                                    </div>

                                    <Button onClick={calculateForTomorrow} className="w-full gap-2" variant="default">
                                        <Calculator className="w-4 h-4" />
                                        {t.warehouse.calcTomorrow.replace('{number}', tomorrowMenuNumber.toString())}
                                    </Button>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">{t.warehouse.selectCalculated}</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {getNext14Days().map(({ date, label, menuNumber }) => (
                                                <button
                                                    key={date}
                                                    onClick={() => handleDateToggle(date)}
                                                    className={`p-2 text-left rounded-lg border transition-colors ${selectedDates.includes(date)
                                                        ? 'bg-primary text-white border-primary'
                                                        : 'bg-white hover:bg-slate-50 border-slate-200'
                                                        }`}
                                                >
                                                    <div className="text-sm font-medium">{label}</div>
                                                    <div className={`text-xs ${selectedDates.includes(date) ? 'text-white/80' : 'text-slate-500'
                                                        }`}>
                                                        {t.warehouse.menuFor} {menuNumber}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        {selectedDates.length > 0 && (
                                            <Button onClick={calculateForPeriod} className="w-full gap-2 mt-2">
                                                <Calculator className="w-4 h-4" />
                                                {t.warehouse.calcForDays.replace('{count}', selectedDates.length.toString())}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Results */}
                                <div className="space-y-4">
                                    {calculatedIngredients.size > 0 && (
                                        <>
                                            <div>
                                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                                    <Package className="w-4 h-4" />
                                                    {t.warehouse.requiredIngredients}
                                                </h4>
                                                <div className="bg-white rounded-lg border max-h-48 overflow-y-auto">
                                                    {Array.from(calculatedIngredients.entries()).map(([name, { amount, unit }]) => (
                                                        <div key={name} className="flex justify-between p-2 border-b last:border-0 text-sm">
                                                            <span className="text-slate-700">{name}</span>
                                                            <span className="font-medium">{amount} {unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="font-medium mb-2 flex items-center gap-2 text-orange-600">
                                                    <ShoppingCart className="w-4 h-4" />
                                                    {t.warehouse.shoppingListTitle}
                                                </h4>
                                                <div className="bg-orange-50 rounded-lg border border-orange-200 max-h-48 overflow-y-auto">
                                                    {shoppingList.size > 0 ? (
                                                        Array.from(shoppingList.entries()).map(([name, { amount, unit }]) => (
                                                            <div key={name} className="flex justify-between w-full p-2 border-b border-orange-100 last:border-0 text-sm">
                                                                <span className="text-orange-800">{name}</span>
                                                                <span className="font-medium text-orange-900">{amount} {unit}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-green-600 text-sm">
                                                            {t.warehouse.allGood}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {calculatedIngredients.size === 0 && (
                                        <div className="text-center py-12 text-slate-400">
                                            <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>{t.warehouse.clickToCalc}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {/* NEW: Dishes Management Tab */}
                        <TabsContent value="dishes">
                            <DishesManager />
                        </TabsContent>


                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
