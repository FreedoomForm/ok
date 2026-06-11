'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, ChefHat, AlertTriangle, UtensilsCrossed, Users } from 'lucide-react';
import { toast } from 'sonner';
import { MENUS } from '@/modules/warehouse/infrastructure/menu-data';
import { useLanguage } from '@/contexts/LanguageContext';

interface Dish {
    id: string | number; // Support both for compatibility
    name: string;
    description?: string;
    mealType: string;
    calorieMappings?: Record<string, string[]>;
}

// Types for custom sets
interface SetDish {
    dishId: string | number;
    dishName: string;
    mealType: string;
}

interface CalorieGroup {
    id?: string;
    name?: string;
    calories: number;
    dishes: SetDish[];
}

interface MenuSet {
    id: string;
    name: string;
    menuNumber: number; // Global sets have 0 or ignored
    calorieGroups: Record<string, CalorieGroup[]>; // Changed to map day -> groups
    isActive: boolean;
}



interface ClientData {
    id: string;
    calories: number;
    assignedSetId?: string | null;
    isActive: boolean;
    deliveryDays: any;
}

interface OrderData {
    customerId: string;
    quantity: number;
    calories: number;
    deliveryDate: string;
}

interface CookingManagerProps {
    date: string;
    menuNumber: number;
    clientsByCalorie: Record<number, number>;
    clients?: ClientData[]; // Optional for backward compatibility if needed, but required for filtering
    orders?: OrderData[];
    onCook?: () => void;
    orderInfo?: { total: number; byCalorie: Record<number, number> };
    availableSets?: MenuSet[];
    selectedSetId?: string;
    onSelectedSetIdChange?: (next: string) => void;
    selectedCalorieGroup?: string;
    onSelectedCalorieGroupChange?: (next: string) => void;
    showHeader?: boolean;
    showContextInfo?: boolean;
}

const CALORIE_GROUPS = [1200, 1600, 2000, 2500, 3000];
const MEAL_TYPE_ORDER = ['BREAKFAST', 'SECOND_BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'SIXTH_MEAL'] as const;

export function CookingManager({
    date,
    menuNumber,
    clientsByCalorie: globalClientsByCalorie,
    clients = [],
    orders = [],
    onCook,
    orderInfo: _orderInfo,
    availableSets: externalAvailableSets,
    selectedSetId: controlledSelectedSetId,
    onSelectedSetIdChange,
    selectedCalorieGroup: controlledSelectedCalorieGroup,
    onSelectedCalorieGroupChange,
    showHeader = true,
    showContextInfo = true,
}: CookingManagerProps) {
    const { language } = useLanguage();

    const uiText = useMemo(() => {
        if (language === 'ru') {
            return {
                title: 'Контроль готовки',
                customSet: 'Сет',
                activeSetDescription: 'Блюда загружены из активного сета для этого дня',
                standardMenuDescription: 'Используется стандартное меню (нет активных сетов)',
                setLabel: 'Сет:',
                selectSet: 'Выберите сет',
                autoActiveGlobal: 'Авто (Активный глобальный)',
                filterLabel: 'Фильтр:',
                all: 'Все',
                allCalories: 'Все калории',
                ordersForTomorrow: 'Заказы на завтра:',
                portions: 'порций',
                noOrdersGlobal: 'Нет заказов на эту дату (глобально)',
                dish: 'Блюдо',
                ready: 'Готово',
                left: 'Осталось',
                cookedAndDeducted: 'Приготовлено и списано со склада',
                loadFailed: 'Не удалось загрузить данные',
                enterValidAmount: 'Введите корректное количество',
                cookFailed: 'Не удалось приготовить',
                cookError: 'Ошибка приготовления',
                selectedSetDiffersWarning:
                    'Внимание: выбранный сет отличается от активного. Заказы отображаются для активного сета.',
                mealLabel: (meal: number) => {
                    const words = ['Первый', 'Второй', 'Третий', 'Четвертый', 'Пятый', 'Шестой'];
                    return `${words[meal - 1] ?? `${meal}-й`} прием пищи`;
                },
                noDishes: (menu: number) => `Нет блюд для отображения (меню ${menu}). Проверьте настройки выбранного сета.`,
            }
        }

        if (language === 'uz') {
            return {
                title: 'Pishirish nazorati',
                customSet: 'Set',
                activeSetDescription: 'Ushbu kun uchun taomlar faol setdan yuklandi',
                standardMenuDescription: "Standart menyu ishlatiladi (faol set yo'q)",
                setLabel: 'Set:',
                selectSet: 'Setni tanlang',
                autoActiveGlobal: 'Avto (Faol global)',
                filterLabel: 'Filter:',
                all: 'Barchasi',
                allCalories: 'Barcha kaloriya',
                ordersForTomorrow: 'Ertangi buyurtmalar:',
                portions: 'porsiya',
                noOrdersGlobal: "Bu sana uchun buyurtma yo'q (global)",
                dish: 'Taom',
                ready: 'Tayyor',
                left: 'Qoldi',
                cookedAndDeducted: 'Pishirildi va ombordan yechildi',
                loadFailed: "Ma'lumot yuklanmadi",
                enterValidAmount: "To'g'ri miqdor kiriting",
                cookFailed: "Pishirib bo'lmadi",
                cookError: 'Pishirishda xatolik',
                selectedSetDiffersWarning:
                    "Diqqat: tanlangan set aktiv setdan farq qiladi. Buyurtmalar aktiv set bo'yicha ko'rsatiladi.",
                mealLabel: (meal: number) => {
                    const words = ['Birinchi', 'Ikkinchi', 'Uchinchi', "To'rtinchi", 'Beshinchi', 'Oltinchi'];
                    return `${words[meal - 1] ?? `Ovqat ${meal}`}`;
                },
                noDishes: (menu: number) => `Ko'rsatish uchun taom yo'q (menyu ${menu}). Tanlangan set sozlamalarini tekshiring.`,
            }
        }

        return {
            title: 'Cooking Control',
            customSet: 'Custom Set',
            activeSetDescription: 'Dishes loaded from active set for this day',
            standardMenuDescription: 'Using standard menu (no active sets)',
            setLabel: 'Set:',
            selectSet: 'Select Set',
            autoActiveGlobal: 'Auto (Active Global)',
            filterLabel: 'Filter:',
            all: 'All',
            allCalories: 'All Calories',
            ordersForTomorrow: 'Orders for tomorrow:',
            portions: 'portions',
            noOrdersGlobal: 'No orders for this date (global)',
            dish: 'Dish',
            ready: 'Ready',
            left: 'Left',
            cookedAndDeducted: 'Cooked and deducted from stock',
            loadFailed: 'Failed to load data',
            enterValidAmount: 'Please enter a valid amount',
            cookFailed: 'Failed to cook',
            cookError: 'Error cooking',
            selectedSetDiffersWarning: 'Warning: selected set differs from active. Orders are shown for the active set.',
            mealLabel: (meal: number) => {
                const words = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
                return `${words[meal - 1] ?? `Meal ${meal}`} meal`;
            },
            noDishes: (menu: number) => `No dishes to display (menu ${menu}). Check selected set settings.`,
        }
    }, [language]);

    const [dishes, setDishes] = useState<Dish[]>([]);
    const [loading, setLoading] = useState(true);
    const [cookingPlan, setCookingPlan] = useState<any>(null); // { cookedStats: { dishId: { 1200: 5 } } }
    const [internalSelectedCalorieGroup, setInternalSelectedCalorieGroup] = useState<string>('all');
    const [cookingAmounts, setCookingAmounts] = useState<Record<string, Record<string, string>>>({});
    const [isCooking, setIsCooking] = useState(false);

    // Custom set integration
    const [availableSets, setAvailableSets] = useState<MenuSet[]>(() => (Array.isArray(externalAvailableSets) ? externalAvailableSets : []));
    const [internalSelectedSetId, setInternalSelectedSetId] = useState<string>('active');
    const safeAvailableSets = Array.isArray(externalAvailableSets) ? externalAvailableSets : availableSets;

    const selectedSetId = controlledSelectedSetId ?? internalSelectedSetId;
    const setSelectedSetId = onSelectedSetIdChange ?? setInternalSelectedSetId;

    const selectedCalorieGroup = controlledSelectedCalorieGroup ?? internalSelectedCalorieGroup;
    const setSelectedCalorieGroup = onSelectedCalorieGroupChange ?? setInternalSelectedCalorieGroup;

    useEffect(() => {
        if (Array.isArray(externalAvailableSets)) setAvailableSets(externalAvailableSets);
    }, [externalAvailableSets]);

    // Memoize the effective caloric distribution based on selected set
    const clientsByCalorie = useMemo(() => {
        // If showing active/global set, use the pre-calculated global stats
        if (!selectedSetId || selectedSetId === 'active') {
            return globalClientsByCalorie;
        }

        // Otherwise filter for the specific set
        const distribution: Record<number, number> = {};

        // Helper to add with tier mapping
        const add = (cal: number, qty: number) => {
            let tier = 2000;
            if (cal <= 1400) tier = 1200;
            else if (cal <= 1800) tier = 1600;
            else if (cal <= 2200) tier = 2000;
            else if (cal <= 2800) tier = 2500;
            else tier = 3000;

            distribution[tier] = (distribution[tier] || 0) + qty;
        };

        // 1. Filter clients who are assigned to this set
        const relevantClients = clients.filter(c => c.assignedSetId === selectedSetId);
        const relevantClientIds = new Set(relevantClients.map(c => c.id));

        // 2. Filter orders for this date
        const dayOrders = orders.filter(o => o.deliveryDate && o.deliveryDate.startsWith(date));

        if (dayOrders.length > 0) {
            // Count orders from relevant clients
            dayOrders.forEach(order => {
                if (relevantClientIds.has(order.customerId)) {
                    add(order.calories, order.quantity || 1);
                }
            });
        } else {
            // Fallback: Use client schedule
            const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            relevantClients.forEach(client => {
                if (client.isActive !== false) {
                    let dDays = client.deliveryDays;
                    if (typeof dDays === 'string') {
                        try { dDays = JSON.parse(dDays); } catch { dDays = {}; }
                    }
                    // Check if explicitly disabled for this day
                    if (dDays && dDays[dayOfWeek] === false) return;

                    add(client.calories, 1);
                }
            });
        }

        return distribution;
    }, [selectedSetId, globalClientsByCalorie, clients, orders, date]);

    // Custom set integration defined above
    const activeSet = useMemo(() => {
        if (selectedSetId === 'active') return safeAvailableSets.find(s => s.isActive) || null;
        return safeAvailableSets.find(s => s.id === selectedSetId) || null;
    }, [safeAvailableSets, selectedSetId]);

    const activeSetDayGroups = useMemo(() => {
        if (!activeSet) return null;
        const groups = activeSet.calorieGroups as unknown as Record<string, CalorieGroup[]>;
        if (Array.isArray(groups as any)) return null;
        const dayGroups = (groups as any)?.[menuNumber?.toString?.() ?? String(menuNumber)];
        return Array.isArray(dayGroups) ? (dayGroups as CalorieGroup[]) : null;
    }, [activeSet, menuNumber]);

    const groupLabelByCalories = useMemo(() => {
        const m = new Map<number, string>();
        if (activeSetDayGroups) {
            for (const g of activeSetDayGroups) {
                const cal = typeof g?.calories === 'number' ? g.calories : Number((g as any)?.calories);
                if (!Number.isFinite(cal)) continue;
                const name = typeof (g as any)?.name === 'string' ? (g as any).name.trim() : '';
                m.set(cal, name || `${cal} kcal`);
            }
        }
        return m;
    }, [activeSetDayGroups]);

    const availableCalorieGroups = useMemo(() => {
        const fromSet =
            activeSetDayGroups
                ?.map((g) => (typeof g?.calories === 'number' ? g.calories : Number((g as any)?.calories)))
                .filter((n) => Number.isFinite(n)) ?? [];
        const unique = Array.from(new Set(fromSet)).sort((a, b) => a - b);
        return unique.length > 0 ? unique : CALORIE_GROUPS;
    }, [activeSetDayGroups]);

    useEffect(() => {
        if (selectedCalorieGroup === 'all') return;
        const cal = Number(selectedCalorieGroup);
        if (!Number.isFinite(cal) || !availableCalorieGroups.includes(cal)) setSelectedCalorieGroup('all');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableCalorieGroups.join('|')]);

    useEffect(() => {
        fetchData();
        // Do not depend on `safeAvailableSets` here: when we fetch sets internally it updates state,
        // which would cause a fetch loop.
    }, [menuNumber, date, selectedSetId, externalAvailableSets]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Active Sets first
            let currentActiveSet: MenuSet | null = null;
            if (Array.isArray(externalAvailableSets)) {
                if (selectedSetId === 'active') currentActiveSet = safeAvailableSets.find(s => s.isActive) || null;
                else currentActiveSet = safeAvailableSets.find(s => s.id === selectedSetId) || null;
            } else {
                try {
                    const setsRes = await fetch('/api/admin/sets');
                    if (setsRes.ok) {
                        const raw = await setsRes.json().catch(() => null);
                        const setsData = raw?.data ?? raw;
                        const sets: MenuSet[] = Array.isArray(setsData) ? (setsData as MenuSet[]) : [];
                        setAvailableSets(sets);

                        // Logic Update: determine active set based on selection or global status
                        if (selectedSetId === 'active') {
                            currentActiveSet = sets.find(s => s.isActive) || null;
                        } else {
                            currentActiveSet = sets.find(s => s.id === selectedSetId) || null;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to fetch sets', e);
                }
            }

            // 2. Determine dishes based on Set or Standard Menu
            if (currentActiveSet) {
                // Get data for the CURRENT menuNumber (day)
                // calorieGroups is now Record<string, CalorieGroup[]>
                const setGroups = currentActiveSet.calorieGroups as unknown as Record<string, CalorieGroup[]>;

                let dayData: CalorieGroup[] | undefined;
                if (!Array.isArray(setGroups)) {
                    dayData = setGroups[menuNumber.toString()];
                }

                if (dayData && Array.isArray(dayData)) {
                    // Determine all unique dishes from this day's set config
                    const uniqueDishesMap = new Map<string, Dish>(); // Use string keys for flexibility

                    dayData.forEach(group => {
                        if (group && group.dishes) {
                            group.dishes.forEach(d => {
                                const dishKey = d.dishId.toString();
                                if (!uniqueDishesMap.has(dishKey)) {
                                    uniqueDishesMap.set(dishKey, {
                                        id: d.dishId, // Keep original ID (number/string)
                                        name: d.dishName,
                                        mealType: d.mealType
                                    });
                                }
                            });
                        }
                    });

                    setDishes(Array.from(uniqueDishesMap.values()));
                } else {
                    // Custom set exists but has no data for this day
                    setDishes([]);
                }
            } else {
                // Standard Menu Logic (No Custom Set Active/Selected)
                let gotDishes = false;
                try {
                    const menuRes = await fetch(`/api/admin/menus?number=${menuNumber}`);
                    if (menuRes.ok) {
                        const menuJson = await menuRes.json().catch(() => null);
                        const menuData = menuJson?.data ?? menuJson;
                        const menuDishes =
                            menuData && Array.isArray((menuData as any).dishes) ? ((menuData as any).dishes as Dish[]) : [];
                        if (menuDishes.length > 0) {
                            setDishes(menuDishes);
                            gotDishes = true;
                        }
                    }
                } catch (e) {
                    console.error('Failed to fetch menu from API:', e);
                }

                // Ultimate fallback: use static MENUS data
                if (!gotDishes) {
                    const staticMenu = MENUS.find(m => m.menuNumber === menuNumber);
                    if (staticMenu && Array.isArray(staticMenu.dishes) && staticMenu.dishes.length > 0) {
                        setDishes(staticMenu.dishes.map(d => ({
                            id: d.id,
                            name: d.name,
                            mealType: d.mealType,
                        })));
                    }
                }
            }

            // 3. Fetch Cooking Plan Status
            const planRes = await fetch(`/api/admin/warehouse/cooking-plan?date=${date}`);
            if (planRes.ok) {
                const planJson = await planRes.json();
                const planData = planJson?.data ?? planJson;
                setCookingPlan(planData);
            }
        } catch (error) {
            console.error('Failed to load cooking data', error);
            toast.error(uiText.loadFailed);
        } finally {
            setLoading(false);
        }
    };

    const handleAmountChange = (dishId: string, calorie: number, value: string) => {
        setCookingAmounts(prev => ({
            ...prev,
            [dishId]: {
                ...(prev[dishId] || {}),
                [calorie]: value
            }
        }));
    };

    const handleCook = async (dishId: string, calorie: number | null) => {
        const updates: { dishId: string, calorie: number, amount: number }[] = [];

        if (calorie) {
            // Cook for specific calorie group
            const amount = parseInt(cookingAmounts[dishId]?.[calorie] || '0');
            if (amount <= 0) return;
            updates.push({ dishId, calorie, amount });
        } else {
            // Batch cook logic if needed, but for now we do per-cell
        }

        if (updates.length === 0) {
            toast.error(uiText.enterValidAmount);
            return;
        }

        setIsCooking(true);
        try {
            const res = await fetch('/api/admin/warehouse/cook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    menuNumber,
                    updates,
                    // Pass active set info so backend knows which ingredients to deduct
                    activeSetId: activeSet?.id
                })
            });

            if (res.ok) {
                toast.success(uiText.cookedAndDeducted);
                // Clear inputs
                setCookingAmounts(prev => {
                    const newState = { ...prev };
                    updates.forEach(u => {
                        if (newState[u.dishId]) {
                            delete newState[u.dishId][u.calorie];
                        }
                    });
                    return newState;
                });
                fetchData();
                if (onCook) onCook();
            } else {
                const json = await res.json();
                const errMsg = json?.error?.message || json?.error || uiText.cookFailed;
                toast.error(typeof errMsg === 'string' ? errMsg : uiText.cookFailed);
            }
        } catch (error) {
            console.error('Error cooking:', error);
            toast.error(uiText.cookError);
        } finally {
            setIsCooking(false);
        }
    };

    const getCookedAmount = (dishId: string, calorie: number) => {
        return cookingPlan?.cookedStats?.[dishId]?.[calorie] || 0;
    };

    const getClientCountForGroupCalories = (groupCalories: number) => {
        const keys = Object.keys(clientsByCalorie)
            .map((k) => Number(k))
            .filter((n) => Number.isFinite(n));
        if (keys.length === 0) return 0;
        if (typeof clientsByCalorie[groupCalories] === 'number') return clientsByCalorie[groupCalories] || 0;

        let closest = keys[0];
        for (const k of keys) {
            if (Math.abs(k - groupCalories) < Math.abs(closest - groupCalories)) closest = k;
        }
        return clientsByCalorie[closest] || 0;
    };

    const isDishInGroup = (dishId: string | number, calorie: number) => {
        // Custom Set Logic
        if (activeSet) {
            let group: CalorieGroup | undefined;
            const groups = activeSet.calorieGroups as unknown as Record<string, CalorieGroup[]>;

            if (Array.isArray(groups)) {
                group = groups.find((g: any) => g.calories === calorie);
            } else {
                const dayGroups = groups[menuNumber.toString()];
                if (dayGroups) {
                    group = dayGroups.find(g => g.calories === calorie);
                }
            }

            if (!group) return false;
            return group.dishes.some(d => String(d.dishId) === String(dishId));
        }

        // Standard Menu Logic
        const dish = dishes.find(d => d.id == dishId);
        if (!dish) return false;

        if (dish.calorieMappings) {
            const allowedGroups = dish.calorieMappings[menuNumber.toString()] || [];
            if (!allowedGroups.includes(calorie.toString())) {
                return false;
            }
        }

        return true;
    };

    const getNeededAmount = (dishId: string | number, calorie: number) => {
        // If we are using a custom set
        if (activeSet) {
            let group: CalorieGroup | undefined;
            const groups = activeSet.calorieGroups as unknown as Record<string, CalorieGroup[]>;

            if (Array.isArray(groups)) {
                // Legacy fallback
                group = groups.find((g: any) => g.calories === calorie);
            } else {
                // New structure
                const dayGroups = groups[menuNumber.toString()];
                if (dayGroups) {
                    group = dayGroups.find(g => g.calories === calorie);
                }
            }

            if (!group) return 0;

            // Check if this dish is in this calorie group
            const hasDish = group.dishes.some(d => d.dishId == dishId); // loose equality
            return hasDish ? getClientCountForGroupCalories(calorie) : 0;
        }

        // Fallback to standard logic
        const dish = dishes.find(d => d.id == dishId);
        if (!dish) return 0;

        // If mappings exist (standard menu logic)
        if (dish.calorieMappings) {
            const allowedGroups = dish.calorieMappings[menuNumber.toString()] || [];
            if (!allowedGroups.includes(calorie.toString())) {
                return 0; // Not needed for this calorie group on this day
            }
        }

        return getClientCountForGroupCalories(calorie);
    };

    const filteredCalorieGroups = selectedCalorieGroup === 'all'
        ? availableCalorieGroups
        : [parseInt(selectedCalorieGroup)];

    const getMealIndex = (mealType: string) => {
        const idx = MEAL_TYPE_ORDER.indexOf(String(mealType || '').toUpperCase().trim() as any);
        return idx >= 0 ? idx + 1 : null;
    };

    if (loading) {
        return <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    }

    return (
        <div className="space-y-4">
            {showHeader ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                            {uiText.title}
                            {activeSet && (
 <Badge variant="secondary" className="bg-primary/10 text-primary">
                                    <UtensilsCrossed className="w-3 h-3 mr-1" />
                                    {uiText.customSet}: {activeSet.name}
                                </Badge>
                            )}
                        </h3>
                        <p className="text-sm text-slate-500">
                            {activeSet
                                ? uiText.activeSetDescription
                                : uiText.standardMenuDescription}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-start sm:items-center">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-sm text-slate-500 whitespace-nowrap">{uiText.setLabel}</span>
                            <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder={uiText.selectSet} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{uiText.autoActiveGlobal}</SelectItem>
                                    {safeAvailableSets.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name} {s.isActive ? '✓' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-sm text-slate-500 whitespace-nowrap">{uiText.filterLabel}</span>
                            <Select value={selectedCalorieGroup} onValueChange={setSelectedCalorieGroup}>
                                <SelectTrigger className="w-full sm:w-[120px]">
                                    <SelectValue placeholder={uiText.all} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{uiText.allCalories}</SelectItem>
                                    {availableCalorieGroups.map(c => (
                                        <SelectItem key={c} value={c.toString()}>
                                            {groupLabelByCalories.get(c) ?? `${c} kcal`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            ) : null}

            {showContextInfo ? (
 <div className="glass-card rounded-lg p-3 shadow-shadow">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-neutral-600" />
                        <span className="font-medium text-foreground">{uiText.ordersForTomorrow}</span>
                        <Badge variant="secondary" className="glass-card text-foreground">
                            {Object.values(clientsByCalorie).reduce((a, b) => a + b, 0)} {uiText.portions}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {availableCalorieGroups.map(cal => {
                            const count = clientsByCalorie[cal] || 0;
                            if (count === 0) return null;
                            return (
                                <Badge key={cal} variant="outline" className="glass-card">
                                    {groupLabelByCalories.get(cal) ?? `${cal} kcal`}:{' '}
                                    <span className="font-bold ml-1">{count}</span>
                                </Badge>
                            );
                        })}
                        {Object.values(clientsByCalorie).every(v => v === 0) && (
                            <span className="text-sm text-muted-foreground">{uiText.noOrdersGlobal}</span>
                        )}
                        {activeSet && selectedSetId !== 'active' && activeSet.id !== selectedSetId && (
                            <div className="w-full text-xs text-slate-600 mt-1 flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {uiText.selectedSetDiffersWarning}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

 <div className="glass-card rounded-lg overflow-x-auto shadow-shadow">
                <Table className="[&_tr]:!bg-transparent [&_tr]:text-foreground">
                    <TableHeader>
                        <TableRow className="!bg-transparent">
                            <TableHead className="w-[200px]">{uiText.dish}</TableHead>
                            {filteredCalorieGroups.map(cal => (
                                <TableHead key={cal} className="text-center min-w-[150px]">
                                    <div className="truncate font-medium">
                                        {groupLabelByCalories.get(cal) ?? `${cal} kcal`}
                                    </div>
                                    <div className="text-xs font-normal text-slate-500">
                                        {cal} kcal · Need: {clientsByCalorie[cal] || 0}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dishes.map(dish => {
                            // Check if this dish is needed for ANY of the filtered calorie groups
                            const _isNeededAnywhere = filteredCalorieGroups.some(cal => getNeededAmount(dish.id, cal) > 0);

                            // Optional: Hide dishes that aren't needed for any displayed column to clean up view
                            // if (!_isNeededAnywhere) return null; 

                            return (
                                <TableRow key={dish.id} className="!bg-transparent">
                                    <TableCell className="font-medium">
                                        {dish.name}
                                        <div className="text-xs text-slate-400">
                                            {(() => {
                                                const meal = getMealIndex(dish.mealType);
                                                return meal ? uiText.mealLabel(meal) : dish.mealType;
                                            })()}
                                        </div>
                                    </TableCell>
                                    {filteredCalorieGroups.map(cal => {
                                        const needed = getNeededAmount(dish.id, cal);
                                        const cooked = getCookedAmount(dish.id.toString(), cal);
                                        const remaining = Math.max(0, needed - cooked);
                                        const inputVal = cookingAmounts[dish.id.toString()]?.[cal] || '';

                                        const isAvailable = isDishInGroup(dish.id, cal);

                                        // If not configured for this column, show greyed out or empty
                                        if (!isAvailable) {
                                            return (
                                                <TableCell key={cal} className="p-2">
                                                    <div className="h-full flex items-center justify-center text-slate-300 text-xs text-center">
                                                        -
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        return (
                                            <TableCell key={cal} className="p-2">
 <div className={`glass-card rounded-lg p-2 space-y-2 ${needed === 0 ? '' : ''}`}>
                                                    <div className="flex justify-between text-xs">
                                                        <span className={cooked >= needed && needed > 0 ? "text-neutral-800 font-medium" : "text-slate-600"}>
                                                            {uiText.ready}: {cooked}
                                                        </span>
                                                        <span className="text-slate-500">{uiText.left}: {remaining}</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Input
                                                            type="number"
                                                            className="h-7 text-xs px-1"
                                                            placeholder={remaining.toString()}
                                                            value={inputVal}
                                                            onChange={(e) => handleAmountChange(dish.id.toString(), cal, e.target.value)}
                                                        />
                                                        <Button
                                                            size="icon"
                                                            className="h-7 w-7 shrink-0"
                                                            disabled={isCooking || !inputVal}
                                                            onClick={() => handleCook(dish.id.toString(), cal)}
                                                        >
                                                            <ChefHat className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            {dishes.length === 0 && (
 <div className="glass-card text-center py-12 text-muted-foreground rounded-lg">
                    {uiText.noDishes(menuNumber)}
                </div>
            )}
        </div>
    );
}
