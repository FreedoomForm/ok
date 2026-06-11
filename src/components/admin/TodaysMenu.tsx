'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    getTodaysMenuNumber,
    getTodaysMenu,
    getDishImageUrl,
    MEAL_TYPES,
    type DailyMenu,
    type Dish
} from '@/modules/warehouse/infrastructure/menu-data';
import { Utensils } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TodaysMenuProps {
    className?: string;
}

const _mealTypeColors: Record<keyof typeof MEAL_TYPES, string> = {
 BREAKFAST: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 ',
 SECOND_BREAKFAST: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100 ',
 LUNCH: 'bg-neutral-100 text-neutral-800 ',
 SNACK: 'bg-neutral-200 text-neutral-800 ',
 DINNER: 'bg-neutral-100 text-neutral-600 ',
 SIXTH_MEAL: 'bg-neutral-200 text-neutral-800 ',
 UNKNOWN: 'bg-muted/50 text-muted-foreground ',
 // SEVENTH_MEAL: 'bg-neutral-100 text-neutral-800 ', // Example if needed
};

const mealTypeIcons: Record<keyof typeof MEAL_TYPES, string> = {
    BREAKFAST: '🌅',
    SECOND_BREAKFAST: '🥐',
    LUNCH: '🍽️',
    SNACK: '🍎',
    DINNER: '🌙',
    SIXTH_MEAL: '🥗',
    UNKNOWN: '❓',
    // SEVENTH_MEAL: '🥣',
};

export function TodaysMenu({ className }: TodaysMenuProps) {
    const { t } = useLanguage();
    const [menu, setMenu] = useState<DailyMenu | undefined>(undefined);
    const [menuNumber, setMenuNumber] = useState<number>(0);
    const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

    useEffect(() => {
        const currentMenuNumber = getTodaysMenuNumber();
        setMenuNumber(currentMenuNumber);
        setMenu(getTodaysMenu());
    }, []);

    const handleImageError = (dishId: number) => {
        setImageErrors(prev => new Set(prev).add(dishId));
    };

    if (!menu) {
        return (
            <Card className={`glass-card ${className}`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Utensils className="w-5 h-5" />
                        {t.admin.todaysMenu}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
 <div className="animate-spin rounded-full h-6 w-6"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Group dishes by meal type
    const dishesByMealType = menu.dishes.reduce((acc, dish) => {
        if (!acc[dish.mealType]) {
            acc[dish.mealType] = [];
        }
        acc[dish.mealType].push(dish);
        return acc;
    }, {} as Record<keyof typeof MEAL_TYPES, Dish[]>);

    return (
        <Card className={`glass-card ${className}`}>
            <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex flex-row justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-primary" />
                        <CardTitle className="text-base font-semibold">
                            {t.admin.todaysMenu}
                        </CardTitle>
                        <Badge variant="outline" className="ml-2 px-2 py-0.5 h-6 bg-primary/5 text-xs font-normal">
                            {t.admin.day} {menuNumber} / 21
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                <div className="flex overflow-x-auto pb-2 gap-3 scrollbar-hide -mx-1 px-1">
                    {Object.entries(MEAL_TYPES).map(([key, label]) => {
                        const mealKey = key as keyof typeof MEAL_TYPES;
                        const dishes = dishesByMealType[mealKey];

                        if (!dishes || dishes.length === 0) return null;

                        return dishes.map((dish) => (
                            <div
                                key={dish.id}
 className="flex-none w-[200px] group relative bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-row h-20"
                            >
                                <div className="w-20 h-full relative bg-muted/50 flex-shrink-0">
                                    {!imageErrors.has(dish.id) ? (
                                        <img
                                            src={getDishImageUrl(dish.id)}
                                            alt={dish.name}
                                            className="w-full h-full object-cover"
                                            onError={() => handleImageError(dish.id)}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl bg-muted/50">
                                            {mealTypeIcons[dish.mealType]}
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 flex flex-col justify-between flex-1 min-w-0">
                                    <div>
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-medium">
                                                {/* Use label directly as it seems to be hardcoded, or map it if possible. 
                                                    For now if MEAL_TYPES values are Russian, they will be Russian.
                                                    Better to rely on the key if possible, but label is passed from map. */}
                                                {label}
                                            </span>
                                        </div>
                                        <h4 className="font-medium text-xs text-slate-900 leading-tight line-clamp-2" title={dish.name}>
                                            {dish.name}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
 <div className="text-[10px] text-slate-500 truncate" title={dish.ingredients.map(i => i.name).join(',')}>
                                            {dish.ingredients.length} {t.warehouse.ingredient}
                                            {/* Using warehouse.ingredient ('Ингредиент'/'Masalliq') might be slightly off for 'ingr.', 
                                                but better than hardcoded. 'ingredient' key is singular. */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ));
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

