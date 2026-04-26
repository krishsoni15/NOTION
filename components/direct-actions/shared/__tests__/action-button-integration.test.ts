/**
 * Action Button System Integration Tests
 * 
 * Comprehensive integration tests validating the action button system works correctly
 * for all document types and status combinations.
 * 
 * Validates: Requirements 2.1, 2.2, 2.5, 2.6, 2.7, 2.8
 */

import { isItemEditable, getActionButtonType } from "../utils";
import type { DirectActionItem } from "../types";

// Helper to create mock DirectActionItem with full data
function createMockDirectActionItem(
  type: "cc" | "dc" | "po",
  status: string,
  customTitle?: string
): DirectActionItem {
  const baseId = `${type}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: baseId,
    type,
    displayId: `${type.toUpperCase()}-001`,
    customTitle: customTitle || `Test ${type.toUpperCase()}`,
    status,
    createdDate: Date.now(),
    createdBy: "user-123" as any,
    isDirect: true,
    rawData: {
      _id: baseId as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: "user-123" as any,
    } as any,
  };
}

// Test Suite: CC Edit Button Visibility
export const ccEditButtonTests = {
  "CC draft status shows Edit button": () => {
    const item = createMockDirectActionItem("cc", "draft");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error(`Expected edit button for CC draft, got ${buttonType}`);
    }
  },

  "CC draft status is editable": () => {
    const item = createMockDirectActionItem("cc", "draft");
    if (!isItemEditable(item)) {
      throw new Error("CC draft should be editable");
    }
  },

  "CC draft with custom title shows Edit button": () => {
    const item = createMockDirectActionItem("cc", "draft", "Custom CC Title");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error(`Expected edit button for CC draft with title, got ${buttonType}`);
    }
  },

  "CC draft allows title editing": () => {
    const item = createMockDirectActionItem("cc", "draft", "Original Title");
    if (!isItemEditable(item)) {
      throw new Error("CC draft should allow title editing");
    }
    if (item.customTitle !== "Original Title") {
      throw new Error("Custom title should be preserved");
    }
  },
};

// Test Suite: CC View Button Visibility
export const ccViewButtonTests = {
  "CC finalized status shows View button": () => {
    const item = createMockDirectActionItem("cc", "cc_approved");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for CC finalized, got ${buttonType}`);
    }
  },

  "CC finalized status is not editable": () => {
    const item = createMockDirectActionItem("cc", "cc_approved");
    if (isItemEditable(item)) {
      throw new Error("CC finalized should not be editable");
    }
  },

  "CC approved status shows View button": () => {
    const item = createMockDirectActionItem("cc", "cc_approved");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for CC approved, got ${buttonType}`);
    }
  },

  "CC pending status shows View button": () => {
    const item = createMockDirectActionItem("cc", "cc_pending");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for CC pending, got ${buttonType}`);
    }
  },

  "CC rejected status shows View button": () => {
    const item = createMockDirectActionItem("cc", "cc_rejected");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for CC rejected, got ${buttonType}`);
    }
  },

  "CC finalized with custom title shows View button": () => {
    const item = createMockDirectActionItem("cc", "cc_approved", "Finalized CC");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for finalized CC with title, got ${buttonType}`);
    }
  },
};

// Test Suite: DC Edit Button Visibility
export const dcEditButtonTests = {
  "DC draft status shows Edit button": () => {
    const item = createMockDirectActionItem("dc", "draft");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error(`Expected edit button for DC draft, got ${buttonType}`);
    }
  },

  "DC draft status is editable": () => {
    const item = createMockDirectActionItem("dc", "draft");
    if (!isItemEditable(item)) {
      throw new Error("DC draft should be editable");
    }
  },

  "DC pending status shows Edit button": () => {
    const item = createMockDirectActionItem("dc", "pending");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error(`Expected edit button for DC pending, got ${buttonType}`);
    }
  },

  "DC pending status is editable": () => {
    const item = createMockDirectActionItem("dc", "pending");
    if (!isItemEditable(item)) {
      throw new Error("DC pending should be editable");
    }
  },

  "DC draft with custom title shows Edit button": () => {
    const item = createMockDirectActionItem("dc", "draft", "Draft DC");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error(`Expected edit button for DC draft with title, got ${buttonType}`);
    }
  },

  "DC pending with custom title shows Edit button": () => {
    const item = createMockDirectActionItem("dc", "pending", "Pending DC");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error(`Expected edit button for DC pending with title, got ${buttonType}`);
    }
  },
};

// Test Suite: DC View Button Visibility
export const dcViewButtonTests = {
  "DC finalized status shows View button": () => {
    const item = createMockDirectActionItem("dc", "delivered");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for DC finalized, got ${buttonType}`);
    }
  },

  "DC finalized status is not editable": () => {
    const item = createMockDirectActionItem("dc", "delivered");
    if (isItemEditable(item)) {
      throw new Error("DC finalized should not be editable");
    }
  },

  "DC delivered status shows View button": () => {
    const item = createMockDirectActionItem("dc", "delivered");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for DC delivered, got ${buttonType}`);
    }
  },

  "DC cancelled status shows View button": () => {
    const item = createMockDirectActionItem("dc", "cancelled");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for DC cancelled, got ${buttonType}`);
    }
  },

  "DC delivered with custom title shows View button": () => {
    const item = createMockDirectActionItem("dc", "delivered", "Delivered DC");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for delivered DC with title, got ${buttonType}`);
    }
  },

  "DC cancelled with custom title shows View button": () => {
    const item = createMockDirectActionItem("dc", "cancelled", "Cancelled DC");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for cancelled DC with title, got ${buttonType}`);
    }
  },
};

// Test Suite: PO View Button (Always)
export const poViewButtonTests = {
  "PO pending_approval status shows View button": () => {
    const item = createMockDirectActionItem("po", "pending_approval");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for PO pending_approval, got ${buttonType}`);
    }
  },

  "PO pending_approval is never editable": () => {
    const item = createMockDirectActionItem("po", "pending_approval");
    if (isItemEditable(item)) {
      throw new Error("PO should never be editable");
    }
  },

  "PO sign_pending status shows View button": () => {
    const item = createMockDirectActionItem("po", "sign_pending");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for PO sign_pending, got ${buttonType}`);
    }
  },

  "PO approved status shows View button": () => {
    const item = createMockDirectActionItem("po", "approved");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for PO approved, got ${buttonType}`);
    }
  },

  "PO approved is never editable": () => {
    const item = createMockDirectActionItem("po", "approved");
    if (isItemEditable(item)) {
      throw new Error("PO should never be editable");
    }
  },

  "PO ordered status shows View button": () => {
    const item = createMockDirectActionItem("po", "ordered");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for PO ordered, got ${buttonType}`);
    }
  },

  "PO delivered status shows View button": () => {
    const item = createMockDirectActionItem("po", "delivered");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for PO delivered, got ${buttonType}`);
    }
  },

  "PO rejected status shows View button": () => {
    const item = createMockDirectActionItem("po", "rejected");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for PO rejected, got ${buttonType}`);
    }
  },

  "PO cancelled status shows View button": () => {
    const item = createMockDirectActionItem("po", "cancelled");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for PO cancelled, got ${buttonType}`);
    }
  },

  "PO with custom title always shows View button": () => {
    const item = createMockDirectActionItem("po", "approved", "Custom PO Title");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error(`Expected view button for PO with title, got ${buttonType}`);
    }
  },

  "PO with custom title is never editable": () => {
    const item = createMockDirectActionItem("po", "approved", "Custom PO Title");
    if (isItemEditable(item)) {
      throw new Error("PO should never be editable, even with custom title");
    }
  },
};

// Test Suite: Cross-Document Type Consistency
export const crossDocumentConsistencyTests = {
  "All draft documents show Edit button": () => {
    const cc = createMockDirectActionItem("cc", "draft");
    const dc = createMockDirectActionItem("dc", "draft");
    
    const ccButton = getActionButtonType(cc);
    const dcButton = getActionButtonType(dc);
    
    if (ccButton !== "edit" || dcButton !== "edit") {
      throw new Error("All draft documents should show Edit button");
    }
  },

  "All finalized documents show View button": () => {
    const cc = createMockDirectActionItem("cc", "cc_approved");
    const dc = createMockDirectActionItem("dc", "delivered");
    const po = createMockDirectActionItem("po", "approved");
    
    const ccButton = getActionButtonType(cc);
    const dcButton = getActionButtonType(dc);
    const poButton = getActionButtonType(po);
    
    if (ccButton !== "view" || dcButton !== "view" || poButton !== "view") {
      throw new Error("All finalized documents should show View button");
    }
  },

  "PO always shows View regardless of other document types": () => {
    const po1 = createMockDirectActionItem("po", "pending_approval");
    const po2 = createMockDirectActionItem("po", "approved");
    const po3 = createMockDirectActionItem("po", "delivered");
    
    const button1 = getActionButtonType(po1);
    const button2 = getActionButtonType(po2);
    const button3 = getActionButtonType(po3);
    
    if (button1 !== "view" || button2 !== "view" || button3 !== "view") {
      throw new Error("PO should always show View button");
    }
  },

  "CC and DC have different edit status rules": () => {
    // CC is editable only in draft
    const ccDraft = createMockDirectActionItem("cc", "draft");
    const ccPending = createMockDirectActionItem("cc", "cc_pending");
    
    // DC is editable in draft and pending
    const dcDraft = createMockDirectActionItem("dc", "draft");
    const dcPending = createMockDirectActionItem("dc", "pending");
    
    if (!isItemEditable(ccDraft)) {
      throw new Error("CC draft should be editable");
    }
    if (isItemEditable(ccPending)) {
      throw new Error("CC pending should not be editable");
    }
    if (!isItemEditable(dcDraft)) {
      throw new Error("DC draft should be editable");
    }
    if (!isItemEditable(dcPending)) {
      throw new Error("DC pending should be editable");
    }
  },
};

// Test Suite: Status Transition Scenarios
export const statusTransitionTests = {
  "CC transitions from draft to pending correctly": () => {
    const draftCC = createMockDirectActionItem("cc", "draft");
    const pendingCC = createMockDirectActionItem("cc", "cc_pending");
    
    if (getActionButtonType(draftCC) !== "edit") {
      throw new Error("Draft CC should show Edit");
    }
    if (getActionButtonType(pendingCC) !== "view") {
      throw new Error("Pending CC should show View");
    }
  },

  "CC transitions from pending to approved correctly": () => {
    const pendingCC = createMockDirectActionItem("cc", "cc_pending");
    const approvedCC = createMockDirectActionItem("cc", "cc_approved");
    
    if (getActionButtonType(pendingCC) !== "view") {
      throw new Error("Pending CC should show View");
    }
    if (getActionButtonType(approvedCC) !== "view") {
      throw new Error("Approved CC should show View");
    }
  },

  "DC transitions from draft to pending correctly": () => {
    const draftDC = createMockDirectActionItem("dc", "draft");
    const pendingDC = createMockDirectActionItem("dc", "pending");
    
    if (getActionButtonType(draftDC) !== "edit") {
      throw new Error("Draft DC should show Edit");
    }
    if (getActionButtonType(pendingDC) !== "edit") {
      throw new Error("Pending DC should show Edit");
    }
  },

  "DC transitions from pending to delivered correctly": () => {
    const pendingDC = createMockDirectActionItem("dc", "pending");
    const deliveredDC = createMockDirectActionItem("dc", "delivered");
    
    if (getActionButtonType(pendingDC) !== "edit") {
      throw new Error("Pending DC should show Edit");
    }
    if (getActionButtonType(deliveredDC) !== "view") {
      throw new Error("Delivered DC should show View");
    }
  },

  "PO remains View throughout all transitions": () => {
    const pendingPO = createMockDirectActionItem("po", "pending_approval");
    const approvedPO = createMockDirectActionItem("po", "approved");
    const orderedPO = createMockDirectActionItem("po", "ordered");
    const deliveredPO = createMockDirectActionItem("po", "delivered");
    
    if (getActionButtonType(pendingPO) !== "view") {
      throw new Error("Pending PO should show View");
    }
    if (getActionButtonType(approvedPO) !== "view") {
      throw new Error("Approved PO should show View");
    }
    if (getActionButtonType(orderedPO) !== "view") {
      throw new Error("Ordered PO should show View");
    }
    if (getActionButtonType(deliveredPO) !== "view") {
      throw new Error("Delivered PO should show View");
    }
  },
};

// Test Suite: Edge Cases
export const edgeCaseTests = {
  "Unknown status defaults to View": () => {
    const item = createMockDirectActionItem("cc", "unknown_status");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "view") {
      throw new Error("Unknown status should default to View");
    }
  },

  "Empty custom title still shows correct button": () => {
    const item = createMockDirectActionItem("cc", "draft", "");
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error("Empty title should not affect button type");
    }
  },

  "Null custom title still shows correct button": () => {
    const item = createMockDirectActionItem("cc", "draft");
    item.customTitle = undefined;
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error("Null title should not affect button type");
    }
  },

  "Very long custom title still shows correct button": () => {
    const longTitle = "A".repeat(500);
    const item = createMockDirectActionItem("cc", "draft", longTitle);
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error("Long title should not affect button type");
    }
  },

  "Special characters in title don't affect button": () => {
    const specialTitle = "Test!@#$%^&*()_+-=[]{}|;:',.<>?/";
    const item = createMockDirectActionItem("cc", "draft", specialTitle);
    const buttonType = getActionButtonType(item);
    if (buttonType !== "edit") {
      throw new Error("Special characters in title should not affect button type");
    }
  },
};

// Run all integration tests
export function runActionButtonIntegrationTests() {
  console.log("\n=== Action Button System Integration Tests ===\n");
  
  const testSuites = {
    "CC Edit Button Tests": ccEditButtonTests,
    "CC View Button Tests": ccViewButtonTests,
    "DC Edit Button Tests": dcEditButtonTests,
    "DC View Button Tests": dcViewButtonTests,
    "PO View Button Tests": poViewButtonTests,
    "Cross-Document Consistency Tests": crossDocumentConsistencyTests,
    "Status Transition Tests": statusTransitionTests,
    "Edge Case Tests": edgeCaseTests,
  };

  let totalPassed = 0;
  let totalFailed = 0;
  const failedTests: string[] = [];

  for (const [suiteName, tests] of Object.entries(testSuites)) {
    console.log(`\n${suiteName}:`);
    
    for (const [testName, testFn] of Object.entries(tests)) {
      try {
        testFn();
        console.log(`  ✓ ${testName}`);
        totalPassed++;
      } catch (error: any) {
        console.error(`  ✗ ${testName}`);
        console.error(`    ${error.message}`);
        totalFailed++;
        failedTests.push(`${suiteName} > ${testName}`);
      }
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`${"=".repeat(50)}\n`);

  if (failedTests.length > 0) {
    console.log("Failed tests:");
    failedTests.forEach(test => console.log(`  - ${test}`));
    console.log();
  }

  return { passed: totalPassed, failed: totalFailed };
}
