"use client";

/**
 * Unit Input Component
 * 
 * Text input with autocomplete suggestions for common units.
 */

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Common units for CRM/inventory management
const COMMON_UNITS = [
  "bags",
  "kg",
  "g",
  "gm",
  "ton",
  "mm",
  "cm",
  "m",
  "km",
  "nos",
  "pieces",
  "pcs",
  "liters",
  "l",
  "ml",
  "sqft",
  "sqm",
  "cft",
  "cum",
  "boxes",
  "cartons",
  "bundles",
  "rolls",
  "sheets",
  "units",
];

// Smart unit suggestions based on number
function getSmartUnitSuggestions(number: number): string[] {
  // For small numbers (< 100), suggest smaller units
  if (number < 100) {
    return ["g", "gm", "ml", "mm", "cm", "nos", "pcs", "pieces", "units"];
  }
  // For medium numbers (100-999), suggest medium units
  else if (number < 1000) {
    return ["kg", "l", "m", "bags", "boxes", "bundles", "rolls", "sheets"];
  }
  // For large numbers (1000+), suggest bulk units
  else {
    return ["cartons", "boxes", "bags", "ton", "kg", "cft", "cum", "sqft", "sqm"];
  }
}

// Generate suggestions with numbers (e.g., "76786 m" → "76786 mm", "76786 m", "76786 ml", etc.)
function generateNumberSuggestions(input: string): string[] {
  // Match number at the start (with optional space and partial unit)
  // Pattern: number + optional space + unit text
  const numberMatch = input.match(/^(\d+)\s*(.*)$/);
  if (numberMatch) {
    const number = numberMatch[1];
    const numberValue = parseInt(number, 10);
    const unitPart = numberMatch[2].toLowerCase().trim();

    if (unitPart.length === 0) {
      // If just a number, suggest smart units based on number value
      const smartUnits = getSmartUnitSuggestions(numberValue);
      return smartUnits.map(unit => `${number} ${unit}`);
    } else {
      // If number + unit text (e.g., "76786 m"), filter units that match or start with the unit text
      // Show exact match first, then similar units (starts with, then contains)
      const exactMatches = COMMON_UNITS.filter(unit =>
        unit.toLowerCase() === unitPart
      );
      const startsWithMatches = COMMON_UNITS.filter(unit =>
        unit.toLowerCase().startsWith(unitPart) && unit.toLowerCase() !== unitPart
      );
      const containsMatches = COMMON_UNITS.filter(unit =>
        unit.toLowerCase().includes(unitPart) &&
        !unit.toLowerCase().startsWith(unitPart) &&
        unit.toLowerCase() !== unitPart
      );

      // Combine: exact matches first, then starts with, then contains
      const allMatches = [...exactMatches, ...startsWithMatches, ...containsMatches];

      if (allMatches.length > 0) {
        return allMatches.map(unit => `${number} ${unit}`);
      } else {
        // If no matches, still show smart suggestions with the number
        const smartUnits = getSmartUnitSuggestions(numberValue);
        return smartUnits.map(unit => `${number} ${unit}`);
      }
    }
  }
  return [];
}

interface UnitInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

export function UnitInput({
  value,
  onChange,
  disabled,
  id,
  placeholder = "e.g., kg, ml, pieces, bags",
}: UnitInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredUnits, setFilteredUnits] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value && value.length > 0) {
      // Only show unit filtering - no number-based suggestions
      const filtered = COMMON_UNITS.filter((unit) =>
        unit.toLowerCase().includes(value.toLowerCase()) ||
        unit.toLowerCase().startsWith(value.toLowerCase())
      );
      setFilteredUnits(filtered);
      // Keep dropdown open while typing
      setIsOpen(true);
    } else {
      // Show all common units when empty
      setFilteredUnits(COMMON_UNITS);
      // Don't auto-open when empty (only on click/focus)
      setIsOpen(false);
    }
  }, [value]);

  const handleSelect = (unit: string) => {
    onChange(unit);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    // Always open dropdown on focus/click
    if (value.length === 0) {
      setFilteredUnits(COMMON_UNITS);
    } else {
      // Only show unit filtering - no number-based suggestions
      const filtered = COMMON_UNITS.filter((unit) =>
        unit.toLowerCase().includes(value.toLowerCase()) ||
        unit.toLowerCase().startsWith(value.toLowerCase())
      );
      setFilteredUnits(filtered.length > 0 ? filtered : COMMON_UNITS);
    }
    setIsOpen(true);
  };

  const handleClick = () => {
    // Open dropdown on click
    handleFocus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement)?.closest('[data-unit-dropdown]')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Unit *</Label>
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onClick={handleClick}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full"
          type="text"
        />
        {isOpen && filteredUnits.length > 0 && (
          <div
            data-unit-dropdown
            className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredUnits.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => handleSelect(unit)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                    value === unit && "bg-accent"
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

