"use client";

/**
 * Address Autocomplete Component
 * 
 * Provides Geoapify address autocomplete suggestions (free alternative to Google Places).
 */

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressSuggestion {
  formatted: string;
  properties: {
    formatted: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    district?: string;
    suburb?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  required = false,
  disabled = false,
  label = "Address",
  placeholder = "Search address...",
  id = "address",
  className,
}: AddressAutocompleteProps) {
  const [searchValue, setSearchValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value with internal search value
  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  // Fetch suggestions from Geoapify API
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) {
      setError("Geoapify API key not configured");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          query
        )}&filter=countrycode:in&limit=8&apiKey=${apiKey}&lang=en`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      // Filter to ensure only India results (double check)
      let indiaResults = (data.features || []).filter(
        (feature: AddressSuggestion) =>
          feature.properties.country?.toLowerCase() === "india" ||
          feature.properties.country_code?.toLowerCase() === "in"
      );

      // Sort results: Gujarat first (with local addresses prioritized), then other states
      indiaResults = indiaResults.sort((a: AddressSuggestion, b: AddressSuggestion) => {
        const aState = a.properties.state?.toLowerCase() || "";
        const bState = b.properties.state?.toLowerCase() || "";
        const isGujarat = (state: string) => 
          state === "gujarat" || state === "gujrat" || state.includes("gujarat");
        
        const aIsGujarat = isGujarat(aState);
        const bIsGujarat = isGujarat(bState);
        
        // Check if it's a local address (has street address, suburb, or district)
        const isLocalAddress = (suggestion: AddressSuggestion) => {
          return !!(
            suggestion.properties.address_line1 ||
            suggestion.properties.suburb ||
            suggestion.properties.district
          );
        };
        
        const aIsLocal = isLocalAddress(a);
        const bIsLocal = isLocalAddress(b);
        
        // Priority order:
        // 1. Gujarat local addresses
        // 2. Gujarat cities
        // 3. Other states local addresses
        // 4. Other states cities
        
        if (aIsGujarat && !bIsGujarat) return -1;
        if (!aIsGujarat && bIsGujarat) return 1;
        
        // Both are Gujarat or both are not Gujarat
        if (aIsGujarat && bIsGujarat) {
          // Within Gujarat, prioritize local addresses
          if (aIsLocal && !bIsLocal) return -1;
          if (!aIsLocal && bIsLocal) return 1;
        }
        
        // Both are not Gujarat
        if (!aIsGujarat && !bIsGujarat) {
          // Prioritize local addresses
          if (aIsLocal && !bIsLocal) return -1;
          if (!aIsLocal && bIsLocal) return 1;
        }
        
        return 0;
      });
      
      setSuggestions(indiaResults);
    } catch (err) {
      console.error("Error fetching address suggestions:", err);
      setError("Failed to load address suggestions");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchValue && searchValue.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(searchValue);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    onChange(newValue);
    setShowSuggestions(true);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    const formattedAddress = suggestion.properties.formatted || suggestion.formatted;
    setSearchValue(formattedAddress);
    onChange(formattedAddress);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSuggestions]);

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  const isReady = !!apiKey;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm">
          {label} {required && "*"}
        </Label>
      )}
      <div className="relative z-0" ref={suggestionsRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            id={id}
            value={searchValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || "Search address in India..."}
            required={required}
            disabled={disabled || !isReady}
            className="h-9 pl-9 pr-9 focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>

        {!isReady && (
          <p className="text-xs text-muted-foreground mt-1">
            Add NEXT_PUBLIC_GEOAPIFY_API_KEY to enable address suggestions
          </p>
        )}

        {showSuggestions && isFocused && suggestions.length > 0 && (
          <div className="absolute z-[9999] w-full mt-1.5 bg-popover border border-border/50 rounded-lg shadow-xl max-h-80 overflow-auto backdrop-blur-sm">
            <div className="sticky top-0 bg-popover/95 backdrop-blur-sm border-b border-border/50 px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span>Addresses in India</span>
            </div>
            <div className="p-1.5">
              {suggestions.map((suggestion, index) => {
                const formattedAddress =
                  suggestion.properties.formatted || suggestion.formatted;
                
                // Check if it's Gujarat
                const state = suggestion.properties.state?.toLowerCase() || "";
                const isGujarat = state === "gujarat" || state === "gujrat" || state.includes("gujarat");
                
                // Better address formatting
                const addressParts = [
                  suggestion.properties.address_line1,
                  suggestion.properties.address_line2,
                  suggestion.properties.suburb,
                  suggestion.properties.district,
                ].filter(Boolean);
                
                const mainText = addressParts.length > 0 
                  ? addressParts.join(", ")
                  : suggestion.properties.city || formattedAddress;
                
                const locationParts = [
                  suggestion.properties.city,
                  suggestion.properties.state,
                  suggestion.properties.postcode,
                ].filter(Boolean);
                
                const secondaryText = locationParts.length > 0
                  ? locationParts.join(", ")
                  : formattedAddress.includes(mainText)
                  ? formattedAddress.replace(mainText, "").trim().replace(/^,\s*/, "")
                  : "";

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelect(suggestion)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 hover:bg-accent/50 active:bg-accent transition-all rounded-md flex items-start gap-3 text-sm group mb-0.5 last:mb-0",
                      isGujarat && "bg-primary/5 hover:bg-primary/10"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors",
                        isGujarat ? "bg-primary/15" : "bg-primary/10"
                      )}>
                        <MapPin className={cn(
                          "h-4 w-4",
                          isGujarat ? "text-primary" : "text-primary/80"
                        )} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-foreground leading-tight mb-0.5 flex-1">
                          {mainText}
                        </div>
                        {isGujarat && (
                          <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                            Gujarat
                          </span>
                        )}
                      </div>
                      {secondaryText && (
                        <div className="text-xs text-muted-foreground leading-tight line-clamp-1">
                          {secondaryText}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showSuggestions &&
          isFocused &&
          !isLoading &&
          suggestions.length === 0 &&
          searchValue.length >= 2 && (
            <div className="absolute z-[9999] w-full mt-1.5 bg-popover border border-border/50 rounded-lg shadow-xl p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>No addresses found in India. You can continue typing manually.</span>
              </div>
            </div>
          )}

        {error && (
          <div className="absolute z-[9999] w-full mt-1 bg-popover border rounded-md shadow-xl p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
