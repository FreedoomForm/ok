'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton';
import { ResourceActionBar } from '@/components/admin/dashboard/shared/ResourceActionBar';

interface Ingredient {
    id: string;
    name: string;
    amount: number;
    unit: string;
    kcalPerGram?: number | null;
    pricePerUnit?: number | null;
    priceUnit?: string;
    isActive?: boolean;
    deletedAt?: string | null;
}

interface IngredientsManagerProps {
    onUpdate?: () => void;
    showDeleted?: boolean;
    selectedIds?: readonly string[];
    onSelectionChange?: (ids: readonly string[]) => void;
    universalCreate?: boolean;
    onUniversalCreateHandled?: () => void;
    universalEdit?: boolean;
    onUniversalEditHandled?: () => void;
}

export function IngredientsManager({ onUpdate, showDeleted = false, selectedIds, onSelectionChange, universalCreate = false, onUniversalCreateHandled, universalEdit = false, onUniversalEditHandled }: IngredientsManagerProps) {
    const { language } = useLanguage();

    const uiText = useMemo(() => {
        if (language === 'ru') {
            return {
                searchPlaceholder: 'Поиск ингредиентов...',
                addIngredient: 'Добавить ингредиент',
                name: 'Название',
                amountInStock: 'Количество (на складе)',
                unit: 'Ед.',
                kcalPerGram: 'ккал / гр',
                kcalPerGramHint: 'Калории в 1 грамме',
                price: 'Цена',
                pricePerUnit: 'Цена за единицу (UZS)',
                priceUnit: 'Ед. цены',
                actions: 'Действия',
                noIngredientsFound: 'Ингредиенты не найдены',
                totalIngredients: 'Всего позиций',
                outOfStock: 'Пусто',
                totalAmount: 'Общее количество',
                editIngredient: 'Редактировать ингредиент',
                addIngredientTitle: 'Добавить ингредиент',
                amountInitial: 'Количество (начальное)',
                priceExample: 'Например: 35000',
                priceUnitExample: 'kg, gr, ml, шт',
                cancel: 'Отмена',
                save: 'Сохранить',
                exampleName: 'например: Рис',
                unitExample: 'гр, мл, шт',
                failedLoadIngredients: 'Не удалось загрузить ингредиенты',
                nameRequired: 'Название обязательно',
                ingredientUpdated: 'Ингредиент обновлен',
                ingredientCreated: 'Ингредиент создан',
                failedSaveIngredient: 'Не удалось сохранить ингредиент',
                errorSaveIngredient: 'Ошибка сохранения ингредиента',
                confirmDeleteIngredient: 'Удалить этот ингредиент?',
                ingredientDeleted: 'Ингредиент удален',
                failedDeleteIngredient: 'Не удалось удалить ингредиент',
                errorDeleteIngredient: 'Ошибка удаления ингредиента',
            }
        }

        if (language === 'uz') {
            return {
                searchPlaceholder: 'Ingredientlarni qidirish...',
                addIngredient: "Ingredient qo'shish",
                name: 'Nomi',
                amountInStock: 'Miqdor (omborda)',
                unit: "O'lchov",
                kcalPerGram: 'kkal / g',
                kcalPerGramHint: '1 grammdagi kaloriya',
                price: 'Narx',
                pricePerUnit: 'Birlik narxi (UZS)',
                priceUnit: 'Narx birligi',
                actions: 'Amallar',
                noIngredientsFound: 'Ingredient topilmadi',
                totalIngredients: 'Jami pozitsiya',
                outOfStock: 'Bo‘sh',
                totalAmount: 'Jami miqdor',
                editIngredient: 'Ingredientni tahrirlash',
                addIngredientTitle: "Ingredient qo'shish",
                amountInitial: "Miqdor (boshlang'ich)",
                priceExample: 'Masalan: 35000',
                priceUnitExample: 'kg, gr, ml, dona',
                cancel: 'Bekor qilish',
                save: 'Saqlash',
                exampleName: 'masalan: Guruch',
                unitExample: 'gr, ml, dona',
                failedLoadIngredients: 'Ingredientlar yuklanmadi',
                nameRequired: 'Nom kiritish shart',
                ingredientUpdated: 'Ingredient yangilandi',
                ingredientCreated: 'Ingredient yaratildi',
                failedSaveIngredient: "Ingredientni saqlab bo'lmadi",
                errorSaveIngredient: 'Ingredientni saqlashda xatolik',
                confirmDeleteIngredient: "Ushbu ingredient o'chirilsinmi?",
                ingredientDeleted: "Ingredient o'chirildi",
                failedDeleteIngredient: "Ingredientni o'chirib bo'lmadi",
                errorDeleteIngredient: "Ingredientni o'chirishda xatolik",
            }
        }

        return {
            searchPlaceholder: 'Search ingredients...',
            addIngredient: 'Add Ingredient',
            name: 'Name',
            amountInStock: 'Amount (In Stock)',
            unit: 'Unit',
            kcalPerGram: 'kcal / g',
            kcalPerGramHint: 'Calories per 1 gram',
            price: 'Price',
            pricePerUnit: 'Price per unit (UZS)',
            priceUnit: 'Price unit',
            actions: 'Actions',
            noIngredientsFound: 'No ingredients found',
            totalIngredients: 'Total items',
            outOfStock: 'Out of stock',
            totalAmount: 'Total quantity',
            editIngredient: 'Edit Ingredient',
            addIngredientTitle: 'Add Ingredient',
            amountInitial: 'Amount (Initial)',
            priceExample: 'Example: 35000',
            priceUnitExample: 'kg, gr, ml, pcs',
            cancel: 'Cancel',
            save: 'Save',
            exampleName: 'e.g. Rice',
            unitExample: 'gr, ml, pcs',
            failedLoadIngredients: 'Failed to load ingredients',
            nameRequired: 'Name is required',
            ingredientUpdated: 'Ingredient updated',
            ingredientCreated: 'Ingredient created',
            failedSaveIngredient: 'Failed to save ingredient',
            errorSaveIngredient: 'Error saving ingredient',
            confirmDeleteIngredient: 'Are you sure you want to delete this ingredient?',
            ingredientDeleted: 'Ingredient deleted',
            failedDeleteIngredient: 'Failed to delete ingredient',
            errorDeleteIngredient: 'Error deleting ingredient',
        }
    }, [language]);

    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSelectedElementsOpen, setIsSelectedElementsOpen] = useState(false);
    const [currentIngredient, setCurrentIngredient] = useState<Partial<Ingredient>>({});
    const [isSaving, setIsSaving] = useState(false);

    const fetchIngredients = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/warehouse/ingredients?showDeleted=${showDeleted ? 'true' : 'false'}`);
            if (res.ok) {
                const data = await res.json();
                setIngredients(data);
            }
        } catch (error) {
            console.error('Failed to fetch ingredients', error);
            toast.error(uiText.failedLoadIngredients);
        } finally {
            setLoading(false);
        }
    }, [showDeleted, uiText.failedLoadIngredients]);

    useEffect(() => {
        void fetchIngredients();
    }, [fetchIngredients]);

    useEffect(() => {
        if (!universalCreate || showDeleted) return;
        setCurrentIngredient({ unit: 'gr', amount: 0 });
        setIsDialogOpen(true);
        onUniversalCreateHandled?.();
    }, [onUniversalCreateHandled, showDeleted, universalCreate]);

    useEffect(() => {
        if (!universalEdit || showDeleted) return;
        if ((selectedIds?.length ?? 0) > 1) setIsSelectedElementsOpen(true);
        else {
            const ingredient = ingredients.find((candidate) => candidate.id === selectedIds?.[0]);
            if (ingredient) {
                setCurrentIngredient(ingredient);
                setIsDialogOpen(true);
            }
        }
        onUniversalEditHandled?.();
    }, [ingredients, onUniversalEditHandled, selectedIds, showDeleted, universalEdit]);

    const handleSave = async () => {
        if (!currentIngredient.name) {
            toast.error(uiText.nameRequired);
            return;
        }

        const pricePerUnit =
            typeof currentIngredient.pricePerUnit === 'number' && Number.isFinite(currentIngredient.pricePerUnit)
                ? currentIngredient.pricePerUnit
                : null;

        const kcalPerGram =
            typeof currentIngredient.kcalPerGram === 'number' && Number.isFinite(currentIngredient.kcalPerGram)
                ? currentIngredient.kcalPerGram
                : null;

        const payload: Partial<Ingredient> = {
            ...currentIngredient,
            kcalPerGram,
            pricePerUnit,
            priceUnit: (currentIngredient.priceUnit || 'kg').trim() || 'kg',
        };

        setIsSaving(true);
        try {
            const method = currentIngredient.id ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/warehouse/ingredients', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(currentIngredient.id ? uiText.ingredientUpdated : uiText.ingredientCreated);
                fetchIngredients();
                setIsDialogOpen(false);
                setCurrentIngredient({});
                if (onUpdate) onUpdate();
            } else {
                toast.error(uiText.failedSaveIngredient);
            }
        } catch (error) {
            console.error('Error saving ingredient', error);
            toast.error(uiText.errorSaveIngredient);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(uiText.confirmDeleteIngredient)) return;

        try {
            const res = await fetch(`/api/admin/warehouse/ingredients?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success(uiText.ingredientDeleted);
                fetchIngredients();
                if (onUpdate) onUpdate();
            } else {
                toast.error(uiText.failedDeleteIngredient);
            }
        } catch (error) {
            console.error('Error deleting ingredient', error);
            toast.error(uiText.errorDeleteIngredient);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            const res = await fetch('/api/admin/warehouse/ingredients', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, deletedAt: false }),
            });
            if (!res.ok) {
                toast.error(uiText.failedSaveIngredient);
                return;
            }
            toast.success(language === 'ru' ? 'Ингредиент восстановлен' : language === 'uz' ? 'Ingredient tiklandi' : 'Ingredient restored');
            await fetchIngredients();
            onUpdate?.();
        } catch (error) {
            console.error('Error restoring ingredient', error);
            toast.error(uiText.errorSaveIngredient);
        }
    };

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const selectedIngredients = ingredients.filter((ingredient) => selectedIds?.includes(ingredient.id));
    const inventorySummary = useMemo(() => ({
        total: ingredients.length,
        outOfStock: ingredients.filter((ingredient) => ingredient.amount <= 0).length,
        amount: ingredients.reduce((sum, ingredient) => sum + (Number.isFinite(ingredient.amount) ? ingredient.amount : 0), 0),
    }), [ingredients]);

    return (
        <div className="space-y-4">
            <div className="border-y border-border bg-background px-3 py-2">
                <ResourceActionBar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={uiText.searchPlaceholder}
                >
                    <Button
                        type="button"
                        size="icon"
                        className="size-9"
                        onClick={() => { setCurrentIngredient({ unit: 'gr', amount: 0 }); setIsDialogOpen(true); }}
                        aria-label={uiText.addIngredient}
                        title={uiText.addIngredient}
                    >
                        <Plus className="size-4" />
                    </Button>
                    <RefreshIconButton
                        label={language === 'ru' ? 'Обновить' : language === 'uz' ? 'Yangilash' : 'Refresh'}
                        onClick={() => void fetchIngredients()}
                        isLoading={loading}
                        iconSize="md"
                    />
                </ResourceActionBar>
            </div>

            <div className="grid grid-cols-3 divide-x border-y border-border bg-background">
                <div className="p-3">
                    <p className="text-xs text-muted-foreground">{uiText.totalIngredients}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{inventorySummary.total}</p>
                </div>
                <div className="p-3">
                    <p className="text-xs text-muted-foreground">{uiText.outOfStock}</p>
                    <p className={`mt-1 text-xl font-semibold tabular-nums ${inventorySummary.outOfStock > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{inventorySummary.outOfStock}</p>
                </div>
                <div className="p-3">
                    <p className="text-xs text-muted-foreground">{uiText.totalAmount}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{inventorySummary.amount.toLocaleString()}</p>
                </div>
            </div>

            {isSelectedElementsOpen ? <div data-reference-selected-elements="ingredients" className="space-y-3 border-y border-border bg-background p-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{language === 'uz' ? 'Tanlangan ingredientlar' : 'Выбранные ингредиенты'}</h3><Button type="button" variant="ghost" size="sm" onClick={() => setIsSelectedElementsOpen(false)}>{language === 'uz' ? 'Orqaga' : 'Назад'}</Button></div><div className="divide-y border-y" role="list" aria-label={language === 'uz' ? 'Tanlangan ingredientlar' : 'Выбранные ингредиенты'}>{selectedIngredients.map((ingredient) => <button key={ingredient.id} type="button" role="listitem" className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/30" onClick={() => { setIsSelectedElementsOpen(false); setCurrentIngredient(ingredient); setIsDialogOpen(true) }}><span className="truncate text-sm font-medium">{ingredient.name}</span><span className="shrink-0 text-xs text-muted-foreground">{language === 'uz' ? 'Ochish' : 'Открыть'}</span></button>)}</div></div> : null}

            <div className="relative max-h-[600px] overflow-y-auto border-y border-border bg-background">
                <Table className="[&_tr]:!bg-transparent [&_tr]:text-foreground">
                    <TableHeader className="sticky top-0 z-10 border-b border-border bg-background">
                        <TableRow className="!bg-transparent">
                            <TableHead className="w-10" />
                            <TableHead>{uiText.name}</TableHead>
                            <TableHead>{uiText.amountInStock}</TableHead>
                            <TableHead>{uiText.unit}</TableHead>
                            <TableHead>{uiText.kcalPerGram}</TableHead>
                            <TableHead>{uiText.price}</TableHead>
                            <TableHead className="text-right">{uiText.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow className="!bg-transparent">
                                <TableCell colSpan={7} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredIngredients.length === 0 ? (
                            <TableRow className="!bg-transparent">
                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                    {uiText.noIngredientsFound}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredIngredients.map((ing) => (
                                 <TableRow key={ing.id} data-reference-resource-row="ingredients" data-resource-id={ing.id} className="!bg-transparent">
                                     <TableCell className="w-10"><input type="checkbox" checked={selectedIds?.includes(ing.id) ?? false} onChange={() => onSelectionChange?.(selectedIds?.includes(ing.id) ? (selectedIds ?? []).filter((id) => id !== ing.id) : [...(selectedIds ?? []), ing.id])} aria-label={`${language === 'uz' ? 'Tanlash' : 'Выбрать'} ${ing.name}`} /></TableCell>
                                     <TableCell className="font-medium">{ing.name}</TableCell>
                                     <TableCell className={ing.amount <= 0 ? 'font-medium text-destructive' : 'font-medium'} title={ing.amount <= 0 ? uiText.outOfStock : undefined}>{ing.amount}</TableCell>
                                     <TableCell>{ing.unit}</TableCell>
                                     <TableCell className="text-xs text-muted-foreground">
                                         {typeof ing.kcalPerGram === 'number' && Number.isFinite(ing.kcalPerGram) ? ing.kcalPerGram : '-'}
                                     </TableCell>
                                     <TableCell className="text-sm text-muted-foreground">
                                         {typeof ing.pricePerUnit === 'number' && Number.isFinite(ing.pricePerUnit)
                                             ? `${ing.pricePerUnit.toLocaleString('ru-RU')} UZS/${ing.priceUnit || 'kg'}`
                                             : '-'}
                                     </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {!showDeleted && <Button variant="ghost" size="icon" onClick={() => { setCurrentIngredient(ing); setIsDialogOpen(true); }} aria-label={uiText.editIngredient} title={uiText.editIngredient}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>}
                                            {showDeleted ? <Button variant="ghost" size="icon" onClick={() => void handleRestore(ing.id)} aria-label={language === 'ru' ? 'Восстановить' : language === 'uz' ? 'Tiklash' : 'Restore'} title={language === 'ru' ? 'Восстановить' : language === 'uz' ? 'Tiklash' : 'Restore'}>
                                                <RotateCcw className="h-4 w-4 text-emerald-600" />
                                            </Button> : <Button variant="ghost" size="icon" onClick={() => void handleDelete(ing.id)} aria-label={language === 'ru' ? 'В корзину' : language === 'uz' ? 'Savatga yuborish' : 'Move to trash'} title={language === 'ru' ? 'В корзину' : language === 'uz' ? 'Savatga yuborish' : 'Move to trash'}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentIngredient.id ? uiText.editIngredient : uiText.addIngredientTitle}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{uiText.name}</Label>
                            <Input
                                value={currentIngredient.name || ''}
                                onChange={(e) => setCurrentIngredient({ ...currentIngredient, name: e.target.value })}
                                placeholder={uiText.exampleName}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{uiText.amountInitial}</Label>
                                <Input
                                    type="number"
                                    value={currentIngredient.amount || 0}
                                    onChange={(e) => setCurrentIngredient({ ...currentIngredient, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{uiText.unit}</Label>
                                <Input
                                    value={currentIngredient.unit || 'gr'}
                                    onChange={(e) => setCurrentIngredient({ ...currentIngredient, unit: e.target.value })}
                                    placeholder={uiText.unitExample}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>
                                {uiText.kcalPerGram}
                                <span className="ml-2 text-xs font-normal text-muted-foreground">{uiText.kcalPerGramHint}</span>
                            </Label>
                            <Input
                                inputMode="decimal"
                                value={typeof currentIngredient.kcalPerGram === 'number' ? String(currentIngredient.kcalPerGram) : ''}
                                onChange={(e) =>
                                    setCurrentIngredient({
                                        ...currentIngredient,
                                        kcalPerGram: e.target.value.trim() === '' ? null : Number(e.target.value),
                                    })
                                }
                                placeholder="0.0"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{uiText.pricePerUnit}</Label>
                                <Input
                                    inputMode="decimal"
                                    value={typeof currentIngredient.pricePerUnit === 'number' ? String(currentIngredient.pricePerUnit) : ''}
                                    onChange={(e) =>
                                        setCurrentIngredient({
                                            ...currentIngredient,
                                            pricePerUnit: e.target.value.trim() === '' ? null : Number(e.target.value),
                                        })
                                    }
                                    placeholder={uiText.priceExample}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{uiText.priceUnit}</Label>
                                <Input
                                    value={currentIngredient.priceUnit || 'kg'}
                                    onChange={(e) => setCurrentIngredient({ ...currentIngredient, priceUnit: e.target.value })}
                                    placeholder={uiText.priceUnitExample}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{uiText.cancel}</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {uiText.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
