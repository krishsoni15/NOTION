"use client";

/**
 * Date Picker Component
 * 
 * Manual input field with calendar button that opens calendar popover
 * Auto-formats input as DD/MM/YYYY
 */

import { useState, useEffect, useRef } from "react";
import { format, parse, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  className,
  disabled = false,
  error = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? startOfMonth(value) : startOfMonth(new Date()));
  const [manualInput, setManualInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update manual input when value changes
  useEffect(() => {
    if (value) {
      setManualInput(format(value, "dd/MM/yyyy"));
    } else {
      setManualInput("");
    }
  }, [value]);

  // Update current month when value changes
  useEffect(() => {
    if (value) {
      setCurrentMonth(startOfMonth(value));
    }
  }, [value]);

  const formatDateInput = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    // Limit to 8 digits (DDMMYYYY)
    const limitedDigits = digits.slice(0, 8);
    
    // Format with slashes
    if (limitedDigits.length <= 2) {
      return limitedDigits;
    } else if (limitedDigits.length <= 4) {
      return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
    } else {
      return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2, 4)}/${limitedDigits.slice(4, 8)}`;
    }
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatDateInput(rawValue);
    
    setManualInput(formatted);

    // Try to parse DD/MM/YYYY format when complete (10 chars with slashes)
    if (formatted.length === 10) {
      const parsed = parse(formatted, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        // Validate day and month ranges
        const day = parseInt(formatted.slice(0, 2), 10);
        const month = parseInt(formatted.slice(3, 5), 10);
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
          onChange(parsed);
        }
      }
    } else if (formatted.length === 0) {
      onChange(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, arrow keys, tab
    if (["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
      return;
    }
    // Allow numbers
    if (!/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  };

  const handleCalendarDateSelect = (date: Date) => {
    onChange(date);
    setOpen(false);
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday = 0
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleTodayClick = () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    onChange(todayDate);
  };

  return (
    <div className={cn("space-y-1.5 sm:space-y-2", className)}>
      <div className="flex gap-1.5 sm:gap-2">
        {/* Manual Input Field */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={handleManualInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={10}
            className={cn(
              "font-mono w-full h-10 sm:h-11 text-sm sm:text-base",
              value && "pr-8 sm:pr-10",
              error && "border-destructive focus:border-destructive focus:ring-destructive/20"
            )}
          />
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
                setManualInput("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>
        
        {/* Today Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTodayClick}
          disabled={disabled}
          className="shrink-0 h-10 sm:h-11 px-2 sm:px-3 text-xs sm:text-sm font-medium touch-manipulation"
          title="Set today's date"
        >
          Today
        </Button>
        
        {/* Calendar Button */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 touch-manipulation"
            >
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </PopoverTrigger>
        <PopoverContent 
          className="w-[calc(100vw-2rem)] sm:w-auto p-2 sm:p-4 max-w-[320px] sm:max-w-none" 
          align="start"
          sideOffset={4}
        >
          <div className="p-2 sm:p-3">
            <div className="space-y-3 sm:space-y-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between px-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={previousMonth}
                  className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <div className="font-semibold text-sm sm:text-base px-2">
                  {format(currentMonth, "MMMM yyyy")}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-1.5"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {days.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = value && isSameDay(day, value);
                  const isToday = isSameDay(day, today);

                  return (
                    <Button
                      key={day.toISOString()}
                      type="button"
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal text-xs sm:text-sm touch-manipulation",
                        !isCurrentMonth && "text-muted-foreground opacity-50",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && isToday && "bg-accent",
                        !isSelected && !isToday && "hover:bg-accent active:bg-accent/80"
                      )}
                      onClick={() => handleCalendarDateSelect(day)}
                    >
                      {format(day, "d")}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      </div>
      
      {/* Format hint below - responsive */}
      {isFocused && manualInput.length > 0 && manualInput.length < 10 && (
        <p className="text-xs sm:text-sm text-muted-foreground px-1">
          Enter date as DD/MM/YYYY (e.g., 24/10/2024)
        </p>
      )}
    </div>
  );
}

