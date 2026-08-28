"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

type Option = {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  onSearch?: (query: string, signal?: AbortSignal) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select items...", className, onSearch, isLoading, disabled = false }: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const debouncedSearch = useDebounce(inputValue, 300);
  const onSearchRef = React.useRef(onSearch);

  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  React.useEffect(() => {
    if (!onSearchRef.current) return;
    const controller = new AbortController();
    onSearchRef.current(debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [debouncedSearch]);

  const handleUnselect = React.useCallback((item: string) => {
    if (disabled) return;
    onChange(selected.filter((i) => i !== item));
  }, [onChange, selected, disabled]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          onChange(selected.slice(0, -1));
        }
      }
      if (e.key === "Escape") {
        input.blur();
      }
    }
  }, [onChange, selected, disabled]);

  const selectables = options.filter(option => !selected.includes(option.value));

  return (
    <Command onKeyDown={handleKeyDown} className={cn("overflow-visible bg-transparent", className, disabled && "opacity-50 cursor-not-allowed")} shouldFilter={!onSearch}>
      <div
        className={cn("group border border-input px-3 py-2 text-sm ring-offset-background rounded-md flex flex-wrap gap-1", !disabled && "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2")}
      >
        {selected.map((item) => {
          const option = options.find((o) => o.value === item);
          const label = option ? option.label : item;
          return (
            <Badge key={item} variant="secondary" className="hover:bg-secondary truncate max-w-[150px]">
              {label}
              {!disabled && (
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(item);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(item)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </Badge>
          );
        })}
        <CommandPrimitive.Input
          ref={inputRef}
          value={inputValue}
          onValueChange={setInputValue}
          onBlur={() => setOpen(false)}
          onFocus={() => { if (!disabled) setOpen(true); }}
          placeholder={selected.length === 0 ? placeholder : undefined}
          disabled={disabled}
          className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1 min-w-[120px] disabled:cursor-not-allowed"
        />
      </div>
      <div className="relative mt-2">
        {open && !disabled ? (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandList>
              {isLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                  </div>
              ) : (
                  <>
                      {inputValue && selectables.length === 0 && (
                          <CommandEmpty>No results found.</CommandEmpty>
                      )}
                      {selectables.length > 0 && (
                          <CommandGroup className="h-full overflow-auto max-h-[160px]">
                            {selectables.map((option) => {
                              return (
                                <CommandItem
                                  key={option.value}
                                  value={option.value}
                                  keywords={[option.label]}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onSelect={(value) => {
                                    setInputValue("");
                                    onChange([...selected, option.value]);
                                  }}
                                  className={"cursor-pointer py-2 px-2"}
                                >
                                  {option.label}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                      )}
                  </>
              )}
            </CommandList>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
