'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Ingredient {
    id: string;
    name: string;
    amount: number;
    unit: string;
}

interface IngredientsManagerProps {
    onUpdate?: () => void;
}

export function IngredientsManager({ onUpdate }: IngredientsManagerProps) {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentIngredient, setCurrentIngredient] = useState<Partial<Ingredient>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchIngredients();
    }, []);

    const fetchIngredients = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/warehouse/ingredients');
            if (res.ok) {
                const data = await res.json();
                setIngredients(data);
            }
        } catch (error) {
            console.error('Failed to fetch ingredients', error);
            toast.error('Failed to load ingredients');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentIngredient.name) {
            toast.error('Name is required');
            return;
        }

        setIsSaving(true);
        try {
            const method = currentIngredient.id ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/warehouse/ingredients', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentIngredient),
            });

            if (res.ok) {
                toast.success(currentIngredient.id ? 'Ingredient updated' : 'Ingredient created');
                fetchIngredients();
                setIsDialogOpen(false);
                setCurrentIngredient({});
                if (onUpdate) onUpdate();
            } else {
                toast.error('Failed to save ingredient');
            }
        } catch (error) {
            console.error('Error saving ingredient', error);
            toast.error('Error saving ingredient');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this ingredient?')) return;

        try {
            const res = await fetch(`/api/admin/warehouse/ingredients?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Ingredient deleted');
                fetchIngredients();
                if (onUpdate) onUpdate();
            } else {
                toast.error('Failed to delete ingredient');
            }
        } catch (error) {
            console.error('Error deleting ingredient', error);
            toast.error('Error deleting ingredient');
        }
    };

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search ingredients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Button onClick={() => { setCurrentIngredient({ unit: 'gr', amount: 0 }); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Ingredient
                </Button>
            </div>

            <div className="bg-white rounded-lg border max-h-[600px] overflow-y-auto relative">
                <Table>
                    <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Amount (In Stock)</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredIngredients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                    No ingredients found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredIngredients.map((ing) => (
                                <TableRow key={ing.id}>
                                    <TableCell className="font-medium">{ing.name}</TableCell>
                                    <TableCell>{ing.amount}</TableCell>
                                    <TableCell>{ing.unit}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => { setCurrentIngredient(ing); setIsDialogOpen(true); }}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(ing.id)}>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentIngredient.id ? 'Edit Ingredient' : 'Add Ingredient'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={currentIngredient.name || ''}
                                onChange={(e) => setCurrentIngredient({ ...currentIngredient, name: e.target.value })}
                                placeholder="e.g. Rice"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Amount (Initial)</Label>
                                <Input
                                    type="number"
                                    value={currentIngredient.amount || 0}
                                    onChange={(e) => setCurrentIngredient({ ...currentIngredient, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Input
                                    value={currentIngredient.unit || 'gr'}
                                    onChange={(e) => setCurrentIngredient({ ...currentIngredient, unit: e.target.value })}
                                    placeholder="gr, ml, pcs"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
