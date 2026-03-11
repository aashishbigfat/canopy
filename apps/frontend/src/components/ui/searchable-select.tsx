"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectOption {
    label: string
    value: string
    disabled?: boolean
}

interface SearchableSelectProps {
    options: SearchableSelectOption[]
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    disabled?: boolean
    isLoading?: boolean
    className?: string
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    disabled = false,
    isLoading = false,
    className
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false)

    const selectedOption = React.useMemo(() => 
        options.find((opt) => opt.value === value),
    [options, value])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "h-9 w-full justify-between bg-white px-3 font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled || isLoading}
                >
                    <span className="truncate">
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading...
                            </span>
                        ) : (
                            selectedOption ? selectedOption.label : placeholder
                        )}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} className="h-9" />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto p-1">
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label} // Command filters by value, which is usually label text
                                    onSelect={() => {
                                        if (option.disabled) return
                                        onValueChange(option.value === value ? "" : option.value)
                                        setOpen(false)
                                    }}
                                    disabled={option.disabled}
                                    className={cn(
                                        "flex items-center justify-between py-2 px-2",
                                        option.disabled && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Check
                                            className={cn(
                                                "h-4 w-4 text-blue-600",
                                                value === option.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
