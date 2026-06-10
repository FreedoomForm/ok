'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import dynamic from 'next/dynamic'
import { SortableTableHeader, sortData, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import { applyFilters, type FilterColumn } from '@/components/ui/table-filter-utils'

const TableFilterPanel = dynamic(
  () => import('@/components/ui/table-filter-panel').then((mod) => mod.TableFilterPanel),
  { ssr: false }
)
import {
    Plus,
    Trash2,
    UtensilsCrossed,
    Flame,
    Copy,
    Scale
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { MENUS, MEAL_TYPES, type Dish, type Ingredient } from '@/lib/menuData';
import type { DateRange } from 'react-day-picker';
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector';

// Types for custom sets
// Types for custom sets
interface SetDish {
    dishId: string | number; // Support CUIDs from DB and legacy numeric IDs
    dishName: string;
    mealType: string;
    mealIndex?: number | null;
    customIngredients?: Ingredient[];
}

interface CalorieGroup {
    id?: string; // stable key inside JSON
    name?: string;
    price?: number | null;
    calories?: number;
    dishes: SetDish[];
}

// Map day number (string) to array of calorie groups
type DayConfig = Record<string, CalorieGroup[]>;

interface MenuSet {
    id: string;
    name: string;
    description?: string;
    menuNumber: number; // Ignored/0 for global sets
    calorieGroups: DayConfig; // Changed structure!
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const DEFAULT_GROUP_COUNT = 1;
const MEAL_TYPE_ORDER: Array<keyof typeof MEAL_TYPES> = [
    'BREAKFAST',
    'SECOND_BREAKFAST',
    'LUNCH',
    'SNACK',
    'DINNER',
    'SIXTH_MEAL',
];
const UNIT_OPTIONS = ['kg', 'gr', 'ml', 'l', 'pcs'];

function getMealIndex(mealType: string) {
    const idx = MEAL_TYPE_ORDER.indexOf(mealType as any);
    return idx >= 0 ? idx + 1 : null;
}

export function SetsTab() {
    const { language } = useLanguage();

    const uiText = useMemo(() => {
        if (language === 'uz') {
            return {
                title: 'Setlar',
                subtitle: 'Menuni kunlar bo‘yicha sozlash',
                newSet: 'Yangi set',
                newDish: 'Yangi taom',
                setsList: 'Setlar ro‘yxati',
                updatedAt: 'Yangilandi',
                search: 'Qidirish',
                selectSetHint: 'Tahrirlashni boshlash uchun setni tanlang',
                days: 'Kunlar',
                dayMenuTitle: (day: string) => `Kun ${day} menyusi`,
                noDayDataTitle: 'Bu kun uchun menyu yo‘q',
                noDayDataDesc: (day: string) => `Siz bo‘shdan boshlashingiz yoki ${day}-kun uchun standart menyuni nusxalashingiz mumkin.`,
                copyStandard: (day: string) => `Standart menyuni nusxalash (Kun ${day})`,
                copiedDay: (day: string) => `Kun ${day} menyusi nusxalandi`,
                confirmDeleteSet: 'Ushbu setni o‘chirasizmi?',
                deleted: 'O‘chirildi',
                delete: 'O‘chirish',
                saveError: 'Saqlashda xatolik',
                loadSetsError: 'Setlarni yuklashda xatolik',
                loadDishesError: 'Taomlarni yuklashda xatolik',
                setNameRequired: 'Set nomini kiriting',
                confirmDeleteDay: (day: string) => `Kun ${day} ni oâ€˜chirasizmi?`,
                confirmDeleteGroup: 'Ushbu guruhni oâ€˜chirasizmi?',
                cantDeleteLastDay: 'Oxirgi kunni oâ€˜chirib boâ€˜lmaydi',
                create: 'Yaratish',
                cancel: 'Bekor qilish',
                setName: 'Set nomi',
                mealName: 'Taom nomi',
                mealNamePlaceholder: 'Taom nomini yozing...',
                mealNameRequired: 'Taom nomini kiriting',
                dish: 'Taom',
                meal: 'Ovqat',
                addMeal: 'Taom qo‘shish',
                editMeal: 'Taomni tahrirlash',
                noDishes: 'Taomlar yo‘q',
                customWeight: 'Moslashtirilgan vazn',
                standard: 'Standart',
                addIngredient: 'Ingredient qo‘shish',
                selectIngredient: 'Ingredient tanlang...',
                ingredients: 'Ingredientlar',
                ingredientsDesc: 'Bu taom uchun ingredientlar tarkibini va og‘irligini sozlang.',
                tableName: 'Nomi',
                tableAmount: 'Miqdor',
                tableUnit: 'Birlik',
                noIngredients: 'Ingredient yo‘q',
                ingredientAlreadyAdded: 'Ingredient allaqachon qo‘shilgan',
                saveChanges: 'O‘zgarishlarni saqlash',
                groups: 'Guruhlar',
                group: 'Guruh',
                newGroup: 'Yangi guruh',
                groupName: 'Guruh nomi',
                groupCalories: 'Kaloriya (kcal)',
                groupPrice: 'Narx',
                dishesLabel: 'Taomlar',
                caloriesLabel: 'Kaloriya',
                priceLabel: 'Narx (UZS)',
                mealLabel: (n: number) => `${n}-taom`,
                menuDay: (day: string) => `Menyu ${day}`,
                addDay: 'Kun qo‘shish',
                maxDaysReached: (n: number) => `Maksimal kunlar: ${n}`,
            };
        }

        if (language === 'ru') {
            return {
                title: 'Сеты',
                subtitle: 'Настройка меню по дням',
                newSet: 'Новый сет',
                newDish: 'Новое блюдо',
                setsList: 'Список сетов',
                updatedAt: 'Обновлено',
                search: 'Поиск',
                selectSetHint: 'Выберите сет, чтобы начать редактирование',
                days: 'Дни',
                dayMenuTitle: (day: string) => `Меню на День ${day}`,
                noDayDataTitle: 'Нет меню для этого дня',
                noDayDataDesc: (day: string) => `Вы можете начать с чистого листа или скопировать стандартное меню для Дня ${day}.`,
                copyStandard: (day: string) => `Скопировать стандартное меню (День ${day})`,
                copiedDay: (day: string) => `Меню дня ${day} скопировано`,
                confirmDeleteSet: 'Удалить этот сет?',
                deleted: 'Удалено',
                delete: 'Удалить',
                saveError: 'Ошибка сохранения',
                loadSetsError: 'Ошибка загрузки сетов',
                loadDishesError: 'Ошибка загрузки блюд',
                setNameRequired: 'Введите название сета',
                confirmDeleteDay: (day: string) => `Удалить День ${day}?`,
                confirmDeleteGroup: 'Удалить эту группу?',
                cantDeleteLastDay: 'Нельзя удалить последний день',
                create: 'Создать',
                cancel: 'Отмена',
                setName: 'Название сета',
                mealName: 'Название блюда',
                mealNamePlaceholder: 'Введите название блюда...',
                mealNameRequired: 'Введите название блюда',
                dish: 'Блюдо',
                meal: 'Приём пищи',
                addMeal: 'Добавить блюдо',
                editMeal: 'Редактировать блюдо',
                noDishes: 'Нет блюд',
                customWeight: 'Кастомный вес',
                standard: 'Стандарт',
                addIngredient: 'Добавить ингредиент',
                selectIngredient: 'Выберите ингредиент...',
                ingredients: 'Ингредиенты',
                ingredientsDesc: 'Настройте состав и вес ингредиентов для этого блюда в рамках сета.',
                tableName: 'Название',
                tableAmount: 'Кол-во',
                tableUnit: 'Ед.',
                noIngredients: 'Нет ингредиентов',
                ingredientAlreadyAdded: 'Ингредиент уже добавлен',
                saveChanges: 'Сохранить изменения',
                groups: 'Группы',
                group: 'Группа',
                newGroup: 'Новая группа',
                groupName: 'Название группы',
                groupCalories: 'Калории (kcal)',
                groupPrice: 'Цена',
                dishesLabel: 'Блюда',
                caloriesLabel: 'Калории',
                priceLabel: 'Цена (UZS)',
                mealLabel: (n: number) => `Приём ${n}`,
                menuDay: (day: string) => `Меню ${day}`,
                addDay: 'Добавить день',
                maxDaysReached: (n: number) => `Максимум дней: ${n}`,
            };
        }

        return {
            title: 'Sets',
            subtitle: 'Configure menus by day',
            newSet: 'New set',
            newDish: 'New dish',
            setsList: 'Sets list',
            updatedAt: 'Updated',
            search: 'Search',
            selectSetHint: 'Select a set to start editing',
            days: 'Days',
            dayMenuTitle: (day: string) => `Day ${day} menu`,
            noDayDataTitle: 'No menu for this day',
            noDayDataDesc: (day: string) => `Start from scratch or copy the standard menu for Day ${day}.`,
            copyStandard: (day: string) => `Copy standard menu (Day ${day})`,
            copiedDay: (day: string) => `Copied menu for Day ${day}`,
            confirmDeleteSet: 'Delete this set?',
            deleted: 'Deleted',
            delete: 'Delete',
            saveError: 'Save error',
            loadSetsError: 'Failed to load sets',
            loadDishesError: 'Failed to load dishes',
             setNameRequired: 'Enter set name',
             confirmDeleteDay: (day: string) => `Delete Day ${day}?`,
             confirmDeleteGroup: 'Delete this group?',
             cantDeleteLastDay: 'Cannot delete the last day',
             create: 'Create',
             cancel: 'Cancel',
             setName: 'Set name',
            mealName: 'Meal name',
            mealNamePlaceholder: 'Type a meal name...',
            mealNameRequired: 'Enter meal name',
            dish: 'Dish',
            meal: 'Meal',
            addMeal: 'Add meal',
            editMeal: 'Edit meal',
            noDishes: 'No dishes',
            customWeight: 'Custom weight',
            standard: 'Standard',
            addIngredient: 'Add ingredient',
            selectIngredient: 'Select an ingredient...',
            ingredients: 'Ingredients',
            ingredientsDesc: 'Adjust ingredients and amounts for this meal inside the set.',
            tableName: 'Name',
            tableAmount: 'Qty',
            tableUnit: 'Unit',
            noIngredients: 'No ingredients',
            ingredientAlreadyAdded: 'Ingredient already added',
            saveChanges: 'Save changes',
            groups: 'Groups',
            group: 'Group',
            newGroup: 'New group',
            groupName: 'Group name',
            groupCalories: 'Calories (kcal)',
            groupPrice: 'Price',
            dishesLabel: 'Dishes',
            caloriesLabel: 'Calories',
            priceLabel: 'Price (UZS)',
            mealLabel: (n: number) => `Meal ${n}`,
            menuDay: (day: string) => `Menu ${day}`,
            addDay: 'Add day',
            maxDaysReached: (n: number) => `Max days: ${n}`,
        };
    }, [language]);

    type CalorieGroupsMeta = {
        dayOrder?: string[];
        groupOrder?: string[];
        assignedPeriod?: {
            from: string;
            to: string;
        };
    };

    const [sets, setSets] = useState<MenuSet[]>([]);
    const [selectedSet, setSelectedSet] = useState<MenuSet | null>(null);
    const [activeDay, setActiveDay] = useState<string>("1"); // Current day being edited (1-21)
    const [availableDishes, setAvailableDishes] = useState<Dish[]>([]);
    const [warehouseItems, setWarehouseItems] = useState<Array<{ name: string; unit?: string; kcalPerGram?: number | null; pricePerUnit?: number | null; priceUnit?: string }>>([]);
    const [setSearch, setSetSearch] = useState('');
    const [periodRange, setPeriodRange] = useState<DateRange | undefined>(undefined);

    // UI State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRenameSetModalOpen, setIsRenameSetModalOpen] = useState(false);
    const [renameSetForm, setRenameSetForm] = useState({ name: '', description: '' });
    const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
    const [isEditDishModalOpen, setIsEditDishModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Edit State
    const [activeGroupTab, setActiveGroupTab] = useState('');
    const [addDishTarget, setAddDishTarget] = useState<{ calorieIndex: number } | null>(null);
    const [selectedDishToAdd, setSelectedDishToAdd] = useState<string>('');
    const [mealNameToAdd, setMealNameToAdd] = useState('');
    const [draftMealIngredients, setDraftMealIngredients] = useState<Ingredient[]>([]);
    const [customDraftIngredient, setCustomDraftIngredient] = useState({
        name: '',
        amount: '',
        unit: 'gr',
        kcalPerGram: '',
        pricePerUnit: '',
        priceUnit: 'kg',
    });
    const [customEditIngredient, setCustomEditIngredient] = useState({
        name: '',
        amount: '',
        unit: 'gr',
        kcalPerGram: '',
        pricePerUnit: '',
        priceUnit: 'kg',
    });
    const [editingDish, setEditingDish] = useState<{ setId: string; calorieIndex: number; dishIndex: number; dish: SetDish } | null>(null);
    const [editingGroup, setEditingGroup] = useState<{ groupIndex: number; group: CalorieGroup } | null>(null);
    const [selectedSetIdForPeriod, setSelectedSetIdForPeriod] = useState<string | null>(null);

    // Form state for new set
    const [newSetForm, setNewSetForm] = useState({
        name: '',
        description: ''
    });

    const [groupForm, setGroupForm] = useState<{ name: string; price: string }>({
        name: '',
        price: '',
    });

    const [setsOrder, setSetsOrder] = useState<string[]>([]);

    // Meals table sort & filter state
    const [mealSortStates, setMealSortStates] = useState<Record<string, SortState>>({})
    const [mealFilterOpen, setMealFilterOpen] = useState(false)
    const [mealFilterValues, setMealFilterValues] = useState<Record<string, string>>({})

    const mealColumns: SortableColumn[] = useMemo(() => [
        { key: 'index', label: '#', type: 'number' },
        { key: 'name', label: uiText.mealName, type: 'text' },
        { key: 'calories', label: uiText.caloriesLabel, type: 'number' },
        { key: 'standard', label: uiText.standard, type: 'text' },
    ], [uiText])

    const mealFilterColumns: FilterColumn[] = mealColumns

    const handleMealSortChange = useCallback((key: string, state: SortState) => {
        setMealSortStates((prev) => ({ ...prev, [key]: state }))
    }, [])

    const handleMealFilterChange = useCallback((key: string, value: string) => {
        setMealFilterValues((prev) => ({ ...prev, [key]: value }))
    }, [])

    const handleMealClearAllFilters = useCallback(() => {
        setMealFilterValues({})
    }, [])

    // Ingredient table sort state (add & edit modals)
    const [addIngredientSortStates, setAddIngredientSortStates] = useState<Record<string, SortState>>({})
    const [editIngredientSortStates, setEditIngredientSortStates] = useState<Record<string, SortState>>({})

    const ingredientColumns: SortableColumn[] = useMemo(() => [
        { key: 'name', label: uiText.tableName, type: 'text' },
        { key: 'amount', label: uiText.tableAmount, type: 'number' },
        { key: 'unit', label: uiText.tableUnit, type: 'text' },
        { key: 'kcalPerGram', label: 'kcal/gr', type: 'number' },
        { key: 'pricePerUnit', label: 'UZS/unit', type: 'number' },
    ], [uiText])

    const handleAddIngredientSortChange = useCallback((key: string, state: SortState) => {
        setAddIngredientSortStates((prev) => ({ ...prev, [key]: state }))
    }, [])

    const handleEditIngredientSortChange = useCallback((key: string, state: SortState) => {
        setEditIngredientSortStates((prev) => ({ ...prev, [key]: state }))
    }, [])

    // Load sets and dishes
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([fetchSets(), fetchDishes(), fetchWarehouseItems()]);
            setIsLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('warehouse_sets_order_v1');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setSetsOrder(parsed.filter((v) => typeof v === 'string'));
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        if (!sets || sets.length === 0) return;
        setSetsOrder((prev) => {
            const known = new Set(prev);
            const next = [...prev];
            for (const s of sets) {
                if (!known.has(s.id)) next.push(s.id);
            }
            try {
                localStorage.setItem('warehouse_sets_order_v1', JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });
    }, [sets]);

    const getMeta = (set: MenuSet | null): CalorieGroupsMeta => {
        const base = set?.calorieGroups as any;
        if (!base || typeof base !== 'object' || Array.isArray(base)) return {};
        const meta = base._meta;
        if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
        return meta as CalorieGroupsMeta;
    };

    const getBaseGroups = (set: MenuSet | null) => {
        const base =
            set?.calorieGroups && !Array.isArray(set.calorieGroups)
                ? (set.calorieGroups as any)
                : {};
        return base;
    };

    const getAssignedPeriodRange = (set: MenuSet | null): DateRange | undefined => {
        const meta = getMeta(set);
        const fromRaw = meta?.assignedPeriod?.from;
        if (!fromRaw) return undefined;

        const from = new Date(fromRaw);
        if (Number.isNaN(from.getTime())) return undefined;

        const to = new Date(meta?.assignedPeriod?.to ?? fromRaw);
        if (Number.isNaN(to.getTime())) return undefined;

        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        return { from, to };
    };

    const resolveDayKeyForDate = (date: Date, set: MenuSet | null, fallbackDay = '1') => {
        const assigned = getAssignedPeriodRange(set);
        const anchor = new Date(assigned?.from ?? date);
        anchor.setHours(0, 0, 0, 0);

        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        const diff = Math.floor((target.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000));
        const dayNumber = diff + 1;
        if (!Number.isFinite(dayNumber) || dayNumber < 1) return fallbackDay;
        return String(dayNumber);
    };

    const getDayKeysFromGroups = (groups: any) => {
        return Object.keys(groups || {})
            .filter((k) => /^\d+$/.test(k))
            .map((k) => String(parseInt(k, 10)))
            .filter((k) => k !== 'NaN' && Number(k) > 0);
    };

    const moveInArray = <T,>(arr: T[], from: number, to: number) => {
        if (from === to) return arr;
        if (from < 0 || from >= arr.length) return arr;
        if (to < 0 || to >= arr.length) return arr;
        const next = [...arr];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return next;
    };

    const fetchSets = async () => {
        try {
            const response = await fetch('/api/admin/sets');
            if (response.ok) {
                const json = await response.json();
                const data = json?.data ?? json;

                if (data.length === 0) {
                    await createDefaultSet();
                } else {
                    setSets(data);
                    // Always ensure selectedSet points to a valid set from the DB.
                    // If the current selectedSet no longer exists in the fetched list,
                    // fall back to the first set.
                    setSelectedSet(prev => {
                        if (prev && data.some((s: MenuSet) => s.id === prev.id)) {
                            return prev;
                        }
                        return data[0];
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching sets:', error);
            toast.error(uiText.loadSetsError);
        }
    };

    const createDefaultSet = async () => {
        try {
            const defaultName =
                language === 'ru' ? 'Стандартный сет' :
                    language === 'uz' ? 'Standart set' :
                        'Default set';
            const defaultDesc =
                language === 'ru' ? 'Автоматически созданный сет' :
                    language === 'uz' ? 'Avtomatik yaratilgan set' :
                        'Auto-created default set';
            const response = await fetch('/api/admin/sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: defaultName,
                    description: defaultDesc
                })
            });

            if (response.ok) {
                const json = await response.json();
                const newSet = json?.data ?? json;
                setSets([newSet]);
                setSelectedSet(newSet);
                toast.success(defaultName);
            }
        } catch (e) {
            console.error('Failed to create default set', e);
        }
    };

    const fetchDishes = async () => {
        try {
            const response = await fetch('/api/admin/warehouse/dishes');
            if (response.ok) {
                const json = await response.json();
                const data = json?.data ?? json;
                // Ensure IDs are strings to match our selection state naturally, or keep as is.
                // The DB returns objects. id might be string or number (if we seeded as "1").
                // Let's use them as is but treat IDs flexibly.
                setAvailableDishes(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching dishes:', error);
            toast.error(uiText.loadDishesError);
        }
    };

    const fetchWarehouseItems = async () => {
        try {
            const response = await fetch('/api/admin/warehouse/ingredients');
            if (response.ok) {
                const json = await response.json();
                const data = json?.data ?? json;
                setWarehouseItems(Array.isArray(data) ? data : []);
            }
        } catch {
            // calorie totals are best-effort; ignore loading failures here
            setWarehouseItems([]);
        }
    };

    const normalizeName = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();

    const normalizeIngredients = (raw: any): Ingredient[] => {
        if (!Array.isArray(raw)) return [];
        const toOptionalNumber = (value: unknown): number | undefined => {
            const n = typeof value === 'number' ? value : Number(value);
            return Number.isFinite(n) ? n : undefined;
        };
        return raw
            .map((i) => ({
                name: typeof i?.name === 'string' ? i.name : '',
                amount: typeof i?.amount === 'number' && Number.isFinite(i.amount) ? i.amount : Number(i?.amount) || 0,
                unit: typeof i?.unit === 'string' ? i.unit : 'gr',
                kcalPerGram: toOptionalNumber(i?.kcalPerGram),
                pricePerUnit: toOptionalNumber(i?.pricePerUnit),
                priceUnit: typeof i?.priceUnit === 'string' && i.priceUnit.trim().length > 0 ? i.priceUnit : undefined,
            }))
            .filter((i) => i.name.trim().length > 0);
    };

    const resetAddMealDraft = () => {
        setSelectedDishToAdd('');
        setMealNameToAdd('');
        setDraftMealIngredients([]);
        setCustomDraftIngredient({ name: '', amount: '', unit: 'gr', kcalPerGram: '', pricePerUnit: '', priceUnit: 'kg' });
    };

    const selectDishForAdd = (dish: any) => {
        setSelectedDishToAdd(String(dish?.id ?? ''));
        setMealNameToAdd(String(dish?.name ?? ''));
        setDraftMealIngredients(normalizeIngredients(dish?.ingredients));
    };

    const addDraftIngredient = (name: string) => {
        const trimmed = String(name || '').trim();
        if (!trimmed) return;
        if (draftMealIngredients.find((i) => normalizeName(i.name) === normalizeName(trimmed))) {
            toast.error(uiText.ingredientAlreadyAdded);
            return;
        }
        const found = getAllUniqueIngredients().find((i) => i.name === trimmed);
        setDraftMealIngredients((prev) => [
            ...prev,
            { name: trimmed, amount: 0, unit: found?.unit || 'gr' },
        ]);
    };

    const addCustomDraftIngredient = () => {
        const name = customDraftIngredient.name.trim();
        const amount = Number(customDraftIngredient.amount);
        const kcalPerGram = customDraftIngredient.kcalPerGram.trim() === '' ? undefined : Number(customDraftIngredient.kcalPerGram);
        const pricePerUnit = customDraftIngredient.pricePerUnit.trim() === '' ? undefined : Number(customDraftIngredient.pricePerUnit);
        if (!name || !Number.isFinite(amount) || amount <= 0) {
            toast.error(uiText.addIngredient);
            return;
        }
        if (draftMealIngredients.find((i) => normalizeName(i.name) === normalizeName(name))) {
            toast.error(uiText.ingredientAlreadyAdded);
            return;
        }
        setDraftMealIngredients((prev) => [
            ...prev,
            {
                name,
                amount,
                unit: customDraftIngredient.unit || 'gr',
                kcalPerGram: Number.isFinite(kcalPerGram as number) ? (kcalPerGram as number) : undefined,
                pricePerUnit: Number.isFinite(pricePerUnit as number) ? (pricePerUnit as number) : undefined,
                priceUnit: customDraftIngredient.priceUnit || customDraftIngredient.unit || 'kg',
            }
        ]);
        setCustomDraftIngredient({ name: '', amount: '', unit: 'gr', kcalPerGram: '', pricePerUnit: '', priceUnit: 'kg' });
    };

    const removeDraftIngredient = (index: number) => {
        setDraftMealIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const updateDraftIngredientAmount = (index: number, amount: number) => {
        setDraftMealIngredients((prev) =>
            prev.map((ing, i) => (i === index ? { ...ing, amount } : ing))
        );
    };

    const updateDraftIngredient = (index: number, patch: Partial<Ingredient>) => {
        setDraftMealIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)));
    };

    const createSet = async () => {
        if (!newSetForm.name.trim()) {
            toast.error(uiText.setNameRequired);
            return;
        }

        try {
            const response = await fetch('/api/admin/sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newSetForm.name,
                    description: newSetForm.description
                })
            });

            if (response.ok) {
                const json = await response.json();
                const newSet = json?.data ?? json;
                setSets(prev => [newSet, ...prev]);
                setSelectedSet(newSet);
                setIsCreateModalOpen(false);
                setNewSetForm({ name: '', description: '' });
                toast.success(uiText.create);
            } else {
                toast.error(uiText.saveError);
            }
        } catch {
            toast.error(uiText.saveError);
        }
    };

    // Helper: Get data for current day, or init default
    const getCurrentDayData = (): CalorieGroup[] => {
        if (!selectedSet) return [];

        // Safety check for legacy data
        if (Array.isArray(selectedSet.calorieGroups)) return [];

        // Check if data exists for this day
        const dayData = (selectedSet.calorieGroups as any)[activeDay];

        if (dayData) return dayData;

        return [];
    };

    // Copy standard menu to current day
    const buildStandardDayData = (dayNum: number): CalorieGroup[] | null => {
        const menuNumber = ((dayNum - 1) % 21) + 1;
        const menuData = MENUS.find(m => m.menuNumber === menuNumber);
        if (!menuData) return null;

        return [
            {
                id: 'group-1',
                calories: 0,
                name: '1',
                price: null,
                dishes: menuData.dishes.map((dish) => ({
                    dishId: dish.id,
                    dishName: dish.name,
                    mealType: dish.mealType,
                    customIngredients: undefined,
                })),
            },
        ];
    };

    const copyStandardMenuToDay = async () => {
        if (!selectedSet) return;

        const dayNum = parseInt(activeDay);
        const newDayData = buildStandardDayData(dayNum);

        if (!newDayData) {
            toast.error(uiText.noDayDataTitle);
            return;
        }

        const updatedGroups = {
            ...(selectedSet.calorieGroups || {}),
            [activeDay]: newDayData
        };

        const updatedSet = { ...selectedSet, calorieGroups: updatedGroups };

        // Optimistic
        setSelectedSet(updatedSet);
        setSets(prev => prev.map(s => s.id === updatedSet.id ? updatedSet : s));

        // Save
        await saveSet(updatedSet);
        toast.success(uiText.copiedDay(activeDay));
    };

    const saveSet = async (setToSave: MenuSet) => {
        try {
            const response = await fetch(`/api/admin/sets/${setToSave.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ calorieGroups: setToSave.calorieGroups })
            });
            if (!response.ok) {
                if (response.status === 404) {
                    // The set no longer exists in the DB (e.g. after re-seed).
                    // Re-fetch the sets list so the UI stays in sync.
                    toast.error(uiText.saveError);
                    await fetchSets();
                    return;
                }
                throw new Error(`save_set_failed_${response.status}`);
            }
        } catch (e) {
            console.error(e);
            toast.error(uiText.saveError);
        }
    };

    useEffect(() => {
        if (!isGroupModalOpen) return;

        if (editingGroup) {
            setGroupForm({
                name: editingGroup.group.name || '',
                price: typeof editingGroup.group.price === 'number' ? String(editingGroup.group.price) : '',
            });
            return;
        }

        setGroupForm({ name: '', price: '' });
    }, [editingGroup, isGroupModalOpen]);

    const makeGroupId = () => {
        try {
            const id = (globalThis as any)?.crypto?.randomUUID?.();
            if (typeof id === 'string' && id.length > 0) return id;
        } catch {
            // ignore
        }
        return `g_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    };

    const upsertGroup = async () => {
        if (!selectedSet) return;

        const baseGroups = getBaseGroups(selectedSet);
        const meta = getMeta(selectedSet);

        const dayGroups = Array.isArray(baseGroups[String(activeDay)]) ? baseGroups[String(activeDay)] : [];
        const defaultNumberName = editingGroup ? String(editingGroup.groupIndex + 1) : String(dayGroups.length + 1);
        const name = (groupForm.name || '').trim() || defaultNumberName;
        const rawPrice = String(groupForm.price || '').trim();
        let price: number | null = null;
        if (rawPrice !== '') {
            const normalized = rawPrice.replace(/\s+/g, '').replace(',', '.');
            const parsed = Number(normalized);
            if (!Number.isFinite(parsed) || parsed < 0) {
                toast.error(uiText.saveError);
                return;
            }
            price = parsed;
        }

        const nextId = editingGroup?.group?.id || makeGroupId();

        const dayKeys = getDayKeysFromGroups(baseGroups);
        const ensuredKeys = dayKeys.length > 0 ? dayKeys : Array.from({ length: 21 }, (_, i) => String(i + 1));

        const nextGroups: Record<string, CalorieGroup[]> = {};
        for (const dayKey of ensuredKeys) {
            const dayArr: CalorieGroup[] = Array.isArray(baseGroups[dayKey]) ? baseGroups[dayKey] : [];

            if (editingGroup) {
                nextGroups[dayKey] = dayArr.map((g) => (g.id === nextId ? { ...g, id: nextId, name, price, dishes: g.dishes || [] } : g));
            } else {
                nextGroups[dayKey] = [
                    ...dayArr,
                    { id: nextId, name, price, dishes: [] },
                ];
            }
        }
        nextGroups._meta = {
            ...meta,
            groupOrder: (() => {
                const existing = Array.isArray(meta.groupOrder) ? meta.groupOrder.map(String) : [];
                if (existing.includes(String(nextId))) return existing;
                return [...existing, String(nextId)];
            })(),
        } as any;

        const updatedSet = { ...selectedSet, calorieGroups: nextGroups };
        setSelectedSet(updatedSet);
        setSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
        setIsGroupModalOpen(false);
        setEditingGroup(null);
        await saveSet(updatedSet);
        toast.success(uiText.saveChanges);
    };

    // CRUD Operations for Dishes (similar to before but aware of Day structure)

    // Ingredient Management
    const getAllUniqueIngredients = () => {
        const ingredients = new Map<string, string>(); // name -> unit
        availableDishes.forEach(d => {
            d.ingredients?.forEach(i => ingredients.set(i.name, i.unit));
        });
        // Also include warehouse items so managers can add any newly created ingredient.
        warehouseItems.forEach((item) => {
            const name = typeof item?.name === 'string' ? item.name.trim() : '';
            if (!name) return;
            ingredients.set(name, item.unit || 'gr');
        });
        return Array.from(ingredients.entries()).map(([name, unit]) => ({ name, unit })).sort((a, b) => a.name.localeCompare(b.name));
    };

    const removeIngredient = (index: number) => {
        if (!editingDish) return;
        const currentIngredients = editingDish.dish.customIngredients
            ? [...editingDish.dish.customIngredients]
            : [...getOriginalIngredients(editingDish.dish.dishId)];

        currentIngredients.splice(index, 1);

        setEditingDish({
            ...editingDish,
            dish: { ...editingDish.dish, customIngredients: currentIngredients }
        });
    };

    const updateEditingIngredient = (index: number, patch: Partial<Ingredient>) => {
        if (!editingDish) return;
        const currentIngredients = editingDish.dish.customIngredients
            ? [...editingDish.dish.customIngredients]
            : [...getOriginalIngredients(editingDish.dish.dishId)];
        currentIngredients[index] = { ...currentIngredients[index], ...patch };
        setEditingDish({
            ...editingDish,
            dish: { ...editingDish.dish, customIngredients: currentIngredients }
        });
    };

    const addCustomIngredientToEditingDish = () => {
        if (!editingDish) return;
        const name = customEditIngredient.name.trim();
        const amount = Number(customEditIngredient.amount);
        const kcalPerGram = customEditIngredient.kcalPerGram.trim() === '' ? undefined : Number(customEditIngredient.kcalPerGram);
        const pricePerUnit = customEditIngredient.pricePerUnit.trim() === '' ? undefined : Number(customEditIngredient.pricePerUnit);
        if (!name || !Number.isFinite(amount) || amount <= 0) {
            toast.error(uiText.addIngredient);
            return;
        }
        const currentIngredients = editingDish.dish.customIngredients
            ? [...editingDish.dish.customIngredients]
            : [...getOriginalIngredients(editingDish.dish.dishId)];
        if (currentIngredients.find(i => normalizeName(i.name) === normalizeName(name))) {
            toast.error(uiText.ingredientAlreadyAdded);
            return;
        }
        const existing = getAllUniqueIngredients().find((i) => normalizeName(i.name) === normalizeName(name));
        const warehouseMeta = warehouseItemByName.get(normalizeName(name));
        const resolvedUnit = customEditIngredient.unit || existing?.unit || 'gr';
        const resolvedKcal =
            Number.isFinite(kcalPerGram as number)
                ? (kcalPerGram as number)
                : (typeof warehouseMeta?.kcalPerGram === 'number' ? warehouseMeta.kcalPerGram : undefined);
        const resolvedPrice =
            Number.isFinite(pricePerUnit as number)
                ? (pricePerUnit as number)
                : (typeof warehouseMeta?.pricePerUnit === 'number' ? warehouseMeta.pricePerUnit : undefined);
        currentIngredients.push({
            name,
            amount,
            unit: resolvedUnit,
            kcalPerGram: resolvedKcal,
            pricePerUnit: resolvedPrice,
            priceUnit: customEditIngredient.priceUnit || resolvedUnit || 'kg',
        });
        setEditingDish({
            ...editingDish,
            dish: { ...editingDish.dish, customIngredients: currentIngredients }
        });
        setCustomEditIngredient({ name: '', amount: '', unit: 'gr', kcalPerGram: '', pricePerUnit: '', priceUnit: 'kg' });
    };

    const updateEditingDish = async () => {
        if (!editingDish || !selectedSet) return;

        const currentData = getCurrentDayData();
        const updatedDayData = [...currentData];

        // Ensure structure exists
        if (!updatedDayData[editingDish.calorieIndex]) return;

        updatedDayData[editingDish.calorieIndex].dishes[editingDish.dishIndex] = editingDish.dish;

        const updatedGroups = {
            ...(selectedSet.calorieGroups || {}),
            [activeDay]: updatedDayData
        };

        const updatedSet = { ...selectedSet, calorieGroups: updatedGroups };

        setSelectedSet(updatedSet);
        setSets(prev => prev.map(s => s.id === updatedSet.id ? updatedSet : s));
        setIsEditDishModalOpen(false);
        setEditingDish(null);

        await saveSet(updatedSet);
        toast.success(uiText.saveChanges);
    };

    const deleteDishFromGroup = async (calorieIndex: number, dishIndex: number) => {
        if (!selectedSet) return;

        const currentData = getCurrentDayData();
        const updatedDayData = [...currentData]; // Shallow copy of array

        // Deep copy of dishes array to modify it
        updatedDayData[calorieIndex] = {
            ...updatedDayData[calorieIndex],
            dishes: [...updatedDayData[calorieIndex].dishes]
        };

        updatedDayData[calorieIndex].dishes.splice(dishIndex, 1);

        const updatedGroups = {
            ...(selectedSet.calorieGroups || {}),
            [activeDay]: updatedDayData
        };
        const updatedSet = { ...selectedSet, calorieGroups: updatedGroups };

        setSelectedSet(updatedSet);
        setSets(prev => prev.map(s => s.id === updatedSet.id ? updatedSet : s));
        await saveSet(updatedSet);
    };

    const addDishToGroup = async () => {
        if (!selectedSet || !addDishTarget) return;

        const enteredName = mealNameToAdd.trim();
        if (!enteredName) {
            toast.error(uiText.mealNameRequired);
            return;
        }

        // Prefer explicitly selected dish; fallback to exact-name match.
        let dishObj: any =
            selectedDishToAdd
                ? availableDishes.find(d => String((d as any).id) === selectedDishToAdd)
                : availableDishes.find(d => normalizeName(String((d as any).name || '')) === normalizeName(enteredName));

        const ingredientsToUse =
            draftMealIngredients.length > 0
                ? draftMealIngredients
                : (dishObj ? normalizeIngredients((dishObj as any).ingredients) : []);

        if (!dishObj) {
            try {
                const response = await fetch('/api/admin/warehouse/dishes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: enteredName,
                        description: '',
                        mealType: 'CUSTOM',
                        ingredients: ingredientsToUse,
                        menuNumbers: [],
                    }),
                });

                if (!response.ok) {
                    toast.error(uiText.saveError);
                    return;
                }

                dishObj = await response.json().catch(() => null);
                if (dishObj?.data) dishObj = dishObj.data;
                await fetchDishes();
            } catch {
                toast.error(uiText.saveError);
                return;
            }
        }

        if (!dishObj) {
            toast.error(uiText.saveError);
            return;
        }

        const currentData = getCurrentDayData();

        // If empty, init it first? But copyStandardMenuToDay handles bulk init.
        // Assuming array exists if we are adding via button which is inside tab content

        const updatedDayData = [...currentData];
        if (updatedDayData.length === 0) {
            // Edge case: empty day, user clicks add manually without copying
            // Initialize structure
            updatedDayData.push({ id: 'group-1', calories: 0, name: '1', price: null, dishes: [] });
        }

        updatedDayData[addDishTarget.calorieIndex] = {
            ...updatedDayData[addDishTarget.calorieIndex],
            dishes: [...updatedDayData[addDishTarget.calorieIndex].dishes]
        };

        const dishesArr = updatedDayData[addDishTarget.calorieIndex].dishes;
        const maxMealIndex = dishesArr.reduce((acc, d) => {
            const n = typeof (d as any).mealIndex === 'number' ? (d as any).mealIndex : 0;
            return Math.max(acc, Number.isFinite(n) ? n : 0);
        }, 0);
        const mealIndex = maxMealIndex + 1;

        dishesArr.push({
            dishId: (dishObj as any).id,
            dishName: String((dishObj as any).name || enteredName),
            mealType: String((dishObj as any).mealType || 'CUSTOM'),
            mealIndex,
            customIngredients: ingredientsToUse.length > 0 ? [...ingredientsToUse] : undefined
        });

        const updatedGroups = {
            ...(selectedSet.calorieGroups || {}),
            [activeDay]: updatedDayData
        };

        const updatedSet = { ...selectedSet, calorieGroups: updatedGroups };
        setSelectedSet(updatedSet);
        setSets(prev => prev.map(s => s.id === updatedSet.id ? updatedSet : s));

        setIsAddDishModalOpen(false);
        setAddDishTarget(null);
        resetAddMealDraft();

        await saveSet(updatedSet);
        toast.success(uiText.addMeal);
    };

    const openRenameSetModal = () => {
        if (!selectedSet) return;
        setRenameSetForm({ name: selectedSet.name, description: selectedSet.description || '' });
        setIsRenameSetModalOpen(true);
    };

    const renameSet = async () => {
        if (!selectedSet || !renameSetForm.name.trim()) {
            toast.error(uiText.setNameRequired);
            return;
        }
        try {
            const response = await fetch(`/api/admin/sets/${selectedSet.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: renameSetForm.name, description: renameSetForm.description })
            });
            if (response.ok) {
                const json = await response.json();
                const updated = json?.data ?? json;
                setSets(prev => prev.map(s => s.id === updated.id ? updated : s));
                setSelectedSet(updated);
                setIsRenameSetModalOpen(false);
                toast.success(uiText.saveChanges);
            } else {
                toast.error(uiText.saveError);
            }
        } catch {
            toast.error(uiText.saveError);
        }
    };

    const deleteSet = async (id: string) => {
        if (!confirm(uiText.confirmDeleteSet)) return;
        await fetch(`/api/admin/sets/${id}`, { method: 'DELETE' });
        setSets((prev) => {
            const next = prev.filter((s) => s.id !== id);
            if (selectedSet?.id === id) {
                setSelectedSet(next[0] || null);
                setActiveDay('1');
                setActiveGroupTab('');
            }
            return next;
        });
        toast.success(uiText.deleted);
    };

    const getOriginalIngredients = (dishId: string | number): Ingredient[] => {
        // Try to find in availableDishes first (from DB)
        let dish = availableDishes.find(d => d.id == dishId); // Use loose equality for string/number compatibility

        // Fallback to static MENUS if not found or availableDishes is empty
        if (!dish && MENUS) {
            for (const menu of MENUS) {
                const found = menu.dishes.find(d => d.id == dishId);
                if (found) {
                    dish = found;
                    break;
                }
            }
        }

        return dish?.ingredients || [];
    };

    const kcalPerGramByName = useMemo(() => {
        const m = new Map<string, number>();
        for (const item of warehouseItems) {
            const name = typeof item?.name === 'string' ? item.name.trim().toLowerCase() : '';
            const kcal = typeof item?.kcalPerGram === 'number' && Number.isFinite(item.kcalPerGram) ? item.kcalPerGram : null;
            if (!name || kcal === null) continue;
            m.set(name, kcal);
        }
        return m;
    }, [warehouseItems]);

    const toGrams = (amount: number, unit: string) => {
        const a = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
        const u = (unit || '').toLowerCase().trim();
        if (!a) return 0;
        if (u === 'kg') return a * 1000;
        if (u === 'g' || u === 'gr' || u === 'гр') return a;
        if (u === 'mg') return a / 1000;
        // Best-effort for liquids/pcs: treat as grams to still show a useful total.
        return a;
    };

    const formatUzs = (value: number) => {
        const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
        return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(v));
    };

    // Compact format for tight labels (e.g. group tabs): 84000 -> "84k".
    const formatUzsCompact = (value: number) => {
        const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
        if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}k`;
        return String(Math.round(v));
    };

    const getGroupDisplayName = (group: CalorieGroup, index: number) => {
        const raw = String(group?.name || '').trim();
        if (!raw) return String(index + 1);
        return raw;
    };

    const warehouseItemByName = useMemo(() => {
        const map = new Map<string, { kcalPerGram: number | null; pricePerUnit: number | null; priceUnit: string }>();
        for (const item of warehouseItems) {
            const key = String(item?.name || '').trim().toLowerCase();
            if (!key) continue;
            map.set(key, {
                kcalPerGram: typeof item?.kcalPerGram === 'number' && Number.isFinite(item.kcalPerGram) ? item.kcalPerGram : null,
                pricePerUnit: typeof item?.pricePerUnit === 'number' && Number.isFinite(item.pricePerUnit) ? item.pricePerUnit : null,
                priceUnit: String(item?.priceUnit || item?.unit || 'kg').trim() || 'kg',
            });
        }
        return map;
    }, [warehouseItems]);

    const convertUnitAmount = (amount: number, fromUnit: string, toUnit: string): number | null => {
        const from = (fromUnit || '').toLowerCase().trim();
        const to = (toUnit || '').toLowerCase().trim();
        if (!Number.isFinite(amount)) return null;
        if (from === to) return amount;

        const mass: Record<string, number> = { kg: 1000, g: 1, gr: 1, mg: 0.001 };
        const volume: Record<string, number> = { l: 1000, ml: 1 };
        const pcs: Record<string, number> = { pcs: 1, pc: 1, sht: 1, dona: 1 };

        if (mass[from] && mass[to]) return (amount * mass[from]) / mass[to];
        if (volume[from] && volume[to]) return (amount * volume[from]) / volume[to];
        if (pcs[from] && pcs[to]) return amount;
        return null;
    };

    const getDraftIngredientCost = (ing: Ingredient) => {
        if (typeof ing?.pricePerUnit === 'number' && Number.isFinite(ing.pricePerUnit)) {
            const localPriceUnit = String(ing.priceUnit || ing.unit || 'gr');
            const convertedLocal = convertUnitAmount(Number(ing.amount) || 0, String(ing.unit || 'gr'), localPriceUnit);
            if (convertedLocal !== null) return convertedLocal * ing.pricePerUnit;
        }
        const item = warehouseItemByName.get(String(ing.name || '').trim().toLowerCase());
        if (!item || item.pricePerUnit === null) return null;
        const converted = convertUnitAmount(Number(ing.amount) || 0, String(ing.unit || 'gr'), item.priceUnit);
        if (converted === null) return null;
        return converted * item.pricePerUnit;
    };

    const getDishCalories = (dish: SetDish) => {
        const ingredients = dish.customIngredients ? dish.customIngredients : getOriginalIngredients(dish.dishId);
        let total = 0;
        for (const ing of ingredients || []) {
            const nameKey = (ing.name || '').trim().toLowerCase();
            const kcalPerGram =
                (typeof ing?.kcalPerGram === 'number' && Number.isFinite(ing.kcalPerGram) ? ing.kcalPerGram : null)
                ?? (kcalPerGramByName.get(nameKey) ?? 0);
            total += toGrams(Number(ing.amount), String(ing.unit)) * kcalPerGram;
        }
        return Number.isFinite(total) ? total : 0;
    };

    const getDishPrice = (dish: SetDish) => {
        const ingredients = dish.customIngredients ? dish.customIngredients : getOriginalIngredients(dish.dishId);
        let total = 0;
        for (const ing of ingredients || []) {
            const cost = getDraftIngredientCost(ing);
            if (cost !== null && Number.isFinite(cost)) total += cost;
        }
        return Number.isFinite(total) ? total : 0;
    };

    const visibleSets = useMemo(() => {
        const q = setSearch.trim().toLowerCase();
        const filtered = !q ? sets : sets.filter((s) => (s.name || '').toLowerCase().includes(q));

        if (!setsOrder || setsOrder.length === 0) return filtered;
        const idx = new Map<string, number>();
        setsOrder.forEach((id, i) => idx.set(id, i));
        return filtered.slice().sort((a, b) => {
            const aI = idx.has(a.id) ? (idx.get(a.id) as number) : Number.MAX_SAFE_INTEGER;
            const bI = idx.has(b.id) ? (idx.get(b.id) as number) : Number.MAX_SAFE_INTEGER;
            if (aI !== bI) return aI - bI;
            // Stable fallback: keep API order (createdAt desc)
            return 0;
        });
    }, [setSearch, sets, setsOrder]);

    const currentDayDataRaw = getCurrentDayData();
    const currentDayData = useMemo(() => {
        return (currentDayDataRaw || []).map((g, idx) => ({
            ...g,
            id: g.id || `group-${idx + 1}`,
            price: typeof g.price === 'number' ? g.price : (g.price ?? null),
        }));
    }, [currentDayDataRaw]);
    const visibleDayGroups = useMemo(() => {
        return currentDayData.filter((g) => {
            const rawName = String(g?.name || '').trim();
            const isNumericLabel = /^\d+$/.test(rawName);
            const hasPrice = typeof g?.price === 'number' && Number.isFinite(g.price);
            const hasDishes = Array.isArray(g?.dishes) && g.dishes.length > 0;
            // Ignore day-like placeholders from legacy structures (e.g. 1..22 with no dishes/price).
            return !isNumericLabel || hasPrice || hasDishes;
        });
    }, [currentDayData]);
    const hasDataForDay = visibleDayGroups.length > 0;

    const dayKeys = useMemo(() => {
        if (!selectedSet || !selectedSet.calorieGroups || Array.isArray(selectedSet.calorieGroups)) {
            return Array.from({ length: 21 }, (_, i) => String(i + 1));
        }

        const base = getBaseGroups(selectedSet);
        const meta = getMeta(selectedSet);
        const existing = getDayKeysFromGroups(base).sort((a, b) => Number(a) - Number(b));
        if (existing.length === 0) return Array.from({ length: 21 }, (_, i) => String(i + 1));

        const order = Array.isArray(meta.dayOrder) ? meta.dayOrder.map(String) : [];
        if (order.length === 0) return existing;

        // Keep only existing keys, preserve order, then append any missing.
        const existingSet = new Set(existing);
        const next: string[] = [];
        for (const k of order) if (existingSet.has(k)) next.push(k);
        for (const k of existing) if (!next.includes(k)) next.push(k);
        return next;
    }, [selectedSet]);

    const selectedSummaryDayKeys = useMemo(() => {
        if (dayKeys.length === 0) return [] as string[];
        if (!periodRange?.from) return [activeDay];

        const start = new Date(periodRange.from);
        start.setHours(0, 0, 0, 0);
        const end = new Date(periodRange.to ?? periodRange.from);
        end.setHours(0, 0, 0, 0);

        const assigned = getAssignedPeriodRange(selectedSet);
        const anchor = new Date(assigned?.from ?? start);
        anchor.setHours(0, 0, 0, 0);

        const result: string[] = [];
        const maxSpan = 62;
        const cursor = new Date(start);

        while (cursor.getTime() <= end.getTime() && result.length < maxSpan) {
            const dayNumber = Math.floor((cursor.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000)) + 1;
            const key = String(dayNumber);
            if (dayKeys.includes(key)) result.push(key);
            cursor.setDate(cursor.getDate() + 1);
        }

        return result.length > 0 ? result : [activeDay];
    }, [dayKeys, periodRange, activeDay, selectedSet]);

    const selectedDayBadgeLabel = useMemo(() => {
        if (selectedSummaryDayKeys.length !== 1) return null;
        return `Day:${selectedSummaryDayKeys[0]}`;
    }, [selectedSummaryDayKeys]);

    const selectedDaysSummary = useMemo(() => {
        if (!selectedSet) {
            return { days: 0, dishes: 0, calories: 0, price: 0 };
        }
        const baseGroups = getBaseGroups(selectedSet);
        let dishes = 0;
        let calories = 0;
        let price = 0;

        for (const dayKey of selectedSummaryDayKeys) {
            const dayGroups: CalorieGroup[] = Array.isArray((baseGroups as any)[dayKey]) ? (baseGroups as any)[dayKey] : [];
            for (const group of dayGroups) {
                for (const dish of group?.dishes || []) {
                    dishes += 1;
                    calories += getDishCalories(dish as SetDish);
                    price += getDishPrice(dish as SetDish);
                }
            }
        }

        return {
            days: selectedSummaryDayKeys.length,
            dishes,
            calories: Math.round(calories),
            price: Math.round(price),
        };
    }, [selectedSet, selectedSummaryDayKeys, warehouseItemByName, kcalPerGramByName, availableDishes]);

    const calendarUiText = useMemo(() => {
        if (language === 'ru') {
            return { calendar: 'Период', today: 'Сегодня', thisWeek: 'Неделя', thisMonth: 'Месяц', clearRange: 'Сброс', allTime: 'Выбрать период' };
        }
        if (language === 'uz') {
            return { calendar: 'Davr', today: 'Bugun', thisWeek: 'Hafta', thisMonth: 'Oy', clearRange: 'Tozalash', allTime: 'Davr tanlang' };
        }
        return { calendar: 'Period', today: 'Today', thisWeek: 'Week', thisMonth: 'Month', clearRange: 'Clear', allTime: 'Select period' };
    }, [language]);

    const setToThisSetLabel = useMemo(() => {
        if (language === 'ru') return 'Установить на этот сет';
        if (language === 'uz') return 'Ushbu setga biriktirish';
        return 'Set to this set';
    }, [language]);

    const periodAssignedMessage = useMemo(() => {
        if (language === 'ru') return 'Период привязан к выбранному сету';
        if (language === 'uz') return 'Davr tanlangan setga biriktirildi';
        return 'Period assigned to selected set';
    }, [language]);

    const applySelectedPeriodToSet = async () => {
        if (!selectedSet || !periodRange?.from) return;
        const from = new Date(periodRange.from);
        from.setHours(0, 0, 0, 0);
        const to = new Date(periodRange.to ?? periodRange.from);
        to.setHours(0, 0, 0, 0);

        const baseGroups = getBaseGroups(selectedSet);
        const meta = getMeta(selectedSet);
        const nextGroups = {
            ...baseGroups,
            _meta: {
                ...meta,
                assignedPeriod: {
                    from: from.toISOString(),
                    to: to.toISOString(),
                },
            },
        } as any;

        const updatedSet = { ...selectedSet, calorieGroups: nextGroups };
        setSelectedSet(updatedSet);
        setSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
        await saveSet(updatedSet);
        toast.success(periodAssignedMessage);
    };

    const deleteGroupById = async (groupId: string) => {
        if (!selectedSet) return;
        if (!groupId) return;
        if (!confirm(uiText.confirmDeleteGroup)) return;

        const baseGroups = getBaseGroups(selectedSet);
        const meta = getMeta(selectedSet);

        const nextGroups: Record<string, CalorieGroup[]> = {};
        for (const dayKey of getDayKeysFromGroups(baseGroups)) {
            const dayArr: CalorieGroup[] = Array.isArray(baseGroups[dayKey]) ? baseGroups[dayKey] : [];
            nextGroups[dayKey] = dayArr.filter((g) => String(g.id || '') !== String(groupId));
        }
        nextGroups._meta = {
            ...meta,
            groupOrder: Array.isArray(meta.groupOrder) ? meta.groupOrder.filter((id) => String(id) !== String(groupId)) : undefined,
        } as any;

        const updatedSet = { ...selectedSet, calorieGroups: nextGroups };
        setSelectedSet(updatedSet);
        setSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));

        setActiveGroupTab((prev) => {
            if (prev !== groupId) return prev;
            const forActiveDay = nextGroups[String(activeDay)] || [];
            const ensured = forActiveDay.map((g, idx) => ({ ...g, id: g.id || `group-${idx + 1}` }));
            return ensured[0]?.id || '';
        });

        await saveSet(updatedSet);
        toast.success(uiText.deleted);
    };

    const moveSelectedSet = (dir: -1 | 1) => {
        if (!selectedSet) return;
        setSetsOrder((prev) => {
            const order = prev.length > 0 ? [...prev] : sets.map((s) => s.id);
            const idx = order.indexOf(selectedSet.id);
            if (idx === -1) return prev;
            const next = moveInArray(order, idx, idx + dir);
            try {
                localStorage.setItem('warehouse_sets_order_v1', JSON.stringify(next));
            } catch {
                // ignore
            }
            return next;
        });
    };

    useEffect(() => {
        if (!hasDataForDay) return;
        if (visibleDayGroups.some((g) => g.id === activeGroupTab)) return;
        setActiveGroupTab(visibleDayGroups[0]?.id || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeDay, hasDataForDay, visibleDayGroups]);

    useEffect(() => {
        if (!dayKeys.includes(activeDay)) {
            setActiveDay(dayKeys[0] || '1');
        }
    }, [dayKeys, activeDay]);

    useEffect(() => {
        if (!selectedSet) return;
        if (selectedSetIdForPeriod === selectedSet.id) return;

        setSelectedSetIdForPeriod(selectedSet.id);

        const assignedRange = getAssignedPeriodRange(selectedSet);
        setPeriodRange(assignedRange);

        if (assignedRange?.from) {
            const mappedDay = resolveDayKeyForDate(assignedRange.from, selectedSet, dayKeys[0] || '1');
            if (dayKeys.includes(mappedDay)) {
                setActiveDay(mappedDay);
                return;
            }
        }

        setActiveDay(dayKeys[0] || '1');
    }, [selectedSet, selectedSetIdForPeriod, dayKeys]);

    if (isLoading) return (
        <div className="space-y-4 p-4">
            {/* Skeleton page header */}
            <div className="page-header">
                <div className="space-y-2">
                    <div className="skeleton h-7 w-32 rounded-md" />
                    <div className="skeleton h-4 w-48 rounded-md" />
                </div>
                <div className="skeleton h-10 w-28 rounded-lg" />
            </div>
            {/* Skeleton sets row */}
 <div className="rounded-xl p-3">
                <div className="flex items-center gap-2">
                    <div className="skeleton h-8 w-24 rounded-lg" />
                    <div className="skeleton h-8 w-28 rounded-lg" />
                    <div className="skeleton h-8 w-20 rounded-lg" />
                    <div className="skeleton h-8 w-8 rounded-lg" />
                </div>
            </div>
            {/* Skeleton content area */}
 <div className="rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <div className="skeleton h-9 w-20 rounded-lg" />
                    <div className="skeleton h-9 w-20 rounded-lg" />
                    <div className="skeleton h-9 w-20 rounded-lg" />
                </div>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="skeleton h-4 w-10 rounded" />
                        <div className="skeleton h-4 flex-1 rounded" />
                        <div className="skeleton h-4 w-16 rounded" />
                        <div className="skeleton h-4 w-20 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Page Header — design system .page-header pattern */}
            <div className="page-header">
                <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-foreground">{uiText.title}</h3>
                    <p className="page-header-desc">{uiText.subtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <CalendarRangeSelector
                        value={periodRange}
                        onChange={(next) => {
                            if (!next?.from) {
                                setPeriodRange(undefined);
                                setActiveDay(dayKeys[0] || '1');
                                return;
                            }
                            const start = new Date(next.from);
                            start.setHours(0, 0, 0, 0);
                            const end = new Date(next.to ?? next.from);
                            end.setHours(0, 0, 0, 0);
                            setPeriodRange({ from: start, to: end });
                            const mappedDay = resolveDayKeyForDate(start, selectedSet, dayKeys[0] || '1');
                            if (dayKeys.includes(mappedDay)) {
                                setActiveDay(mappedDay);
                            } else {
                                setActiveDay(dayKeys[0] || '1');
                            }
                        }}
                        uiText={calendarUiText}
                        locale={language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'}
                        highlightAfterRange
                        className="w-full sm:w-[280px] md:w-[320px] flex-none basis-full sm:basis-auto"
                    />
                    <Button
                        type="button"
                        size="sm"
                        className="h-9 w-full sm:w-auto flex-none basis-full sm:basis-auto"
                        disabled={!selectedSet || !periodRange?.from}
                        onClick={() => void applySelectedPeriodToSet()}
                    >
                        {setToThisSetLabel}
                    </Button>

                </div>
            </div>

            <div className="space-y-4">
                {/* Sets Selector Row */}
 <Card className="rounded-xl overflow-hidden bg-card">
                    <div className="p-2 overflow-x-auto">
                        <div className="flex items-center gap-1 min-w-max">
                            <span className="section-kicker px-2 mr-2 flex items-center gap-1">
                                <Scale className="w-4 h-4" />
                                {uiText.setsList}:
                            </span>

                            {visibleSets.map((set) => {
                                const isSelected = selectedSet?.id === set.id;
                                return (
                                    <Button
                                        key={set.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSet(set);
                                        }}
                                        onDoubleClick={() => {
                                            setSelectedSet(set);
                                            setRenameSetForm({ name: set.name, description: set.description || '' });
                                            setIsRenameSetModalOpen(true);
                                        }}
                                        variant="ghost"
                                        className={[
 "h-8 min-w-[140px] max-w-[220px] px-3 rounded-lg flex items-center transition-colors justify-start",
                                            isSelected
 ? " bg-primary-50 text-primary-700 font-medium"
 : " bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                                        ].join(" ")}
                                        title={set.name}
                                    >
                                        <span className="truncate text-sm flex-1 text-left">{set.name}</span>
                                    </Button>
                                );
                            })}

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                onClick={() => setIsCreateModalOpen(true)}
                                title={uiText.newSet}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>

                {selectedSet ? (
                    <div className="space-y-4">
 <Card className="rounded-xl min-h-[600px] flex flex-col bg-card">
                                {/* Day Content */}
                                <CardContent className="flex-1 p-0">
                                    {!hasDataForDay ? (
                                            <div className="empty-state">
                                                <UtensilsCrossed className="empty-state-icon" />
                                            <div className="empty-state-title">{uiText.noDayDataTitle}</div>
                                            <p className="empty-state-desc mb-6">{uiText.noDayDataDesc(activeDay)}</p>
                                            <Button variant="outline" onClick={copyStandardMenuToDay}>
                                                <Copy className="h-4 w-4 mr-2" />
                                                {uiText.copyStandard(activeDay)}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Tabs value={activeGroupTab} onValueChange={setActiveGroupTab} className="h-full flex flex-col">
 <div className="px-4 py-2 flex items-center gap-2 bg-card">
                                                <TabsList className="flex flex-wrap w-full justify-start gap-1 bg-transparent">
                                                    {visibleDayGroups.map((g, idx) => (
                                                        <TabsTrigger
                                                            key={g.id}
                                                            value={g.id as string}
                                                            className="px-3 rounded-lg text-sm text-muted-foreground data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:shadow-none"
                                                            onDoubleClick={(e) => {
                                                                e.preventDefault();
                                                                setEditingGroup({ groupIndex: idx, group: g });
                                                                setIsGroupModalOpen(true);
                                                            }}
                                                        >
                                                            <span className="max-w-[160px] truncate">
                                                                {(() => {
                                                                    const groupLabel = getGroupDisplayName(g, idx);
                                                                    return /^\d+$/.test(groupLabel) ? `${uiText.group} ${groupLabel}` : groupLabel;
                                                                })()}
                                                            </span>
                                                            {typeof g.price === 'number' && Number.isFinite(g.price) ? (
                                                                <span className="ml-1 text-[10px] tabular-nums opacity-70">
                                                                    {formatUzsCompact(g.price)}
                                                                </span>
                                                            ) : null}
                                                        </TabsTrigger>
                                                    ))}
                                                </TabsList>

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={() => {
                                                        setEditingGroup(null)
                                                        setIsGroupModalOpen(true)
                                                    }}
                                                    title={uiText.newGroup}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>

                                            </div>

                                            {visibleDayGroups.map((group) => {
                                                    const groupIdx = visibleDayGroups.findIndex((g) => g.id === group.id)

                                                    const dishesRows = (group.dishes || []).map((dish, origIdx) => ({
                                                        index: typeof (dish as any).mealIndex === 'number' ? (dish as any).mealIndex : (getMealIndex(String(dish.mealType)) ?? 1),
                                                        name: dish.dishName,
                                                        calories: Math.round(getDishCalories(dish)),
                                                        standard: dish.customIngredients ? uiText.customWeight : uiText.standard,
                                                        _dish: dish,
                                                        _origIdx: origIdx,
                                                    }))
                                                    const dishesFiltered = applyFilters(dishesRows as Record<string, unknown>[], mealFilterValues, mealFilterColumns)
                                                    const hasActiveMealSort = mealColumns.some(col => mealSortStates[col.key] && mealSortStates[col.key] !== 'default')
                                                    const dishesSorted = hasActiveMealSort
                                                        ? sortData(dishesFiltered, mealSortStates, mealColumns)
                                                        : dishesFiltered.sort((a, b) => (a.index as number) - (b.index as number))

                                                    return (
                                                        <TabsContent key={group.id} value={group.id as string} className="flex-1 p-6 m-0">
                                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <Flame className="w-5 h-5 text-orange-500" />
                                                                        <span className="font-semibold text-lg truncate">
                                                                            {getGroupDisplayName(group, groupIdx)}
                                                                        </span>
                                                                        {typeof group.price === 'number' && Number.isFinite(group.price) ? (
                                                                            <Badge variant="secondary" className="text-[10px] tabular-nums">
                                                                                {formatUzs(group.price)} UZS
                                                                            </Badge>
                                                                        ) : null}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <TableFilterPanel
                                                                        open={mealFilterOpen}
                                                                        onOpenChange={setMealFilterOpen}
                                                                        columns={mealFilterColumns}
                                                                        filters={mealFilterValues}
                                                                        onFilterChange={handleMealFilterChange}
                                                                        onClearAll={handleMealClearAllFilters}
                                                                        title={uiText.search}
                                                                    />
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8"
                                                                        onClick={() => {
                                                                            setAddDishTarget({ calorieIndex: groupIdx })
                                                                            resetAddMealDraft()
                                                                            setIsAddDishModalOpen(true)
                                                                        }}
                                                                    >
                                                                        <Plus className="h-4 w-4 mr-1" />
                                                                        {uiText.addMeal}
                                                                    </Button>
                                                                </div>
                                                            </div>

 <div className="rounded-lg overflow-hidden">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="dense-row-header text-muted-foreground">
                                                                            <SortableTableHeader column={mealColumns[0]} sortState={mealSortStates[mealColumns[0].key] || 'default'} onSortChange={handleMealSortChange} className="w-[50px] px-3 py-2" />
                                                                            <SortableTableHeader column={mealColumns[1]} sortState={mealSortStates[mealColumns[1].key] || 'default'} onSortChange={handleMealSortChange} className="px-3 py-2" />
                                                                            <SortableTableHeader column={mealColumns[2]} sortState={mealSortStates[mealColumns[2].key] || 'default'} onSortChange={handleMealSortChange} className="w-[100px] px-3 py-2" />
                                                                            <SortableTableHeader column={mealColumns[3]} sortState={mealSortStates[mealColumns[3].key] || 'default'} onSortChange={handleMealSortChange} className="w-[120px] px-3 py-2" />
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {dishesSorted.map((row, idx) => {
                                                                            const dish = (row as any)._dish as SetDish
                                                                            const origIdx = (row as any)._origIdx as number
                                                                            const mealIndex = row.index as number

                                                                            return (
                                                                                <TableRow key={`${dish.dishId}-${origIdx}`} className="dense-row cursor-pointer hover:bg-muted/50" onDoubleClick={() => {
                                                                                    setEditingDish({
                                                                                        setId: selectedSet.id,
                                                                                        calorieIndex: groupIdx,
                                                                                        dishIndex: origIdx,
                                                                                        dish: { ...dish }
                                                                                    });
                                                                                    setIsEditDishModalOpen(true);
                                                                                }}>
                                                                                    <TableCell className="px-3 py-2">
                                                                                        <Badge variant="outline" className="text-[10px]">
                                                                                            {uiText.mealLabel(mealIndex)}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-3 py-2 font-medium text-sm">{dish.dishName}</TableCell>
                                                                                    <TableCell className="px-3 py-2 text-sm text-muted-foreground tabular-nums">
                                                                                        {String(row.calories)} kcal
                                                                                    </TableCell>
                                                                                    <TableCell className="px-3 py-2">
                                                                                        {dish.customIngredients ? (
                                                                                            <span className="text-warning font-medium text-xs flex items-center gap-1">
                                                                                                <Scale className="w-3 h-3" /> {uiText.customWeight}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-muted-foreground text-xs flex items-center gap-1">
                                                                                                <Scale className="w-3 h-3" /> {uiText.standard}
                                                                                            </span>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            )
                                                                        })}

                                                                        {(!group?.dishes || group.dishes.length === 0) && (
                                                                            <TableRow>
                                                                                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                                                                                    {uiText.noDishes}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </TabsContent>
                                                    );
                                                })}
                                        </Tabs>
                                    )}
                                </CardContent>
                            </Card>
                    </div>
                ) : (
                    <div className="empty-state">
                        <UtensilsCrossed className="empty-state-icon" />
                        <div className="empty-state-title">{uiText.noDishes}</div>
                        <p className="empty-state-desc">{uiText.selectSetHint}</p>
                        <Button
                            className="mt-4 h-10"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {uiText.newSet}
                        </Button>
                    </div>
                )}
            </div>

            {/* Rename Set Modal — small (400px) */}
            <Dialog open={isRenameSetModalOpen} onOpenChange={setIsRenameSetModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{uiText.editMeal}</DialogTitle>
                        <DialogDescription>{uiText.setName}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{uiText.setName} <span className="text-destructive">*</span></Label>
                            <Input
                                value={renameSetForm.name}
                                onChange={(e) => setRenameSetForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={uiText.setName}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-row items-center justify-between sm:justify-between">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                                if (selectedSet) {
                                    await deleteSet(selectedSet.id);
                                    setIsRenameSetModalOpen(false);
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {uiText.delete}
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsRenameSetModalOpen(false)}>{uiText.cancel}</Button>
                            <Button onClick={renameSet}>{uiText.saveChanges}</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Modal — small (400px) */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{uiText.newSet}</DialogTitle>
                        <DialogDescription>{uiText.subtitle}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{uiText.setName} <span className="text-destructive">*</span></Label>
                            <Input
                                value={newSetForm.name}
                                onChange={(e) => setNewSetForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={uiText.setName}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>{uiText.cancel}</Button>
                        <Button onClick={createSet}>{uiText.create}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Group Modal — medium (560px) */}
            <Dialog
                open={isGroupModalOpen}
                onOpenChange={(open) => {
                    setIsGroupModalOpen(open);
                    if (!open) setEditingGroup(null);
                }}
            >
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>{editingGroup ? uiText.group : uiText.newGroup}</DialogTitle>
                        <DialogDescription>{uiText.groups}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 py-4">
                        <div className="grid gap-2">
                            <Label>{uiText.groupName} <span className="text-destructive">*</span></Label>
                            <Input
                                value={groupForm.name}
                                onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder={uiText.groupName}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>{uiText.groupPrice}</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={groupForm.price}
                                onChange={(e) => setGroupForm((prev) => ({ ...prev, price: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-row items-center justify-between sm:justify-between">
                        {editingGroup ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                    await deleteGroupById(editingGroup.group.id || '');
                                    setIsGroupModalOpen(false);
                                    setEditingGroup(null);
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {uiText.delete}
                            </Button>
                        ) : (
                            <div />
                        )}
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>
                                {uiText.cancel}
                            </Button>
                            <Button onClick={() => void upsertGroup()}>
                                {uiText.saveChanges}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Dish Modal — medium (560px) */}
            <Dialog
                open={isAddDishModalOpen}
                onOpenChange={(open) => {
                    setIsAddDishModalOpen(open);
                    if (!open) {
                        setAddDishTarget(null);
                        resetAddMealDraft();
                    }
                }}
            >
                <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-xl">
 <DialogHeader className="px-6 py-4">
                        <DialogTitle>{uiText.addMeal}</DialogTitle>
                        <DialogDescription>{uiText.dish} / {uiText.meal}</DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-4 flex-1 overflow-auto space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="min-w-0">{uiText.mealName} <span className="text-destructive">*</span></Label>
                                <div className="flex items-center gap-2">
                                    {selectedDishToAdd ? (
                                        <Badge variant="secondary" className="text-[10px]">DB</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px]">NEW</Badge>
                                    )}
                                </div>
                            </div>
                            <Input
                                value={mealNameToAdd}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setMealNameToAdd(v);
                                    // If user starts typing a different name, treat it as a new dish draft.
                                    if (selectedDishToAdd) {
                                        const selected = availableDishes.find(d => String((d as any).id) === selectedDishToAdd);
                                        if (selected && normalizeName(String((selected as any).name || '')) !== normalizeName(v)) {
                                            setSelectedDishToAdd('');
                                        }
                                    }
                                }}
                                placeholder={uiText.mealNamePlaceholder}
                            />

                            {mealNameToAdd.trim().length > 0 ? (
 <div className="rounded-lg bg-card">
                                    <ScrollArea className="max-h-44">
                                        <div className="p-2 space-y-1">
                                            {availableDishes
                                                .filter((d) => normalizeName(String((d as any).name || '')).includes(normalizeName(mealNameToAdd)))
                                                .slice(0, 12)
                                                .map((d) => {
                                                    const isSelected = String((d as any).id) === selectedDishToAdd;
                                                    return (
                                                        <Button
                                                            key={String((d as any).id)}
                                                            type="button"
                                                            onClick={() => selectDishForAdd(d)}
                                                            variant="ghost"
                                                            className={[
                                                                'w-full text-left rounded-lg px-2 py-2 flex items-center justify-between gap-2',
                                                                'hover:bg-muted/60 transition-colors',
                                                                isSelected ? 'bg-primary-50 text-primary-700' : '',
                                                            ].join(' ')}
                                                        >
                                                            <span className="truncate text-sm">{String((d as any).name || '')}</span>
                                                            {isSelected ? (
                                                                <Badge variant="secondary" className="text-[10px] shrink-0">Selected</Badge>
                                                            ) : null}
                                                        </Button>
                                                    );
                                                })}
                                            {availableDishes.filter((d) => normalizeName(String((d as any).name || '')).includes(normalizeName(mealNameToAdd))).length === 0 ? (
                                                <div className="px-2 py-2 text-sm text-muted-foreground">
                                                    {uiText.newDish}
                                                </div>
                                            ) : null}
                                        </div>
                                    </ScrollArea>
                                </div>
                            ) : null}
                        </div>

 <div className="rounded-xl overflow-hidden">
 <div className="px-4 py-3 flex items-center justify-between gap-3 bg-card">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-foreground">{uiText.ingredients}</div>
                                    <div className="text-xs text-muted-foreground truncate">{uiText.ingredientsDesc}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className="text-[10px]">
                                        {selectedSet?.name || uiText.setName}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {(() => {
                                            const idx = addDishTarget?.calorieIndex ?? -1;
                                            if (idx < 0) return uiText.group;
                                            const targetGroup = currentDayData[idx];
                                            return targetGroup ? `${uiText.group}: ${getGroupDisplayName(targetGroup, idx)}` : uiText.group;
                                        })()}
                                    </Badge>
                                </div>
                            </div>

                            <Table className="[&_tr]:!bg-transparent [&_tr]:text-foreground text-sm">
                                <TableHeader>
                                    <TableRow className="!bg-transparent dense-row-header">
                                        <SortableTableHeader column={ingredientColumns[0]} sortState={addIngredientSortStates[ingredientColumns[0].key] || 'default'} onSortChange={handleAddIngredientSortChange} className="pl-4 px-3 py-2" />
                                        <SortableTableHeader column={ingredientColumns[1]} sortState={addIngredientSortStates[ingredientColumns[1].key] || 'default'} onSortChange={handleAddIngredientSortChange} className="w-[110px] px-3 py-2" />
                                        <SortableTableHeader column={ingredientColumns[2]} sortState={addIngredientSortStates[ingredientColumns[2].key] || 'default'} onSortChange={handleAddIngredientSortChange} className="w-[90px] px-3 py-2" />
                                        <SortableTableHeader column={ingredientColumns[3]} sortState={addIngredientSortStates[ingredientColumns[3].key] || 'default'} onSortChange={handleAddIngredientSortChange} className="w-[120px] px-3 py-2 text-right" />
                                        <SortableTableHeader column={ingredientColumns[4]} sortState={addIngredientSortStates[ingredientColumns[4].key] || 'default'} onSortChange={handleAddIngredientSortChange} className="w-[150px] px-3 py-2 text-right" />
                                        <TableHead className="w-[48px] px-3 py-2" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        const addIngRows = draftMealIngredients.map((ing, origIdx) => ({ ...ing, _origIdx: origIdx }))
                                        const addIngSorted = sortData(addIngRows as Record<string, unknown>[], addIngredientSortStates, ingredientColumns)
                                        return addIngSorted.map((row) => {
                                            const idx = (row as any)._origIdx as number
                                            const ing = draftMealIngredients[idx]
                                            return (
                                                <TableRow key={`${ing.name}-${idx}`} className="!bg-transparent dense-row-compact">
                                                    <TableCell className="pl-4 min-w-0 px-3 py-1">
                                                        <Input
                                                            className="h-8 text-sm"
                                                            value={ing.name}
                                                            onChange={(e) => updateDraftIngredient(idx, { name: e.target.value })}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-1">
                                                        <Input
                                                            type="number"
                                                            className="h-8 w-24 text-sm"
                                                            value={ing.amount}
                                                            onChange={(e) => {
                                                                const newVal = parseFloat(e.target.value);
                                                                updateDraftIngredientAmount(idx, Number.isFinite(newVal) ? newVal : 0);
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-1">
                                                        <Select value={String(ing.unit || 'gr')} onValueChange={(val) => updateDraftIngredient(idx, { unit: val })}>
                                                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {UNIT_OPTIONS.map((unit) => (
                                                                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right px-3 py-1">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-right text-sm"
                                                            value={typeof ing.kcalPerGram === 'number' && Number.isFinite(ing.kcalPerGram) ? ing.kcalPerGram : ''}
                                                            placeholder={(() => {
                                                                const meta = warehouseItemByName.get(String(ing.name || '').trim().toLowerCase());
                                                                return typeof meta?.kcalPerGram === 'number' ? String(meta.kcalPerGram) : 'auto';
                                                            })()}
                                                            onChange={(e) => {
                                                                const next = e.target.value.trim() === '' ? undefined : Number(e.target.value);
                                                                updateDraftIngredient(idx, { kcalPerGram: Number.isFinite(next as number) ? (next as number) : undefined });
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right px-3 py-1">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-right text-sm"
                                                            value={typeof ing.pricePerUnit === 'number' && Number.isFinite(ing.pricePerUnit) ? ing.pricePerUnit : ''}
                                                            placeholder={(() => {
                                                                const meta = warehouseItemByName.get(String(ing.name || '').trim().toLowerCase());
                                                                return typeof meta?.pricePerUnit === 'number' ? String(meta.pricePerUnit) : 'auto';
                                                            })()}
                                                            onChange={(e) => {
                                                                const next = e.target.value.trim() === '' ? undefined : Number(e.target.value);
                                                                updateDraftIngredient(idx, { pricePerUnit: Number.isFinite(next as number) ? (next as number) : undefined });
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeDraftIngredient(idx)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    })()}
                                    {draftMealIngredients.length === 0 ? (
                                        <TableRow className="!bg-transparent">
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                                                {uiText.noIngredients}
                                            </TableCell>
                                        </TableRow>
                                    ) : null}
                                </TableBody>
                            </Table>

 <div className="p-4 space-y-3 bg-card">
                                <div className="space-y-2">
                                    <Label className="section-kicker">{uiText.addIngredient}</Label>
                                    <Select onValueChange={(val) => addDraftIngredient(val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={uiText.selectIngredient} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {getAllUniqueIngredients().map((ing) => (
                                                <SelectItem key={ing.name} value={ing.name}>
                                                    <div className="flex justify-between w-full min-w-[200px]">
                                                        <span className="truncate">{ing.name}</span>
                                                        <span className="text-muted-foreground text-xs">{ing.unit}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-12 gap-2">
                                    <Input className="col-span-4 h-8 text-sm" placeholder="New ingredient" value={customDraftIngredient.name} onChange={(e) => setCustomDraftIngredient((prev) => ({ ...prev, name: e.target.value }))} />
                                    <Input className="col-span-2 h-8 text-sm" type="number" placeholder="Amount" value={customDraftIngredient.amount} onChange={(e) => setCustomDraftIngredient((prev) => ({ ...prev, amount: e.target.value }))} />
                                    <Select value={customDraftIngredient.unit} onValueChange={(value) => setCustomDraftIngredient((prev) => ({ ...prev, unit: value }))}>
                                        <SelectTrigger className="col-span-2 h-8 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>{UNIT_OPTIONS.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Input className="col-span-2 h-8 text-sm" type="number" placeholder="kcal/gr" value={customDraftIngredient.kcalPerGram} onChange={(e) => setCustomDraftIngredient((prev) => ({ ...prev, kcalPerGram: e.target.value }))} />
                                    <Input className="col-span-1 h-8 text-sm" type="number" placeholder="UZS" value={customDraftIngredient.pricePerUnit} onChange={(e) => setCustomDraftIngredient((prev) => ({ ...prev, pricePerUnit: e.target.value }))} />
                                    <Button type="button" variant="outline" size="icon" className="col-span-1 h-8 w-8 p-0" onClick={addCustomDraftIngredient}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

 <DialogFooter className="px-6 py-4">
                        <Button variant="outline" onClick={() => setIsAddDishModalOpen(false)}>{uiText.cancel}</Button>
                        <Button onClick={addDishToGroup} disabled={!mealNameToAdd.trim()}>{uiText.addMeal}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Ingredients Modal — medium (560px) */}
            <Dialog open={isEditDishModalOpen} onOpenChange={setIsEditDishModalOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-xl">
 <DialogHeader className="px-6 py-4">
                        <DialogTitle>{uiText.ingredients}: {editingDish?.dish.dishName}</DialogTitle>
                        <DialogDescription>
                            {uiText.ingredientsDesc}
                        </DialogDescription>
                    </DialogHeader>
                    {editingDish && (
                        <div className="flex-1 overflow-auto">
                            <Table className="[&_tr]:!bg-transparent [&_tr]:text-foreground text-sm">
                                <TableHeader className="bg-card sticky top-0">
                                    <TableRow className="!bg-transparent dense-row-header">
                                        <SortableTableHeader column={ingredientColumns[0]} sortState={editIngredientSortStates[ingredientColumns[0].key] || 'default'} onSortChange={handleEditIngredientSortChange} className="pl-6 px-3 py-2" />
                                        <SortableTableHeader column={ingredientColumns[1]} sortState={editIngredientSortStates[ingredientColumns[1].key] || 'default'} onSortChange={handleEditIngredientSortChange} className="px-3 py-2" />
                                        <SortableTableHeader column={ingredientColumns[2]} sortState={editIngredientSortStates[ingredientColumns[2].key] || 'default'} onSortChange={handleEditIngredientSortChange} className="px-3 py-2" />
                                        <SortableTableHeader column={ingredientColumns[3]} sortState={editIngredientSortStates[ingredientColumns[3].key] || 'default'} onSortChange={handleEditIngredientSortChange} className="px-3 py-2" />
                                        <SortableTableHeader column={ingredientColumns[4]} sortState={editIngredientSortStates[ingredientColumns[4].key] || 'default'} onSortChange={handleEditIngredientSortChange} className="px-3 py-2" />
                                        <TableHead className="w-[50px] px-3 py-2"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        const editIngredients = editingDish.dish.customIngredients || getOriginalIngredients(editingDish.dish.dishId)
                                        const editIngRows = editIngredients.map((ing, origIdx) => ({ ...ing, _origIdx: origIdx }))
                                        const editIngSorted = sortData(editIngRows as Record<string, unknown>[], editIngredientSortStates, ingredientColumns)
                                        return editIngSorted.map((row) => {
                                            const idx = (row as any)._origIdx as number
                                            const ing = editIngredients[idx]
                                            return (
                                                <TableRow key={`${ing.name}-${idx}`} className="!bg-transparent dense-row-compact">
                                                    <TableCell className="pl-6 font-medium px-3 py-1">
                                                        <Input className="h-8 text-sm" value={ing.name} onChange={(e) => updateEditingIngredient(idx, { name: e.target.value })} />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-1">
                                                        <Input
                                                            type="number" className="h-8 w-24 text-sm"
                                                            value={ing.amount}
                                                            onChange={(e) => {
                                                                const newVal = parseFloat(e.target.value) || 0;
                                                                updateEditingIngredient(idx, { amount: newVal });
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm px-3 py-1">
                                                        <Select value={String(ing.unit || 'gr')} onValueChange={(val) => updateEditingIngredient(idx, { unit: val })}>
                                                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {UNIT_OPTIONS.map((unit) => (
                                                                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="px-3 py-1">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-sm"
                                                            value={typeof ing.kcalPerGram === 'number' && Number.isFinite(ing.kcalPerGram) ? ing.kcalPerGram : ''}
                                                            placeholder="auto"
                                                            onChange={(e) => {
                                                                const next = e.target.value.trim() === '' ? undefined : Number(e.target.value);
                                                                updateEditingIngredient(idx, { kcalPerGram: Number.isFinite(next as number) ? (next as number) : undefined });
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-1">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-sm"
                                                            value={typeof ing.pricePerUnit === 'number' && Number.isFinite(ing.pricePerUnit) ? ing.pricePerUnit : ''}
                                                            placeholder="auto"
                                                            onChange={(e) => {
                                                                const next = e.target.value.trim() === '' ? undefined : Number(e.target.value);
                                                                updateEditingIngredient(idx, { pricePerUnit: Number.isFinite(next as number) ? (next as number) : undefined });
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-3 py-1">
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            onClick={() => removeIngredient(idx)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    })()}
                                    {(editingDish.dish.customIngredients || getOriginalIngredients(editingDish.dish.dishId)).length === 0 && (
                                        <TableRow className="!bg-transparent">
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                                                {uiText.noIngredients}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

 <div className="p-4 space-y-3 bg-card">
                        <div className="grid grid-cols-12 gap-2">
                            <Input className="col-span-4 h-8 text-sm" list="edit-ingredients-list" placeholder="New ingredient" value={customEditIngredient.name} onChange={(e) => setCustomEditIngredient((prev) => ({ ...prev, name: e.target.value }))} />
                            <datalist id="edit-ingredients-list">
                                {getAllUniqueIngredients().map((ing) => (
                                    <option key={ing.name} value={ing.name} />
                                ))}
                            </datalist>
                            <Input className="col-span-2 h-8 text-sm" type="number" placeholder="Amount" value={customEditIngredient.amount} onChange={(e) => setCustomEditIngredient((prev) => ({ ...prev, amount: e.target.value }))} />
                            <Select value={customEditIngredient.unit} onValueChange={(value) => setCustomEditIngredient((prev) => ({ ...prev, unit: value }))}>
                                <SelectTrigger className="col-span-2 h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{UNIT_OPTIONS.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}</SelectContent>
                            </Select>
                            <Input className="col-span-2 h-8 text-sm" type="number" placeholder="kcal/gr" value={customEditIngredient.kcalPerGram} onChange={(e) => setCustomEditIngredient((prev) => ({ ...prev, kcalPerGram: e.target.value }))} />
                            <Input className="col-span-1 h-8 text-sm" type="number" placeholder="UZS" value={customEditIngredient.pricePerUnit} onChange={(e) => setCustomEditIngredient((prev) => ({ ...prev, pricePerUnit: e.target.value }))} />
                            <Button type="button" variant="outline" size="icon" className="col-span-1 h-8 w-8 p-0" onClick={addCustomIngredientToEditingDish}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                    if (editingDish) {
                                        await deleteDishFromGroup(editingDish.calorieIndex, editingDish.dishIndex);
                                        setIsEditDishModalOpen(false);
                                        setEditingDish(null);
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {uiText.delete}
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsEditDishModalOpen(false)}>{uiText.cancel}</Button>
                                <Button onClick={updateEditingDish}>{uiText.saveChanges}</Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
