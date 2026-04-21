/**
 * Performance Integration Tests Runner
 * 
 * Tests integration of caching with DirectActionsSection workflow
 */

// Mock implementations
class IDCacheManager {
  constructor(ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.DEFAULT_TTL = ttl;
    this.startCleanupInterval();
  }

  get(entityId, type) {
    const cacheKey = `${type}:${entityId}`;
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
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
    return { size: this.cache.size, entries };
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
    if (!entry) return null;
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
    if (!entry) return null;
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

// Mock data generators
function createMockCC(id, createdAt, status = "draft") {
  return {
    _id: id,
    createdAt,
    status,
    itemName: `Item ${id}`,
    ccTitle: `CC Title ${id}`,
    createdBy: "test-user",
  };
}

function createMockPO(id, createdAt, status = "approved") {
  return {
    _id: id,
    createdAt,
    status,
    itemDescription: `Item ${id}`,
    customTitle: `PO Title ${id}`,
    createdBy: "test-user",
    isDirect: true,
  };
}

function createMockDC(id, createdAt, status = "pending") {
  return {
    _id: id,
    createdAt,
    status,
    receiverName: `Receiver ${id}`,
    customTitle: `DC Title ${id}`,
    createdBy: "test-user",
  };
}

function generateStandardizedId(items, currentItem, type) {
  const sortedItems = [...items].sort((a, b) => a.createdAt - b.createdAt);
  const index = sortedItems.findIndex((item) => item._id === currentItem._id);
  const sequentialNumber = (index + 1).toString().padStart(3, "0");
  const prefix = type.toUpperCase();
  return `${prefix}-${sequentialNumber}`;
}

function formatEntityId(entity, type, allItems) {
  const idCache = getGlobalIDCache();
  const cachedId = idCache.get(entity._id, type);

  if (cachedId) {
    return cachedId;
  }

  if (allItems) {
    const formattedId = generateStandardizedId(allItems, entity, type);
    idCache.set(entity._id, type, formattedId);
    return formattedId;
  }

  return `${type.toUpperCase()}-???`;
}

function transformCC(cc, allCCs) {
  const itemName = cc.itemName;
  return {
    id: cc._id,
    type: "cc",
    displayId: formatEntityId(cc, "cc", allCCs),
    customTitle: cc.ccTitle || itemName,
    status: cc.status,
    createdDate: cc.createdAt,
    createdBy: cc.createdBy,
    isDirect: true,
    rawData: cc,
  };
}

function transformPO(po, allPOs) {
  return {
    id: po._id,
    type: "po",
    displayId: formatEntityId(po, "po", allPOs),
    customTitle: po.customTitle || po.itemDescription,
    status: po.status,
    createdDate: po.createdAt,
    createdBy: po.createdBy,
    isDirect: true,
    rawData: po,
  };
}

function transformDC(dc, allDCs) {
  return {
    id: dc._id,
    type: "dc",
    displayId: formatEntityId(dc, "dc", allDCs),
    customTitle: dc.customTitle || dc.receiverName,
    status: dc.status,
    createdDate: dc.createdAt,
    createdBy: dc.createdBy,
    isDirect: true,
    rawData: dc,
  };
}

function combineDirectActions(costComparisons = [], purchaseOrders = [], deliveryChallans = []) {
  const items = [];

  costComparisons.forEach((cc) => {
    items.push(transformCC(cc, costComparisons));
  });

  purchaseOrders.forEach((po) => {
    items.push(transformPO(po, purchaseOrders));
  });

  deliveryChallans.forEach((dc) => {
    items.push(transformDC(dc, deliveryChallans));
  });

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

function filterDirectActions(items, filters) {
  const filterCache = getGlobalFilterCache();
  const cachedResult = filterCache.get(items, filters);

  if (cachedResult) {
    return cachedResult;
  }

  const result = items.filter((item) => {
    if (filters.entityType !== "all" && item.type !== filters.entityType) {
      return false;
    }
    return true;
  });

  filterCache.set(items, filters, result);

  return result;
}

// Tests
const tests = {
  "Integration: Should combine and cache IDs for large dataset": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    const ccs = Array.from({ length: 100 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 100 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 100 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    const combined = combineDirectActions(ccs, pos, dcs);

    if (combined.length !== 300) {
      throw new Error(`Expected 300 items, got ${combined.length}`);
    }

    const ccItems = combined.filter((i) => i.type === "cc");
    if (ccItems.length !== 100) {
      throw new Error(`Expected 100 CCs, got ${ccItems.length}`);
    }

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

    const startTime1 = performance.now();
    const sorted1 = sortByDateOptimized(combined);
    const endTime1 = performance.now();
    const firstSortTime = endTime1 - startTime1;

    const startTime2 = performance.now();
    const sorted2 = sortByDateOptimized(combined);
    const endTime2 = performance.now();
    const secondSortTime = endTime2 - startTime2;

    if (sorted1.length !== 150) {
      throw new Error(`Expected 150 items, got ${sorted1.length}`);
    }

    const sortCache = getGlobalSortCache();
    if (sortCache.getSize() === 0) {
      throw new Error("Sort cache should have entries");
    }

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
    const sorted = sortByDateOptimized(combined);

    const filters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "",
    };

    const startTime1 = performance.now();
    const filtered1 = filterDirectActions(sorted, filters);
    const endTime1 = performance.now();
    const firstFilterTime = endTime1 - startTime1;

    const startTime2 = performance.now();
    const filtered2 = filterDirectActions(sorted, filters);
    const endTime2 = performance.now();
    const secondFilterTime = endTime2 - startTime2;

    if (filtered1.length !== 50) {
      throw new Error(`Expected 50 CCs, got ${filtered1.length}`);
    }

    const filterCache = getGlobalFilterCache();
    if (filterCache.getSize() === 0) {
      throw new Error("Filter cache should have entries");
    }

    if (secondFilterTime >= firstFilterTime * 0.5) {
      throw new Error(
        `Cache not providing benefit: first=${firstFilterTime}ms, second=${secondFilterTime}ms`
      );
    }
  },

  "Integration: Should handle large dataset (1000+ items) efficiently": () => {
    resetGlobalIDCache();
    resetGlobalMemoizationCaches();

    const ccs = Array.from({ length: 400 }, (_, i) =>
      createMockCC(`cc-${i}`, Date.now() - i * 1000)
    );
    const pos = Array.from({ length: 400 }, (_, i) =>
      createMockPO(`po-${i}`, Date.now() - i * 1000)
    );
    const dcs = Array.from({ length: 400 }, (_, i) =>
      createMockDC(`dc-${i}`, Date.now() - i * 1000)
    );

    const startTime = performance.now();
    const combined = combineDirectActions(ccs, pos, dcs);
    const sorted = sortByDateOptimized(combined);
    const endTime = performance.now();

    const totalTime = endTime - startTime;

    if (combined.length !== 1200) {
      throw new Error(`Expected 1200 items, got ${combined.length}`);
    }

    if (totalTime > 200) {
      throw new Error(`Operations took too long: ${totalTime}ms`);
    }

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

    const idCache = getGlobalIDCache();
    const idStats = idCache.getStats();

    if (idStats.size === 0) {
      throw new Error("ID cache should have entries");
    }

    if (idStats.entries.length === 0) {
      throw new Error("ID cache entries should be tracked");
    }

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

// Run tests
console.log("=".repeat(60));
console.log("Performance Integration Tests");
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
  console.log("🎉 All integration tests passed!");
  process.exit(0);
}
