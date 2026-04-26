/**
 * Memoization Utilities
 * 
 * Provides memoization for expensive operations like filtering and sorting
 * to improve performance with large datasets
 */

import type { DirectActionItem, DirectActionFilters } from "./types";

interface MemoizedResult<T> {
  result: T;
  timestamp: number;
  inputHash: string;
}

/**
 * Memoization Cache for filtered results
 */
export class FilterMemoizationCache {
  private cache: Map<string, MemoizedResult<DirectActionItem[]>> = new Map();
  private readonly DEFAULT_TTL = 30 * 1000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttl: number = this.DEFAULT_TTL) {
    this.DEFAULT_TTL = ttl;
    this.startCleanupInterval();
  }

  /**
   * Get memoized filter result
   */
  get(
    items: DirectActionItem[],
    filters: DirectActionFilters
  ): DirectActionItem[] | null {
    const hash = this.generateHash(items, filters);
    const entry = this.cache.get(hash);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.DEFAULT_TTL) {
      this.cache.delete(hash);
      return null;
    }

    return entry.result;
  }

  /**
   * Set memoized filter result
   */
  set(
    items: DirectActionItem[],
    filters: DirectActionFilters,
    result: DirectActionItem[]
  ): void {
    const hash = this.generateHash(items, filters);
    this.cache.set(hash, {
      result,
      timestamp: Date.now(),
      inputHash: hash,
    });
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Generate hash from items and filters
   */
  private generateHash(items: DirectActionItem[], filters: DirectActionFilters): string {
    // Create a simple hash based on item count, filter values, and item IDs
    const itemIds = items.map((i) => i.id).join(",");
    const filterStr = JSON.stringify(filters);
    return `${itemIds}|${filterStr}`;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 1000); // Run cleanup every minute
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.DEFAULT_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * Memoization Cache for sorted results
 */
export class SortMemoizationCache {
  private cache: Map<string, MemoizedResult<DirectActionItem[]>> = new Map();
  private readonly DEFAULT_TTL = 30 * 1000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttl: number = this.DEFAULT_TTL) {
    this.DEFAULT_TTL = ttl;
    this.startCleanupInterval();
  }

  /**
   * Get memoized sort result
   */
  get(items: DirectActionItem[]): DirectActionItem[] | null {
    const hash = this.generateHash(items);
    const entry = this.cache.get(hash);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.DEFAULT_TTL) {
      this.cache.delete(hash);
      return null;
    }

    return entry.result;
  }

  /**
   * Set memoized sort result
   */
  set(items: DirectActionItem[], result: DirectActionItem[]): void {
    const hash = this.generateHash(items);
    this.cache.set(hash, {
      result,
      timestamp: Date.now(),
      inputHash: hash,
    });
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Generate hash from items
   */
  private generateHash(items: DirectActionItem[]): string {
    // Create a simple hash based on item count and item IDs
    const itemIds = items.map((i) => i.id).join(",");
    return itemIds;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 1000); // Run cleanup every minute
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.DEFAULT_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global memoization instances
let globalFilterCache: FilterMemoizationCache | null = null;
let globalSortCache: SortMemoizationCache | null = null;

/**
 * Get or create global filter memoization cache
 */
export function getGlobalFilterCache(): FilterMemoizationCache {
  if (!globalFilterCache) {
    globalFilterCache = new FilterMemoizationCache();
  }
  return globalFilterCache;
}

/**
 * Get or create global sort memoization cache
 */
export function getGlobalSortCache(): SortMemoizationCache {
  if (!globalSortCache) {
    globalSortCache = new SortMemoizationCache();
  }
  return globalSortCache;
}

/**
 * Reset all global memoization caches (useful for testing)
 */
export function resetGlobalMemoizationCaches(): void {
  if (globalFilterCache) {
    globalFilterCache.destroy();
    globalFilterCache = null;
  }
  if (globalSortCache) {
    globalSortCache.destroy();
    globalSortCache = null;
  }
}
