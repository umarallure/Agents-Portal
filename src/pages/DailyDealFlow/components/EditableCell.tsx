import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string;
  onSave: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
  children: React.ReactNode;
}

export const EditableCell = ({
  value,
  onSave,
  placeholder,
  className,
  children
}: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(editValue);
      if (success !== false) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving cell:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        if (isEditing && !isSaving) {
          handleSave();
        }
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, isSaving, editValue, value]);

  return (
    <div
      ref={cellRef}
      className={cn(
        "min-h-[32px] w-full cursor-pointer transition-colors",
        "hover:bg-muted/50 focus-within:bg-muted/50",
        isEditing && "bg-muted/50 ring-2 ring-primary ring-offset-1",
        isSaving && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={() => !isEditing && !isSaving && setIsEditing(true)}
      onKeyDown={handleKeyDown}
    >
      {isEditing ? (
        <div className="w-full h-full">
          {children}
        </div>
      ) : (
        <div className="px-2 py-1 w-full h-full flex items-center">
          <span className={cn(
            "truncate",
            !value && "text-muted-foreground italic"
          )}>
            {value || placeholder || "Click to edit"}
          </span>
          {isSaving && (
            <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>
      )}
    </div>
  );
};
