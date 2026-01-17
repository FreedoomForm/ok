'use client';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    BarChart3,
    ShoppingCart,
    Map,
    Package,
    ChefHat,
    DollarSign,
    Users,
    Truck,
    UtensilsCrossed,
    MessageSquare,
    Settings,
    Globe,
    LogOut,
    X,
    History,
    Trash2,
    User
} from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
}

export function Sidebar({ className, activeTab, onTabChange, isOpen, onClose, onLogout }: SidebarProps) {
    const { t } = useLanguage();

    const menuItems = [
        { id: 'statistics', label: t.admin.statistics, icon: BarChart3, group: 'main' },
        { id: 'orders', label: t.admin.orders, icon: ShoppingCart, group: 'main', badge: 0 },
        { id: 'clients', label: t.admin.clients, icon: Users, group: 'main' },
        { id: 'admins', label: t.admin.admins, icon: Users, group: 'main' },
        { id: 'couriers', label: 'Курьеры', icon: Truck, group: 'main' },
        { id: 'divider1', type: 'divider' },
        { id: 'warehouse', label: t.warehouse.title, icon: Package, group: 'operations' },
        { id: 'cooking', label: t.warehouse.cooking, icon: ChefHat, group: 'operations' },
        { id: 'sets', label: 'Сеты', icon: UtensilsCrossed, group: 'operations' },
        { id: 'divider2', type: 'divider' },
        { id: 'finance', label: t.finance.title, icon: DollarSign, group: 'finance' },
        { id: 'history', label: t.admin.history, icon: History, group: 'finance' },
        { id: 'divider3', type: 'divider' },
        { id: 'chat', label: 'Чат', icon: MessageSquare, group: 'tools' },
        { id: 'website', label: 'Сайт', icon: Globe, group: 'tools' },
        { id: 'bin', label: t.admin.bin, icon: Trash2, group: 'tools' },
        { id: 'divider4', type: 'divider' },
        { id: 'profile', label: t.common.profile, icon: User, group: 'settings' },
        { id: 'settings', label: 'Настройки', icon: Settings, group: 'settings' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:block shadow-xl",
                isOpen ? "translate-x-0" : "-translate-x-full",
                className
            )}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <ChefHat className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                AutoFood
                            </h1>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <ScrollArea className="flex-1 py-2">
                        <nav className="space-y-0.5 px-2">
                            {menuItems.map((item, index) => {
                                if (item.type === 'divider') {
                                    return <div key={item.id} className="h-px bg-slate-800/50 my-2 mx-2" />;
                                }

                                const Icon = item.icon!;
                                return (
                                    <Button
                                        key={item.id}
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg",
                                            activeTab === item.id
                                                ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/20"
                                                : "text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent"
                                        )}
                                        onClick={() => {
                                            onTabChange(item.id);
                                            onClose();
                                        }}
                                    >
                                        <Icon className={cn(
                                            "h-4 w-4",
                                            activeTab === item.id ? "text-blue-400" : ""
                                        )} />
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {item.badge !== undefined && item.badge > 0 && (
                                            <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-red-500 hover:bg-red-500">
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </Button>
                                );
                            })}
                        </nav>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-800/50">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-lg py-2.5"
                            onClick={onLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            {t.common.logout}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
