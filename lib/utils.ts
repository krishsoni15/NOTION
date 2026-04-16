import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a timestamp to a readable date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a timestamp to a readable date and time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Smart Search Utility
 * 
 * Normalizes search queries for robust matching:
 * - Trims leading/trailing whitespace
 * - Normalizes multiple spaces to single space
 * - Handles null/undefined values
 * - Returns normalized lowercase query for matching
 */
export function normalizeSearchQuery(query: string | null | undefined): string {
  if (!query) return "";
  
  // Trim and normalize whitespace (multiple spaces to single space)
  const normalized = query.trim().replace(/\s+/g, " ");
  
  return normalized.toLowerCase();
}

/**
 * Check if a text value matches a search query
 * Handles null/undefined values gracefully
 */
export function matchesSearchQuery(
  text: string | null | undefined,
  query: string
): boolean {
  if (!text) return false;
  
  const normalizedText = normalizeSearchQuery(text);
  const normalizedQuery = normalizeSearchQuery(query);
  
  if (!normalizedQuery) return true; // Empty query matches everything
  
  return normalizedText.includes(normalizedQuery);
}

/**
 * Check if any of the provided texts match the search query
 */
export function matchesAnySearchQuery(
  texts: (string | null | undefined)[],
  query: string
): boolean {
  if (!query || normalizeSearchQuery(query) === "") return true;
  
  return texts.some((text) => matchesSearchQuery(text, query));
}
