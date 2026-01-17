'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, ChefHat, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Dish {
    id: string;
    name: string;
    description: string;
    mealType: string;
    ingredients: any[];
    imageUrl: string;
    calorieMappings?: Record<string, string[]>;
}

interface CookingManagerProps {
    date: string;
    menuNumber: number;
    clientsByCalorie: Record<number, number>;
    onCook?: () => void;
}

const CALORIE_GROUPS = [1200, 1600, 2000, 2500, 3000];

export function CookingManager({ date, menuNumber, clientsByCalorie, onCook }: CookingManagerProps) {
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [loading, setLoading] = useState(true);
    const [cookingPlan, setCookingPlan] = useState<any>(null); // { cookedStats: { dishId: { 1200: 5 } } }
    const [selectedCalorieGroup, setSelectedCalorieGroup] = useState<string>('all');
    const [cookingAmounts, setCookingAmounts] = useState<Record<string, Record<string, string>>>({});
    const [isCooking, setIsCooking] = useState(false);

    useEffect(() => {
        fetchData();
    }, [menuNumber, date]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Menu Dishes
            const menuRes = await fetch(`/api/admin/menus?number=${menuNumber}`);
            if (menuRes.ok) {
                const menuData = await menuRes.json();
                if (menuData && menuData.dishes) {
                    setDishes(menuData.dishes);
                }
            }

            // Fetch Cooking Plan Status
            const planRes = await fetch(`/api/admin/warehouse/cooking-plan?date=${date}`);
            if (planRes.ok) {
                const planData = await planRes.json();
                setCookingPlan(planData);
            }
        } catch (error) {
            console.error('Failed to load cooking data', error);
            toast.error('Failed to load data');
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
            toast.error('Please enter a valid amount');
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
                    updates
                })
            });

            if (res.ok) {
                toast.success('Cooked successfully');
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
                const data = await res.json();
                toast.error(data.error || 'Failed to cook');
            }
        } catch (error) {
            console.error('Error cooking:', error);
            toast.error('Error cooking');
        } finally {
            setIsCooking(false);
        }
    };

    const getCookedAmount = (dishId: string, calorie: number) => {
        return cookingPlan?.cookedStats?.[dishId]?.[calorie] || 0;
    };

    const getNeededAmount = (dishId: string, calorie: number) => {
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) return 0;

        // If mappings exist, check if this calorie group is allowed for THIS menuNumber
        if (dish.calorieMappings) {
            const allowedGroups = dish.calorieMappings[menuNumber.toString()] || [];
            if (!allowedGroups.includes(calorie.toString())) {
                return 0; // Not needed for this calorie group on this day
            }
        }

        return clientsByCalorie[calorie] || 0;
    };

    const filteredCalorieGroups = selectedCalorieGroup === 'all'
        ? CALORIE_GROUPS
        : [parseInt(selectedCalorieGroup)];

    if (loading) {
        return <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Cooking Control</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Filter Calories:</span>
                    <Select value={selectedCalorieGroup} onValueChange={setSelectedCalorieGroup}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Groups</SelectItem>
                            {CALORIE_GROUPS.map(c => (
                                <SelectItem key={c} value={c.toString()}>{c} kcal</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-white rounded-lg border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Dish</TableHead>
                            {filteredCalorieGroups.map(cal => (
                                <TableHead key={cal} className="text-center min-w-[150px]">
                                    {cal} kcal
                                    <div className="text-xs font-normal text-slate-500">
                                        Need: {clientsByCalorie[cal] || 0}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dishes.map(dish => (
                            <TableRow key={dish.id}>
                                <TableCell className="font-medium">
                                    {dish.name}
                                    <div className="text-xs text-slate-400">{dish.mealType}</div>
                                </TableCell>
                                {filteredCalorieGroups.map(cal => {
                                    const needed = getNeededAmount(dish.id, cal);
                                    const cooked = getCookedAmount(dish.id, cal);
                                    const remaining = Math.max(0, needed - cooked);
                                    const inputVal = cookingAmounts[dish.id]?.[cal] || '';

                                    return (
                                        <TableCell key={cal} className="p-2">
                                            <div className="bg-slate-50 rounded-lg p-2 space-y-2 border">
                                                <div className="flex justify-between text-xs">
                                                    <span className={cooked >= needed ? "text-green-600 font-medium" : "text-amber-600"}>
                                                        Done: {cooked}
                                                    </span>
                                                    <span className="text-slate-500">Left: {remaining}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Input
                                                        type="number"
                                                        className="h-7 text-xs px-1"
                                                        placeholder={remaining.toString()}
                                                        value={inputVal}
                                                        onChange={(e) => handleAmountChange(dish.id, cal, e.target.value)}
                                                    />
                                                    <Button
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0"
                                                        disabled={isCooking || !inputVal}
                                                        onClick={() => handleCook(dish.id, cal)}
                                                    >
                                                        <ChefHat className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
