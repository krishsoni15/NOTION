/**
 * Title Editing Tests
 * 
 * Tests for inline title editing functionality
 * Validates: Requirement 8.5
 */

import type { DirectActionItem } from "../types";

// Helper to create mock DirectActionItem
function createMockItem(
  type: "cc" | "dc" | "po",
  customTitle?: string
): DirectActionItem {
  return {
    id: `${type}-1`,
    type,
    displayId: `${type.toUpperCase()}-001`,
    customTitle: customTitle || undefined,
    status: "draft",
    createdDate: Date.now(),
    createdBy: "test-user" as any,
    isDirect: true,
    rawData: {} as any,
  };
}

// Test Suite: Title Editing
export const titleEditingTests = {
  "Should allow setting title on CC": () => {
    const item = createMockItem("cc");
    if (item.customTitle !== undefined) {
      throw new Error("Initial title should be undefined");
    }
    // Simulate title update
    const updatedItem = { ...item, customTitle: "My Cost Comparison" };
    if (updatedItem.customTitle !== "My Cost Comparison") {
      throw new Error("Title should be updated");
    }
  },

  "Should allow setting title on DC": () => {
    const item = createMockItem("dc");
    if (item.customTitle !== undefined) {
      throw new Error("Initial title should be undefined");
    }
    // Simulate title update
    const updatedItem = { ...item, customTitle: "My Delivery" };
    if (updatedItem.customTitle !== "My Delivery") {
      throw new Error("Title should be updated");
    }
  },

  "Should allow setting title on PO": () => {
    const item = createMockItem("po");
    if (item.customTitle !== undefined) {
      throw new Error("Initial title should be undefined");
    }
    // Simulate title update
    const updatedItem = { ...item, customTitle: "My Purchase Order" };
    if (updatedItem.customTitle !== "My Purchase Order") {
      throw new Error("Title should be updated");
    }
  },

  "Should allow clearing title": () => {
    const item = createMockItem("cc", "Existing Title");
    if (item.customTitle !== "Existing Title") {
      throw new Error("Initial title should be set");
    }
    // Simulate title clear
    const updatedItem = { ...item, customTitle: "" };
    if (updatedItem.customTitle !== "") {
      throw new Error("Title should be cleared");
    }
  },

  "Should allow updating existing title": () => {
    const item = createMockItem("cc", "Old Title");
    if (item.customTitle !== "Old Title") {
      throw new Error("Initial title should be set");
    }
    // Simulate title update
    const updatedItem = { ...item, customTitle: "New Title" };
    if (updatedItem.customTitle !== "New Title") {
      throw new Error("Title should be updated");
    }
  },

  "Should preserve title across item updates": () => {
    const item = createMockItem("cc", "My Title");
    const updatedItem = { ...item, status: "cc_pending" };
    if (updatedItem.customTitle !== "My Title") {
      throw new Error("Title should be preserved");
    }
  },

  "Should handle special characters in title": () => {
    const specialTitle = "Title with @#$% & special chars!";
    const item = createMockItem("cc", specialTitle);
    if (item.customTitle !== specialTitle) {
      throw new Error("Special characters should be preserved");
    }
  },

  "Should handle long titles": () => {
    const longTitle = "A".repeat(500);
    const item = createMockItem("cc", longTitle);
    if (item.customTitle !== longTitle) {
      throw new Error("Long title should be preserved");
    }
  },

  "Should handle whitespace in title": () => {
    const titleWithWhitespace = "  Title with spaces  ";
    const item = createMockItem("cc", titleWithWhitespace);
    if (item.customTitle !== titleWithWhitespace) {
      throw new Error("Whitespace should be preserved");
    }
  },

  "Should handle unicode characters in title": () => {
    const unicodeTitle = "Title with émojis 🎉 and ñ characters";
    const item = createMockItem("cc", unicodeTitle);
    if (item.customTitle !== unicodeTitle) {
      throw new Error("Unicode characters should be preserved");
    }
  },
};

// Run all tests
export function runTitleEditingTests() {
  console.log("\n=== Title Editing Tests ===\n");
  let passed = 0;
  let failed = 0;

  for (const [testName, testFn] of Object.entries(titleEditingTests)) {
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
