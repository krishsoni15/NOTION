/**
 * Performance Optimization and Caching Tests
 * 
 * Tests for ID caching, memoization, and sorting optimization
 * Validates: Requirements 1.5, 1.7
 */

import {
  IDCacheManager,
  getGlobalIDCache,
  resetGlobalIDCache,
} from "../id-cache";
import {
  FilterMemoizationCache,
  SortMemoizationCache,
  getGlobalFilterCache,
  getGlobalSortCache,
  resetGlobalMemoizationCaches,
} from "../memoization";
import {
  sortByDateOptimized,
  insertIntoSortedList,
  removeFromSortedList,
  updateInSortedList,
  partitionItems,
  getTopItems,
  getItemsInRange,
  measureSortingPerformance,
} from "../sorting-optimization";
import { generateStandardizedId, formatEntityId, filterDirectActions } from "../utils";
import type { DirectActionItem, DirectActionFilters } from "../types";

// Helper to create mock items
function createMockItem(
  id: string,
  type: "cc" | "dc" | "po",
  createdAt: number,
  status: string = "draft"
): DirectActionItem {
  return {
    id,
    type,
    displayId: `${type.toUpperCase()}-001`,
    customTitle: `Test ${type.toUpperCase()}`,
    status,
    createdDate: createdAt,
    createdBy: "test-user" as any,
    isDirect: true,
    rawData: { _id: id, createdAt, status } as any,
  };
}

// Helper to create large dataset
function createLargeDataset(count: number): DirectActionItem[] {
  const items: DirectActionItem[] = [];
  for (let i = 0; i < count; i++) {
    const type = ["cc", "dc", "po"][i % 3] as "cc" | "dc" | "po";
    items.push(
      createMockItem(
        `item-${i}`,
        type,
        Date.now() - i * 1000,
        ["draft", "pending", "approved"][i % 3]
      )
    );
  }
  return items;
}

export const performanceOptimizationTests = {
  // ID Cache Tests
  "ID Cache: Should cache generated IDs": () => {
    resetGlobalIDCache();
    const cache = getGlobalIDCache();
    
    cache.set("entity1", "cc", "CC-001");
    const result = cache.get("entity1", "cc");
    
    if (result !== "CC-001") {
      throw new Error(`Expected CC-001, got ${result}`);
    }
  },

  "ID Cache: Should return null for non-existent entries": () => {
    resetGlobalIDCache();
    const cache = getGlobalIDCache();
    
    const result = cache.get("non-existent", "cc");
    
    if (result !== null) {
      throw new Error(`Expected null, got ${result}`);
    }
  },

  "ID Cache: Should clear specific entries": () => {
    resetGlobalIDCache();
    const cache = getGlobalIDCache();
    
    cache.set("entity1", "cc", "CC-001");
    cache.clear("entity1", "cc");
    const result = cache.get("entity1", "cc");
    
    if (result !== null) {
      throw new Error(`Expected null after clear, got ${result}`);
    }
  },

  "ID Cache: Should clear all entries": () => {
    resetGlobalIDCache();
    const cache = getGlobalIDCache();
    
    cache.set("entity1", "cc", "CC-001");
    cache.set("entity2", "po", "PO-001");
    cache.clearAll();
    
    if (cache.getSize() !== 0) {
      throw new Error(`Expected cache size 0, got ${cache.getSize()}`);
    }
  },

  "ID Cache: Should track cache statistics": () => {
    resetGlobalIDCache();
    const cache = getGlobalIDCache();
    
    cache.set("entity1", "cc", "CC-001");
    cache.set("entity2", "po", "PO-001");
    
    const stats = cache.getStats();
    
    if (stats.size !== 2) {
      throw new Error(`Expected cache size 2, got ${stats.size}`);
    }
    if (stats.entries.length !== 2) {
      throw new Error(`Expected 2 entries, got ${stats.entries.length}`);
    }
  },

  // Filter Memoization Tests
  "Filter Memoization: Should cache filter results": () => {
    resetGlobalMemoizationCaches();
    const cache = getGlobalFilterCache();
    
    const items = [
      createMockItem("item1", "cc", Date.now()),
      createMockItem("item2", "po", Date.now() - 1000),
    ];
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };
    
    const result = [items[0]];
    cache.set(items, filters, result);
    
    const cached = cache.get(items, filters);
    
    if (!cached || cached.length !== 1 || cached[0].id !== "item1") {
      throw new Error("Filter memoization cache failed");
    }
  },

  "Filter Memoization: Should return null for non-existent entries": () => {
    resetGlobalMemoizationCaches();
    const cache = getGlobalFilterCache();
    
    const items = [createMockItem("item1", "cc", Date.now())];
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };
    
    const result = cache.get(items, filters);
    
    if (result !== null) {
      throw new Error(`Expected null, got ${result}`);
    }
  },

  "Filter Memoization: Should clear all entries": () => {
    resetGlobalMemoizationCaches();
    const cache = getGlobalFilterCache();
    
    const items = [createMockItem("item1", "cc", Date.now())];
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };
    
    cache.set(items, filters, items);
    cache.clearAll();
    
    if (cache.getSize() !== 0) {
      throw new Error(`Expected cache size 0, got ${cache.getSize()}`);
    }
  },

  // Sort Memoization Tests
  "Sort Memoization: Should cache sort results": () => {
    resetGlobalMemoizationCaches();
    const cache = getGlobalSortCache();
    
    const items = [
      createMockItem("item1", "cc", Date.now() - 2000),
      createMockItem("item2", "po", Date.now()),
      createMockItem("item3", "dc", Date.now() - 1000),
    ];
    
    const sorted = [items[1], items[2], items[0]]; // Newest first
    cache.set(items, sorted);
    
    const cached = cache.get(items);
    
    if (!cached || cached.length !== 3 || cached[0].id !== "item2") {
      throw new Error("Sort memoization cache failed");
    }
  },

  "Sort Memoization: Should clear all entries": () => {
    resetGlobalMemoizationCaches();
    const cache = getGlobalSortCache();
    
    const items = [createMockItem("item1", "cc", Date.now())];
    cache.set(items, items);
    cache.clearAll();
    
    if (cache.getSize() !== 0) {
      throw new Error(`Expected cache size 0, got ${cache.getSize()}`);
    }
  },

  // Sorting Optimization Tests
  "Sorting: Should sort items by date (newest first)": () => {
    resetGlobalMemoizationCaches();
    
    const items = [
      createMockItem("item1", "cc", Date.now() - 2000),
      createMockItem("item2", "po", Date.now()),
      createMockItem("item3", "dc", Date.now() - 1000),
    ];
    
    const sorted = sortByDateOptimized(items);
    
    if (sorted[0].id !== "item2" || sorted[1].id !== "item3" || sorted[2].id !== "item1") {
      throw new Error("Sorting order incorrect");
    }
  },

  "Sorting: Should use cache for identical datasets": () => {
    resetGlobalMemoizationCaches();
    
    const items = [
      createMockItem("item1", "cc", Date.now() - 2000),
      createMockItem("item2", "po", Date.now()),
    ];
    
    const sorted1 = sortByDateOptimized(items);
    const sorted2 = sortByDateOptimized(items);
    
    // Should be same reference if cached
    if (sorted1 !== sorted2) {
      throw new Error("Cache not being used for identical datasets");
    }
  },

  "Sorting: Should insert item into sorted list": () => {
    const items = [
      createMockItem("item1", "cc", Date.now()),
      createMockItem("item3", "po", Date.now() - 2000),
    ];
    
    const newItem = createMockItem("item2", "dc", Date.now() - 1000);
    const result = insertIntoSortedList(items, newItem);
    
    if (result.length !== 3 || result[1].id !== "item2") {
      throw new Error("Item insertion failed");
    }
  },

  "Sorting: Should remove item from sorted list": () => {
    const items = [
      createMockItem("item1", "cc", Date.now()),
      createMockItem("item2", "po", Date.now() - 1000),
      createMockItem("item3", "dc", Date.now() - 2000),
    ];
    
    const result = removeFromSortedList(items, "item2");
    
    if (result.length !== 2 || result.some((i) => i.id === "item2")) {
      throw new Error("Item removal failed");
    }
  },

  "Sorting: Should update item in sorted list": () => {
    const items = [
      createMockItem("item1", "cc", Date.now()),
      createMockItem("item2", "po", Date.now() - 1000),
    ];
    
    const updatedItem = createMockItem("item2", "po", Date.now() - 1000);
    updatedItem.customTitle = "Updated Title";
    
    const result = updateInSortedList(items, updatedItem);
    
    if (result[1].customTitle !== "Updated Title") {
      throw new Error("Item update failed");
    }
  },

  "Sorting: Should partition items into chunks": () => {
    const items = createLargeDataset(10);
    const chunks = partitionItems(items, 3);
    
    if (chunks.length !== 4) {
      throw new Error(`Expected 4 chunks, got ${chunks.length}`);
    }
    if (chunks[0].length !== 3 || chunks[3].length !== 1) {
      throw new Error("Chunk sizes incorrect");
    }
  },

  "Sorting: Should get top N items": () => {
    resetGlobalMemoizationCaches();
    
    const items = createLargeDataset(10);
    const top5 = getTopItems(items, 5);
    
    if (top5.length !== 5) {
      throw new Error(`Expected 5 items, got ${top5.length}`);
    }
  },

  "Sorting: Should get items in range": () => {
    resetGlobalMemoizationCaches();
    
    const items = createLargeDataset(10);
    const range = getItemsInRange(items, 2, 3);
    
    if (range.length !== 3) {
      throw new Error(`Expected 3 items, got ${range.length}`);
    }
  },

  // Performance Tests with Large Datasets
  "Performance: Should handle 1000+ documents efficiently": () => {
    resetGlobalMemoizationCaches();
    
    const items = createLargeDataset(1000);
    
    const startTime = performance.now();
    const sorted = sortByDateOptimized(items);
    const endTime = performance.now();
    
    const sortTime = endTime - startTime;
    
    if (sorted.length !== 1000) {
      throw new Error(`Expected 1000 items, got ${sorted.length}`);
    }
    
    // Should complete in reasonable time (< 100ms for 1000 items)
    if (sortTime > 100) {
      throw new Error(`Sorting took too long: ${sortTime}ms`);
    }
  },

  "Performance: Should cache results for 1000+ documents": () => {
    resetGlobalMemoizationCaches();
    
    const items = createLargeDataset(1000);
    
    // First sort
    const startTime1 = performance.now();
    const sorted1 = sortByDateOptimized(items);
    const endTime1 = performance.now();
    const firstSortTime = endTime1 - startTime1;
    
    // Second sort (should use cache)
    const startTime2 = performance.now();
    const sorted2 = sortByDateOptimized(items);
    const endTime2 = performance.now();
    const secondSortTime = endTime2 - startTime2;
    
    // Cached sort should be significantly faster
    if (secondSortTime >= firstSortTime * 0.5) {
      throw new Error(
        `Cache not providing performance benefit: first=${firstSortTime}ms, second=${secondSortTime}ms`
      );
    }
  },

  "Performance: Should filter 1000+ documents efficiently": () => {
    resetGlobalMemoizationCaches();
    
    const items = createLargeDataset(1000);
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };
    
    const startTime = performance.now();
    const filtered = filterDirectActions(items, filters);
    const endTime = performance.now();
    
    const filterTime = endTime - startTime;
    
    // Should complete in reasonable time (< 50ms for 1000 items)
    if (filterTime > 50) {
      throw new Error(`Filtering took too long: ${filterTime}ms`);
    }
  },

  "Performance: Should cache filter results for 1000+ documents": () => {
    resetGlobalMemoizationCaches();
    
    const items = createLargeDataset(1000);
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };
    
    // First filter
    const startTime1 = performance.now();
    const filtered1 = filterDirectActions(items, filters);
    const endTime1 = performance.now();
    const firstFilterTime = endTime1 - startTime1;
    
    // Second filter (should use cache)
    const startTime2 = performance.now();
    const filtered2 = filterDirectActions(items, filters);
    const endTime2 = performance.now();
    const secondFilterTime = endTime2 - startTime2;
    
    // Cached filter should be significantly faster
    if (secondFilterTime >= firstFilterTime * 0.5) {
      throw new Error(
        `Cache not providing performance benefit: first=${firstFilterTime}ms, second=${secondFilterTime}ms`
      );
    }
  },

  "Performance: Should measure sorting metrics": () => {
    resetGlobalMemoizationCaches();
    
    const items = createLargeDataset(100);
    
    const metrics = measureSortingPerformance(items);
    
    if (metrics.itemCount !== 100) {
      throw new Error(`Expected 100 items, got ${metrics.itemCount}`);
    }
    if (metrics.sortTime < 0) {
      throw new Error("Sort time should be positive");
    }
    if (metrics.cacheHit !== false) {
      throw new Error("First sort should not be a cache hit");
    }
  },

  "Performance: Should show cache hit in metrics": () => {
    resetGlobalMemoizationCaches();
    
    const items = createLargeDataset(100);
    
    // First measurement
    measureSortingPerformance(items);
    
    // Second measurement (should be cache hit)
    const metrics = measureSortingPerformance(items);
    
    if (metrics.cacheHit !== true) {
      throw new Error("Second sort should be a cache hit");
    }
  },

  "Performance: Should integrate caching with formatEntityId": () => {
    resetGlobalIDCache();
    
    const mockCCs = [
      { _id: "cc1", createdAt: 1000 },
      { _id: "cc2", createdAt: 2000 },
    ];
    
    // First call - should generate and cache
    const id1 = formatEntityId(mockCCs[0], "cc", mockCCs);
    
    // Second call - should use cache
    const id2 = formatEntityId(mockCCs[0], "cc", mockCCs);
    
    if (id1 !== "CC-001" || id2 !== "CC-001") {
      throw new Error("formatEntityId caching failed");
    }
    
    const cache = getGlobalIDCache();
    if (cache.getSize() !== 1) {
      throw new Error("Cache should have 1 entry");
    }
  },
};

// Run all tests
export function runPerformanceOptimizationTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  Object.entries(performanceOptimizationTests).forEach(([name, test]) => {
    try {
      test();
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    } catch (error: any) {
      results.push({ name, passed: false, error: error.message });
      console.error(`✗ ${name}: ${error.message}`);
    }
  });

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`\n${passed}/${total} tests passed`);

  return results;
}
