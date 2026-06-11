'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
    TrendingUp,
    TrendingDown,
    Wallet,

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
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { getAllIngredients } from '@/modules/warehouse/infrastructure/menu-data';
import { useLanguage } from '@/contexts/LanguageContext';

import { CalendarDateSelector } from '@/components/admin/dashboard/shared/CalendarDateSelector';
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton'
import { SearchPanel } from '@/components/ui/search-panel'
import dynamic from 'next/dynamic'
import { SortableTableHeader, sortData, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import { applyFilters, type FilterColumn } from '@/components/ui/table-filter-utils'

const TableFilterPanel = dynamic(
  () => import('@/components/ui/table-filter-panel').then((mod) => mod.TableFilterPanel),
  { ssr: false }
)
import type { DateRange } from 'react-day-picker'

interface FinanceTabProps {
    className?: string;
    selectedDate?: Date | null;
    applySelectedDate?: (date: Date | null) => void;
    shiftSelectedDate?: (days: number) => void;
    selectedDateLabel?: string;
    selectedPeriod?: DateRange | undefined
    applySelectedPeriod?: (range: DateRange | undefined) => void
    selectedPeriodLabel?: string
    profileUiText?: any;
}

interface Client {
    id: string;
    name: string;
    phone: string;
    balance: number;
    dailyPrice?: number;
    planType?: string;
}

interface AdminSalaryBalanceRow {
    id: string
    name: string
    role: string
    isActive: boolean
    createdAt: string
    salaryPerDay: number
    days: number
    accrued: number
    paid: number
    balance: number
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

export function FinanceTab({ 
    className,
    selectedDate,
    applySelectedDate,
    shiftSelectedDate,
    selectedDateLabel,
    selectedPeriod,
    applySelectedPeriod,
    selectedPeriodLabel,
    profileUiText
}: FinanceTabProps) {
    const { t, language } = useLanguage();
    const calendarLocale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'
    const [companyBalance, setCompanyBalance] = useState(0);
    const [clients, setClients] = useState<Client[]>([]);
    const [history, setHistory] = useState<Transaction[]>([]);
    const [ingredientsList, setIngredientsList] = useState<string[]>([]);

    // Filters
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [categories, setCategories] = useState<string[]>([]);

    // Sort & Filter
    const [sortStates, setSortStates] = useState<Record<string, SortState>>({});
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});

    const financeColumns: SortableColumn[] = useMemo(() => [
        { key: 'date', label: t.finance.date, type: 'text' },
        { key: 'type', label: t.finance.type, type: 'text' },
        { key: 'category', label: t.finance.category, type: 'text' },
        { key: 'description', label: t.finance.description, type: 'text' },
        { key: 'linkedTo', label: t.finance.linkedTo, type: 'text' },
        { key: 'amount', label: t.finance.amount, type: 'number' },
    ], [t]);

    const financeFilterColumns: FilterColumn[] = financeColumns;

    const handleSortChange = useCallback((key: string, state: SortState) => {
        setSortStates((prev) => ({ ...prev, [key]: state }));
    }, []);

    const handleFilterChange = useCallback((key: string, value: string) => {
        setFilterValues((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleClearAllFilters = useCallback(() => {
        setFilterValues({});
    }, []);

    // Salary payout (as an expense category inside the general withdraw flow)
    const [salaryAdmins, setSalaryAdmins] = useState<AdminSalaryBalanceRow[]>([])
    const [isSalaryAdminsLoading, setIsSalaryAdminsLoading] = useState(false)
    const [selectedSalaryAdminId, setSelectedSalaryAdminId] = useState('')
    const [isFinanceRefreshing, setIsFinanceRefreshing] = useState(false)

    const visibleHistory = useMemo(() => {
        if (!selectedPeriod?.from) return history
        const start = new Date(selectedPeriod.from)
        start.setHours(0, 0, 0, 0)
        const end = new Date(selectedPeriod.to ?? selectedPeriod.from)
        end.setHours(23, 59, 59, 999)

        return history.filter((tx) => {
            const at = new Date(tx.createdAt).getTime()
            return at >= start.getTime() && at <= end.getTime()
        })
    }, [history, selectedPeriod])

    // Modals
    const [isCompanyFundsModalOpen, setIsCompanyFundsModalOpen] = useState(false);
    const [isBuyIngredientsModalOpen, setIsBuyIngredientsModalOpen] = useState(false);

    // Form Data
    const [transactionAmount, setTransactionAmount] = useState('');
    const [transactionDescription, setTransactionDescription] = useState('');
    const [transactionCategory, setTransactionCategory] = useState('');
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    }, []);

    useEffect(() => {
        // Keep the client debt / prepaid widgets aligned with the selected audit period.
        const asOf = selectedPeriod?.to ?? selectedPeriod?.from ?? selectedDate ?? null
        void fetchClients(asOf)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPeriod?.from, selectedPeriod?.to, selectedDate]);

    useEffect(() => {
        fetchCompanyFinance(); // Refresh history
    }, [selectedDate]);

    useEffect(() => {
        if (!isCompanyFundsModalOpen) return
        if (!(transactionType === 'EXPENSE' && transactionCategory === 'SALARY')) return
        void fetchSalaryAdmins()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCompanyFundsModalOpen, transactionCategory, transactionType, selectedDate, selectedPeriod]);

    const fetchCompanyFinance = async () => {
        try {
            let url = `/api/admin/finance/company?limit=50&type=all&category=all`;
            if (selectedDate) {
                url += `&date=${selectedDate.toISOString()}`;
            }
            const response = await fetch(url);
            if (response.ok) {
                const res = await response.json();
                const data = res.data;
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

    const handleRefreshFinance = async () => {
        setIsFinanceRefreshing(true)
        try {
            await Promise.resolve(fetchCompanyFinance())
            const asOf = selectedPeriod?.to ?? selectedPeriod?.from ?? selectedDate ?? null
            await Promise.resolve(fetchClients(asOf))
        } finally {
            setIsFinanceRefreshing(false)
        }
    }

    const fetchClients = async (asOf: Date | null = null) => {
        try {
            let url = `/api/admin/finance/clients?filter=all`
            if (asOf) url += `&asOf=${encodeURIComponent(asOf.toISOString())}`
            const response = await fetch(url);
            if (response.ok) {
                const res = await response.json();
                setClients(res.data);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Ошибка загрузки списка клиентов');
        }
    };

    const fetchSalaryAdmins = async () => {
        setIsSalaryAdminsLoading(true);
        try {
            const asOf = (selectedPeriod?.to ?? selectedPeriod?.from ?? selectedDate ?? new Date()).toISOString();
            const response = await fetch(`/api/admin/finance/admin-balances?asOf=${encodeURIComponent(asOf)}`);
            if (response.ok) {
                const res = await response.json();
                setSalaryAdmins(Array.isArray(res?.data?.admins) ? res.data.admins : []);
            }
        } catch (error) {
            console.error('Error fetching salary admins:', error);
        } finally {
            setIsSalaryAdminsLoading(false);
        }
    };

    const handleTransactionSubmit = async () => {
        const isSalaryPayout = transactionType === 'EXPENSE' && transactionCategory === 'SALARY';
        if (isSalaryPayout) {
            if (!selectedSalaryAdminId) {
                toast.error(t.finance.selectStaff);
                return;
            }
            if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
                toast.error(t.finance.enterAmount);
                return;
            }

            setIsSubmitting(true);
            try {
                const response = await fetch('/api/admin/finance/salary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientAdminId: selectedSalaryAdminId,
                        amount: parseFloat(transactionAmount),
                    }),
                });

                if (response.ok) {
                    toast.success(t.finance.salaryPaid);
                    setIsCompanyFundsModalOpen(false);

                    setSelectedSalaryAdminId('');
                    setTransactionAmount('');
                    setTransactionDescription('');
                    setTransactionCategory('');
                    setTransactionType('INCOME');

                    fetchCompanyFinance();
                    fetchSalaryAdmins();
                } else {
                    const data = await response.json();
                    toast.error(data?.error?.message || t.finance.paymentError);
                }
            } catch (error) {
                console.error('Error paying salary:', error);
                toast.error(t.common.connectionError);
            } finally {
                setIsSubmitting(false);
            }

            return;
        }

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
                category: transactionCategory || 'COMPANY_FUNDS'
            };

            const response = await fetch('/api/admin/finance/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(t.finance.transactionSuccess);
                setIsCompanyFundsModalOpen(false);

                // Reset form
                setTransactionAmount('');
                setTransactionDescription('');
                setTransactionCategory('');
                setTransactionType('INCOME');

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
                toast.error(data?.error?.message || t.finance.buyError);
            }
        } catch (error) {
            console.error('Error buying ingredients:', error);
            toast.error(t.common.connectionError);
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

    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    const visibleHistoryRows = useMemo(() => {
        // Step 1: date period filter (existing)
        let rows = visibleHistory

        // Step 2: search query filter
        const q = historySearchQuery.trim().toLowerCase()
        if (q) {
            rows = rows.filter((tx) => {
                const hay = [
                    tx.type,
                    tx.category,
                    tx.description,
                    String(tx.amount ?? ''),
                    tx.customer?.name,
                    tx.customer?.phone,
                    tx.customer ? 'client' : 'company',
                    formatDate(tx.createdAt),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()

                return hay.includes(q)
            })
        }

        // Step 3: panel column filters
        const filterableRows = rows.map((tx) => ({
            date: formatDate(tx.createdAt),
            type: tx.type === 'INCOME' ? t.finance.income : t.finance.expense,
            category: tx.category,
            description: tx.description || '',
            linkedTo: tx.customer?.name || t.finance.companyBalance,
            amount: String(tx.amount),
            _original: tx,
        }))
        const filtered = applyFilters(filterableRows as unknown as Record<string, unknown>[], filterValues, financeFilterColumns)

        // Step 4: sort
        const sorted = sortData(filtered as unknown as Record<string, unknown>[], sortStates, financeColumns)

        return sorted.map((row: Record<string, unknown>) => (row as { _original: Transaction })._original)
    }, [formatDate, historySearchQuery, visibleHistory, filterValues, sortStates, financeFilterColumns, financeColumns, t])

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Top Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-neutral-900">
                            {t.finance.companyBalance}
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-neutral-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-700">{formatCurrency(companyBalance)}</div>
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-neutral-600/80">
                                {t.finance.currentFunds}
                            </p>
                            <Button
                                size="sm"
                                className="h-7 bg-neutral-800 hover:bg-neutral-900"
                                onClick={() => {
                                    setTransactionAmount('');
                                    setTransactionDescription('');
                                    setTransactionCategory('');
                                    setTransactionType('INCOME');
                                    setIsCompanyFundsModalOpen(true);
                                }}
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                {t.finance.manageBalance}
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 bg-neutral-900 hover:bg-neutral-900 ml-2"
                                onClick={() => setIsBuyIngredientsModalOpen(true)}
                            >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                {t.finance.purchase}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t.finance.clientDebt}
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-neutral-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-700">
                            {formatCurrency(clients.reduce((sum, c) => c.balance < 0 ? sum + c.balance : sum, 0))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {t.finance.negativeBalanceSum}
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t.finance.clientPrepaid}
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-neutral-800" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-800">
                            {formatCurrency(clients.reduce((sum, c) => c.balance > 0 ? sum + c.balance : sum, 0))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {t.finance.positiveBalanceSum}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">{t.finance.history}</CardTitle>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
                        <CardDescription className="flex-1 min-w-0">
                            {t.finance.historyDesc}
                        </CardDescription>
                         {/* Orders-tab style: wrap on mobile so actions never disappear off-screen. */}
                         <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                             <RefreshIconButton
                                 label={profileUiText?.refresh ?? 'Refresh'}
                                 onClick={() => void handleRefreshFinance()}
                                 isLoading={isFinanceRefreshing}
                                 iconSize="md"
                             />

                             {applySelectedDate &&
                               (applySelectedPeriod ? Boolean(selectedPeriodLabel) : Boolean(selectedDateLabel)) &&
                               profileUiText ? (
                                 <CalendarDateSelector
                                     selectedDate={selectedDate || null}
                                     applySelectedDate={applySelectedDate}
                                     shiftSelectedDate={shiftSelectedDate}
                                     selectedDateLabel={selectedPeriodLabel ?? selectedDateLabel}
                                     selectedPeriod={selectedPeriod}
                                     applySelectedPeriod={applySelectedPeriod}
                                     locale={calendarLocale}
                                     profileUiText={profileUiText}
                                 />
                               ) : null}

                             <SearchPanel
                                 value={historySearchQuery}
                                 onChange={setHistorySearchQuery}
                                 placeholder={t.admin.searchPlaceholder}
                                 className="w-full sm:w-[260px] md:w-[320px] flex-none basis-full sm:basis-auto"
                             />
                             <TableFilterPanel
                                 open={filterOpen}
                                 onOpenChange={setFilterOpen}
                                 columns={financeFilterColumns}
                                 filters={filterValues}
                                 onFilterChange={handleFilterChange}
                                 onClearAll={handleClearAllFilters}
                                 title={t.finance.history}
                             />
                         </div>
                     </div>
                 </CardHeader>
                <CardContent>
                    <div className="rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableTableHeader column={financeColumns[0]} sortState={sortStates[financeColumns[0].key] || 'default'} onSortChange={handleSortChange} />
                                    <SortableTableHeader column={financeColumns[1]} sortState={sortStates[financeColumns[1].key] || 'default'} onSortChange={handleSortChange} />
                                    <SortableTableHeader column={financeColumns[2]} sortState={sortStates[financeColumns[2].key] || 'default'} onSortChange={handleSortChange} />
                                    <SortableTableHeader column={financeColumns[3]} sortState={sortStates[financeColumns[3].key] || 'default'} onSortChange={handleSortChange} />
                                    <SortableTableHeader column={financeColumns[4]} sortState={sortStates[financeColumns[4].key] || 'default'} onSortChange={handleSortChange} />
                                    <SortableTableHeader column={financeColumns[5]} sortState={sortStates[financeColumns[5].key] || 'default'} onSortChange={handleSortChange} className="text-right" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleHistoryRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            {t.finance.emptyHistory}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    visibleHistoryRows.map((tx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell className="text-xs text-slate-500">
                                                    {formatDate(tx.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.type === 'INCOME' ? 'outline' : 'secondary'} className={
                                                        tx.type === 'INCOME' ? 'text-neutral-800 bg-neutral-50' : 'text-neutral-700 bg-neutral-50'
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
                                                <TableCell className={`text-right font-medium ${tx.type === 'INCOME' ? 'text-neutral-800' : 'text-neutral-700'
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
                                    onClick={() => {
                                        setTransactionType('INCOME')
                                        if (transactionCategory === 'SALARY') {
                                            setTransactionCategory('')
                                            setSelectedSalaryAdminId('')
                                        }
                                    }}
                                    className={transactionType === 'INCOME' ? 'bg-neutral-800 hover:bg-neutral-900' : ''}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t.finance.topUp}
                                </Button>
                                <Button
                                    type="button"
                                    variant={transactionType === 'EXPENSE' ? 'default' : 'outline'}
                                    onClick={() => setTransactionType('EXPENSE')}
                                    className={transactionType === 'EXPENSE' ? 'bg-neutral-700 hover:bg-neutral-800' : ''}
                                >
                                    <Minus className="w-4 h-4 mr-2" />
                                    {t.finance.withdraw}
                                </Button>
                            </div>
                        </div>


                        {/* Category + salary payout selection */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">{t.finance.category}</Label>
                            <div className="col-span-3 relative">
                                <Input
                                    id="category"
                                    value={transactionCategory}
                                    onChange={(e) => {
                                        const next = e.target.value
                                        setTransactionCategory(next)
                                        if (next === 'SALARY') {
                                            setTransactionType('EXPENSE')
                                        }
                                    }}
                                    placeholder={t.finance.category}
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

                        {transactionType === 'EXPENSE' && transactionCategory === 'SALARY' ? (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="salary-recipient" className="text-right">{t.finance.staff}</Label>
                                <Select
                                    value={selectedSalaryAdminId}
                                    onValueChange={(val) => {
                                        setSelectedSalaryAdminId(val)
                                        const row = salaryAdmins.find((a) => a.id === val)
                                        if (row) {
                                            const suggested = Math.max(0, Math.round(row.balance))
                                            if (!Number.isNaN(suggested)) {
                                                setTransactionAmount(String(suggested))
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger id="salary-recipient" className="col-span-3">
                                        <SelectValue placeholder={isSalaryAdminsLoading ? t.common.loading : t.finance.selectStaff} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {salaryAdmins.map((a) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name} ({a.role}) - {formatCurrency(a.balance)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}

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

                        {!(transactionType === 'EXPENSE' && transactionCategory === 'SALARY') ? (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="description" className="text-right">{t.finance.description}</Label>
                                <Input
                                    id="description"
                                    value={transactionDescription}
                                    onChange={(e) => setTransactionDescription(e.target.value)}
                                    className="col-span-3"
                                    placeholder={t.finance.description}
                                />
                            </div>
                        ) : null}

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompanyFundsModalOpen(false)}>Отмена</Button>
                        <Button onClick={handleTransactionSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Подтвердить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                    className="w-8 h-8 text-neutral-700 hover:bg-neutral-50"
                                    onClick={() => handleRemovePurchaseItem(index)}
                                    disabled={purchaseItems.length === 1}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}

 <Button variant="outline" size="sm" onClick={handleAddPurchaseItem} className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> {t.finance.addRow}
                        </Button>
                    </div>

 <div className="flex justify-between items-center pt-4">
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

