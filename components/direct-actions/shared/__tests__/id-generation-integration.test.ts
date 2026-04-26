/**
 * ID Generation System Integration Tests
 * 
 * Comprehensive integration tests validating the ID generation system works correctly
 * for all document types with proper chronological sorting and formatting.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { generateStandardizedId, formatEntityId } from "../utils";
import { transformCC, transformPO, transformDC, combineDirectActions } from "../data-fetcher";
import type { CostComparison, PurchaseOrder, DeliveryChallan } from "../types";

// ============================================================================
// Test 1: Chronological Sorting of Documents by createdAt
// ============================================================================

export const chronologicalSortingTests = {
  "Should sort CCs chronologically by createdAt ascending": () => {
    const unsortedCCs = [
      { _id: "cc3", createdAt: 3000 },
      { _id: "cc1", createdAt: 1000 },
      { _id: "cc2", createdAt: 2000 },
    ];
    
    // First item (cc1 with createdAt 1000) should get ID CC-001
    const result1 = generateStandardizedId(unsortedCCs, unsortedCCs[1], "cc");
    if (result1 !== "CC-001") {
      throw new Error(`Expected CC-001 for earliest CC, got ${result1}`);
    }
    
    // Second item (cc2 with createdAt 2000) should get ID CC-002
    const result2 = generateStandardizedId(unsortedCCs, unsortedCCs[2], "cc");
    if (result2 !== "CC-002") {
      throw new Error(`Expected CC-002 for middle CC, got ${result2}`);
    }
    
    // Third item (cc3 with createdAt 3000) should get ID CC-003
    const result3 = generateStandardizedId(unsortedCCs, unsortedCCs[0], "cc");
    if (result3 !== "CC-003") {
      throw new Error(`Expected CC-003 for latest CC, got ${result3}`);
    }
  },

  "Should sort POs chronologically by createdAt ascending": () => {
    const unsortedPOs = [
      { _id: "po2", createdAt: 2500 },
      { _id: "po3", createdAt: 3500 },
      { _id: "po1", createdAt: 1500 },
    ];
    
    const result1 = generateStandardizedId(unsortedPOs, unsortedPOs[2], "po");
    if (result1 !== "PO-001") {
      throw new Error(`Expected PO-001 for earliest PO, got ${result1}`);
    }
    
    const result2 = generateStandardizedId(unsortedPOs, unsortedPOs[0], "po");
    if (result2 !== "PO-002") {
      throw new Error(`Expected PO-002 for middle PO, got ${result2}`);
    }
    
    const result3 = generateStandardizedId(unsortedPOs, unsortedPOs[1], "po");
    if (result3 !== "PO-003") {
      throw new Error(`Expected PO-003 for latest PO, got ${result3}`);
    }
  },

  "Should sort DCs chronologically by createdAt ascending": () => {
    const unsortedDCs = [
      { _id: "dc2", createdAt: 2200 },
      { _id: "dc1", createdAt: 1200 },
      { _id: "dc3", createdAt: 3200 },
    ];
    
    const result1 = generateStandardizedId(unsortedDCs, unsortedDCs[1], "dc");
    if (result1 !== "DC-001") {
      throw new Error(`Expected DC-001 for earliest DC, got ${result1}`);
    }
    
    const result2 = generateStandardizedId(unsortedDCs, unsortedDCs[0], "dc");
    if (result2 !== "DC-002") {
      throw new Error(`Expected DC-002 for middle DC, got ${result2}`);
    }
    
    const result3 = generateStandardizedId(unsortedDCs, unsortedDCs[2], "dc");
    if (result3 !== "DC-003") {
      throw new Error(`Expected DC-003 for latest DC, got ${result3}`);
    }
  },

  "Should handle documents with same createdAt timestamp": () => {
    const itemsWithSameTime = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 1000 },
      { _id: "item3", createdAt: 1000 },
    ];
    
    // All should get sequential IDs despite same timestamp
    const result1 = generateStandardizedId(itemsWithSameTime, itemsWithSameTime[0], "cc");
    const result2 = generateStandardizedId(itemsWithSameTime, itemsWithSameTime[1], "cc");
    const result3 = generateStandardizedId(itemsWithSameTime, itemsWithSameTime[2], "cc");
    
    if (result1 !== "CC-001" || result2 !== "CC-002" || result3 !== "CC-003") {
      throw new Error(`Expected sequential IDs for same timestamp, got ${result1}, ${result2}, ${result3}`);
    }
  },

  "Should maintain chronological order with large dataset": () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      _id: `item${i}`,
      createdAt: i * 1000,
    }));
    
    // First item should be CC-001
    const result1 = generateStandardizedId(items, items[0], "cc");
    if (result1 !== "CC-001") {
      throw new Error(`Expected CC-001 for first item, got ${result1}`);
    }
    
    // Middle item should be CC-026
    const result26 = generateStandardizedId(items, items[25], "cc");
    if (result26 !== "CC-026") {
      throw new Error(`Expected CC-026 for 26th item, got ${result26}`);
    }
    
    // Last item should be CC-050
    const result50 = generateStandardizedId(items, items[49], "cc");
    if (result50 !== "CC-050") {
      throw new Error(`Expected CC-050 for last item, got ${result50}`);
    }
  },
};

// ============================================================================
// Test 2: Sequential Numbering with Three-Digit Padding
// ============================================================================

export const sequentialNumberingTests = {
  "Should pad single digit numbers with leading zeros": () => {
    const items = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 2000 },
      { _id: "item3", createdAt: 3000 },
      { _id: "item4", createdAt: 4000 },
      { _id: "item5", createdAt: 5000 },
      { _id: "item6", createdAt: 6000 },
      { _id: "item7", createdAt: 7000 },
      { _id: "item8", createdAt: 8000 },
      { _id: "item9", createdAt: 9000 },
    ];
    
    for (let i = 0; i < 9; i++) {
      const result = generateStandardizedId(items, items[i], "cc");
      const expectedPadding = `CC-00${i + 1}`;
      if (result !== expectedPadding) {
        throw new Error(`Expected ${expectedPadding}, got ${result}`);
      }
    }
  },

  "Should pad double digit numbers with leading zero": () => {
    const items = Array.from({ length: 99 }, (_, i) => ({
      _id: `item${i}`,
      createdAt: i * 1000,
    }));
    
    // 10th item should be CC-010
    const result10 = generateStandardizedId(items, items[9], "cc");
    if (result10 !== "CC-010") {
      throw new Error(`Expected CC-010, got ${result10}`);
    }
    
    // 50th item should be CC-050
    const result50 = generateStandardizedId(items, items[49], "cc");
    if (result50 !== "CC-050") {
      throw new Error(`Expected CC-050, got ${result50}`);
    }
    
    // 99th item should be CC-099
    const result99 = generateStandardizedId(items, items[98], "cc");
    if (result99 !== "CC-099") {
      throw new Error(`Expected CC-099, got ${result99}`);
    }
  },

  "Should handle three digit numbers without padding": () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      _id: `item${i}`,
      createdAt: i * 1000,
    }));
    
    // 100th item should be CC-100
    const result100 = generateStandardizedId(items, items[99], "cc");
    if (result100 !== "CC-100") {
      throw new Error(`Expected CC-100, got ${result100}`);
    }
  },

  "Should handle large numbers beyond 999": () => {
    const items = Array.from({ length: 1500 }, (_, i) => ({
      _id: `item${i}`,
      createdAt: i * 1000,
    }));
    
    // 1000th item should be CC-1000
    const result1000 = generateStandardizedId(items, items[999], "cc");
    if (result1000 !== "CC-1000") {
      throw new Error(`Expected CC-1000, got ${result1000}`);
    }
    
    // 1500th item should be CC-1500
    const result1500 = generateStandardizedId(items, items[1499], "cc");
    if (result1500 !== "CC-1500") {
      throw new Error(`Expected CC-1500, got ${result1500}`);
    }
  },

  "Should maintain consistent padding across all document types": () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      _id: `item${i}`,
      createdAt: i * 1000,
    }));
    
    const ccResult = generateStandardizedId(items, items[4], "cc");
    const poResult = generateStandardizedId(items, items[4], "po");
    const dcResult = generateStandardizedId(items, items[4], "dc");
    
    if (ccResult !== "CC-005" || poResult !== "PO-005" || dcResult !== "DC-005") {
      throw new Error(`Expected consistent padding, got ${ccResult}, ${poResult}, ${dcResult}`);
    }
  },
};

// ============================================================================
// Test 3: ID Format for Each Document Type
// ============================================================================

export const idFormatTests = {
  "Should generate CC-### format for cost comparisons": () => {
    const ccs = [
      { _id: "cc1", createdAt: 1000 },
      { _id: "cc2", createdAt: 2000 },
      { _id: "cc3", createdAt: 3000 },
    ];
    
    const result1 = generateStandardizedId(ccs, ccs[0], "cc");
    const result2 = generateStandardizedId(ccs, ccs[1], "cc");
    const result3 = generateStandardizedId(ccs, ccs[2], "cc");
    
    if (!result1.startsWith("CC-") || !result2.startsWith("CC-") || !result3.startsWith("CC-")) {
      throw new Error(`Expected CC- prefix, got ${result1}, ${result2}, ${result3}`);
    }
    
    if (result1 !== "CC-001" || result2 !== "CC-002" || result3 !== "CC-003") {
      throw new Error(`Expected CC-001, CC-002, CC-003, got ${result1}, ${result2}, ${result3}`);
    }
  },

  "Should generate PO-### format for purchase orders": () => {
    const pos = [
      { _id: "po1", createdAt: 1500 },
      { _id: "po2", createdAt: 2500 },
      { _id: "po3", createdAt: 3500 },
    ];
    
    const result1 = generateStandardizedId(pos, pos[0], "po");
    const result2 = generateStandardizedId(pos, pos[1], "po");
    const result3 = generateStandardizedId(pos, pos[2], "po");
    
    if (!result1.startsWith("PO-") || !result2.startsWith("PO-") || !result3.startsWith("PO-")) {
      throw new Error(`Expected PO- prefix, got ${result1}, ${result2}, ${result3}`);
    }
    
    if (result1 !== "PO-001" || result2 !== "PO-002" || result3 !== "PO-003") {
      throw new Error(`Expected PO-001, PO-002, PO-003, got ${result1}, ${result2}, ${result3}`);
    }
  },

  "Should generate DC-### format for delivery challans": () => {
    const dcs = [
      { _id: "dc1", createdAt: 1200 },
      { _id: "dc2", createdAt: 2200 },
      { _id: "dc3", createdAt: 3200 },
    ];
    
    const result1 = generateStandardizedId(dcs, dcs[0], "dc");
    const result2 = generateStandardizedId(dcs, dcs[1], "dc");
    const result3 = generateStandardizedId(dcs, dcs[2], "dc");
    
    if (!result1.startsWith("DC-") || !result2.startsWith("DC-") || !result3.startsWith("DC-")) {
      throw new Error(`Expected DC- prefix, got ${result1}, ${result2}, ${result3}`);
    }
    
    if (result1 !== "DC-001" || result2 !== "DC-002" || result3 !== "DC-003") {
      throw new Error(`Expected DC-001, DC-002, DC-003, got ${result1}, ${result2}, ${result3}`);
    }
  },

  "Should maintain format consistency across multiple calls": () => {
    const items = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 2000 },
    ];
    
    // Call multiple times to ensure consistency
    const result1a = generateStandardizedId(items, items[0], "cc");
    const result1b = generateStandardizedId(items, items[0], "cc");
    const result1c = generateStandardizedId(items, items[0], "cc");
    
    if (result1a !== result1b || result1b !== result1c) {
      throw new Error(`Expected consistent results, got ${result1a}, ${result1b}, ${result1c}`);
    }
  },

  "Should handle mixed document types independently": () => {
    const ccs = [{ _id: "cc1", createdAt: 1000 }];
    const pos = [{ _id: "po1", createdAt: 1000 }];
    const dcs = [{ _id: "dc1", createdAt: 1000 }];
    
    const ccResult = generateStandardizedId(ccs, ccs[0], "cc");
    const poResult = generateStandardizedId(pos, pos[0], "po");
    const dcResult = generateStandardizedId(dcs, dcs[0], "dc");
    
    if (ccResult !== "CC-001" || poResult !== "PO-001" || dcResult !== "DC-001") {
      throw new Error(`Expected independent numbering, got ${ccResult}, ${poResult}, ${dcResult}`);
    }
  },
};

// ============================================================================
// Test 4: ID Consistency Across Application Restarts
// ============================================================================

export const idConsistencyTests = {
  "Should generate same ID for same document across multiple calls": () => {
    const items = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 2000 },
      { _id: "item3", createdAt: 3000 },
    ];
    
    // Simulate multiple "restarts" by calling multiple times
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = generateStandardizedId(items, items[1], "cc");
      results.push(result);
    }
    
    // All results should be identical
    const firstResult = results[0];
    for (const result of results) {
      if (result !== firstResult) {
        throw new Error(`Expected consistent ID across calls, got ${firstResult} and ${result}`);
      }
    }
    
    if (firstResult !== "CC-002") {
      throw new Error(`Expected CC-002, got ${firstResult}`);
    }
  },

  "Should maintain ID consistency when data order changes": () => {
    const item = { _id: "item2", createdAt: 2000 };
    
    // First call with items in order
    const items1 = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 2000 },
      { _id: "item3", createdAt: 3000 },
    ];
    const result1 = generateStandardizedId(items1, item, "cc");
    
    // Second call with items in different order
    const items2 = [
      { _id: "item3", createdAt: 3000 },
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 2000 },
    ];
    const result2 = generateStandardizedId(items2, item, "cc");
    
    if (result1 !== result2) {
      throw new Error(`Expected same ID regardless of input order, got ${result1} and ${result2}`);
    }
    
    if (result1 !== "CC-002") {
      throw new Error(`Expected CC-002, got ${result1}`);
    }
  },

  "Should maintain ID consistency with formatEntityId wrapper": () => {
    const items = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 2000 },
    ];
    
    const item = items[0];
    
    // Call generateStandardizedId directly
    const directResult = generateStandardizedId(items, item, "cc");
    
    // Call through formatEntityId wrapper
    const wrappedResult = formatEntityId(item, "cc", items);
    
    if (directResult !== wrappedResult) {
      throw new Error(`Expected consistent results through wrapper, got ${directResult} and ${wrappedResult}`);
    }
  },

  "Should preserve ID when new documents are added": () => {
    const item = { _id: "item1", createdAt: 1000 };
    
    // Initial ID with 3 items
    const items1 = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 2000 },
      { _id: "item3", createdAt: 3000 },
    ];
    const result1 = generateStandardizedId(items1, item, "cc");
    
    // ID after adding new items
    const items2 = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 2000 },
      { _id: "item3", createdAt: 3000 },
      { _id: "item4", createdAt: 4000 },
      { _id: "item5", createdAt: 5000 },
    ];
    const result2 = generateStandardizedId(items2, item, "cc");
    
    if (result1 !== result2) {
      throw new Error(`Expected ID to remain CC-001 after new items added, got ${result1} and ${result2}`);
    }
  },
};

// ============================================================================
// Test 5: Concurrent Document Creation Doesn't Cause ID Conflicts
// ============================================================================

export const concurrentCreationTests = {
  "Should assign unique IDs to documents created at same timestamp": () => {
    const items = [
      { _id: "item1", createdAt: 1000 },
      { _id: "item2", createdAt: 1000 },
      { _id: "item3", createdAt: 1000 },
      { _id: "item4", createdAt: 1000 },
      { _id: "item5", createdAt: 1000 },
    ];
    
    const ids = items.map((item, index) => generateStandardizedId(items, item, "cc"));
    
    // All IDs should be unique
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new Error(`Expected unique IDs for concurrent creation, got duplicates: ${ids.join(", ")}`);
    }
    
    // IDs should be sequential
    const expectedIds = ["CC-001", "CC-002", "CC-003", "CC-004", "CC-005"];
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] !== expectedIds[i]) {
        throw new Error(`Expected ${expectedIds[i]}, got ${ids[i]}`);
      }
    }
  },

  "Should handle rapid sequential creation without conflicts": () => {
    const createdItems: { _id: string; createdAt: number }[] = [];
    
    // Simulate rapid creation
    for (let i = 0; i < 10; i++) {
      createdItems.push({
        _id: `item${i}`,
        createdAt: 1000 + i, // Slightly different timestamps
      });
    }
    
    const ids = createdItems.map((item) => generateStandardizedId(createdItems, item, "cc"));
    
    // All IDs should be unique
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new Error(`Expected unique IDs for rapid creation, got duplicates`);
    }
    
    // IDs should be sequential
    for (let i = 0; i < ids.length; i++) {
      const expected = `CC-${String(i + 1).padStart(3, "0")}`;
      if (ids[i] !== expected) {
        throw new Error(`Expected ${expected}, got ${ids[i]}`);
      }
    }
  },

  "Should maintain ID uniqueness across document types": () => {
    const ccs = [
      { _id: "cc1", createdAt: 1000 },
      { _id: "cc2", createdAt: 1000 },
    ];
    const pos = [
      { _id: "po1", createdAt: 1000 },
      { _id: "po2", createdAt: 1000 },
    ];
    const dcs = [
      { _id: "dc1", createdAt: 1000 },
      { _id: "dc2", createdAt: 1000 },
    ];
    
    const ccIds = ccs.map((item) => generateStandardizedId(ccs, item, "cc"));
    const poIds = pos.map((item) => generateStandardizedId(pos, item, "po"));
    const dcIds = dcs.map((item) => generateStandardizedId(dcs, item, "dc"));
    
    // Each type should have unique IDs
    if (new Set(ccIds).size !== ccIds.length) {
      throw new Error("CC IDs should be unique");
    }
    if (new Set(poIds).size !== poIds.length) {
      throw new Error("PO IDs should be unique");
    }
    if (new Set(dcIds).size !== dcIds.length) {
      throw new Error("DC IDs should be unique");
    }
    
    // Expected results
    if (ccIds[0] !== "CC-001" || ccIds[1] !== "CC-002") {
      throw new Error(`Expected CC-001, CC-002, got ${ccIds[0]}, ${ccIds[1]}`);
    }
    if (poIds[0] !== "PO-001" || poIds[1] !== "PO-002") {
      throw new Error(`Expected PO-001, PO-002, got ${poIds[0]}, ${poIds[1]}`);
    }
    if (dcIds[0] !== "DC-001" || dcIds[1] !== "DC-002") {
      throw new Error(`Expected DC-001, DC-002, got ${dcIds[0]}, ${dcIds[1]}`);
    }
  },

  "Should handle large batch concurrent creation": () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      _id: `item${i}`,
      createdAt: 1000, // All same timestamp
    }));
    
    const ids = items.map((item) => generateStandardizedId(items, item, "cc"));
    
    // All IDs should be unique
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new Error(`Expected 100 unique IDs, got ${uniqueIds.size}`);
    }
    
    // First should be CC-001, last should be CC-100
    if (ids[0] !== "CC-001") {
      throw new Error(`Expected first ID to be CC-001, got ${ids[0]}`);
    }
    if (ids[99] !== "CC-100") {
      throw new Error(`Expected last ID to be CC-100, got ${ids[99]}`);
    }
  },
};

// ============================================================================
// Test Runner
// ============================================================================

export function runIdGenerationIntegrationTests() {
  console.log("\n=== ID Generation System Integration Tests ===\n");
  
  const testSuites = [
    { name: "Chronological Sorting", tests: chronologicalSortingTests },
    { name: "Sequential Numbering", tests: sequentialNumberingTests },
    { name: "ID Format", tests: idFormatTests },
    { name: "ID Consistency", tests: idConsistencyTests },
    { name: "Concurrent Creation", tests: concurrentCreationTests },
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const suite of testSuites) {
    console.log(`\n--- ${suite.name} ---\n`);
    
    for (const [testName, testFn] of Object.entries(suite.tests)) {
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
  }
  
  console.log(`\n=== Results: ${totalPassed} passed, ${totalFailed} failed ===\n`);
  return { passed: totalPassed, failed: totalFailed };
}
