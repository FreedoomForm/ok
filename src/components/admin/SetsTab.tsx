'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Plus,
    Trash2,
    Edit,
    Save,
    UtensilsCrossed,
    ChefHat,
    Flame,
    Clock,
    Copy,
    MoreVertical,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { MENUS, MEAL_TYPES, getDishImageUrl, type Dish, type DailyMenu } from '@/lib/menuData';

// Types for custom sets
interface SetDish {
    dishId: number;
    dishName: string;
    mealType: keyof typeof MEAL_TYPES;
    customIngredients?: Array<{ name: string; amount: number; unit: string }>;
}

interface CalorieGroup {
    calories: number;
    dishes: SetDish[];
}

interface MenuSet {
    id: string;
    name: string;
    description?: string;
    menuNumber: number; // 1-21
    calorieGroups: CalorieGroup[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const CALORIE_OPTIONS = [1200, 1600, 2000, 2500, 3000];

export function SetsTab() {
    const { t } = useLanguage();
    const [sets, setSets] = useState<MenuSet[]>([]);
    const [selectedSet, setSelectedSet] = useState<MenuSet | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditDishModalOpen, setIsEditDishModalOpen] = useState(false);
    const [editingDish, setEditingDish] = useState<{ setId: string; calorieIndex: number; dishIndex: number; dish: SetDish } | null>(null);
    const [activeCalorieTab, setActiveCalorieTab] = useState('1200');
    const [isLoading, setIsLoading] = useState(true);

    // Form state for new set
    const [newSetForm, setNewSetForm] = useState({
        name: '',
        description: '',
        menuNumber: 1,
        copyFrom: '' // ID of set to copy from
    });

    // Load sets from API
    useEffect(() => {
        fetchSets();
    }, []);

    const fetchSets = async () => {
        try {
            const response = await fetch('/api/admin/sets');
            if (response.ok) {
                const data = await response.json();
                setSets(data);
                if (data.length > 0 && !selectedSet) {
                    setSelectedSet(data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching sets:', error);
            toast.error('Ошибка загрузки сетов');
        } finally {
            setIsLoading(false);
        }
    };

    const createSet = async () => {
        if (!newSetForm.name.trim()) {
            toast.error('Введите название сета');
            return;
        }

        try {
            // Get dishes from the selected menu number
            const menuData = MENUS.find(m => m.menuNumber === newSetForm.menuNumber);

            // Create calorie groups with default dishes from menu
            const calorieGroups: CalorieGroup[] = CALORIE_OPTIONS.map(calories => ({
                calories,
                dishes: menuData?.dishes.map(dish => ({
                    dishId: dish.id,
                    dishName: dish.name,
                    mealType: dish.mealType,
                    customIngredients: undefined // Will use default from menuData
                })) || []
            }));

            // If copying from another set, use its dishes
            if (newSetForm.copyFrom) {
                const sourceSet = sets.find(s => s.id === newSetForm.copyFrom);
                if (sourceSet) {
                    calorieGroups.forEach((group, index) => {
                        const sourceGroup = sourceSet.calorieGroups.find(g => g.calories === group.calories);
                        if (sourceGroup) {
                            calorieGroups[index].dishes = [...sourceGroup.dishes];
                        }
                    });
                }
            }

            const response = await fetch('/api/admin/sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newSetForm.name,
                    description: newSetForm.description,
                    menuNumber: newSetForm.menuNumber,
                    calorieGroups
                })
            });

            if (response.ok) {
                const newSet = await response.json();
                setSets(prev => [...prev, newSet]);
                setSelectedSet(newSet);
                setIsCreateModalOpen(false);
                setNewSetForm({ name: '', description: '', menuNumber: 1, copyFrom: '' });
                toast.success('Сет успешно создан');
            } else {
                const error = await response.json();
                toast.error(error.message || 'Ошибка создания сета');
            }
        } catch (error) {
            console.error('Error creating set:', error);
            toast.error('Ошибка создания сета');
        }
    };

    const updateSetDish = async () => {
        if (!editingDish || !selectedSet) return;

        try {
            const updatedGroups = [...selectedSet.calorieGroups];
            updatedGroups[editingDish.calorieIndex].dishes[editingDish.dishIndex] = editingDish.dish;

            const response = await fetch(`/api/admin/sets/${selectedSet.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ calorieGroups: updatedGroups })
            });

            if (response.ok) {
                const updatedSet = await response.json();
                setSets(prev => prev.map(s => s.id === updatedSet.id ? updatedSet : s));
                setSelectedSet(updatedSet);
                setIsEditDishModalOpen(false);
                setEditingDish(null);
                toast.success('Блюдо обновлено');
            } else {
                toast.error('Ошибка обновления блюда');
            }
        } catch (error) {
            console.error('Error updating dish:', error);
            toast.error('Ошибка обновления блюда');
        }
    };

    const deleteSet = async (setId: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот сет?')) return;

        try {
            const response = await fetch(`/api/admin/sets/${setId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setSets(prev => prev.filter(s => s.id !== setId));
                if (selectedSet?.id === setId) {
                    setSelectedSet(sets.find(s => s.id !== setId) || null);
                }
                toast.success('Сет удален');
            } else {
                toast.error('Ошибка удаления сета');
            }
        } catch (error) {
            console.error('Error deleting set:', error);
            toast.error('Ошибка удаления сета');
        }
    };

    const replaceDish = (calorieIndex: number, dishIndex: number, newDish: Dish) => {
        if (!selectedSet) return;

        const updatedGroups = [...selectedSet.calorieGroups];
        updatedGroups[calorieIndex].dishes[dishIndex] = {
            dishId: newDish.id,
            dishName: newDish.name,
            mealType: newDish.mealType,
            customIngredients: undefined
        };

        setSelectedSet({
            ...selectedSet,
            calorieGroups: updatedGroups
        });
    };

    // Get all available dishes for replacement
    const getAllDishes = (): Dish[] => {
        const allDishes: Dish[] = [];
        MENUS.forEach(menu => {
            menu.dishes.forEach(dish => {
                if (!allDishes.find(d => d.id === dish.id)) {
                    allDishes.push(dish);
                }
            });
        });
        return allDishes;
    };

    const currentCalorieGroup = selectedSet?.calorieGroups.find(
        g => g.calories === parseInt(activeCalorieTab)
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold">Кастомные Сеты</h2>
                    <p className="text-sm text-muted-foreground">
                        Создавайте и настраивайте меню для разных калорийных групп
                    </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать сет
                </Button>
            </div>

            {/* Sets List + Selected Set View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                {/* Sets List - Sidebar on desktop, horizontal scroll on mobile */}
                <div className="lg:col-span-3">
                    <Card className="glass-card border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Ваши сеты</CardTitle>
                            <CardDescription className="text-xs">
                                {sets.length} сет(ов) создано
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-2">
                            {/* Mobile: horizontal scroll */}
                            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
                                {sets.map(set => (
                                    <div
                                        key={set.id}
                                        className={`flex-shrink-0 lg:flex-shrink p-3 rounded-lg cursor-pointer transition-all border ${selectedSet?.id === set.id
                                                ? 'bg-primary/10 border-primary/30'
                                                : 'bg-slate-50 hover:bg-slate-100 border-transparent'
                                            }`}
                                        onClick={() => setSelectedSet(set)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-medium text-sm truncate max-w-[120px] lg:max-w-full">
                                                    {set.name}
                                                </h4>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                        День {set.menuNumber}
                                                    </Badge>
                                                    <Badge
                                                        variant={set.isActive ? "default" : "secondary"}
                                                        className="text-[10px] px-1.5 py-0"
                                                    >
                                                        {set.isActive ? 'Активен' : 'Неактивен'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 hidden lg:flex"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteSet(set.id);
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {sets.length === 0 && (
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                        Нет созданных сетов
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Selected Set Details */}
                <div className="lg:col-span-9">
                    {selectedSet ? (
                        <Card className="glass-card border-none">
                            <CardHeader className="pb-2">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <UtensilsCrossed className="w-5 h-5 text-primary" />
                                            {selectedSet.name}
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Меню дня {selectedSet.menuNumber} • {selectedSet.description || 'Без описания'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                                            <Copy className="w-3 h-3 mr-1" />
                                            <span className="hidden sm:inline">Дублировать</span>
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="flex-1 sm:flex-none"
                                            onClick={() => deleteSet(selectedSet.id)}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            <span className="hidden sm:inline">Удалить</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Calorie Tabs */}
                                <Tabs value={activeCalorieTab} onValueChange={setActiveCalorieTab}>
                                    <TabsList className="w-full grid grid-cols-5 h-auto p-1">
                                        {CALORIE_OPTIONS.map(cal => (
                                            <TabsTrigger
                                                key={cal}
                                                value={cal.toString()}
                                                className="text-xs px-1 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-white"
                                            >
                                                <Flame className="w-3 h-3 mr-0.5 hidden sm:inline" />
                                                {cal}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>

                                    {CALORIE_OPTIONS.map(cal => {
                                        const group = selectedSet.calorieGroups.find(g => g.calories === cal);
                                        const groupIndex = selectedSet.calorieGroups.findIndex(g => g.calories === cal);

                                        return (
                                            <TabsContent key={cal} value={cal.toString()} className="mt-4">
                                                <div className="space-y-3">
                                                    {/* Group dishes by meal type */}
                                                    {Object.entries(MEAL_TYPES).map(([mealKey, mealLabel]) => {
                                                        const mealDishes = group?.dishes.filter(d => d.mealType === mealKey) || [];
                                                        if (mealDishes.length === 0) return null;

                                                        return (
                                                            <div key={mealKey} className="space-y-2">
                                                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {mealLabel}
                                                                </h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {mealDishes.map((dish, dishIdx) => {
                                                                        const actualDishIndex = group?.dishes.findIndex(d => d.dishId === dish.dishId) ?? -1;

                                                                        return (
                                                                            <div
                                                                                key={dish.dishId}
                                                                                className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/30 transition-all group"
                                                                            >
                                                                                <div className="w-12 h-12 rounded-md overflow-hidden bg-slate-200 flex-shrink-0">
                                                                                    <img
                                                                                        src={getDishImageUrl(dish.dishId)}
                                                                                        alt={dish.dishName}
                                                                                        className="w-full h-full object-cover"
                                                                                        onError={(e) => {
                                                                                            (e.target as HTMLImageElement).src = '/placeholder-dish.png';
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-sm font-medium truncate">{dish.dishName}</p>
                                                                                    {dish.customIngredients && (
                                                                                        <p className="text-xs text-green-600">
                                                                                            ✓ Настроено
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 opacity-50 group-hover:opacity-100"
                                                                                    onClick={() => {
                                                                                        setEditingDish({
                                                                                            setId: selectedSet.id,
                                                                                            calorieIndex: groupIndex,
                                                                                            dishIndex: actualDishIndex,
                                                                                            dish: { ...dish }
                                                                                        });
                                                                                        setIsEditDishModalOpen(true);
                                                                                    }}
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </TabsContent>
                                        );
                                    })}
                                </Tabs>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="glass-card border-none">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <UtensilsCrossed className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">Выберите сет</h3>
                                <p className="text-sm text-muted-foreground text-center mt-1">
                                    Выберите сет из списка слева или создайте новый
                                </p>
                                <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Создать первый сет
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Create Set Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Создать новый сет</DialogTitle>
                        <DialogDescription>
                            Создайте кастомный набор меню с настраиваемыми блюдами для каждой калорийной группы
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Название сета</Label>
                            <Input
                                id="name"
                                value={newSetForm.name}
                                onChange={(e) => setNewSetForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Например: Веганский сет"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Описание (необязательно)</Label>
                            <Input
                                id="description"
                                value={newSetForm.description}
                                onChange={(e) => setNewSetForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Краткое описание сета"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Базовый день меню (1-21)</Label>
                            <Select
                                value={newSetForm.menuNumber.toString()}
                                onValueChange={(v) => setNewSetForm(prev => ({ ...prev, menuNumber: parseInt(v) }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите день" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 21 }, (_, i) => i + 1).map(num => (
                                        <SelectItem key={num} value={num.toString()}>
                                            День {num}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {sets.length > 0 && (
                            <div className="grid gap-2">
                                <Label>Скопировать из существующего сета</Label>
                                <Select
                                    value={newSetForm.copyFrom}
                                    onValueChange={(v) => setNewSetForm(prev => ({ ...prev, copyFrom: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите сет (необязательно)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">-- Не копировать --</SelectItem>
                                        {sets.map(set => (
                                            <SelectItem key={set.id} value={set.id}>
                                                {set.name} (День {set.menuNumber})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={createSet}>
                            <Plus className="w-4 h-4 mr-2" />
                            Создать
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dish Modal */}
            <Dialog open={isEditDishModalOpen} onOpenChange={setIsEditDishModalOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Редактировать блюдо</DialogTitle>
                        <DialogDescription>
                            Замените блюдо или настройте ингредиенты для этой калорийной группы
                        </DialogDescription>
                    </DialogHeader>
                    {editingDish && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Текущее блюдо</Label>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <img
                                        src={getDishImageUrl(editingDish.dish.dishId)}
                                        alt={editingDish.dish.dishName}
                                        className="w-16 h-16 rounded-md object-cover"
                                    />
                                    <div>
                                        <p className="font-medium">{editingDish.dish.dishName}</p>
                                        <Badge variant="outline" className="text-xs mt-1">
                                            {MEAL_TYPES[editingDish.dish.mealType]}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Заменить на</Label>
                                <Select
                                    value={editingDish.dish.dishId.toString()}
                                    onValueChange={(v) => {
                                        const newDish = getAllDishes().find(d => d.id === parseInt(v));
                                        if (newDish) {
                                            setEditingDish({
                                                ...editingDish,
                                                dish: {
                                                    dishId: newDish.id,
                                                    dishName: newDish.name,
                                                    mealType: newDish.mealType,
                                                    customIngredients: undefined
                                                }
                                            });
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите блюдо" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {getAllDishes()
                                            .filter(d => d.mealType === editingDish.dish.mealType)
                                            .map(dish => (
                                                <SelectItem key={dish.id} value={dish.id.toString()}>
                                                    {dish.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Custom ingredients section could be added here */}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setIsEditDishModalOpen(false);
                            setEditingDish(null);
                        }}>
                            Отмена
                        </Button>
                        <Button onClick={updateSetDish}>
                            <Save className="w-4 h-4 mr-2" />
                            Сохранить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
