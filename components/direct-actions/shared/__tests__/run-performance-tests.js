/**
 * Performance Optimization Tests Runner (JavaScript)
 * 
 * Runs all performance optimization and caching tests
 */

// Mock implementation for testing without TypeScript compilation
class IDCacheManager {
  constructor(ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.DEFAULT_TTL = ttl;
    this.startCleanupInterval();
  }

  get(entityId, type) {
    const cacheKey = `${type}:${entityId}`;
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.formattedId;
  }

  set(entityId, type, formattedId) {
    const cacheKey = `${type}:${entityId}`;
    this.cache.set(cacheKey, {
      id: cacheKey,
      formattedId,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL,
    });
  }

  clear(entityId, type) {
    const cacheKey = `${type}:${entityId}`;
    this.cache.delete(cacheKey);
  }

  clearAll() {
    this.cache.clear();
  }

  getSize() {
    return this.cache.size;
  }

  getStats() {
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

  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 1000);
  }

  cleanupExpiredEntries() {
    const now = Date.now();
    const keysToDelete = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

class FilterMemoizationCache {
  constructor(ttl = 30 * 1000) {
    this.cache = new Map();
    this.DEFAULT_TTL = ttl;
    this.startCleanupInterval();
  }

  get(items, filters) {
    const hash = this.generateHash(items, filters);
    const entry = this.cache.get(hash);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.DEFAULT_TTL) {
      this.cache.delete(hash);
      return null;
    }

    return entry.result;
  }

  set(items, filters, result) {
    const hash = this.generateHash(items, filters);
    this.cache.set(hash, {
      result,
      timestamp: Date.now(),
      inputHash: hash,
    });
  }

  clearAll() {
    this.cache.clear();
  }

  getSize() {
    return this.cache.size;
  }

  generateHash(items, filters) {
    const itemIds = items.map((i) => i.id).join(",");
    const filterStr = JSON.stringify(filters);
    return `${itemIds}|${filterStr}`;
  }

  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 1000);
  }

  cleanupExpiredEntries() {
    const now = Date.now();
    const keysToDelete = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.DEFAULT_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

class SortMemoizationCache {
  constructor(ttl = 30 * 1000) {
    this.cache = new Map();
    this.DEFAULT_TTL = ttl;
    this.startCleanupInterval();
  }

  get(items) {
    const hash = this.generateHash(items);
    const entry = this.cache.get(hash);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.DEFAULT_TTL) {
      this.cache.delete(hash);
      return null;
    }

    return entry.result;
  }

  set(items, result) {
    const hash = this.generateHash(items);
    this.cache.set(hash, {
      result,
      timestamp: Date.now(),
      inputHash: hash,
    });
  }

  clearAll() {
    this.cache.clear();
  }

  getSize() {
    return this.cache.size;
  }

  generateHash(items) {
    const itemIds = items.map((i) => i.id).join(",");
    return itemIds;
  }

  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 1000);
  }

  cleanupExpiredEntries() {
    const now = Date.now();
    const keysToDelete = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.DEFAULT_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global instances
let globalIDCache = null;
let globalFilterCache = null;
let globalSortCache = null;

function getGlobalIDCache() {
  if (!globalIDCache) {
    globalIDCache = new IDCacheManager();
  }
  return globalIDCache;
}

function resetGlobalIDCache() {
  if (globalIDCache) {
    globalIDCache.destroy();
    globalIDCache = null;
  }
}

function getGlobalFilterCache() {
  if (!globalFilterCache) {
    globalFilterCache = new FilterMemoizationCache();
  }
  return globalFilterCache;
}

function getGlobalSortCache() {
  if (!globalSortCache) {
    globalSortCache = new SortMemoizationCache();
  }
  return globalSortCache;
}

function resetGlobalMemoizationCaches() {
  if (globalFilterCache) {
    globalFilterCache.destroy();
    globalFilterCache = null;
  }
  if (globalSortCache) {
    globalSortCache.destroy();
    globalSortCache = null;
  }
}

// Helper functions
function createMockItem(id, type, createdAt, status = "draft") {
  return {
    id,
    type,
    displayId: `${type.toUpperCase()}-001`,
    customTitle: `Test ${type.toUpperCase()}`,
    status,
    createdDate: createdAt,
    createdBy: "test-user",
    isDirect: true,
    rawData: { _id: id, createdAt, status },
  };
}

function createLargeDataset(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const type = ["cc", "dc", "po"][i % 3];
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

function sortByDateOptimized(items) {
  const sortCache = getGlobalSortCache();
  const cachedResult = sortCache.get(items);

  if (cachedResult) {
    return cachedResult;
  }

  const sorted = [...items].sort((a, b) => b.createdDate - a.createdDate);
  sortCache.set(items, sorted);

  return sorted;
}

function insertIntoSortedList(sortedItems, newItem) {
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

  const result = [...sortedItems];
  result.splice(left, 0, newItem);

  return result;
}

function removeFromSortedList(sortedItems, itemId) {
  return sortedItems.filter((item) => item.id !== itemId);
}

function updateInSortedList(sortedItems, updatedItem) {
  const index = sortedItems.findIndex((item) => item.id === updatedItem.id);

  if (index === -1) {
    return sortedItems;
  }

  if (sortedItems[index].createdDate === updatedItem.createdDate) {
    const result = [...sortedItems];
    result[index] = updatedItem;
    return result;
  }

  const withoutItem = sortedItems.filter((item) => item.id !== updatedItem.id);
  return insertIntoSortedList(withoutItem, updatedItem);
}

function partitionItems(items, chunkSize) {
  const chunks = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  return chunks;
}

function getTopItems(items, limit) {
  const sorted = sortByDateOptimized(items);
  return sorted.slice(0, limit);
}

function getItemsInRange(items, offset, limit) {
  const sorted = sortByDateOptimized(items);
  return sorted.slice(offset, offset + limit);
}

function measureSortingPerformance(items) {
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

// Tests
const tests = {
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

  "Filter Memoization: Should cache filter results": () => {
    resetGlobalMemoizationCaches();
    const cache = getGlobalFilterCache();

    const items = [
      createMockItem("item1", "cc", Date.now()),
      createMockItem("item2", "po", Date.now() - 1000),
    ];
    const filters = {
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
    const filters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };

    const result = cache.get(items, filters);

    if (result !== null) {
      throw new Error(`Expected null, got ${result}`);
    }
  },

  "Sort Memoization: Should cache sort results": () => {
    resetGlobalMemoizationCaches();
    const cache = getGlobalSortCache();

    const items = [
      createMockItem("item1", "cc", Date.now() - 2000),
      createMockItem("item2", "po", Date.now()),
      createMockItem("item3", "dc", Date.now() - 1000),
    ];

    const sorted = [items[1], items[2], items[0]];
    cache.set(items, sorted);

    const cached = cache.get(items);

    if (!cached || cached.length !== 3 || cached[0].id !== "item2") {
      throw new Error("Sort memoization cache failed");
    }
  },

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

    if (sortTime > 100) {
      throw new Error(`Sorting took too long: ${sortTime}ms`);
    }
  },

  "Performance: Should cache results for 1000+ documents": () => {
    resetGlobalMemoizationCaches();

    const items = createLargeDataset(1000);

    const startTime1 = performance.now();
    const sorted1 = sortByDateOptimized(items);
    const endTime1 = performance.now();
    const firstSortTime = endTime1 - startTime1;

    const startTime2 = performance.now();
    const sorted2 = sortByDateOptimized(items);
    const endTime2 = performance.now();
    const secondSortTime = endTime2 - startTime2;

    if (secondSortTime >= firstSortTime * 0.5) {
      throw new Error(
        `Cache not providing performance benefit: first=${firstSortTime}ms, second=${secondSortTime}ms`
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

    measureSortingPerformance(items);

    const metrics = measureSortingPerformance(items);

    if (metrics.cacheHit !== true) {
      throw new Error("Second sort should be a cache hit");
    }
  },
};

// Run tests
console.log("=".repeat(60));
console.log("Performance Optimization and Caching Tests");
console.log("=".repeat(60));
console.log("");

const results = [];

Object.entries(tests).forEach(([name, test]) => {
  try {
    test();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error(`✗ ${name}: ${error.message}`);
  }
});

console.log("");
console.log("=".repeat(60));
console.log("Test Summary");
console.log("=".repeat(60));

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log(`Total: ${results.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log("");
  console.log("Failed Tests:");
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  - ${r.name}`);
      console.log(`    Error: ${r.error}`);
    });
  process.exit(1);
} else {
  console.log("");
  console.log("🎉 All tests passed!");
  process.exit(0);
}
