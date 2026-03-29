/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  ChefHat, 
  Utensils, 
  Package, 
  BarChart3, 
  Settings, 
  Users, 
  Calendar as CalendarIcon, 
  RotateCcw, 
  Plus, 
  Play, 
  Trash2,
  Soup,
  CookingPot,
  Cherry,
  ChevronLeft,
  ChevronRight,
  X,
  Sun,
  Moon,
  MessageSquare,
  LogOut,
  Database,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval, 
  isWithinInterval,
  isBefore,
  startOfDay
} from 'date-fns';
import { useLanguage } from './contexts/LanguageContext';

interface StaffMember {
  id: string;
  name: string;
  email: string;
}

const INITIAL_STAFF: StaffMember[] = [
  { id: '1', name: 'freedim', email: 'afo66timabegim@gmail.com' },
  { id: '2', name: 'FREEDOOM', email: 'asf19@gm.com' },
  { id: '3', name: 'Hsan', email: 'oddiyde@gmail.com' },
  { id: '4', name: 'husan', email: 'husaan@gm.com' },
];

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState('Staff');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [staff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  
  // Date Picker State
  const [startDate, setStartDate] = useState<Date>(new Date(2026, 2, 16));
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 16));
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Lock body scroll when date picker is open
  useEffect(() => {
    if (isDatePickerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isDatePickerOpen]);

  // Handle dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleDateClick = (day: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (isBefore(day, startDate)) {
        setStartDate(day);
        setEndDate(null);
      } else if (isSameDay(day, startDate)) {
        // Deselect if same day? Or just keep it as single day.
        // Let's keep it as single day.
      } else {
        setEndDate(day);
      }
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateView = startOfWeek(monthStart);
    const endDateView = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDateView;
    const dateFormat = "d";

    while (day <= endDateView) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isSelected = (startDate && isSameDay(cloneDay, startDate)) || (endDate && isSameDay(cloneDay, endDate));
        const isInRange = startDate && endDate && isWithinInterval(cloneDay, { start: startDate, end: endDate });
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);

        days.push(
          <div
            key={day.toString()}
            className={`relative p-1 md:p-2 text-center cursor-pointer transition-all duration-200 rounded-lg md:rounded-xl
              ${!isCurrentMonth ? 'text-gourmet-ink dark:text-dark-text' : 'text-gourmet-ink dark:text-dark-text'}
              ${isSelected ? 'bg-gourmet-green dark:bg-dark-green text-gourmet-ink dark:text-dark-text shadow-md z-10' : 'hover:bg-gourmet-green/10 dark:hover:bg-dark-green/40'}
              ${isInRange && !isSelected ? 'bg-gourmet-green/20 dark:bg-dark-green/20' : ''}
            `}
            onClick={() => handleDateClick(cloneDay)}
          >
            <span className="relative z-10 font-bold text-xs md:text-base">{format(cloneDay, dateFormat)}</span>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="flex flex-col gap-1">{rows}</div>;
  };

  const toggleStaffSelection = (id: string) => {
    const newSelected = new Set(selectedStaffIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStaffIds(newSelected);
  };

  const navItems = [
    { name: t.admin.orders, icon: <Cherry className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />, key: 'Orders' },
    { name: t.admin.staff, icon: <ChefHat className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />, key: 'Staff' },
    { name: t.admin.menu, icon: <Utensils className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />, key: 'Menu' },
    { name: t.admin.inventory, icon: <CookingPot className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />, key: 'Inventory' },
    { name: t.admin.analytics, icon: <BarChart3 className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />, key: 'Analytics' },
    { name: t.admin.settings, icon: <Soup className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />, key: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="h-20 md:h-24 bg-dark-green flex items-center justify-between px-4 md:px-10 rounded-b-[30px] md:rounded-b-[50px] shadow-xl z-30 transition-colors duration-300"
      >
        <motion.div 
          whileHover={{ scale: 1.05, y: 4 }}
          className="flex items-center gap-2 md:gap-4 cursor-pointer"
        >
          <motion.div 
            animate={{ rotate: [-12, 12, -12] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="bg-gourmet-green dark:bg-dark-surface p-2 md:p-3 rounded-full shadow-inner border-2 border-white/20 transition-colors duration-300"
          >
            <Utensils className="w-6 h-6 md:w-10 md:h-10 text-gourmet-ink dark:text-dark-text" />
          </motion.div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gourmet-ink dark:text-dark-text tracking-tight">Gourmet</h1>
            <p className="hidden md:block text-sm text-gourmet-ink dark:text-dark-text font-medium">Management V1</p>
          </div>
        </motion.div>

        <div className="flex items-center gap-3 md:gap-8">
          <motion.button
            whileHover={{ scale: 1.1, y: 4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-12 h-12 md:w-16 md:h-16 bg-gourmet-green dark:bg-dark-surface rounded-full shadow-xl flex items-center justify-center border-b-4 border-black/10 group transition-colors duration-300"
          >
            <div className="w-10 h-10 md:w-13 md:h-13 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
              {isDarkMode ? (
                <Sun className="w-6 h-6 md:w-8 md:h-8 text-gourmet-ink dark:text-dark-text" />
              ) : (
                <Moon className="w-6 h-6 md:w-8 md:h-8 text-gourmet-ink dark:text-dark-text" />
              )}
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1, y: 4 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setLanguage(language === 'uz' ? 'ru' : 'uz')}
            className="w-12 h-12 md:w-16 md:h-16 bg-gourmet-green dark:bg-dark-surface rounded-full shadow-xl flex items-center justify-center border-b-4 border-black/10 group transition-colors duration-300 relative"
          >
            <div className="w-10 h-10 md:w-13 md:h-13 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
              <Globe className="w-6 h-6 md:w-8 md:h-8 text-gourmet-ink dark:text-dark-text" />
            </div>
          </motion.button>

          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 5, y: 8 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-12 h-12 md:w-16 md:h-16 bg-gourmet-green dark:bg-dark-surface rounded-full shadow-xl flex items-center justify-center border-b-4 border-black/10 group transition-colors duration-300"
            >
              <div className="w-10 h-10 md:w-13 md:h-13 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                <ChefHat className="w-6 h-6 md:w-8 md:h-8 text-gourmet-ink dark:text-dark-text" />
              </div>
            </motion.button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-3 w-40 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-black/5 dark:border-white/10 overflow-hidden z-50"
                >
                  <div className="py-1.5">
                    <button className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gourmet-green/10 dark:hover:bg-white/5 transition-colors text-gourmet-ink dark:text-dark-text text-left text-sm">
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">{t.common.chat}</span>
                    </button>
                    <button className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gourmet-green/10 dark:hover:bg-white/5 transition-colors text-gourmet-ink dark:text-dark-text text-left text-sm">
                      <Settings className="w-4 h-4" />
                      <span className="font-medium">{t.common.settings}</span>
                    </button>
                    <button className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gourmet-green/10 dark:hover:bg-white/5 transition-colors text-gourmet-ink dark:text-dark-text text-left text-sm">
                      <Database className="w-4 h-4" />
                      <span className="font-medium">{t.common.database}</span>
                    </button>
                    <div className="h-px bg-black/5 dark:bg-white/10 my-1" />
                    <button className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-left text-sm">
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">{t.common.logout}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>

      <div className="flex flex-col md:flex-row flex-1 py-4 md:py-8 px-2 md:px-4 gap-4 md:gap-6 pb-24 md:pb-8">
        {/* Sidebar / Bottom Nav */}
        <motion.aside 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 80 }}
          className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto md:w-32 flex flex-row md:flex-col gap-2 md:gap-6 bg-gourmet-green/90 dark:bg-dark-green/90 md:bg-gourmet-green/40 md:dark:bg-dark-green/40 p-2 md:p-4 rounded-t-[30px] md:rounded-[40px] shadow-2xl md:shadow-inner z-40 md:z-10 justify-around md:justify-start transition-colors duration-300"
        >
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center gap-1 md:gap-2 group relative py-2 md:py-4 transition-all duration-300 ${
                activeTab === item.key ? 'scale-105' : ''
              }`}
            >
              {activeTab === item.key && (
                <motion.div
                  layoutId="active-nav-bg"
                  className="absolute inset-y-0 w-16 md:w-[121px] left-1/2 -translate-x-1/2 bg-gourmet-cream dark:bg-dark-surface rounded-[20px] md:rounded-[30px] shadow-[-10px_0_15px_rgba(0,0,0,0.05)] z-0 transition-colors duration-300"
                  transition={{ type: "spring", stiffness: 200, damping: 30 }}
                />
              )}
              <motion.div 
                animate={{ y: 0 }}
                whileHover={{ 
                  y: [0, -8, 8, 0],
                  transition: { 
                    duration: 3.375, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }
                }}
                whileTap={{ 
                  y: 0,
                  scale: 0.95
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 30 
                }}
                className={`
                  w-12 h-12 md:w-24 md:h-24 rounded-full flex items-center justify-center relative transition-all overflow-hidden z-10
                  ${activeTab === item.key 
                    ? 'bg-gourmet-green dark:bg-dark-green shadow-2xl border-b-4 border-black/20' 
                    : 'bg-white dark:bg-dark-surface shadow-lg border-b-4 border-black/10 dark:border-white/10'}
                `}
              >
                {/* Explosion Effect */}
                <motion.div 
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 4 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`
                    absolute w-10 h-10 rounded-full pointer-events-none z-0
                    ${activeTab === item.key ? 'bg-white/20' : 'bg-gourmet-green/20 dark:bg-dark-green/20'}
                  `}
                />

                <div className={`
                  w-10 h-10 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 border-dashed relative z-10
                  ${activeTab === item.key ? 'border-white/30' : 'border-black/10 dark:border-white/10'}
                `}>
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: `w-5 h-5 md:w-10 md:h-10 transition-colors duration-300 ${activeTab === item.key ? 'text-gourmet-ink dark:text-dark-text' : (item.icon as any).props.className}`
                  })}
                </div>
              </motion.div>
              <span className={`text-[10px] md:text-sm font-bold transition-colors duration-300 relative z-10 ${activeTab === item.key ? 'text-gourmet-ink dark:text-dark-text' : 'text-gourmet-ink dark:text-dark-text'}`}>
                {item.name}
              </span>
            </button>
          ))}
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="content-card h-full flex flex-col gap-6 md:gap-10 relative overflow-hidden px-4 md:px-14 py-6 md:py-10 transition-colors duration-300"
            >
              {/* Background Watermarks */}
              <motion.div 
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute top-10 right-10 opacity-5 dark:opacity-10 pointer-events-none"
              >
                <CookingPot className="w-64 h-64 text-gourmet-ink dark:text-dark-text" />
              </motion.div>

              <div className="flex flex-col gap-2 relative z-10">
                <motion.h2 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl md:text-4xl font-extrabold text-gourmet-ink dark:text-dark-text tracking-tight"
                >
                  {t.admin.manageStaff}
                </motion.h2>
                <motion.p 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-base md:text-lg text-gourmet-ink dark:text-dark-text font-medium"
                >
                  {t.admin.manageStaffDesc}
                </motion.p>
              </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 md:gap-6 relative z-10">
              {/* Search Panel */}
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="relative flex-1 bg-gourmet-green dark:bg-dark-green rounded-full shadow-xl border-b-4 border-black/20 p-1"
              >
                <div className="rounded-full border-2 border-dashed border-white/30 flex items-center px-4 md:px-6 py-2 md:py-3">
                  <Search className="w-5 h-5 md:w-6 md:h-6 text-gourmet-ink dark:text-dark-text mr-3 md:mr-4" />
                  <input 
                    type="text" 
                    placeholder={t.common.search} 
                    className="w-full bg-transparent py-0 text-base md:text-lg focus:outline-none text-gourmet-ink dark:text-dark-text placeholder:text-gourmet-ink dark:placeholder:text-dark-text"
                  />
                </div>
              </motion.div>

              {/* 5 Buttons Group */}
              <div className="flex items-center gap-2 md:gap-4 overflow-x-auto lg:overflow-visible py-4 lg:py-6 no-scrollbar">
                <div className="relative flex-shrink-0">
                  <motion.div 
                    animate={{ x: 0 }}
                    whileHover={{ 
                      x: [0, -5],
                      transition: { 
                        x: { 
                          duration: 1, 
                          repeat: Infinity, 
                          repeatType: "reverse",
                          ease: "easeInOut" 
                        }
                      }
                    }}
                    whileTap={{ x: 0 }}
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="w-[50px] h-[50px] md:w-auto md:h-[50px] flex items-center gap-4 bg-gourmet-green dark:bg-dark-green rounded-full shadow-xl border-b-4 border-black/20 p-1 group cursor-pointer"
                  >
                    <div className="w-[42px] h-[42px] md:w-full md:h-full rounded-full border-2 border-dashed border-white/10 flex items-center justify-center md:px-6">
                      <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-gourmet-ink dark:text-dark-text md:mr-3" />
                      <span className="hidden md:inline font-bold text-sm md:text-lg text-gourmet-ink dark:text-dark-text whitespace-nowrap">
                        {endDate 
                          ? `${format(startDate, 'd-MMM')} - ${format(endDate, 'd-MMM, yyyy')}`
                          : format(startDate, 'd-MMM, yyyy')
                        }
                      </span>
                    </div>
                  </motion.div>
                </div>

                <div className="flex gap-2 md:gap-4 items-center flex-shrink-0">
                  <motion.button 
                    whileHover={{ scale: 1.15, y: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-[50px] h-[50px] bg-gourmet-green dark:bg-dark-green rounded-full shadow-xl flex items-center justify-center border-b-4 border-black/20 group transition-colors duration-300"
                  >
                    <div className="w-[42px] h-[42px] rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />
                    </div>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.15, y: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-[50px] h-[50px] bg-gourmet-green dark:bg-dark-green rounded-full shadow-xl flex items-center justify-center border-b-4 border-black/20 group transition-colors duration-300"
                  >
                    <div className="w-[42px] h-[42px] rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                      <Play className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />
                    </div>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.15, y: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-[50px] h-[50px] bg-gourmet-green dark:bg-dark-green rounded-full shadow-xl flex items-center justify-center border-b-4 border-black/20 group transition-colors duration-300"
                  >
                    <div className="w-[42px] h-[42px] rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />
                    </div>
                  </motion.button>
                  <motion.button 
                    whileHover={{ rotate: 180, scale: 1.1, y: 5 }}
                    whileTap={{ scale: 0.8 }}
                    className="w-[50px] h-[50px] bg-gourmet-green dark:bg-dark-green rounded-full shadow-xl flex items-center justify-center border-b-4 border-black/20 group transition-colors duration-300"
                  >
                    <div className="w-[42px] h-[42px] rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                      <RotateCcw className="w-5 h-5 text-gourmet-ink dark:text-dark-text" />
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex flex-col gap-4 md:gap-6 relative z-10 pb-10">
              {/* Table Header */}
              {(() => {
                const allSelected = staff.length > 0 && selectedStaffIds.size === staff.length;
                const toggleSelectAll = () => {
                  if (allSelected) {
                    setSelectedStaffIds(new Set());
                  } else {
                    setSelectedStaffIds(new Set(staff.map(s => s.id)));
                  }
                };

                return (
                  <div 
                    onClick={toggleSelectAll}
                    className="grid grid-cols-2 px-4 md:px-10 py-3 md:py-5 bg-gourmet-cream/60 dark:bg-dark-green/20 rounded-2xl md:rounded-3xl border-2 border-dashed border-gourmet-green/30 dark:border-white/10 relative overflow-hidden cursor-pointer group transition-colors duration-300"
                  >
                    {allSelected && (
                      <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-3 md:w-5 h-12 md:h-16 bg-gourmet-green dark:bg-dark-green rounded-r-full z-20"
                      />
                    )}
                    <div className="absolute inset-0 flex justify-between px-10 md:px-20 opacity-10 pointer-events-none">
                      <Cherry className="w-8 h-8 md:w-12 md:h-12 rotate-12" />
                      <Utensils className="w-8 h-8 md:w-12 md:h-12 -rotate-12" />
                    </div>
                    <div className="relative flex items-center">
                      <span className={`text-xs md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-colors ${allSelected ? 'text-gourmet-ink dark:text-dark-text' : 'text-gourmet-ink dark:text-dark-text'}`}>{t.common.nameColumn}</span>
                      <div className={`absolute right-0 top-1/2 -translate-y-1/2 h-8 md:h-10 w-[1px] md:w-[2px] bg-gradient-to-b from-transparent to-transparent ${allSelected ? 'via-gourmet-green/40 dark:via-dark-green/40' : 'via-gourmet-green/40 dark:via-dark-green/40'}`} />
                    </div>
                    <div className="flex items-center pl-4 md:pl-10">
                      <span className={`text-xs md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-colors ${allSelected ? 'text-gourmet-ink dark:text-dark-text' : 'text-gourmet-ink dark:text-dark-text'}`}>{t.common.emailColumn}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Table Rows */}
              <div className="flex flex-col gap-3 md:gap-4">
                {staff.map((member, index) => {
                  const isSelected = selectedStaffIds.has(member.id);
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => toggleStaffSelection(member.id)}
                      whileHover={{ 
                        scale: isSelected ? 1.01 : 1.02, 
                        x: 5,
                        y: 2,
                        backgroundColor: isSelected ? undefined : "rgba(141, 163, 130, 0.1)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 20,
                        delay: index * 0.05 
                      }}
                      className={`
                        grid grid-cols-2 px-4 md:px-10 py-4 md:py-6 rounded-2xl md:rounded-3xl shadow-md border-b-4 transition-all cursor-pointer relative overflow-hidden
                        ${index % 2 === 0 ? 'bg-gourmet-cream dark:bg-dark-surface border-black/5 dark:border-white/5' : 'bg-gourmet-cream/40 dark:bg-dark-green/20 border-black/5 dark:border-white/5'}
                      `}
                    >
                      {isSelected && (
                        <motion.div 
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-3 md:w-5 h-12 md:h-16 bg-gourmet-green dark:bg-dark-green rounded-r-full z-20"
                        />
                      )}
                      <div className="relative flex items-center">
                        <span className={`text-sm md:text-lg font-bold transition-colors truncate pr-2 ${isSelected ? 'text-gourmet-ink dark:text-dark-text' : 'text-gourmet-ink dark:text-dark-text'}`}>
                          {member.name}
                        </span>
                        <div className={`absolute right-0 top-1/2 -translate-y-1/2 h-10 md:h-12 w-[1px] md:w-[2px] bg-gradient-to-b from-transparent to-transparent ${isSelected ? 'via-gourmet-green/50 dark:via-dark-green/50' : 'via-gourmet-green/30 dark:via-dark-green/30'}`} />
                      </div>
                      <div className="flex items-center pl-4 md:pl-10">
                        <span className={`text-sm md:text-lg font-medium transition-colors truncate ${isSelected ? 'text-gourmet-ink dark:text-dark-text' : 'text-gourmet-ink dark:text-dark-text'}`}>
                          {member.email}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Date Picker Modal - Moved to root for z-index safety */}
      <AnimatePresence>
        {isDatePickerOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDatePickerOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-gourmet-cream dark:bg-dark-surface rounded-3xl md:rounded-[40px] shadow-2xl border-2 border-gourmet-green/20 p-6 md:p-10 z-[1000] w-full max-w-[450px] mx-auto overflow-hidden transition-colors duration-300"
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-gourmet-green/10 dark:hover:bg-dark-green/40 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-gourmet-ink dark:text-dark-text" />
                </button>
                <h3 className="text-xl md:text-2xl font-black text-gourmet-ink dark:text-dark-text">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-gourmet-green/10 dark:hover:bg-dark-green/40 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-gourmet-ink dark:text-dark-text" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
                {t.common.days.map(d => (
                  <div key={d} className="text-center text-[10px] md:text-sm font-black text-gourmet-ink dark:text-dark-text uppercase tracking-widest py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="text-base md:text-lg">
                {renderCalendar()}
              </div>

              <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 border-t border-dashed border-gourmet-green/20">
                <button 
                  onClick={() => {
                    setStartDate(new Date(2026, 2, 16));
                    setEndDate(null);
                    setIsDatePickerOpen(false);
                  }}
                  className="text-sm md:text-base font-bold text-gourmet-ink dark:text-dark-text hover:text-gourmet-ink dark:hover:text-dark-text transition-colors"
                >
                  {t.common.reset}
                </button>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsDatePickerOpen(false)}
                    className="px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-sm md:text-base text-gourmet-ink dark:text-dark-text hover:bg-gourmet-green/10 dark:hover:bg-dark-green/40 transition-all border border-gourmet-ink/5 sm:border-none"
                  >
                    {t.common.cancel}
                  </button>
                  <button 
                    onClick={() => setIsDatePickerOpen(false)}
                    className="bg-gourmet-green dark:bg-dark-green text-gourmet-ink dark:text-dark-text px-8 md:px-10 py-2 md:py-3 rounded-full font-bold text-sm md:text-base shadow-xl shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    {t.common.ready}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
