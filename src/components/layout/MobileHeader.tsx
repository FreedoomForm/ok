'use client';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Bell, Settings, User, LogOut, ChevronDown } from "lucide-react";

interface MobileHeaderProps {
    onMenuClick: () => void;
    currentTab: string;
    tabLabels: Record<string, string>;
    userName?: string;
    onLogout: () => void;
}

export function MobileHeader({
    onMenuClick,
    currentTab,
    tabLabels,
    userName = "User",
    onLogout
}: MobileHeaderProps) {
    return (
        <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200 lg:hidden">
            <div className="flex items-center justify-between h-14 px-4">
                {/* Left: Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Center: Current Tab */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                        {tabLabels[currentTab] || currentTab}
                    </span>
                </div>

                {/* Right: User Menu & Notifications */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                        <Bell className="h-4 w-4" />
                        <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                            3
                        </Badge>
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {userName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem>
                                <User className="w-4 h-4 mr-2" />
                                Профиль
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Settings className="w-4 h-4 mr-2" />
                                Настройки
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={onLogout}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Выйти
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
