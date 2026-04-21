#!/usr/bin/env node

/**
 * Standalone Test Runner for Filters and Search Integration Tests
 * 
 * Tests for filter and search functionality in Direct Actions
 * Validates: Requirements 8.3, 8.4
 */

// ============================================================================
// Helper Functions
// ============================================================================

function createMockItem(
  type,
  status,
  displayId,
  customTitle,
  isDirect = true,
  requestId = undefined
) {
  const rawData = {
    _id: `${type}-1`,
    isDirect,
    requestId,
  };

  // For DC items, set poId based on isDirect
  if (type === "dc") {
    rawData.poId = isDirect ? undefined : "po-1";
  }

  return {
    id: `${type}-${displayId}`,
    type,
    displayId,
    customTitle,
    status,
    createdDate: Date.now(),
    createdBy: "test-user",
    isDirect,
    requestId,
    rawData,
  };
}

function isDirect(entity, type) {
  switch (type) {
    case "po":
      return entity.isDirect === true || !entity.requestId;
    case "dc":
      return !entity.poId;
    case "cc":
      return !entity.requestId;
    default:
      return false;
  }
}

function filterDirectActions(items, filters) {
  return items.filter((item) => {
    // Entity type filter
    if (filters.entityType !== "all" && item.type !== filters.entityType) {
      return false;
    }

    // Action type filter
    if (filters.actionType !== "all") {
      const isDirectItem = isDirect(item.rawData, item.type);
      if (filters.actionType === "direct" && !isDirectItem) {
        return false;
      }
      if (filters.actionType === "request-based" && isDirectItem) {
        return false;
      }
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const fullTitle = item.customTitle
        ? `${item.displayId} | ${item.customTitle}`
        : item.displayId;

      if (
        !fullTitle.toLowerCase().includes(query) &&
        !item.displayId.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Status filter
    if (filters.statusFilter && item.status !== filters.statusFilter) {
      return false;
    }

    return true;
  });
}

// ============================================================================
// Test Data
// ============================================================================

const testItems = [
  // Direct CCs
  createMockItem("cc", "draft", "CC-001", "Direct CC Draft", true),
  createMockItem("cc", "cc_pending", "CC-002", "Direct CC Pending", true),
  createMockItem("cc", "cc_approved", "CC-003", "Direct CC Approved", true),

  // Request-based CCs
  createMockItem("cc", "draft", "CC-004", "Request CC Draft", false, "req-1"),
  createMockItem("cc", "cc_pending", "CC-005", "Request CC Pending", false, "req-2"),

  // Direct DCs
  createMockItem("dc", "pending", "DC-001", "Direct DC Pending", true),
  createMockItem("dc", "delivered", "DC-002", "Direct DC Delivered", true),
  createMockItem("dc", "cancelled", "DC-003", "Direct DC Cancelled", true),

  // Request-based DCs
  createMockItem("dc", "pending", "DC-004", "Request DC Pending", false, "req-3"),
  createMockItem("dc", "delivered", "DC-005", "Request DC Delivered", false, "req-4"),

  // Direct POs
  createMockItem("po", "pending_approval", "PO-001", "Direct PO Pending", true),
  createMockItem("po", "approved", "PO-002", "Direct PO Approved", true),
  createMockItem("po", "ordered", "PO-003", "Direct PO Ordered", true),

  // Request-based POs
  createMockItem("po", "pending_approval", "PO-004", "Request PO Pending", false, "req-5"),
  createMockItem("po", "approved", "PO-005", "Request PO Approved", false, "req-6"),
];

// ============================================================================
// Test Suites
// ============================================================================

const typeFilterTests = {
  "Type filter 'all' should return all items": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== testItems.length) {
      throw new Error(`Expected ${testItems.length} items, got ${result.length}`);
    }
  },

  "Type filter 'cc' should return only CC items": () => {
    const filters = {
      entityType: "cc",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 5;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} CC items, got ${result.length}`);
    }
    if (!result.every((item) => item.type === "cc")) {
      throw new Error("All items should be of type 'cc'");
    }
  },

  "Type filter 'dc' should return only DC items": () => {
    const filters = {
      entityType: "dc",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 5;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} DC items, got ${result.length}`);
    }
    if (!result.every((item) => item.type === "dc")) {
      throw new Error("All items should be of type 'dc'");
    }
  },

  "Type filter 'po' should return only PO items": () => {
    const filters = {
      entityType: "po",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 5;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} PO items, got ${result.length}`);
    }
    if (!result.every((item) => item.type === "po")) {
      throw new Error("All items should be of type 'po'");
    }
  },
};

const sourceFilterTests = {
  "Source filter 'all' should return all items": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== testItems.length) {
      throw new Error(`Expected ${testItems.length} items, got ${result.length}`);
    }
  },

  "Source filter 'direct' should return only direct items": () => {
    const filters = {
      entityType: "all",
      actionType: "direct",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 9;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} direct items, got ${result.length}`);
    }
    if (!result.every((item) => item.isDirect)) {
      throw new Error("All items should be direct");
    }
  },

  "Source filter 'request-based' should return only request-based items": () => {
    const filters = {
      entityType: "all",
      actionType: "request-based",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 6;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} request-based items, got ${result.length}`);
    }
    if (result.some((item) => item.isDirect)) {
      throw new Error("No items should be direct");
    }
  },
};

const searchQueryTests = {
  "Search by ID should find matching items": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "CC-001",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== 1) {
      throw new Error(`Expected 1 item, got ${result.length}`);
    }
    if (result[0].displayId !== "CC-001") {
      throw new Error(`Expected CC-001, got ${result[0].displayId}`);
    }
  },

  "Search by title should find matching items": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "Direct CC Draft",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== 1) {
      throw new Error(`Expected 1 item, got ${result.length}`);
    }
    if (result[0].customTitle !== "Direct CC Draft") {
      throw new Error(`Expected 'Direct CC Draft', got ${result[0].customTitle}`);
    }
  },

  "Search should be case-insensitive": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "direct cc draft",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== 1) {
      throw new Error(`Expected 1 item, got ${result.length}`);
    }
    if (result[0].customTitle !== "Direct CC Draft") {
      throw new Error(`Expected 'Direct CC Draft', got ${result[0].customTitle}`);
    }
  },

  "Search should find partial matches in ID": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "CC-",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 5;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items, got ${result.length}`);
    }
  },

  "Search should find partial matches in title": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "Pending",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 6;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items, got ${result.length}`);
    }
  },

  "Search with empty query should return all items": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== testItems.length) {
      throw new Error(`Expected ${testItems.length} items, got ${result.length}`);
    }
  },

  "Search with no query should return all items": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== testItems.length) {
      throw new Error(`Expected ${testItems.length} items, got ${result.length}`);
    }
  },
};

const filterCombinationTests = {
  "Type filter CC + Source filter direct should work together": () => {
    const filters = {
      entityType: "cc",
      actionType: "direct",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 3;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items, got ${result.length}`);
    }
    if (!result.every((item) => item.type === "cc" && item.isDirect)) {
      throw new Error("All items should be CC and direct");
    }
  },

  "Type filter DC + Source filter request-based should work together": () => {
    const filters = {
      entityType: "dc",
      actionType: "request-based",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 2;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items, got ${result.length}`);
    }
    if (!result.every((item) => item.type === "dc" && !item.isDirect)) {
      throw new Error("All items should be DC and request-based");
    }
  },

  "Type filter PO + Source filter direct + Search should work together": () => {
    const filters = {
      entityType: "po",
      actionType: "direct",
      searchQuery: "PO-002",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== 1) {
      throw new Error(`Expected 1 item, got ${result.length}`);
    }
    if (result[0].displayId !== "PO-002" || !result[0].isDirect) {
      throw new Error("Should find PO-002 direct item");
    }
  },

  "Type filter CC + Search should work together": () => {
    const filters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "Approved",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 1;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} item, got ${result.length}`);
    }
    if (result[0].displayId !== "CC-003") {
      throw new Error("Should find CC-003");
    }
  },

  "Source filter direct + Search should work together": () => {
    const filters = {
      entityType: "all",
      actionType: "direct",
      searchQuery: "Delivered",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 1;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} item, got ${result.length}`);
    }
    if (result[0].displayId !== "DC-002") {
      throw new Error("Should find DC-002");
    }
  },

  "All filters combined should work together": () => {
    const filters = {
      entityType: "dc",
      actionType: "direct",
      searchQuery: "Pending",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 1;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} item, got ${result.length}`);
    }
    if (result[0].displayId !== "DC-001") {
      throw new Error("Should find DC-001");
    }
  },

  "No results should return empty array": () => {
    const filters = {
      entityType: "cc",
      actionType: "direct",
      searchQuery: "NonExistent",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== 0) {
      throw new Error(`Expected 0 items, got ${result.length}`);
    }
  },
};

const edgeCaseTests = {
  "Items without custom title should still be searchable by ID": () => {
    const itemWithoutTitle = createMockItem("cc", "draft", "CC-999", undefined, true);
    const items = [itemWithoutTitle];
    const filters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "CC-999",
    };
    const result = filterDirectActions(items, filters);
    if (result.length !== 1) {
      throw new Error(`Expected 1 item, got ${result.length}`);
    }
  },

  "Search should work with special characters in title": () => {
    const itemWithSpecialChars = createMockItem(
      "cc",
      "draft",
      "CC-100",
      "Item (Special) & Title",
      true
    );
    const items = [itemWithSpecialChars];
    const filters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "Special",
    };
    const result = filterDirectActions(items, filters);
    if (result.length !== 1) {
      throw new Error(`Expected 1 item, got ${result.length}`);
    }
  },

  "Empty items array should return empty result": () => {
    const filters = {
      entityType: "all",
      actionType: "all",
    };
    const result = filterDirectActions([], filters);
    if (result.length !== 0) {
      throw new Error(`Expected 0 items, got ${result.length}`);
    }
  },

  "Filter should not modify original items array": () => {
    const originalLength = testItems.length;
    const filters = {
      entityType: "cc",
      actionType: "direct",
    };
    filterDirectActions(testItems, filters);
    if (testItems.length !== originalLength) {
      throw new Error("Original items array was modified");
    }
  },
};

// ============================================================================
// Test Runner
// ============================================================================

function runTests() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   Filters and Search Integration Tests                     ║");
  console.log("║   Validates: Requirements 8.3, 8.4                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  let totalPassed = 0;
  let totalFailed = 0;

  // Run Type Filter Tests
  console.log("--- Type Filter Tests ---");
  for (const [testName, testFn] of Object.entries(typeFilterTests)) {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      totalPassed++;
    } catch (error) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error.message}`);
      totalFailed++;
    }
  }

  // Run Source Filter Tests
  console.log("\n--- Source Filter Tests ---");
  for (const [testName, testFn] of Object.entries(sourceFilterTests)) {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      totalPassed++;
    } catch (error) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error.message}`);
      totalFailed++;
    }
  }

  // Run Search Query Tests
  console.log("\n--- Search Query Tests ---");
  for (const [testName, testFn] of Object.entries(searchQueryTests)) {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      totalPassed++;
    } catch (error) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error.message}`);
      totalFailed++;
    }
  }

  // Run Filter Combination Tests
  console.log("\n--- Filter Combination Tests ---");
  for (const [testName, testFn] of Object.entries(filterCombinationTests)) {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      totalPassed++;
    } catch (error) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error.message}`);
      totalFailed++;
    }
  }

  // Run Edge Case Tests
  console.log("\n--- Edge Case Tests ---");
  for (const [testName, testFn] of Object.entries(edgeCaseTests)) {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      totalPassed++;
    } catch (error) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error.message}`);
      totalFailed++;
    }
  }

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   TEST RESULTS                                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\nTotal Tests: ${totalPassed + totalFailed}`);
  console.log(`✓ Passed: ${totalPassed}`);
  console.log(`✗ Failed: ${totalFailed}`);

  if (totalFailed === 0) {
    console.log(
      "\n🎉 All tests passed! Filters and search functionality is working correctly.\n"
    );
  } else {
    console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review the errors above.\n`);
  }

  return {
    passed: totalPassed,
    failed: totalFailed,
    allPassed: totalFailed === 0,
  };
}

// Run tests
runTests();
