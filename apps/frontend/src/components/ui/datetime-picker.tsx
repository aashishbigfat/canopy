"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
    value?: string; // ISO string
    onChange?: (value: string | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function DateTimePicker({
    value,
    onChange,
    placeholder = "Date Time",
    disabled,
}: DateTimePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
        value ? new Date(value) : undefined
    );
    const [hours, setHours] = React.useState(
        value ? new Date(value).getHours() : new Date().getHours()
    );
    const [minutes, setMinutes] = React.useState(
        value ? new Date(value).getMinutes() : new Date().getMinutes()
    );

    // Keep state in sync with controlled value
    React.useEffect(() => {
        if (value) {
            const d = new Date(value);
            setSelectedDate(d);
            setHours(d.getHours());
            setMinutes(d.getMinutes());
        } else {
            setSelectedDate(undefined);
        }
    }, [value]);

    const handleSet = () => {
        if (!selectedDate) return;
        const combined = new Date(selectedDate);
        combined.setHours(hours);
        combined.setMinutes(minutes);
        combined.setSeconds(0);
        combined.setMilliseconds(0);
        onChange?.(combined.toISOString());
        setOpen(false);
    };

    const handleCancel = () => {
        // Revert to original
        if (value) {
            const d = new Date(value);
            setSelectedDate(d);
            setHours(d.getHours());
            setMinutes(d.getMinutes());
        }
        setOpen(false);
    };

    const adjustHours = (delta: number) => {
        setHours((h) => (h + delta + 24) % 24);
    };

    const adjustMinutes = (delta: number) => {
        setMinutes((m) => (m + delta + 60) % 60);
    };

    const displayValue = React.useMemo(() => {
        if (!value) return null;
        try {
            const d = new Date(value);
            return format(d, "M/d/yyyy, h:mm aa");
        } catch {
            return null;
        }
    }, [value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal h-9 px-3 rounded-md border border-input bg-background text-sm",
                        !displayValue && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {displayValue ?? <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="rounded-md border bg-popover shadow-md">
                    {/* Calendar */}
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        captionLayout="dropdown-months"
                        className="rounded-t-md"
                    />

                    {/* Time picker — matches screenshot "21 : 44" style */}
                    <div className="border-t px-4 py-3">
                        <div className="flex items-center justify-center gap-3">
                            {/* Hours */}
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => adjustHours(1)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </button>
                                <div className="w-10 h-9 border rounded-md flex items-center justify-center text-sm font-medium bg-background select-none">
                                    {String(hours).padStart(2, "0")}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => adjustHours(-1)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                            </div>

                            <span className="text-sm font-bold text-muted-foreground pb-1">:</span>

                            {/* Minutes */}
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => adjustMinutes(1)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </button>
                                <div className="w-10 h-9 border rounded-md flex items-center justify-center text-sm font-medium bg-background select-none">
                                    {String(minutes).padStart(2, "0")}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => adjustMinutes(-1)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center justify-between border-t px-4 py-2 gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                            className="text-muted-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSet}
                            disabled={!selectedDate}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Set
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
