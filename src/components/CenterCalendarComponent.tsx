import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Lead = {
  draft_date: string | null;
};

type CenterCalendarComponentProps = {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  getLeadCountForDate: (date: Date) => number;
  leads: Lead[];
};

export const CenterCalendarComponent = ({
  selectedDate,
  onDateSelect,
  getLeadCountForDate,
  leads,
}: CenterCalendarComponentProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const leadCount = getLeadCountForDate(day);
          const hasLeads = leadCount > 0;

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              className={cn(
                'relative h-20 p-2 rounded-lg border-2 transition-all duration-200',
                'flex flex-col items-center justify-start',
                'hover:border-blue-400 hover:shadow-md',
                isCurrentMonth
                  ? 'bg-background'
                  : 'bg-muted/30 text-muted-foreground',
                isSelected && 'border-blue-600 bg-blue-50 shadow-md',
                isToday && !isSelected && 'border-purple-400 bg-purple-50',
                !isCurrentMonth && 'opacity-50',
                hasLeads && isCurrentMonth && !isSelected && 'border-green-300 bg-green-50/50'
              )}
            >
              {/* Day Number */}
              <span
                className={cn(
                  'text-sm font-semibold mb-1',
                  isSelected && 'text-blue-700',
                  isToday && !isSelected && 'text-purple-700',
                  !isCurrentMonth && 'text-muted-foreground'
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Lead Count Badge */}
              {hasLeads && isCurrentMonth && (
                <div
                  className={cn(
                    'absolute bottom-1 left-1/2 -translate-x-1/2',
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    'min-w-[24px] text-center',
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-green-600 text-white'
                  )}
                >
                  {leadCount}
                </div>
              )}

              {/* Today Indicator */}
              {isToday && (
                <div className="absolute top-1 right-1">
                  <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-purple-400 bg-purple-50"></div>
          <span className="text-muted-foreground">Today</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-blue-600 bg-blue-50"></div>
          <span className="text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-green-300 bg-green-50/50"></div>
          <span className="text-muted-foreground">Has Leads</span>
        </div>
      </div>
    </div>
  );
};
