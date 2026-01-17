'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    History,
    Users,
    Plus,
    Minus,
    Loader2,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { getAllIngredients } from '@/lib/menuData';
import { useLanguage } from '@/contexts/LanguageContext';

interface FinanceTabProps {
    className?: string;
}

interface Client {
    id: string;
    name: string;
    phone: string;
    balance: number;
    dailyPrice?: number;
    planType?: string;
}

interface Staff {
    id: string;
    name: string;
    role: string;
    salary: number;
}

interface Transaction {
    id: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    description: string;
    category: string;
    createdAt: string;
    admin?: { name: string };
    customer?: { name: string; phone: string };
}

export function FinanceTab({ className }: FinanceTabProps) {
    const { t } = useLanguage();
    const [activeSubTab, setActiveSubTab] = useState('clients');
    const [companyBalance, setCompanyBalance] = useState(0);
    const [clients, setClients] = useState<Client[]>([]);
    const [history, setHistory] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [ingredientsList, setIngredientsList] = useState<string[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [balanceFilter, setBalanceFilter] = useState<'all' | 'positive' | 'negative' | 'zero'>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [categories, setCategories] = useState<string[]>([]);

    // Modals
    const [isCompanyFundsModalOpen, setIsCompanyFundsModalOpen] = useState(false);
    const [isClientBalanceModalOpen, setIsClientBalanceModalOpen] = useState(false);
    const [isBuyIngredientsModalOpen, setIsBuyIngredientsModalOpen] = useState(false);
    const [isPaySalaryModalOpen, setIsPaySalaryModalOpen] = useState(false);

    // Form Data
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [transactionAmount, setTransactionAmount] = useState('');
    const [transactionDescription, setTransactionDescription] = useState('');
    const [transactionCategory, setTransactionCategory] = useState('');
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Salary Form
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [salaryAmount, setSalaryAmount] = useState('');

    // Buy Ingredients Form
    const [purchaseItems, setPurchaseItems] = useState<{ name: string; amount: string; costPerUnit: string }[]>([
        { name: '', amount: '', costPerUnit: '' }
    ]);

    useEffect(() => {
        setIngredientsList(getAllIngredients());
    }, []);

    useEffect(() => {
        fetchCompanyFinance();
        fetchClients();
        fetchCompanyFinance();
        fetchClients();
        fetchStaff();
    }, []);

    useEffect(() => {
        if (activeSubTab === 'clients') {
            fetchClients();
        } else if (activeSubTab === 'history') {
            fetchCompanyFinance(); // Refresh history
        }
    }, [activeSubTab, balanceFilter, categoryFilter]); // Re-fetch when filter changes

    const fetchCompanyFinance = async () => {
        try {
            const response = await fetch(`/api/admin/finance/company?limit=50&type=all&category=${categoryFilter}`);
            if (response.ok) {
                const data = await response.json();
                setCompanyBalance(data.companyBalance);
                setHistory(data.history);

                // Extract unique categories
                const uniqueCategories = Array.from(new Set(data.history.map((tx: Transaction) => tx.category)));
                setCategories(uniqueCategories as string[]);
            }
        } catch (error) {
            console.error('Error fetching company finance:', error);
            toast.error('Ошибка загрузки данных финансов');
        }
    };

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (balanceFilter !== 'all') params.append('filter', balanceFilter);

            const response = await fetch(`/api/admin/finance/clients?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setClients(data);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Ошибка загрузки списка клиентов');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const [lowAdminsRes, couriersRes] = await Promise.all([
                fetch('/api/admin/low-admins'),
                fetch('/api/admin/couriers')
            ]);

            const staffMap = new Map<string, Staff>();

            if (lowAdminsRes.ok) {
                const lowAdmins = await lowAdminsRes.json();
                lowAdmins.forEach((admin: Staff) => staffMap.set(admin.id, admin));
            }

            if (couriersRes.ok) {
                const couriers = await couriersRes.json();
                couriers.forEach((courier: Staff) => staffMap.set(courier.id, courier));
            }

            setStaff(Array.from(staffMap.values()));
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchClients();
    };

    const handleTransactionSubmit = async (isCompany: boolean) => {
        if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
            toast.error(t.finance.enterAmount);
            return;
        }
        if (!transactionDescription) {
            toast.error(t.finance.enterDescription);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                amount: parseFloat(transactionAmount),
                type: transactionType,
                description: transactionDescription,
                customerId: isCompany ? undefined : selectedClient?.id,
                category: isCompany ? (transactionCategory || 'COMPANY_FUNDS') : 'MANUAL_ADJUSTMENT'
            };

            const response = await fetch('/api/admin/finance/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(t.finance.transactionSuccess);
                setIsCompanyFundsModalOpen(false);
                setIsClientBalanceModalOpen(false);

                // Reset form
                setTransactionAmount('');
                setTransactionDescription('');
                setTransactionCategory('');
                setTransactionType('INCOME');
                setSelectedClient(null);

                // Refresh data
                fetchCompanyFinance();
                fetchClients();
            } else {
                toast.error(t.finance.transactionError);
            }
        } catch (error) {
            console.error('Error submitting transaction:', error);
            toast.error(t.common.connectionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openClientBalanceModal = (client: Client) => {
        setSelectedClient(client);
        setTransactionAmount('');
        setTransactionDescription('');
        setTransactionType('INCOME'); // Default to Add
        setIsClientBalanceModalOpen(true);
    };

    const handleAddPurchaseItem = () => {
        setPurchaseItems([...purchaseItems, { name: '', amount: '', costPerUnit: '' }]);
    };

    const handleRemovePurchaseItem = (index: number) => {
        const newItems = [...purchaseItems];
        newItems.splice(index, 1);
        setPurchaseItems(newItems);
    };

    const handlePurchaseItemChange = (index: number, field: string, value: string) => {
        const newItems = [...purchaseItems];
        // @ts-ignore
        newItems[index][field] = value;
        setPurchaseItems(newItems);
    };

    const calculateTotalPurchaseCost = () => {
        return purchaseItems.reduce((total, item) => {
            const amount = parseFloat(item.amount) || 0;
            const cost = parseFloat(item.costPerUnit) || 0;
            return total + (amount * cost);
        }, 0);
    };

    const handleBuyIngredientsSubmit = async () => {
        // Validate
        const itemsToBuy = purchaseItems.filter(item => item.name && item.amount && item.costPerUnit);
        if (itemsToBuy.length === 0) {
            toast.error(t.warehouse.addIngredient);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                items: itemsToBuy.map(item => ({
                    name: item.name,
                    amount: parseFloat(item.amount),
                    costPerUnit: parseFloat(item.costPerUnit),
                    unit: 'kg' // Default assumption from UI
                }))
            };

            const response = await fetch('/api/admin/finance/buy-ingredients', {
                method: 'POST', // Correct method for buying ingredients
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(t.finance.buySuccess);
                setIsBuyIngredientsModalOpen(false);
                setPurchaseItems([{ name: '', amount: '', costPerUnit: '' }]);
                fetchCompanyFinance();
            } else {
                const data = await response.json();
                toast.error(data.error || t.finance.buyError);
            }
        } catch (error) {
            console.error('Error buying ingredients:', error);
            toast.error(t.common.connectionError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaySalarySubmit = async () => {
        if (!selectedStaffId || !transactionAmount) {
            toast.error(t.finance.selectStaffAndAmount);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/admin/finance/salary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: selectedStaffId,
                    amount: parseFloat(transactionAmount)
                })
            });

            if (response.ok) {
                toast.success(t.finance.salaryPaid);
                setIsCompanyFundsModalOpen(false); // Close the main modal instead
                setSelectedStaffId('');
                setTransactionAmount('');
                setTransactionDescription('');
                setTransactionCategory('');
                setTransactionType('INCOME');
                fetchCompanyFinance(); // Refresh balance
            } else {
                const data = await response.json();
                toast.error(data.error || t.finance.paymentError);
            }
        } catch (error) {
            toast.error('Ошибка соединения');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'UZS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Top Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-card border-none bg-gradient-to-br from-indigo-50 to-blue-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">
                            {t.finance.companyBalance}
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{formatCurrency(companyBalance)}</div>
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-blue-600/80">
                                {t.finance.currentFunds}
                            </p>
                            <Button
                                size="sm"
                                className="h-7 bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                    setTransactionAmount('');
                                    setTransactionDescription('');
                                    setTransactionCategory('');
                                    setTransactionType('INCOME');
                                    setIsCompanyFundsModalOpen(true);
                                    fetchStaff(); // Refresh staff list for salary options
                                }}
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                {t.finance.manageBalance}
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 bg-indigo-600 hover:bg-indigo-700 ml-2"
                                onClick={() => setIsBuyIngredientsModalOpen(true)}
                            >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                {t.finance.purchase}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t.finance.clientDebt}
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(clients.reduce((sum, c) => c.balance < 0 ? sum + c.balance : sum, 0))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {t.finance.negativeBalanceSum}
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t.finance.clientPrepaid}
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(clients.reduce((sum, c) => c.balance > 0 ? sum + c.balance : sum, 0))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {t.finance.positiveBalanceSum}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="clients" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t.finance.clientsBalance}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        {t.finance.history}
                    </TabsTrigger>
                </TabsList>

                {/* CLIENTS TAB */}
                <TabsContent value="clients" className="space-y-4">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <CardTitle className="text-lg font-medium">{t.finance.clientList}</CardTitle>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                        <Input
                                            placeholder={t.admin.searchPlaceholder}
                                            className="pl-9"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </form>
                                    <Select
                                        value={balanceFilter}
                                        onValueChange={(val: any) => setBalanceFilter(val)}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <Filter className="w-4 h-4 mr-2" />
                                            <SelectValue placeholder={t.admin.filters} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t.finance.filters.all}</SelectItem>
                                            <SelectItem value="positive">{t.finance.filters.positive}</SelectItem>
                                            <SelectItem value="negative">{t.finance.filters.negative}</SelectItem>
                                            <SelectItem value="zero">{t.finance.filters.zero}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t.admin.clients}</TableHead>
                                            <TableHead>{t.common.phone}</TableHead>
                                            <TableHead className="text-right">{t.finance.balance}</TableHead>
                                            <TableHead className="text-right">{t.warehouse.days}</TableHead>
                                            <TableHead className="text-right">{t.admin.actions}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : clients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                                    {t.finance.noClients}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            clients.map((client) => (
                                                <TableRow key={client.id}>
                                                    <TableCell className="font-medium">{client.name}</TableCell>
                                                    <TableCell>{client.phone}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={`font-semibold ${client.balance > 0 ? 'text-green-600' :
                                                            client.balance < 0 ? 'text-red-600' : 'text-slate-600'
                                                            }`}>
                                                            {formatCurrency(client.balance)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">
                                                        {client.dailyPrice ? (
                                                            <span className={client.balance < 0 ? 'text-red-600' : 'text-slate-600'}>
                                                                {Math.floor(client.balance / client.dailyPrice)} дн.
                                                            </span>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openClientBalanceModal(client)}
                                                        >
                                                            <DollarSign className="w-4 h-4 mr-2" />
                                                            {t.finance.edit}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HISTORY TAB */}
                <TabsContent value="history">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium">{t.finance.history}</CardTitle>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
                                <CardDescription>
                                    {t.finance.historyDesc}
                                </CardDescription>
                                <Select
                                    value={categoryFilter}
                                    onValueChange={setCategoryFilter}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder={t.finance.category} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t.admin.all}</SelectItem>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t.finance.date}</TableHead>
                                            <TableHead>{t.finance.type}</TableHead>
                                            <TableHead>{t.finance.category}</TableHead>
                                            <TableHead>{t.finance.description}</TableHead>
                                            <TableHead>{t.finance.linkedTo}</TableHead>
                                            <TableHead className="text-right">{t.finance.amount}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                                    {t.finance.emptyHistory}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            history
                                                .filter(tx => categoryFilter === 'all' || tx.category === categoryFilter)
                                                .map((tx) => (
                                                    <TableRow key={tx.id}>
                                                        <TableCell className="text-xs text-slate-500">
                                                            {formatDate(tx.createdAt)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={tx.type === 'INCOME' ? 'outline' : 'secondary'} className={
                                                                tx.type === 'INCOME' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 bg-red-50'
                                                            }>
                                                                {tx.type === 'INCOME' ? t.finance.income : t.finance.expense}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {tx.category}
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate" title={tx.description}>
                                                            {tx.description || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {tx.customer ? (
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{tx.customer.name}</span>
                                                                    <span className="text-xs text-slate-400">{t.admin.clients}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-500">{t.finance.companyBalance}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={`text-right font-medium ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* COMPANY FUNDS MODAL */}
            <Dialog open={isCompanyFundsModalOpen} onOpenChange={setIsCompanyFundsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.finance.manageBalance}</DialogTitle>
                        <DialogDescription>
                            {t.finance.manageBalanceDesc}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">{t.finance.type}</Label>
                            <div className="col-span-3 flex gap-2">
                                <Button
                                    type="button"
                                    variant={transactionType === 'INCOME' ? 'default' : 'outline'}
                                    onClick={() => setTransactionType('INCOME')}
                                    className={transactionType === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t.finance.topUp}
                                </Button>
                                <Button
                                    type="button"
                                    variant={transactionType === 'EXPENSE' ? 'default' : 'outline'}
                                    onClick={() => setTransactionType('EXPENSE')}
                                    className={transactionType === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}
                                >
                                    <Minus className="w-4 h-4 mr-2" />
                                    {t.finance.withdraw}
                                </Button>
                            </div>
                        </div>


                        {/* Transaction Mode Switch */}
                        <div className="flex justify-end border-b pb-2 mb-2">
                            <Tabs value={transactionCategory === 'SALARY' ? 'SALARY' : 'GENERAL'} onValueChange={(val) => {
                                if (val === 'SALARY') {
                                    setTransactionCategory('SALARY');
                                    setTransactionType('EXPENSE');
                                } else {
                                    setTransactionCategory('');
                                    setTransactionType('INCOME');
                                }
                            }} className="w-full">
                                <TabsList className="w-full grid grid-cols-2">
                                    <TabsTrigger value="GENERAL">{t.finance.general}</TabsTrigger>
                                    <TabsTrigger value="SALARY">{t.finance.salary}</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {transactionCategory === 'SALARY' ? (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="staff" className="text-right">{t.finance.staff}</Label>
                                    <Select
                                        value={selectedStaffId}
                                        onValueChange={(val) => {
                                            setSelectedStaffId(val);
                                            const staffMember = staff.find(s => s.id === val);
                                            if (staffMember) {
                                                setTransactionAmount(staffMember.salary.toString());
                                                setTransactionDescription(`${t.finance.salary}: ${staffMember.name}`);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder={t.finance.selectStaff} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staff.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.name} ({s.role === 'COURIER' ? 'Курьер' : s.role === 'WORKER' ? 'Работник' : 'Админ'}) - {formatCurrency(s.salary)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="salary-amount" className="text-right">{t.finance.amount}</Label>
                                    <Input
                                        id="salary-amount"
                                        type="number"
                                        value={transactionAmount}
                                        onChange={(e) => setTransactionAmount(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="amount" className="text-right">
                                        {t.finance.amount} ({transactionType === 'INCOME' ? '+' : '-'})
                                    </Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        min="0"
                                        value={transactionAmount}
                                        onChange={(e) => setTransactionAmount(e.target.value)}
                                        className="col-span-3"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">
                                        {t.finance.description}
                                    </Label>
                                    <Input
                                        id="description"
                                        value={transactionDescription}
                                        onChange={(e) => setTransactionDescription(e.target.value)}
                                        className="col-span-3"
                                        placeholder={t.finance.description}
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="category" className="text-right">
                                        {t.finance.category}
                                    </Label>
                                    <div className="col-span-3 relative">
                                        <Input
                                            id="category"
                                            value={transactionCategory}
                                            onChange={(e) => setTransactionCategory(e.target.value)}
                                            placeholder="Или выберите..."
                                            list="categories-datalist"
                                        />
                                        <datalist id="categories-datalist">
                                            <option value="COMPANY_FUNDS" />
                                            <option value="INVESTMENT" />
                                            <option value="WITHDRAWAL" />
                                            <option value="SALARY" />
                                            <option value="INGREDIENTS" />
                                            {categories.map(cat => (
                                                <option key={cat} value={cat} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompanyFundsModalOpen(false)}>Отмена</Button>
                        <Button onClick={() => {
                            if (transactionCategory === 'SALARY') {
                                setSalaryAmount(transactionAmount); // Sync for legacy handler check if needed, but better to call unified handler
                                handlePaySalarySubmit();
                            } else {
                                handleTransactionSubmit(true);
                            }
                        }} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Подтвердить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CLIENT BALANCE MODAL */}
            <Dialog open={isClientBalanceModalOpen} onOpenChange={setIsClientBalanceModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.finance.clientBalanceTitle}: {selectedClient?.name}</DialogTitle>
                        <DialogDescription>
                            {t.finance.currentBalance}: <span className="font-semibold text-slate-900">{selectedClient && formatCurrency(selectedClient.balance)}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">{t.common.actions}</Label>
                            <div className="col-span-3 flex gap-2">
                                <Button
                                    type="button"
                                    variant={transactionType === 'INCOME' ? 'default' : 'outline'}
                                    onClick={() => setTransactionType('INCOME')}
                                    className={transactionType === 'INCOME' ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t.finance.topUp}
                                </Button>
                                <Button
                                    type="button"
                                    variant={transactionType === 'EXPENSE' ? 'default' : 'outline'}
                                    onClick={() => setTransactionType('EXPENSE')}
                                    className={transactionType === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : ''}
                                >
                                    <Minus className="w-4 h-4 mr-2" />
                                    {t.finance.withdraw}
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c-amount" className="text-right">
                                {t.finance.amount}
                            </Label>
                            <Input
                                id="c-amount"
                                type="number"
                                min="0"
                                value={transactionAmount}
                                onChange={(e) => setTransactionAmount(e.target.value)}
                                className="col-span-3"
                                placeholder="0"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="c-description" className="text-right">
                                {t.finance.comment}
                            </Label>
                            <Input
                                id="c-description"
                                value={transactionDescription}
                                onChange={(e) => setTransactionDescription(e.target.value)}
                                className="col-span-3"
                                placeholder={t.finance.commentPlaceholder}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClientBalanceModalOpen(false)}>{t.common.cancel}</Button>
                        <Button onClick={() => handleTransactionSubmit(false)} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {t.finance.confirmPurchase}
                        </Button>
                    </DialogFooter>
                </DialogContent >
            </Dialog >

            {/* BUY INGREDIENTS MODAL */}
            < Dialog open={isBuyIngredientsModalOpen} onOpenChange={setIsBuyIngredientsModalOpen} >
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t.finance.buyIngredients}</DialogTitle>
                        <DialogDescription>
                            {t.finance.buyIngredientsDesc}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="flex justify-between items-center px-1">
                            <Label className="w-1/3">{t.warehouse.ingredient}</Label>
                            <Label className="w-24">{t.finance.amountKg}</Label>
                            <Label className="w-24">{t.finance.pricePerKg}</Label>
                            <Label className="w-24">{t.finance.amount}</Label>
                            <div className="w-8"></div>
                        </div>

                        {purchaseItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <div className="w-1/3 relative group">
                                    {/* Searchable Combobox Input */}
                                    <div className="relative">
                                        <Input
                                            value={item.name}
                                            onChange={(e) => handlePurchaseItemChange(index, 'name', e.target.value)}
                                            placeholder={t.common.name}
                                            className="w-full"
                                            list={`ingredients-list-${index}`}
                                        />
                                        <datalist id={`ingredients-list-${index}`}>
                                            {ingredientsList.map(ing => (
                                                <option key={ing} value={ing} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    placeholder="0"
                                    className="w-24"
                                    value={item.amount}
                                    onChange={(e) => handlePurchaseItemChange(index, 'amount', e.target.value)}
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    step="100"
                                    placeholder="0"
                                    className="w-24"
                                    value={item.costPerUnit}
                                    onChange={(e) => handlePurchaseItemChange(index, 'costPerUnit', e.target.value)}
                                />
                                <div className="w-24 text-right font-medium text-sm">
                                    {formatCurrency((parseFloat(item.amount) || 0) * (parseFloat(item.costPerUnit) || 0))}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 text-red-500 hover:bg-red-50"
                                    onClick={() => handleRemovePurchaseItem(index)}
                                    disabled={purchaseItems.length === 1}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}

                        <Button variant="outline" size="sm" onClick={handleAddPurchaseItem} className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-2" /> {t.finance.addRow}
                        </Button>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-lg font-bold">
                            {t.finance.total}: {formatCurrency(calculateTotalPurchaseCost())}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsBuyIngredientsModalOpen(false)}>{t.common.cancel}</Button>
                            <Button onClick={handleBuyIngredientsSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {t.finance.confirmPurchase}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >
        </div >
    );
}

// Ensure default export if needed, or stick to named export and import accordingly.
// Existing pages seem to use named imports for components.
