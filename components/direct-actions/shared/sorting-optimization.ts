/**
 * Sorting Optimization Utilities
 * 
 * Provides optimized sorting algorithms for large datasets
 * Uses efficient algorithms and caching to minimize computational overhead
 */

import type { DirectActionItem } from "./types";
import { getGlobalSortCache } from "./memoization";

/**
 * Optimized chronological sorting for large datasets
 * Uses memoization to avoid re-sorting identical datasets
 * 
 * Time Complexity: O(n log n) for first sort, O(1) for cached results
 * Space Complexity: O(n) for cache storage
 */
export function sortByDateOptimized(items: DirectActionItem[]): DirectActionItem[] {
  // Check memoization cache first
  const sortCache = getGlobalSortCache();
  const cachedResult = sortCache.get(items);

  if (cachedResult) {
    return cachedResult;
  }

  // Perform sort using efficient algorithm
  const sorted = [...items].sort((a, b) => b.createdDate - a.createdDate);

  // Store in cache for future use
  sortCache.set(items, sorted);

  return sorted;
}

/**
 * Batch sort multiple arrays efficiently
 * Useful when sorting multiple document types
 */
export function batchSortByDate(
  itemArrays: DirectActionItem[][]
): DirectActionItem[][] {
  return itemArrays.map((items) => sortByDateOptimized(items));
}

/**
 * Incremental sort for adding new items to existing sorted list
 * More efficient than re-sorting entire list when adding single items
 * 
 * Time Complexity: O(n) for insertion, O(1) for cache invalidation
 */
export function insertIntoSortedList(
  sortedItems: DirectActionItem[],
  newItem: DirectActionItem
): DirectActionItem[] {
  // Find insertion point using binary search
  let left = 0;
  let right = sortedItems.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedItems[mid].createdDate > newItem.createdDate) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  // Insert at correct position
  const result = [...sortedItems];
  result.splice(left, 0, newItem);

  return result;
}

/**
 * Remove item from sorted list while maintaining order
 * 
 * Time Complexity: O(n) for removal
 */
export function removeFromSortedList(
  sortedItems: DirectActionItem[],
  itemId: string
): DirectActionItem[] {
  return sortedItems.filter((item) => item.id !== itemId);
}

/**
 * Update item in sorted list while maintaining order
 * If item's date changed, re-sorts; otherwise updates in place
 * 
 * Time Complexity: O(n) worst case, O(1) best case
 */
export function updateInSortedList(
  sortedItems: DirectActionItem[],
  updatedItem: DirectActionItem
): DirectActionItem[] {
  const index = sortedItems.findIndex((item) => item.id === updatedItem.id);

  if (index === -1) {
    return sortedItems;
  }

  // Check if date changed
  if (sortedItems[index].createdDate === updatedItem.createdDate) {
    // Date unchanged, update in place
    const result = [...sortedItems];
    result[index] = updatedItem;
    return result;
  }

  // Date changed, remove and re-insert
  const withoutItem = sortedItems.filter((item) => item.id !== updatedItem.id);
  return insertIntoSortedList(withoutItem, updatedItem);
}

/**
 * Partition items into chunks for batch processing
 * Useful for processing large datasets in manageable chunks
 */
export function partitionItems(
  items: DirectActionItem[],
  chunkSize: number
): DirectActionItem[][] {
  const chunks: DirectActionItem[][] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Get top N items from sorted list
 * Efficient for pagination and limiting results
 * 
 * Time Complexity: O(n) for first call, O(1) for cached results
 */
export function getTopItems(
  items: DirectActionItem[],
  limit: number
): DirectActionItem[] {
  const sorted = sortByDateOptimized(items);
  return sorted.slice(0, limit);
}

/**
 * Get items in range (for pagination)
 * 
 * Time Complexity: O(n) for first call, O(1) for cached results
 */
export function getItemsInRange(
  items: DirectActionItem[],
  offset: number,
  limit: number
): DirectActionItem[] {
  const sorted = sortByDateOptimized(items);
  return sorted.slice(offset, offset + limit);
}

/**
 * Performance metrics for sorting operations
 */
export interface SortingMetrics {
  itemCount: number;
  sortTime: number; // milliseconds
  cacheHit: boolean;
  memoryUsage: number; // bytes
}

/**
 * Measure sorting performance
 */
export function measureSortingPerformance(
  items: DirectActionItem[]
): SortingMetrics {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  const sortCache = getGlobalSortCache();
  const cachedResult = sortCache.get(items);
  const cacheHit = cachedResult !== null;

  const sorted = sortByDateOptimized(items);

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  return {
    itemCount: items.length,
    sortTime: endTime - startTime,
    cacheHit,
    memoryUsage: endMemory - startMemory,
  };
}
