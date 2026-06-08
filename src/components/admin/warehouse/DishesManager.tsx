'use client';

import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Trash2, Plus, Loader2, X, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { MEAL_TYPES } from '@/lib/menuData';
import { cn } from "@/lib/utils";
import { useLanguage } from '@/contexts/LanguageContext';
import { SearchPanel } from '@/components/ui/search-panel';

interface IngredientRef {
    name: string;
    amount: number;
    unit: string;
}

interface Dish {
    id: string;
    name: string;
    description?: string;
    mealType: string;
    ingredients: IngredientRef[];
    calorieMappings?: Record<string, string[]>; // { "7": ["1200", "2000"] }
    menuNumbers?: number[];
}

interface WarehouseItem {
    id: string;
    name: string;
    unit: string;
}

function IngredientSelector({
    value,
    onChange,
    items
}: {
    value: string;
    onChange: (val: string, unit?: string) => void;
    items: WarehouseItem[]
}) {
    const { language } = useLanguage();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const uiText = useMemo(() => {
        if (language === 'ru') {
            return {
                selectIngredient: 'Выберите ингредиент...',
                searchOrTypeNew: 'Поиск или новый...',
                useValue: (val: string) => `Использовать "${val}"`,
            }
        }
        if (language === 'uz') {
            return {
                selectIngredient: 'Ingredient tanlang...',
                searchOrTypeNew: "Qidirish yoki yangi...",
                useValue: (val: string) => `"${val}" ni ishlatish`,
            }
        }
        return {
            selectIngredient: 'Select ingredient...',
            searchOrTypeNew: 'Search or type new...',
            useValue: (val: string) => `Use "${val}"`,
        }
    }, [language]);

    // Filter items based on search if needed, or rely on Command's internal filtering.
    // To support "Create", we need to know if there's a match.
    // Standard Command automatically hides non-matches.
    // We'll trust Command for filtering, but check if we should show "Create".

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal h-8"
                >
                    {value || uiText.selectIngredient}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput
                        placeholder={uiText.searchOrTypeNew}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-xs font-normal"
                                onClick={() => {
                                    onChange(search); // Create new
                                    setOpen(false);
                                }}
                            >
                                {uiText.useValue(search)}
                            </Button>
                        </CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.name}
                                    onSelect={(currentValue) => {
                                        // Look up the original item to get exact casing or data
                                        const original = items.find(i => i.name.toLowerCase() === currentValue.toLowerCase());
                                        onChange(original ? original.name : currentValue, original?.unit);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const CALORIE_GROUPS = [1200, 1600, 2000, 2500, 3000];

export function DishesManager() {
    const { language } = useLanguage();

    const uiText = useMemo(() => {
        if (language === 'ru') {
            return {
                searchPlaceholder: 'Поиск блюд...',
                addDish: 'Добавить блюдо',
                image: 'Фото',
                name: 'Название',
                mealType: 'Тип приема пищи',
                calorieMappings: 'Калорийные группы',
                menus: 'Меню',
                ingredients: 'Ингредиенты',
                actions: 'Действия',
                noDishesFound: 'Блюда не найдены',
                none: 'Нет',
                editDish: 'Редактировать блюдо',
                addDishTitle: 'Добавить блюдо',
                dishNamePlaceholder: 'Название блюда',
                selectTypePlaceholder: 'Выберите тип',
                menusCalorieTitle: 'Меню и группы калорий (1-21)',
                dayLabel: (day: number) => `День ${day}`,
                selectDaysHint: 'Сначала выберите дни, затем группы калорий для каждого дня.',
                add: 'Добавить',
                ingredient: 'Ингредиент',
                amount: 'Количество',
                unit: 'Ед.',
                noIngredientsAdded: 'Ингредиенты не добавлены',
                cancel: 'Отмена',
                save: 'Сохранить',
                failedLoadData: 'Не удалось загрузить данные',
                nameMealTypeRequired: 'Название и тип обязательны',
                dishUpdated: 'Блюдо обновлено',
                dishCreated: 'Блюдо создано',
                failedSaveDish: 'Не удалось сохранить блюдо',
                errorSaveDish: 'Ошибка сохранения блюда',
                confirmDeleteDish: 'Удалить это блюдо?',
                dishDeleted: 'Блюдо удалено',
                failedDeleteDish: 'Не удалось удалить блюдо',
                errorDeleteDish: 'Ошибка удаления блюда',
            }
        }

        if (language === 'uz') {
            return {
                searchPlaceholder: 'Taomlarni qidirish...',
                addDish: "Taom qo'shish",
                image: 'Rasm',
                name: 'Nomi',
                mealType: "Ovqat turi",
                calorieMappings: 'Kaloriya guruhlari',
                menus: 'Menyu',
                ingredients: 'Ingredientlar',
                actions: 'Amallar',
                noDishesFound: 'Taom topilmadi',
                none: "Yo'q",
                editDish: 'Taomni tahrirlash',
                addDishTitle: "Taom qo'shish",
                dishNamePlaceholder: 'Taom nomi',
                selectTypePlaceholder: 'Turini tanlang',
                menusCalorieTitle: 'Menyu va kaloriya guruhlari (1-21)',
                dayLabel: (day: number) => `Kun ${day}`,
                selectDaysHint: "Avval kunlarni tanlang, so'ng har bir kun uchun kaloriya guruhlarini belgilang.",
                add: "Qo'shish",
                ingredient: 'Ingredient',
                amount: 'Miqdor',
                unit: "O'lchov",
                noIngredientsAdded: "Ingredient qo'shilmagan",
                cancel: 'Bekor qilish',
                save: 'Saqlash',
                failedLoadData: "Ma'lumot yuklanmadi",
                nameMealTypeRequired: 'Nom va ovqat turi shart',
                dishUpdated: 'Taom yangilandi',
                dishCreated: 'Taom yaratildi',
                failedSaveDish: "Taomni saqlab bo'lmadi",
                errorSaveDish: "Taomni saqlashda xatolik",
                confirmDeleteDish: "Ushbu taom o'chirilsinmi?",
                dishDeleted: "Taom o'chirildi",
                failedDeleteDish: "Taomni o'chirib bo'lmadi",
                errorDeleteDish: "Taomni o'chirishda xatolik",
            }
        }

        return {
            searchPlaceholder: 'Search dishes...',
            addDish: 'Add Dish',
            image: 'Image',
            name: 'Name',
            mealType: 'Meal Type',
            calorieMappings: 'Calorie Mappings',
            menus: 'Menus',
            ingredients: 'Ingredients',
            actions: 'Actions',
            noDishesFound: 'No dishes found',
            none: 'None',
            editDish: 'Edit Dish',
            addDishTitle: 'Add Dish',
            dishNamePlaceholder: 'Dish Name',
            selectTypePlaceholder: 'Select type',
            menusCalorieTitle: 'Menus & Calorie Groups (1-21)',
            dayLabel: (day: number) => `Day ${day}`,
            selectDaysHint: 'Select days and then specific calorie groups for each day.',
            add: 'Add',
            ingredient: 'Ingredient',
            amount: 'Amount',
            unit: 'Unit',
            noIngredientsAdded: 'No ingredients added',
            cancel: 'Cancel',
            save: 'Save',
            failedLoadData: 'Failed to load data',
            nameMealTypeRequired: 'Name and Meal Type are required',
            dishUpdated: 'Dish updated',
            dishCreated: 'Dish created',
            failedSaveDish: 'Failed to save dish',
            errorSaveDish: 'Error saving dish',
            confirmDeleteDish: 'Are you sure you want to delete this dish?',
            dishDeleted: 'Dish deleted',
            failedDeleteDish: 'Failed to delete dish',
            errorDeleteDish: 'Error deleting dish',
        }
    }, [language]);
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentDish, setCurrentDish] = useState<Partial<Dish>>({ ingredients: [], menuNumbers: [] });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dishesRes, itemsRes] = await Promise.all([
                fetch('/api/admin/warehouse/dishes'),
                fetch('/api/admin/warehouse/ingredients')
            ]);

            if (dishesRes.ok) {
                setDishes(await dishesRes.json());
            }
            if (itemsRes.ok) {
                setWarehouseItems(await itemsRes.json());
            }
        } catch (error) {
            console.error('Failed to load data', error);
            toast.error(uiText.failedLoadData);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentDish.name || !currentDish.mealType) {
            toast.error(uiText.nameMealTypeRequired);
            return;
        }

        setIsSaving(true);
        try {
            const method = currentDish.id ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/warehouse/dishes', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentDish),
            });

            if (res.ok) {
                toast.success(currentDish.id ? uiText.dishUpdated : uiText.dishCreated);
                fetchData();
                setIsDialogOpen(false);
                setCurrentDish({ ingredients: [], menuNumbers: [] });
            } else {
                toast.error(uiText.failedSaveDish);
            }
        } catch (error) {
            console.error('Error saving dish', error);
            toast.error(uiText.errorSaveDish);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(uiText.confirmDeleteDish)) return;

        try {
            const res = await fetch(`/api/admin/warehouse/dishes?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success(uiText.dishDeleted);
                fetchData();
            } else {
                toast.error(uiText.failedDeleteDish);
            }
        } catch (error) {
            console.error('Error deleting dish', error);
            toast.error(uiText.errorDeleteDish);
        }
    };

    const addIngredientRow = () => {
        setCurrentDish(prev => ({
            ...prev,
            ingredients: [...(prev.ingredients || []), { name: '', amount: 0, unit: 'gr' }]
        }));
    };

    const removeIngredientRow = (index: number) => {
        setCurrentDish(prev => ({
            ...prev,
            ingredients: (prev.ingredients || []).filter((_, i) => i !== index)
        }));
    };

    const updateIngredientRow = (index: number, field: keyof IngredientRef, value: any) => {
        setCurrentDish(prev => {
            const newIngredients = [...(prev.ingredients || [])];
            newIngredients[index] = { ...newIngredients[index], [field]: value };
            return { ...prev, ingredients: newIngredients };
        });
    };

    const handleIngredientNameChange = (index: number, name: string, unit?: string) => {
        setCurrentDish(prev => {
            const newIngredients = [...(prev.ingredients || [])];
            newIngredients[index] = {
                ...newIngredients[index],
                name,
                unit: unit || newIngredients[index].unit || 'gr'
            };
            return { ...prev, ingredients: newIngredients };
        });
    };

    const filteredDishes = dishes.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border-0">
                <SearchPanel
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder={uiText.searchPlaceholder}
                />
                <Button onClick={() => { setCurrentDish({ ingredients: [], unit: 'gr', menuNumbers: [] } as any); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> {uiText.addDish}
                </Button>
            </div>

            <div className="bg-card rounded-lg border-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{uiText.name}</TableHead>
                            <TableHead>{uiText.mealType}</TableHead>
                            <TableHead>{uiText.calorieMappings}</TableHead>
                            <TableHead>{uiText.menus}</TableHead>
                            <TableHead>{uiText.ingredients}</TableHead>
                            <TableHead className="text-right">{uiText.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredDishes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    {uiText.noDishesFound}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDishes.map((dish) => (
                                <TableRow key={dish.id}>
                                    <TableCell className="font-medium">{dish.name}</TableCell>
                                    <TableCell>
                                        <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100">
                                            {MEAL_TYPES[dish.mealType as keyof typeof MEAL_TYPES] || dish.mealType}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {dish.calorieMappings && Object.entries(dish.calorieMappings).map(([day, groups]) => (
                                                <div key={day} className="text-[10px] bg-amber-50 rounded border-0 p-1">
                                                    <span className="font-bold mr-1">D{day}:</span>
                                                    <span>{groups.join(',')}</span>
                                                </div>
                                            ))}
                                            {!dish.calorieMappings && <span className="text-slate-400 text-xs">{uiText.none}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {dish.menuNumbers?.sort((a, b) => a - b).map(num => (
                                                <span key={num} className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border-0">
                                                    #{num}
                                                </span>
                                            ))}
                                            {(!dish.menuNumbers?.length) && <span className="text-xs text-slate-400">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">
                                        {dish.ingredients && dish.ingredients.map(i => i.name).join(', ')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => { setCurrentDish(dish); setIsDialogOpen(true); }}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(dish.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentDish.id ? uiText.editDish : uiText.addDishTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{uiText.name}</Label>
                                <Input
                                    value={currentDish.name || ''}
                                    onChange={(e) => setCurrentDish({ ...currentDish, name: e.target.value })}
                                    placeholder={uiText.dishNamePlaceholder}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{uiText.mealType}</Label>
                                <Select
                                    value={currentDish.mealType}
                                    onValueChange={(val) => setCurrentDish({ ...currentDish, mealType: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={uiText.selectTypePlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(MEAL_TYPES).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{uiText.menusCalorieTitle}</Label>
                            <div className="space-y-3 p-3 border-0 rounded-lg bg-muted/20 max-h-64 overflow-y-auto">
                                {Array.from({ length: 21 }, (_, i) => i + 1).map(num => {
                                    const dayStr = num.toString();
                                    const isSelected = currentDish.menuNumbers?.includes(num);
                                    const dayMappings = currentDish.calorieMappings?.[dayStr] || [];

                                    return (
                                        <div key={num} className="bg-card p-2 rounded border-0 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div
                                                    onClick={() => {
                                                        const current = currentDish.menuNumbers || [];
                                                        const newItem = isSelected
                                                            ? current.filter(n => n !== num)
                                                            : [...current, num];

                                                        // Also clean up mappings if unselected
                                                        const newMappings = { ...currentDish.calorieMappings };
                                                        if (isSelected) delete newMappings[dayStr];

                                                        setCurrentDish({ ...currentDish, menuNumbers: newItem, calorieMappings: newMappings });
                                                    }}
                                                    className={cn(
                                                        "cursor-pointer px-3 py-1 rounded-md text-sm border transition-colors flex items-center gap-2",
                                                        isSelected
                                                            ? "bg-blue-600 text-white border-blue-600 font-medium"
                                                            : "bg-muted/50 text-muted-foreground border-border"
                                                    )}
                                                >
                                                    {uiText.dayLabel(num)}
                                                    {isSelected && <Check className="h-3 w-3" />}
                                                </div>

                                                {isSelected && (
                                                    <div className="flex flex-wrap gap-1 justify-end">
                                                        {CALORIE_GROUPS.map(cal => (
                                                            <div
                                                                key={cal}
                                                                onClick={() => {
                                                                    const currentGroups = currentDish.calorieMappings?.[dayStr] || [];
                                                                    const newGroups = currentGroups.includes(cal.toString())
                                                                        ? currentGroups.filter(g => g !== cal.toString())
                                                                        : [...currentGroups, cal.toString()];

                                                                    setCurrentDish({
                                                                        ...currentDish,
                                                                        calorieMappings: {
                                                                            ...(currentDish.calorieMappings || {}),
                                                                            [dayStr]: newGroups
                                                                        }
                                                                    });
                                                                }}
                                                                className={cn(
                                                                    "cursor-pointer text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                                                                    dayMappings.includes(cal.toString())
                                                                        ? "bg-green-600 text-white border-green-600"
                                                                        : "bg-muted/30 text-muted-foreground border-border"
                                                                )}
                                                            >
                                                                {cal}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-400">{uiText.selectDaysHint}</p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>{uiText.ingredients}</Label>
                                <Button size="sm" variant="outline" onClick={addIngredientRow} type="button">
                                    <Plus className="h-3 w-3 mr-1" /> {uiText.add}
                                </Button>
                            </div>
                            <div className="space-y-2 border-0 rounded-lg p-2 bg-muted/20">
                                {currentDish.ingredients?.map((ing, idx) => (
                                    <div key={idx} className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs">{uiText.ingredient}</Label>
                                            <IngredientSelector
                                                value={ing.name}
                                                items={warehouseItems}
                                                onChange={(name, unit) => handleIngredientNameChange(idx, name, unit)}
                                            />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <Label className="text-xs">{uiText.amount}</Label>
                                            <Input
                                                type="number"
                                                className="h-8"
                                                value={ing.amount}
                                                onChange={(e) => updateIngredientRow(idx, 'amount', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-20 space-y-1">
                                            <Label className="text-xs">{uiText.unit}</Label>
                                            <Input
                                                className="h-8"
                                                value={ing.unit}
                                                onChange={(e) => updateIngredientRow(idx, 'unit', e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 mb-0.5"
                                            onClick={() => removeIngredientRow(idx)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {(!currentDish.ingredients || currentDish.ingredients.length === 0) && (
                                    <div className="text-center text-xs text-slate-400 py-2">{uiText.noIngredientsAdded}</div>
                                )}
                            </div>
                        </div>
                    </div >
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{uiText.cancel}</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {uiText.save}
                        </Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >
        </div >
    );
}
