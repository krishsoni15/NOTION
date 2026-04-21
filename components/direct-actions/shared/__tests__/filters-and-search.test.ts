/**
 * Filters and Search Integration Tests
 * 
 * Tests for filter and search functionality in Direct Actions
 * Validates: Requirements 8.3, 8.4
 * 
 * Test Coverage:
 * - Type filter (All/CC/DC/PO) works correctly
 * - Source filter (Direct/Requested) works correctly
 * - Search query filters by ID and title
 * - Filter combinations work together
 */

import { filterDirectActions } from "../utils";
import type { DirectActionItem, DirectActionFilters } from "../types";

// Helper to create mock DirectActionItem
function createMockItem(
  type: "cc" | "dc" | "po",
  status: string,
  displayId: string,
  customTitle?: string,
  isDirect: boolean = true,
  requestId?: string
): DirectActionItem {
  const rawData: any = {
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
    requestId: requestId as any,
    rawData,
  };
}

// Test data: Create a diverse set of items
const testItems: DirectActionItem[] = [
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

// Test Suite: Type Filter Tests
export const typeFilterTests = {
  "Type filter 'all' should return all items": () => {
    const filters: DirectActionFilters = {
      entityType: "all",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== testItems.length) {
      throw new Error(`Expected ${testItems.length} items, got ${result.length}`);
    }
  },

  "Type filter 'cc' should return only CC items": () => {
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 5; // CC-001 to CC-005
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} CC items, got ${result.length}`);
    }
    if (!result.every(item => item.type === "cc")) {
      throw new Error("All items should be of type 'cc'");
    }
  },

  "Type filter 'dc' should return only DC items": () => {
    const filters: DirectActionFilters = {
      entityType: "dc",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 5; // DC-001 to DC-005
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} DC items, got ${result.length}`);
    }
    if (!result.every(item => item.type === "dc")) {
      throw new Error("All items should be of type 'dc'");
    }
  },

  "Type filter 'po' should return only PO items": () => {
    const filters: DirectActionFilters = {
      entityType: "po",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 5; // PO-001 to PO-005
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} PO items, got ${result.length}`);
    }
    if (!result.every(item => item.type === "po")) {
      throw new Error("All items should be of type 'po'");
    }
  },
};

// Test Suite: Source Filter Tests
export const sourceFilterTests = {
  "Source filter 'all' should return all items": () => {
    const filters: DirectActionFilters = {
      entityType: "all",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== testItems.length) {
      throw new Error(`Expected ${testItems.length} items, got ${result.length}`);
    }
  },

  "Source filter 'direct' should return only direct items": () => {
    const filters: DirectActionFilters = {
      entityType: "all",
      actionType: "direct",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 9; // 3 CCs + 3 DCs + 3 POs (direct only)
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} direct items, got ${result.length}`);
    }
    if (!result.every(item => item.isDirect)) {
      throw new Error("All items should be direct");
    }
  },

  "Source filter 'request-based' should return only request-based items": () => {
    const filters: DirectActionFilters = {
      entityType: "all",
      actionType: "request-based",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 6; // 2 CCs + 2 DCs + 2 POs (request-based only)
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} request-based items, got ${result.length}`);
    }
    if (result.some(item => item.isDirect)) {
      throw new Error("No items should be direct");
    }
  },
};

// Test Suite: Search Query Tests
export const searchQueryTests = {
  "Search by ID should find matching items": () => {
    const filters: DirectActionFilters = {
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
    const filters: DirectActionFilters = {
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
    const filters: DirectActionFilters = {
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
    const filters: DirectActionFilters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "CC-",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 5; // All CC items
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items, got ${result.length}`);
    }
  },

  "Search should find partial matches in title": () => {
    const filters: DirectActionFilters = {
      entityType: "all",
      actionType: "all",
      searchQuery: "Pending",
    };
    const result = filterDirectActions(testItems, filters);
    // Should find: CC-002, CC-005, DC-001, DC-004, PO-001, PO-004
    const expectedCount = 6;
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items, got ${result.length}`);
    }
  },

  "Search with empty query should return all items": () => {
    const filters: DirectActionFilters = {
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
    const filters: DirectActionFilters = {
      entityType: "all",
      actionType: "all",
    };
    const result = filterDirectActions(testItems, filters);
    if (result.length !== testItems.length) {
      throw new Error(`Expected ${testItems.length} items, got ${result.length}`);
    }
  },
};

// Test Suite: Filter Combination Tests
export const filterCombinationTests = {
  "Type filter CC + Source filter direct should work together": () => {
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "direct",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 3; // CC-001, CC-002, CC-003 (direct only)
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items, got ${result.length}`);
    }
    if (!result.every(item => item.type === "cc" && item.isDirect)) {
      throw new Error("All items should be CC and direct");
    }
  },

  "Type filter DC + Source filter request-based should work together": () => {
    const filters: DirectActionFilters = {
      entityType: "dc",
      actionType: "request-based",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 2; // DC-004, DC-005 (request-based only)
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} items, got ${result.length}`);
    }
    if (!result.every(item => item.type === "dc" && !item.isDirect)) {
      throw new Error("All items should be DC and request-based");
    }
  },

  "Type filter PO + Source filter direct + Search should work together": () => {
    const filters: DirectActionFilters = {
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
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "all",
      searchQuery: "Approved",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 1; // CC-003
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} item, got ${result.length}`);
    }
    if (result[0].displayId !== "CC-003") {
      throw new Error("Should find CC-003");
    }
  },

  "Source filter direct + Search should work together": () => {
    const filters: DirectActionFilters = {
      entityType: "all",
      actionType: "direct",
      searchQuery: "Delivered",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 2; // DC-002, PO-002 (direct only, but PO-002 is "Approved" not "Delivered")
    // Actually should be DC-002 only
    if (result.length !== 1) {
      throw new Error(`Expected 1 item, got ${result.length}`);
    }
    if (result[0].displayId !== "DC-002") {
      throw new Error("Should find DC-002");
    }
  },

  "All filters combined should work together": () => {
    const filters: DirectActionFilters = {
      entityType: "dc",
      actionType: "direct",
      searchQuery: "Pending",
    };
    const result = filterDirectActions(testItems, filters);
    const expectedCount = 1; // DC-001
    if (result.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} item, got ${result.length}`);
    }
    if (result[0].displayId !== "DC-001") {
      throw new Error("Should find DC-001");
    }
  },

  "No results should return empty array": () => {
    const filters: DirectActionFilters = {
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

// Test Suite: Edge Cases
export const edgeCaseTests = {
  "Items without custom title should still be searchable by ID": () => {
    const itemWithoutTitle = createMockItem("cc", "draft", "CC-999", undefined, true);
    const items = [itemWithoutTitle];
    const filters: DirectActionFilters = {
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
    const itemWithSpecialChars = createMockItem("cc", "draft", "CC-100", "Item (Special) & Title", true);
    const items = [itemWithSpecialChars];
    const filters: DirectActionFilters = {
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
    const filters: DirectActionFilters = {
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
    const filters: DirectActionFilters = {
      entityType: "cc",
      actionType: "direct",
    };
    filterDirectActions(testItems, filters);
    if (testItems.length !== originalLength) {
      throw new Error("Original items array was modified");
    }
  },
};

// Run all tests
export function runFiltersAndSearchTests() {
  console.log("\n=== Filters and Search Integration Tests ===\n");
  
  let totalPassed = 0;
  let totalFailed = 0;

  // Run Type Filter Tests
  console.log("--- Type Filter Tests ---");
  for (const [testName, testFn] of Object.entries(typeFilterTests)) {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      totalPassed++;
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error.message}`);
      totalFailed++;
    }
  }

  console.log(`\n=== Results: ${totalPassed} passed, ${totalFailed} failed ===\n`);
  return { passed: totalPassed, failed: totalFailed };
}
