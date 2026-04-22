/**
 * Performance Integration Tests
 * 
 * Tests integration of caching and optimization with DirectActionsSection
 * Validates: Requirements 1.5, 1.7
 */

import {
  combineDirectActions,
} from "../data-fetcher";
import { filterDirectActions, sortByDate } from "../utils";
import { resetGlobalIDCache, getGlobalIDCache } from "../id-cache";
import { resetGlobalMemoizationCaches, getGlobalFilterCache, getGlobalSortCache } from "../memoization";
import type { DirectActionFilters } from "../types";

// Mock data generators
function createMockCC(id: string, createdAt: number, status: string = "draft") {
  return {
    _id: id,
    createdAt,
    updatedAt: createdAt,
    status,
    itemName: `Item ${id}`,
    ccTitle: `CC Title ${id}`,
    createdBy: "test-user",
    vendorQuotes: [],
  } as any;
}

function createMockPO(id: string, createdAt: number, status: string = "approved") {
  return {
    _id: id,
    createdAt,
    status,
    itemDescription: `Item ${id}`,
    customTitle: `PO Title ${id}`,
    createdBy: "test-user",
    isDirect: true,
  } as any;
}

function createMockDC(id: string, createdAt: number, status: string = "pending") {
  return {
    _id: id,
    createdAt,
    status,
    receiverName: `Receiver ${id}`,
    customTitle: `DC Title ${id}`,
    createdBy: "test-user",
  } as any;
}

export const performanceIntegrationTests = {
  "Integration: Should combine and cache IDs for large dataset": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    // Create large dataset
    const ccs = Array.from({ length: 100 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 100 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 100 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    // Combine data
    const combined = combineDirectActions(ccs, pos, dcs);

    if (combined.length !== 300) {
      throw new Error(`Expected 300 items, got ${combined.length}`);
    }

    // Check that IDs are generated
    const ccItems = combined.filter((i) => i.type === "cc");
    if (ccItems.length !== 100) {
      throw new Error(`Expected 100 CCs, got ${ccItems.length}`);
    }

    // Verify IDs are cached
    const cache = getGlobalIDCache();
    if (cache.getSize() === 0) {
      throw new Error("Cache should have entries after combining");
    }
  },

  "Integration: Should use cache when sorting combined data": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    const ccs = Array.from({ length: 50 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 50 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 50 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    const combined = combineDirectActions(ccs, pos, dcs);

    // First sort
    const startTime1 = performance.now();
    const sorted1 = sortByDate(combined);
    const endTime1 = performance.now();
    const firstSortTime = endTime1 - startTime1;

    // Second sort (should use cache)
    const startTime2 = performance.now();
    const sorted2 = sortByDate(combined);
    const endTime2 = performance.now();
    const secondSortTime = endTime2 - startTime2;

    if (sorted1.length !== 150) {
      throw new Error(`Expected 150 items, got ${sorted1.length}`);
    }

    // Verify cache is being used
    const sortCache = getGlobalSortCache();
    if (sortCache.getSize() === 0) {
      throw new Error("Sort cache should have entries");
    }

    // Second sort should be faster
    if (secondSortTime >= firstSortTime * 0.5) {
      throw new Error(
        `Cache not providing benefit: first=${firstSortTime}ms, second=${secondSortTime}ms`
      );
    }
  },

  "Integration: Should use cache when filtering combined data": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    const ccs = Array.from({ length: 50 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 50 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 50 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    const combined = combineDirectActions(ccs, pos, dcs);
    const sorted = sortByDate(combined);

    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };

    // First filter
    const startTime1 = performance.now();
    const filtered1 = filterDirectActions(sorted, filters);
    const endTime1 = performance.now();
    const firstFilterTime = endTime1 - startTime1;

    // Second filter (should use cache)
    const startTime2 = performance.now();
    const filtered2 = filterDirectActions(sorted, filters);
    const endTime2 = performance.now();
    const secondFilterTime = endTime2 - startTime2;

    if (filtered1.length !== 50) {
      throw new Error(`Expected 50 CCs, got ${filtered1.length}`);
    }

    // Verify cache is being used
    const filterCache = getGlobalFilterCache();
    if (filterCache.getSize() === 0) {
      throw new Error("Filter cache should have entries");
    }

    // Second filter should be faster
    if (secondFilterTime >= firstFilterTime * 0.5) {
      throw new Error(
        `Cache not providing benefit: first=${firstFilterTime}ms, second=${secondFilterTime}ms`
      );
    }
  },

  "Integration: Should handle multiple filter combinations with caching": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    const ccs = Array.from({ length: 30 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 30 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 30 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    const combined = combineDirectActions(ccs, pos, dcs);
    const sorted = sortByDate(combined);

    // Apply different filters
    const filters1: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };

    const filters2: DirectActionFilters = {
      entityType: "po",
      actionType: "all",
      searchQuery: "",
    };

    const filters3: DirectActionFilters = {
      entityType: "dc",
      actionType: "all",
      searchQuery: "",
    };

    const filtered1 = filterDirectActions(sorted, filters1);
    const filtered2 = filterDirectActions(sorted, filters2);
    const filtered3 = filterDirectActions(sorted, filters3);

    if (filtered1.length !== 30 || filtered2.length !== 30 || filtered3.length !== 30) {
      throw new Error("Filter results incorrect");
    }

    // Verify all filters are cached
    const filterCache = getGlobalFilterCache();
    if (filterCache.getSize() < 3) {
      throw new Error("Filter cache should have at least 3 entries");
    }

    // Re-apply same filters (should use cache)
    const filtered1Again = filterDirectActions(sorted, filters1);
    const filtered2Again = filterDirectActions(sorted, filters2);
    const filtered3Again = filterDirectActions(sorted, filters3);

    if (
      filtered1Again.length !== 30 ||
      filtered2Again.length !== 30 ||
      filtered3Again.length !== 30
    ) {
      throw new Error("Cached filter results incorrect");
    }
  },

  "Integration: Should maintain cache consistency across operations": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    const ccs = Array.from({ length: 20 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 20 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 20 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    // First combination
    const combined1 = combineDirectActions(ccs, pos, dcs);
    const sorted1 = sortByDate(combined1);

    // Second combination (same data)
    const combined2 = combineDirectActions(ccs, pos, dcs);
    const sorted2 = sortByDate(combined2);

    // Results should be identical
    if (sorted1.length !== sorted2.length) {
      throw new Error("Sorted results have different lengths");
    }

    // Check cache statistics
    const idCache = getGlobalIDCache();
    const sortCache = getGlobalSortCache();

    if (idCache.getSize() === 0) {
      throw new Error("ID cache should have entries");
    }

    if (sortCache.getSize() === 0) {
      throw new Error("Sort cache should have entries");
    }
  },

  "Integration: Should handle large dataset (1000+ items) efficiently": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    // Create large dataset
    const ccs = Array.from({ length: 400 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 400 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 400 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    // Combine and sort
    const startTime = performance.now();
    const combined = combineDirectActions(ccs, pos, dcs);
    const sorted = sortByDate(combined);
    const endTime = performance.now();

    const totalTime = endTime - startTime;

    if (combined.length !== 1200) {
      throw new Error(`Expected 1200 items, got ${combined.length}`);
    }

    // Should complete in reasonable time
    if (totalTime > 200) {
      throw new Error(`Operations took too long: ${totalTime}ms`);
    }

    // Verify caches are populated
    const idCache = getGlobalIDCache();
    const sortCache = getGlobalSortCache();

    if (idCache.getSize() === 0 || sortCache.getSize() === 0) {
      throw new Error("Caches should be populated");
    }
  },

  "Integration: Should provide performance metrics": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    const ccs = Array.from({ length: 50 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 50 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 50 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    const combined = combineDirectActions(ccs, pos, dcs);

    // Get cache statistics
    const idCache = getGlobalIDCache();
    const idStats = idCache.getStats();

    if (idStats.size === 0) {
      throw new Error("ID cache should have entries");
    }

    if (idStats.entries.length === 0) {
      throw new Error("ID cache entries should be tracked");
    }

    // Verify entries have valid metadata
    idStats.entries.forEach((entry) => {
      if (entry.age < 0) {
        throw new Error("Entry age should be non-negative");
      }
      if (entry.ttl <= 0) {
        throw new Error("Entry TTL should be positive");
      }
    });
  },
};

// Run all tests
export function runPerformanceIntegrationTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  Object.entries(performanceIntegrationTests).forEach(([name, test]) => {
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
