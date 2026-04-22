/**
 * Action Button Mapping Tests
 * 
 * Tests for dynamic action button system
 * Validates: Requirements 2.1, 2.2, 2.5, 2.6, 2.7, 2.8
 */

import { isItemEditable, getActionButtonType } from "../utils";
import type { DirectActionItem } from "../types";

// Helper to create mock DirectActionItem
function createMockItem(
  type: "cc" | "dc" | "po",
  status: string
): DirectActionItem {
  return {
    id: `${type}-1`,
    type,
    displayId: `${type.toUpperCase()}-001`,
    customTitle: "Test Item",
    status,
    createdDate: Date.now(),
    createdBy: "test-user" as any,
    isDirect: true,
    rawData: {} as any,
  };
}

// Test Suite: Action Button Mapping
export const actionButtonMappingTests = {
  // CC Tests
  "CC draft status should be editable": () => {
    const item = createMockItem("cc", "draft");
    if (!isItemEditable(item)) throw new Error("CC draft should be editable");
  },

  "CC draft status should show Edit button": () => {
    const item = createMockItem("cc", "draft");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") throw new Error(`Expected edit, got ${buttonType}`);
  },

  "CC cc_pending status should not be editable": () => {
    const item = createMockItem("cc", "cc_pending");
    if (isItemEditable(item)) throw new Error("CC cc_pending should not be editable");
  },

  "CC cc_pending status should show View button": () => {
    const item = createMockItem("cc", "cc_pending");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  "CC cc_approved status should not be editable": () => {
    const item = createMockItem("cc", "cc_approved");
    if (isItemEditable(item)) throw new Error("CC cc_approved should not be editable");
  },

  "CC cc_approved status should show View button": () => {
    const item = createMockItem("cc", "cc_approved");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  "CC cc_rejected status should not be editable": () => {
    const item = createMockItem("cc", "cc_rejected");
    if (isItemEditable(item)) throw new Error("CC cc_rejected should not be editable");
  },

  "CC cc_rejected status should show View button": () => {
    const item = createMockItem("cc", "cc_rejected");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  // DC Tests
  "DC pending status should be editable": () => {
    const item = createMockItem("dc", "pending");
    if (!isItemEditable(item)) throw new Error("DC pending should be editable");
  },

  "DC pending status should show Edit button": () => {
    const item = createMockItem("dc", "pending");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") throw new Error(`Expected edit, got ${buttonType}`);
  },

  "DC draft status should be editable": () => {
    const item = createMockItem("dc", "draft");
    if (!isItemEditable(item)) throw new Error("DC draft should be editable");
  },

  "DC draft status should show Edit button": () => {
    const item = createMockItem("dc", "draft");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") throw new Error(`Expected edit, got ${buttonType}`);
  },

  "DC delivered status should not be editable": () => {
    const item = createMockItem("dc", "delivered");
    if (isItemEditable(item)) throw new Error("DC delivered should not be editable");
  },

  "DC delivered status should show View button": () => {
    const item = createMockItem("dc", "delivered");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  "DC cancelled status should not be editable": () => {
    const item = createMockItem("dc", "cancelled");
    if (isItemEditable(item)) throw new Error("DC cancelled should not be editable");
  },

  "DC cancelled status should show View button": () => {
    const item = createMockItem("dc", "cancelled");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  // PO Tests
  "PO pending_approval status should never be editable": () => {
    const item = createMockItem("po", "pending_approval");
    if (isItemEditable(item)) throw new Error("PO should never be editable");
  },

  "PO pending_approval status should show View button": () => {
    const item = createMockItem("po", "pending_approval");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  "PO approved status should never be editable": () => {
    const item = createMockItem("po", "approved");
    if (isItemEditable(item)) throw new Error("PO should never be editable");
  },

  "PO approved status should show View button": () => {
    const item = createMockItem("po", "approved");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  "PO ordered status should never be editable": () => {
    const item = createMockItem("po", "ordered");
    if (isItemEditable(item)) throw new Error("PO should never be editable");
  },

  "PO ordered status should show View button": () => {
    const item = createMockItem("po", "ordered");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  "PO delivered status should never be editable": () => {
    const item = createMockItem("po", "delivered");
    if (isItemEditable(item)) throw new Error("PO should never be editable");
  },

  "PO delivered status should show View button": () => {
    const item = createMockItem("po", "delivered");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  "PO rejected status should never be editable": () => {
    const item = createMockItem("po", "rejected");
    if (isItemEditable(item)) throw new Error("PO should never be editable");
  },

  "PO rejected status should show View button": () => {
    const item = createMockItem("po", "rejected");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },

  "PO cancelled status should never be editable": () => {
    const item = createMockItem("po", "cancelled");
    if (isItemEditable(item)) throw new Error("PO should never be editable");
  },

  "PO cancelled status should show View button": () => {
    const item = createMockItem("po", "cancelled");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") throw new Error(`Expected view, got ${buttonType}`);
  },
};

// Run all tests
export function runActionButtonMappingTests() {
  console.log("\n=== Action Button Mapping Tests ===\n");
  let passed = 0;
  let failed = 0;

  for (const [testName, testFn] of Object.entries(actionButtonMappingTests)) {
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
