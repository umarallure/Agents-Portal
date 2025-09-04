import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditableCell } from "./EditableCell";

interface CellInputProps {
  value: string;
  onSave: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  type?: "text" | "number" | "email" | "tel";
  multiline?: boolean;
  className?: string;
}

export const CellInput = ({
  value,
  onSave,
  placeholder,
  type = "text",
  multiline = false,
  className
}: CellInputProps) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (type === "text" || multiline) {
        inputRef.current.select();
      }
    }
  }, []);

  const handleSave = async () => {
    const success = await onSave(editValue);
    return success;
  };

  const InputComponent = multiline ? Textarea : Input;

  return (
    <EditableCell
      value={value}
      onSave={handleSave}
      placeholder={placeholder}
      className={className}
    >
      <InputComponent
        ref={inputRef as any}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        type={multiline ? undefined : type}
        placeholder={placeholder}
        className="border-none shadow-none focus:ring-0 focus:ring-offset-0 p-1 h-auto min-h-[30px]"
        rows={multiline ? 2 : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !multiline && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          } else if (e.key === 'Enter' && multiline && e.ctrlKey) {
            e.preventDefault();
            handleSave();
          }
        }}
      />
    </EditableCell>
  );
};
