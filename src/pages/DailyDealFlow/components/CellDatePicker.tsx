import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { EditableCell } from "./EditableCell";

interface CellDatePickerProps {
  value: string;
  onSave: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
}

export const CellDatePicker = ({
  value,
  onSave,
  placeholder,
  className
}: CellDatePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedDate(value ? new Date(value) : undefined);
  }, [value]);

  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
    setIsOpen(false);
    
    if (date) {
      const dateString = format(date, "yyyy-MM-dd");
      const success = await onSave(dateString);
      return success;
    } else {
      const success = await onSave("");
      return success;
    }
  };

  const displayValue = selectedDate ? format(selectedDate, "MMM dd, yyyy") : "";

  return (
    <EditableCell
      value={displayValue}
      onSave={() => Promise.resolve(true)} // Handled in handleDateSelect
      placeholder={placeholder || "Select date"}
      className={className}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-left font-normal border-none shadow-none h-auto min-h-[30px] p-1",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "MMM dd, yyyy") : (placeholder || "Pick a date")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </EditableCell>
  );
};
