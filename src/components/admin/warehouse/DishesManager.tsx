'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Trash2, Plus, Search, Loader2, X, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { MEAL_TYPES } from '@/lib/menuData';
import { cn } from "@/lib/utils";
import { useLanguage } from '@/contexts/LanguageContext';

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
    imageUrl?: string;
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
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

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
                    {value || "Select ingredient..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search or type new..."
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
                                Use "{search}"
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
    const { t } = useLanguage();
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
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentDish.name || !currentDish.mealType) {
            toast.error('Name and Meal Type are required');
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
                toast.success(currentDish.id ? 'Dish updated' : 'Dish created');
                fetchData();
                setIsDialogOpen(false);
                setCurrentDish({ ingredients: [], menuNumbers: [] });
            } else {
                toast.error('Failed to save dish');
            }
        } catch (error) {
            console.error('Error saving dish', error);
            toast.error('Error saving dish');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this dish?')) return;

        try {
            const res = await fetch(`/api/admin/warehouse/dishes?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Dish deleted');
                fetchData();
            } else {
                toast.error('Failed to delete dish');
            }
        } catch (error) {
            console.error('Error deleting dish', error);
            toast.error('Error deleting dish');
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
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search dishes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Button onClick={() => { setCurrentDish({ ingredients: [], unit: 'gr', menuNumbers: [] } as any); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Dish
                </Button>
            </div>

            <div className="bg-white rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Meal Type</TableHead>
                            <TableHead>Calorie Mappings</TableHead>
                            <TableHead>Menus</TableHead>
                            <TableHead>Ingredients</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredDishes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No dishes found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDishes.map((dish) => (
                                <TableRow key={dish.id}>
                                    <TableCell>
                                        {dish.imageUrl && (
                                            <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100">
                                                <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{dish.name}</TableCell>
                                    <TableCell>
                                        <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100">
                                            {MEAL_TYPES[dish.mealType as keyof typeof MEAL_TYPES] || dish.mealType}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {dish.calorieMappings && Object.entries(dish.calorieMappings).map(([day, groups]) => (
                                                <div key={day} className="text-[10px] bg-amber-50 rounded border border-amber-100 p-1">
                                                    <span className="font-bold mr-1">D{day}:</span>
                                                    <span>{groups.join(',')}</span>
                                                </div>
                                            ))}
                                            {!dish.calorieMappings && <span className="text-slate-400 text-xs">None</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {dish.menuNumbers?.sort((a, b) => a - b).map(num => (
                                                <span key={num} className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
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
                        <DialogTitle>{currentDish.id ? 'Edit Dish' : 'Add Dish'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={currentDish.name || ''}
                                    onChange={(e) => setCurrentDish({ ...currentDish, name: e.target.value })}
                                    placeholder="Dish Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Meal Type</Label>
                                <Select
                                    value={currentDish.mealType}
                                    onValueChange={(val) => setCurrentDish({ ...currentDish, mealType: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(MEAL_TYPES).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label>Image URL (Optional)</Label>
                                <Input
                                    value={currentDish.imageUrl || ''}
                                    onChange={(e) => setCurrentDish({ ...currentDish, imageUrl: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Menus & Calorie Groups (1-21)</Label>
                            <div className="space-y-3 p-3 border rounded-lg bg-slate-50 max-h-64 overflow-y-auto">
                                {Array.from({ length: 21 }, (_, i) => i + 1).map(num => {
                                    const dayStr = num.toString();
                                    const isSelected = currentDish.menuNumbers?.includes(num);
                                    const dayMappings = currentDish.calorieMappings?.[dayStr] || [];

                                    return (
                                        <div key={num} className="bg-white p-2 rounded border space-y-2">
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
                                                            : "bg-slate-100 text-slate-600 border-slate-200"
                                                    )}
                                                >
                                                    Day {num}
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
                                                                        : "bg-slate-50 text-slate-500 border-slate-200"
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
                            <p className="text-xs text-slate-400">Select days and then specific calorie groups for each day.</p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Ingredients</Label>
                                <Button size="sm" variant="outline" onClick={addIngredientRow} type="button">
                                    <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>
                            <div className="space-y-2 border rounded-lg p-2 bg-slate-50">
                                {currentDish.ingredients?.map((ing, idx) => (
                                    <div key={idx} className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs">Ingredient</Label>
                                            <IngredientSelector
                                                value={ing.name}
                                                items={warehouseItems}
                                                onChange={(name, unit) => handleIngredientNameChange(idx, name, unit)}
                                            />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <Label className="text-xs">Amount</Label>
                                            <Input
                                                type="number"
                                                className="h-8"
                                                value={ing.amount}
                                                onChange={(e) => updateIngredientRow(idx, 'amount', parseFloat(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-20 space-y-1">
                                            <Label className="text-xs">Unit</Label>
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
                                    <div className="text-center text-xs text-slate-400 py-2">No ingredients added</div>
                                )}
                            </div>
                        </div>
                    </div >
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >
        </div >
    );
}
