import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditableCell } from "./EditableCell";

interface CellDropdownProps {
  value: string;
  options: string[];
  onSave: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
}

export const CellDropdown = ({
  value,
  options,
  onSave,
  placeholder,
  className
}: CellDropdownProps) => {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleValueChange = async (newValue: string) => {
    setEditValue(newValue);
    const success = await onSave(newValue);
    return success;
  };

  return (
    <EditableCell
      value={value}
      onSave={() => Promise.resolve(true)} // Handled in handleValueChange
      placeholder={placeholder}
      className={className}
    >
      <Select value={editValue} onValueChange={handleValueChange}>
        <SelectTrigger className="border-none shadow-none focus:ring-0 focus:ring-offset-0 h-auto min-h-[30px] p-1">
          <SelectValue placeholder={placeholder || "Select option"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </EditableCell>
  );
};
