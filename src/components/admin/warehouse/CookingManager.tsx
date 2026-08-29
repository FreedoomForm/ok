'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, ChefHat, AlertTriangle, UtensilsCrossed, Users, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { MENUS } from '@/lib/menuData';
import { useLanguage } from '@/contexts/LanguageContext';
import { ColorSquarePalette, RESOURCE_COLOR_PALETTE } from '@/components/admin/dashboard/shared/ColorSquarePalette';
import { ResourceCalendarPanel } from '@/components/admin/dashboard/shared/ResourceCalendarPanel';
import { findSetGroup, getSetDayGroups, type SetGroup } from '@/lib/menu/set-groups';
import {
    parseCookingDeliveryDays,
    parseCookingMenuResponse,
    parseCookingPlanResponse,
    type CookingDish,
    type CookingPlanState,
} from '@/lib/warehouse/cooking-data';
import { adjustCookingDraftIngredient, setCookingDraftIngredientAmount } from '@/lib/warehouse/cooking-draft';

type Dish = CookingDish;

interface MenuSet {
    id: string;
    name: string;
    menuNumber?: number; // Global sets may omit this unused metadata
    calorieGroups: unknown;
    isActive: boolean;
}

interface ClientData {
    id: string;
    calories: number;
    assignedSetId?: string | null;
    isActive: boolean;
    deliveryDays?: string | Record<string, boolean> | null;
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
    onPlanIdChange?: (id: string | null) => void;
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
    onPlanIdChange,
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
                color: 'Цвет',
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
                actualIngredients: 'Фактический расход',
                provenance: 'Источник',
                saveDraft: 'Сохранить расход',
                draftSaved: 'Расход сохранен',
                draftSaveFailed: 'Не удалось сохранить расход',
                decrease: 'Уменьшить',
                increase: 'Увеличить',
                needed: 'Нужно',
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
                color: 'Rang',
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
                actualIngredients: 'Haqiqiy sarf',
                provenance: 'Manba',
                saveDraft: 'Sarfni saqlash',
                draftSaved: 'Sarf saqlandi',
                draftSaveFailed: 'Sarfni saqlab bo‘lmadi',
                decrease: 'Kamaytirish',
                increase: 'Ko‘paytirish',
                needed: 'Kerak',
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
            title: 'Контроль готовки',
            customSet: 'Сет',
            activeSetDescription: 'Блюда загружены из активного сета для этого дня',
            standardMenuDescription: 'Используется стандартное меню (нет активных сетов)',
            setLabel: 'Сет:',
            color: 'Цвет',
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
            actualIngredients: 'Фактический расход',
            provenance: 'Источник',
            saveDraft: 'Сохранить расход',
            draftSaved: 'Расход сохранен',
            draftSaveFailed: 'Не удалось сохранить расход',
            decrease: 'Уменьшить',
            increase: 'Увеличить',
            needed: 'Нужно',
            loadFailed: 'Не удалось загрузить данные',
            enterValidAmount: 'Введите корректное количество',
            cookFailed: 'Не удалось приготовить',
            cookError: 'Ошибка приготовления',
            selectedSetDiffersWarning: 'Внимание: выбранный сет отличается от активного. Заказы отображаются для активного сета.',
            mealLabel: (meal: number) => {
                const words = ['Первый', 'Второй', 'Третий', 'Четвертый', 'Пятый', 'Шестой'];
                return `${words[meal - 1] ?? `${meal}-й`} прием пищи`;
            },
            noDishes: (menu: number) => `Нет блюд для отображения (меню ${menu}). Проверьте настройки выбранного сета.`,
        }
    }, [language]);

    const [dishes, setDishes] = useState<Dish[]>([]);
    const [loading, setLoading] = useState(true);
    const [cookingPlan, setCookingPlan] = useState<CookingPlanState>({ dishes: {}, color: null, cookedStats: {}, consumption: [] });
    // Unfinished-draft rule: a color the user picked in the open manager must
    // survive background plan reloads (late set settling re-runs the loader and
    // would otherwise silently reset the uncommitted choice back to the server value).
    const draftColorTouchedRef = useRef(false);
    const [internalSelectedCalorieGroup, setInternalSelectedCalorieGroup] = useState<string>('all');
    const [cookingAmounts, setCookingAmounts] = useState<Record<string, Record<string, string>>>({});
    const [expandedDishIds, setExpandedDishIds] = useState<Set<string>>(new Set());
    const [isCooking, setIsCooking] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const fetchDataRef = useRef<() => Promise<void>>(async () => {});
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
            const dayOfWeek = new Date(date).toLocaleDateString(language === 'uz' ? 'uz-UZ' : 'ru-RU', { weekday: 'long' }).toLowerCase();
            relevantClients.forEach(client => {
                if (client.isActive !== false) {
                    const deliveryDays = parseCookingDeliveryDays(client.deliveryDays);
                    // Check if explicitly disabled for this day
                    if (deliveryDays[dayOfWeek as keyof typeof deliveryDays] === false) return;

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
        const dayGroups = getSetDayGroups(activeSet.calorieGroups, menuNumber);
        return dayGroups.length > 0 ? dayGroups : null;
    }, [activeSet, menuNumber]);

    const groupLabelByCalories = useMemo(() => {
        const m = new Map<number, string>();
        if (activeSetDayGroups) {
            for (const g of activeSetDayGroups) {
                const cal = typeof g.calories === 'number' ? g.calories : Number(g.calories);
                if (!Number.isFinite(cal)) continue;
                const name = typeof g.name === 'string' ? g.name.trim() : '';
                m.set(cal, name || `${cal} kcal`);
            }
        }
        return m;
    }, [activeSetDayGroups]);

    const availableCalorieGroups = useMemo(() => {
        const fromSet =
            activeSetDayGroups
                ?.map((g) => (typeof g.calories === 'number' ? g.calories : Number(g.calories)))
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
                        const sets: MenuSet[] = Array.isArray(raw) ? raw.filter((set): set is MenuSet =>
                            typeof set === 'object' && set !== null &&
                            typeof (set as Record<string, unknown>).id === 'string' &&
                            typeof (set as Record<string, unknown>).name === 'string' &&
                            typeof (set as Record<string, unknown>).isActive === 'boolean'
                        ) : [];
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
                // Get data for the CURRENT menuNumber (day) through the shared JSON adapter.
                const dayData: SetGroup[] = getSetDayGroups(currentActiveSet.calorieGroups, menuNumber);

                if (dayData.length > 0) {
                    // Determine all unique dishes from this day's set config
                    const uniqueDishesMap = new Map<string, Dish>(); // Use string keys for flexibility

                    dayData.forEach(group => {
                        if (group && group.dishes) {
                            group.dishes.forEach(d => {
                                const dishKey = d.dishId.toString();
                                if (!uniqueDishesMap.has(dishKey)) {
                                    uniqueDishesMap.set(dishKey, {
                                        id: d.dishId, // Keep original ID (number/string)
                                        name: d.dishName?.trim() || String(d.dishId),
                                        mealType: d.mealType || 'CUSTOM'
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
                        const menuData = await menuRes.json().catch(() => null);
                        const menuDishes = parseCookingMenuResponse(menuData);
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
                const planData = await planRes.json();
                const nextPlan = parseCookingPlanResponse(planData);
                setCookingPlan((previous) => draftColorTouchedRef.current ? { ...nextPlan, color: previous.color ?? nextPlan.color } : nextPlan);
                onPlanIdChange?.(nextPlan.id ?? null);
            } else {
                onPlanIdChange?.(null);
            }
        } catch (error) {
            console.error('Failed to load cooking data', error);
            toast.error(uiText.loadFailed);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataRef.current = fetchData;
    });

    useEffect(() => {
        void fetchDataRef.current();
        // Do not depend on `safeAvailableSets` here: when we fetch sets internally it updates state,
        // which would cause a fetch loop.
    }, [menuNumber, date, selectedSetId, externalAvailableSets]);

    const handleAmountChange = (dishId: string, calorie: number, value: string) => {
        setCookingAmounts(prev => ({
            ...prev,
            [dishId]: {
                ...(prev[dishId] || {}),
                [calorie]: value
            }
        }));
    };

    const handleDraftAmountChange = (dishId: string, calorie: number, ingredientIndex: number, value: string) => {
        const amount = value === '' ? 0 : Number(value);
        if (!Number.isFinite(amount) || amount < 0) return;
        setCookingPlan((previous) => ({ ...previous, consumption: setCookingDraftIngredientAmount(previous.consumption, dishId, calorie, ingredientIndex, amount) }));
    };

    const handleDraftAmountAdjust = (dishId: string, calorie: number, ingredientIndex: number, delta: number) => {
        setCookingPlan((previous) => ({ ...previous, consumption: adjustCookingDraftIngredient(previous.consumption, dishId, calorie, ingredientIndex, delta) }));
    };

    const draftColor = cookingPlan.color ?? RESOURCE_COLOR_PALETTE[0];

    const handleSaveDraft = async () => {
        setIsSavingDraft(true);
        try {
            const res = await fetch('/api/admin/warehouse/cooking-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, menuNumber, dishes: cookingPlan.dishes, color: draftColor, consumption: cookingPlan.consumption }),
            });
            if (!res.ok) throw new Error('draft save failed');
            toast.success(uiText.draftSaved);
        } catch (error) {
            console.error('Error saving cooking draft:', error);
            toast.error(uiText.draftSaveFailed);
        } finally {
            setIsSavingDraft(false);
        }
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
                void fetchDataRef.current();
                if (onCook) onCook();
            } else {
                const data = await res.json();
                toast.error(data.error || uiText.cookFailed);
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
            const group = findSetGroup(activeSet.calorieGroups, menuNumber, calorie);
            if (!group) return false;
            return (group.dishes ?? []).some((dish) => String(dish.dishId) === String(dishId));
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
            const group = findSetGroup(activeSet.calorieGroups, menuNumber, calorie);
            if (!group) return 0;

            // Check if this dish is in this calorie group
            const hasDish = (group.dishes ?? []).some((dish) => dish.dishId == dishId); // loose equality
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
        const normalizedMealType = String(mealType || '').toUpperCase().trim();
        const idx = MEAL_TYPE_ORDER.indexOf(normalizedMealType as (typeof MEAL_TYPE_ORDER)[number]);
        return idx >= 0 ? idx + 1 : null;
    };

    if (loading) {
        return <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    }

    return (
        <div data-reference-cooking-manager className="space-y-4">
            {showHeader ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                            {uiText.title}
                            {activeSet && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                    <UtensilsCrossed className="w-3 h-3 mr-1" />
                                    {uiText.customSet}: {activeSet.name}
                                </Badge>
                            )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {activeSet
                                ? uiText.activeSetDescription
                                : uiText.standardMenuDescription}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-start sm:items-center">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">{uiText.color}</span>
                            <ColorSquarePalette value={draftColor} onChange={(color) => { draftColorTouchedRef.current = true; setCookingPlan((previous) => ({ ...previous, color })); }} label={uiText.color} />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">{uiText.setLabel}</span>
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
                            <span className="text-sm text-muted-foreground whitespace-nowrap">{uiText.filterLabel}</span>
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

            {!showHeader ? (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{uiText.color}</span>
                        <ColorSquarePalette value={draftColor} onChange={(color) => { draftColorTouchedRef.current = true; setCookingPlan((previous) => ({ ...previous, color })); }} label={uiText.color} />
                    </div>
                    {cookingPlan.id ? <ResourceCalendarPanel resourceType="COOKING_RECORD" resourceId={cookingPlan.id} compact /> : null}
                </div>
            ) : null}

            {showContextInfo ? (
                <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground">{uiText.ordersForTomorrow}</span>
                        <Badge variant="secondary" className="text-foreground">
                            {Object.values(clientsByCalorie).reduce((a, b) => a + b, 0)} {uiText.portions}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {availableCalorieGroups.map(cal => {
                            const count = clientsByCalorie[cal] || 0;
                            if (count === 0) return null;
                            return (
                                <Badge key={cal} variant="outline" >
                                    {groupLabelByCalories.get(cal) ?? `${cal} kcal`}:{' '}
                                    <span className="font-bold ml-1">{count}</span>
                                </Badge>
                            );
                        })}
                        {Object.values(clientsByCalorie).every(v => v === 0) && (
                            <span className="text-sm text-muted-foreground">{uiText.noOrdersGlobal}</span>
                        )}
                        {activeSet && selectedSetId !== 'active' && activeSet.id !== selectedSetId && (
                            <div className="w-full text-xs text-amber-600 mt-1 flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {uiText.selectedSetDiffersWarning}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {cookingPlan.consumption.length > 0 ? (
                <div className="flex justify-end">
                    <Button size="sm" variant="outline" disabled={isSavingDraft} onClick={handleSaveDraft}>
                        {isSavingDraft ? <Loader2 className="h-3 w-3 animate-spin" /> : uiText.saveDraft}
                    </Button>
                </div>
            ) : null}

            <div className="rounded-lg border border-border bg-card overflow-x-auto">
                <Table className="[&_tr]:!bg-transparent [&_tr]:text-foreground">
                    <TableHeader>
                        <TableRow className="!bg-transparent">
                            <TableHead className="w-[200px]">{uiText.dish}</TableHead>
                            {filteredCalorieGroups.map(cal => (
                                <TableHead key={cal} className="text-center min-w-[150px]">
                                    <div className="truncate font-medium">
                                        {groupLabelByCalories.get(cal) ?? `${cal} kcal`}
                                    </div>
                                    <div className="text-xs font-normal text-muted-foreground">
                                        {cal} kcal · {uiText.needed}: {clientsByCalorie[cal] || 0}
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

                            const dishKey = String(dish.id);
                            const isExpanded = expandedDishIds.has(dishKey);
                            const dishConsumption = cookingPlan.consumption.filter((record) => record.dishId === dishKey);

                            return (
                                <TableRow key={dish.id} className="!bg-transparent">
                                    <TableCell className="font-medium">
                                        <button type="button" className="text-left font-medium" aria-expanded={isExpanded} onClick={() => setExpandedDishIds((previous) => {
                                            const next = new Set(previous);
                                            if (next.has(dishKey)) next.delete(dishKey);
                                            else next.add(dishKey);
                                            return next;
                                        })}>{dish.name}</button>
                                        <div className="text-xs text-muted-foreground">
                                            {(() => {
                                                const meal = getMealIndex(dish.mealType);
                                                return meal ? uiText.mealLabel(meal) : dish.mealType;
                                            })()}
                                        </div>
                                        {isExpanded && dishConsumption.map((record, recordIndex) => (
                                            <div key={`${record.dishId}-${record.calorie}-${recordIndex}`} data-reference-cooking-consumption className="mt-1 text-xs">
                                                <div className="text-muted-foreground">{uiText.actualIngredients} · {record.calorie} kcal · {record.amount}</div>
                                                <div className="mt-1 space-y-1 pl-2">
                                                    {record.ingredients.map((ingredient, ingredientIndex) => <div key={`${ingredient.name}-${ingredient.unit}`} className="flex items-center gap-1">
                                                        <span className="min-w-0 flex-1 truncate">{ingredient.name} ({ingredient.unit})</span>
                                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`${uiText.decrease} ${ingredient.name}`} onClick={() => handleDraftAmountAdjust(record.dishId, record.calorie, ingredientIndex, -1)}><Minus className="h-3 w-3" /></Button>
                                                        <Input type="number" min="0" step="0.01" className="h-6 w-20 px-1 text-right tabular-nums" aria-label={`${ingredient.name} ${uiText.actualIngredients}`} value={ingredient.amount} onChange={(event) => handleDraftAmountChange(record.dishId, record.calorie, ingredientIndex, event.target.value)} />
                                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`${uiText.increase} ${ingredient.name}`} onClick={() => handleDraftAmountAdjust(record.dishId, record.calorie, ingredientIndex, 1)}><Plus className="h-3 w-3" /></Button>
                                                    </div>)}
                                                    {record.provenance ? <p className="text-[10px] text-muted-foreground">{uiText.provenance}: {[...(record.provenance.clientIds ?? []), ...(record.provenance.contractIds ?? []), ...(record.provenance.orderIds ?? []), ...(record.provenance.setId ? [record.provenance.setId] : [])].join(', ')}</p> : null}
                                                </div>
                                            </div>
                                        ))}

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
                                                    <div className="h-full flex items-center justify-center text-muted-foreground/50 text-xs text-center">
                                                        -
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        return (
                                            <TableCell key={cal} className="p-2">
                                                <div className={`rounded-lg bg-card p-2 space-y-2 border ${needed === 0 ? 'border-dashed' : ''}`}>
                                                    <div className="flex justify-between text-xs">
                                                        <span className={cooked >= needed && needed > 0 ? "text-green-600 font-medium" : "text-amber-600"}>
                                                            {uiText.ready}: {cooked}
                                                        </span>
                                                        <span className="text-muted-foreground">{uiText.left}: {remaining}</span>
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
                                                            aria-label="Приготовить"
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
                <div className="text-center py-12 text-muted-foreground rounded-lg border border-border border-dashed bg-card">
                    {uiText.noDishes(menuNumber)}
                </div>
            )}
        </div>
    );
}
