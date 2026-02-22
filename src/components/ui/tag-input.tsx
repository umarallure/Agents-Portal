import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Type and press Enter to add...',
  className,
  inputClassName,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const safeTags = React.useMemo(() => (Array.isArray(tags) ? tags : []), [tags]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!safeTags.includes(newTag)) {
        onChange([...safeTags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && safeTags.length > 0) {
      onChange(safeTags.slice(0, -1));
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(safeTags.filter((tag) => tag !== tagToRemove));
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 p-2 min-h-[48px] border border-input rounded-md bg-background cursor-text',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
      onClick={handleContainerClick}
    >
      {safeTags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="flex items-center gap-1 px-2 py-1 text-base bg-purple-100 text-purple-800 hover:bg-purple-200"
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(tag);
            }}
            className="ml-1 rounded-full outline-none ring-offset-background hover:bg-purple-300 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={safeTags.length === 0 ? placeholder : ''}
        className={cn(
          'flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-base min-w-[150px] h-8',
          inputClassName
        )}
      />
    </div>
  );
}
