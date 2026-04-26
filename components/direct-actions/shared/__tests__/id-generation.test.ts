/**
 * ID Generation Tests
 * 
 * Tests for standardized ID generation system
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { generateStandardizedId, formatEntityId } from "../utils";

// Test data
const mockCCs = [
  { _id: "cc1", createdAt: 1000 },
  { _id: "cc2", createdAt: 2000 },
  { _id: "cc3", createdAt: 3000 },
];

const mockPOs = [
  { _id: "po1", createdAt: 1500 },
  { _id: "po2", createdAt: 2500 },
  { _id: "po3", createdAt: 3500 },
];

const mockDCs = [
  { _id: "dc1", createdAt: 1200 },
  { _id: "dc2", createdAt: 2200 },
  { _id: "dc3", createdAt: 3200 },
];

// Test Suite: ID Generation
export const idGenerationTests = {
  "Should generate CC-001 for first cost comparison": () => {
    const result = generateStandardizedId(mockCCs, mockCCs[0], "cc");
    if (result !== "CC-001") throw new Error(`Expected CC-001, got ${result}`);
  },

  "Should generate CC-002 for second cost comparison": () => {
    const result = generateStandardizedId(mockCCs, mockCCs[1], "cc");
    if (result !== "CC-002") throw new Error(`Expected CC-002, got ${result}`);
  },

  "Should generate CC-003 for third cost comparison": () => {
    const result = generateStandardizedId(mockCCs, mockCCs[2], "cc");
    if (result !== "CC-003") throw new Error(`Expected CC-003, got ${result}`);
  },

  "Should generate PO-001 for first purchase order": () => {
    const result = generateStandardizedId(mockPOs, mockPOs[0], "po");
    if (result !== "PO-001") throw new Error(`Expected PO-001, got ${result}`);
  },

  "Should generate PO-002 for second purchase order": () => {
    const result = generateStandardizedId(mockPOs, mockPOs[1], "po");
    if (result !== "PO-002") throw new Error(`Expected PO-002, got ${result}`);
  },

  "Should generate PO-003 for third purchase order": () => {
    const result = generateStandardizedId(mockPOs, mockPOs[2], "po");
    if (result !== "PO-003") throw new Error(`Expected PO-003, got ${result}`);
  },

  "Should generate DC-001 for first delivery challan": () => {
    const result = generateStandardizedId(mockDCs, mockDCs[0], "dc");
    if (result !== "DC-001") throw new Error(`Expected DC-001, got ${result}`);
  },

  "Should generate DC-002 for second delivery challan": () => {
    const result = generateStandardizedId(mockDCs, mockDCs[1], "dc");
    if (result !== "DC-002") throw new Error(`Expected DC-002, got ${result}`);
  },

  "Should generate DC-003 for third delivery challan": () => {
    const result = generateStandardizedId(mockDCs, mockDCs[2], "dc");
    if (result !== "DC-003") throw new Error(`Expected DC-003, got ${result}`);
  },

  "Should sort items chronologically by createdAt": () => {
    const unsorted = [
      { _id: "cc3", createdAt: 3000 },
      { _id: "cc1", createdAt: 1000 },
      { _id: "cc2", createdAt: 2000 },
    ];
    const result = generateStandardizedId(unsorted, unsorted[1], "cc");
    // cc1 should be first (1000), cc2 second (2000), cc3 third (3000)
    // unsorted[1] is cc1, so it should be CC-001
    if (result !== "CC-001") throw new Error(`Expected CC-001, got ${result}`);
  },

  "Should handle three-digit padding correctly": () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      _id: `item${i}`,
      createdAt: i * 1000,
    }));
    const result = generateStandardizedId(items, items[99], "cc");
    if (result !== "CC-100") throw new Error(`Expected CC-100, got ${result}`);
  },

  "Should format entity ID with all items provided": () => {
    const result = formatEntityId(mockCCs[0], "cc", mockCCs);
    if (result !== "CC-001") throw new Error(`Expected CC-001, got ${result}`);
  },

  "Should return fallback format if allItems not provided": () => {
    const result = formatEntityId(mockCCs[0], "cc");
    if (result !== "CC-???") throw new Error(`Expected CC-???, got ${result}`);
  },
};

// Run all tests
export function runIdGenerationTests() {
  console.log("\n=== ID Generation Tests ===\n");
  let passed = 0;
  let failed = 0;

  for (const [testName, testFn] of Object.entries(idGenerationTests)) {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      passed++;
    } catch (error: any) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}
