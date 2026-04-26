/**
 * ID Caching Service
 * 
 * Provides in-memory caching for generated IDs to reduce database queries
 * and improve performance with large datasets
 */

interface CacheEntry {
  id: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface IDCacheEntry extends CacheEntry {
  formattedId: string;
}

/**
 * ID Cache Manager
 * Manages caching of generated IDs with TTL support
 */
export class IDCacheManager {
  private cache: Map<string, IDCacheEntry> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttl: number = this.DEFAULT_TTL) {
    this.DEFAULT_TTL = ttl;
    this.startCleanupInterval();
  }

  /**
   * Get cached ID if it exists and hasn't expired
   */
  get(entityId: string, type: string): string | null {
    const cacheKey = this.getCacheKey(entityId, type);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.formattedId;
  }

  /**
   * Set cached ID
   */
  set(entityId: string, type: string, formattedId: string): void {
    const cacheKey = this.getCacheKey(entityId, type);
    this.cache.set(cacheKey, {
      id: cacheKey,
      formattedId,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL,
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(entityId: string, type: string): void {
    const cacheKey = this.getCacheKey(entityId, type);
    this.cache.delete(cacheKey);
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
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl,
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Generate cache key from entity ID and type
   */
  private getCacheKey(entityId: string, type: string): string {
    return `${type}:${entityId}`;
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
      if (now - entry.timestamp > entry.ttl) {
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

// Global cache instance
let globalIDCache: IDCacheManager | null = null;

/**
 * Get or create global ID cache instance
 */
export function getGlobalIDCache(): IDCacheManager {
  if (!globalIDCache) {
    globalIDCache = new IDCacheManager();
  }
  return globalIDCache;
}

/**
 * Reset global cache (useful for testing)
 */
export function resetGlobalIDCache(): void {
  if (globalIDCache) {
    globalIDCache.destroy();
    globalIDCache = null;
  }
}
