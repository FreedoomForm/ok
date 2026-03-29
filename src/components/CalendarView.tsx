import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon 
} from 'lucide-react';
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
  eachDayOfInterval 
} from 'date-fns';

interface CalendarViewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-dashed border-gourmet-green/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gourmet-orange rounded-full flex items-center justify-center shadow-lg border-b-2 border-black/10">
            <CalendarIcon className="w-5 h-5 text-gourmet-ink dark:text-dark-text" />
          </div>
          <h2 className="text-xl font-black text-gourmet-ink dark:text-dark-text tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            whileTap={{ scale: 0.9 }}
            onClick={prevMonth}
            className="p-2 hover:bg-gourmet-green/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            whileTap={{ scale: 0.9 }}
            onClick={nextMonth}
            className="p-2 hover:bg-gourmet-green/10 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-gourmet-ink dark:text-dark-text" />
          </motion.button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-gourmet-ink dark:text-dark-text py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    return (
      <div className="grid grid-cols-7 gap-1 p-2">
        {calendarDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <motion.button
              key={day.toString()}
              whileHover={{ scale: 1.1, y: -2 }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelectDate(day);
                onClose();
              }}
              className={`
                relative h-12 flex items-center justify-center rounded-2xl text-sm font-bold transition-all
                ${!isCurrentMonth ? 'text-gourmet-ink dark:text-dark-text opacity-50' : 'text-gourmet-ink dark:text-dark-text'}
                ${isSelected 
                  ? 'bg-gourmet-orange text-gourmet-ink dark:text-dark-text shadow-lg border-b-2 border-black/20' 
                  : 'hover:bg-gourmet-green/10'}
              `}
            >
              {format(day, 'd')}
              {isSameDay(day, new Date()) && !isSelected && (
                <div className="absolute bottom-1.5 w-1 h-1 bg-gourmet-orange rounded-full" />
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gourmet-ink/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-gourmet-cream rounded-[40px] shadow-2xl z-50 overflow-hidden border-b-8 border-black/10"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-gourmet-ink dark:text-dark-text" />
            </button>
            
            <div className="relative">
              {renderHeader()}
              <div className="p-4">
                {renderDays()}
                {renderCells()}
              </div>
            </div>

            <div className="bg-gourmet-green/5 p-6 flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onSelectDate(new Date());
                  setCurrentMonth(new Date());
                }}
                className="px-8 py-3 bg-white rounded-full text-sm font-black uppercase tracking-widest text-gourmet-ink dark:text-dark-text shadow-md border-b-2 border-black/5 hover:bg-gourmet-orange hover:text-gourmet-ink dark:hover:text-dark-text transition-all"
              >
                Bugun
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
