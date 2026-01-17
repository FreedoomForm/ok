'use client';

import { cn } from "@/lib/utils";
import { useState, useEffect, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

interface AdminLayoutProps {
    children: ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onLogout: () => void;
    userName?: string;
}

const TAB_LABELS: Record<string, string> = {
    'statistics': 'Статистика',
    'orders': 'Заказы',
    'map': 'Карта',
    'warehouse': 'Склад',
    'cooking': 'Готовка',
    'sets': 'Сеты',
    'finance': 'Финансы',
    'clients': 'Клиенты',
    'couriers': 'Курьеры',
    'chat': 'Чат',
    'settings': 'Настройки',
    'website': 'Сайт',
    'admins': 'Администраторы',
    'bin': 'Корзина',
    'history': 'История',
    'profile': 'Профиль',
};

export function AdminLayout({
    children,
    activeTab,
    onTabChange,
    onLogout,
    userName
}: AdminLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [activeTab]);

    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsSidebarOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <Sidebar
                activeTab={activeTab}
                onTabChange={onTabChange}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onLogout={onLogout}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <MobileHeader
                    onMenuClick={() => setIsSidebarOpen(true)}
                    currentTab={activeTab}
                    tabLabels={TAB_LABELS}
                    userName={userName}
                    onLogout={onLogout}
                />

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                    <div className="p-4 md:p-6 lg:p-8">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation (optional quick actions) */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 safe-area-inset-bottom">
                    <div className="flex justify-around items-center max-w-md mx-auto">
                        <MobileNavItem
                            isActive={activeTab === 'orders'}
                            onClick={() => onTabChange('orders')}
                            label="Заказы"
                            icon="📦"
                        />
                        <MobileNavItem
                            isActive={activeTab === 'clients'}
                            onClick={() => onTabChange('clients')}
                            label="Клиенты"
                            icon="👥"
                        />
                        <MobileNavItem
                            isActive={activeTab === 'cooking'}
                            onClick={() => onTabChange('cooking')}
                            label="Готовка"
                            icon="👨‍🍳"
                        />
                        <MobileNavItem
                            isActive={activeTab === 'finance'}
                            onClick={() => onTabChange('finance')}
                            label="Финансы"
                            icon="💰"
                        />
                    </div>
                </nav>

                {/* Bottom padding for mobile nav */}
                <div className="h-16 lg:hidden" />
            </div>
        </div>
    );
}

interface MobileNavItemProps {
    isActive: boolean;
    onClick: () => void;
    label: string;
    icon: string;
}

function MobileNavItem({ isActive, onClick, label, icon }: MobileNavItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors min-w-[56px]",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-500 hover:text-slate-700"
            )}
        >
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] font-medium mt-0.5 truncate">{label}</span>
        </button>
    );
}
