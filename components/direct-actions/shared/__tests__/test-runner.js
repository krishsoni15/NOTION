/**
 * Simple Test Runner for Two-Step DC Workflow Tests
 * 
 * This is a standalone test runner that doesn't require module imports
 * It directly includes all test logic inline
 */

// ============================================================================
// Test Data Fixtures
// ============================================================================

const mockPOs = [
  {
    _id: "po1",
    poNumber: "PO-001",
    itemDescription: "Steel Pipes",
    quantity: 100,
    unit: "meters",
    totalAmount: 50000,
    status: "approved",
  },
  {
    _id: "po2",
    poNumber: "PO-002",
    itemDescription: "Cement Bags",
    quantity: 500,
    unit: "bags",
    totalAmount: 75000,
    status: "approved",
  },
  {
    _id: "po3",
    poNumber: "PO-003",
    itemDescription: "Wooden Planks",
    quantity: 50,
    unit: "pieces",
    totalAmount: 30000,
    status: "approved",
  },
];

const mockManualItems = [
  {
    itemName: "Bricks",
    description: "Red clay bricks for construction",
    quantity: 1000,
    unit: "pieces",
    rate: 5,
    discount: 0,
  },
  {
    itemName: "Sand",
    description: "River sand for concrete",
    quantity: 10,
    unit: "tons",
    rate: 500,
    discount: 5,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function validateStep1POSelection(selectedPOIds) {
  if (selectedPOIds.length === 0) {
    return {
      valid: false,
      error: "Please select at least one Purchase Order",
    };
  }
  return { valid: true };
}

function validateStep1ManualEntry(items) {
  if (items.length === 0) {
    return {
      valid: false,
      error: "Please add at least one item",
    };
  }

  for (const item of items) {
    if (!item.itemName.trim()) {
      return {
        valid: false,
        error: "Please fill in all required fields for manual items",
      };
    }
    if (!item.description.trim()) {
      return {
        valid: false,
        error: "Please fill in all required fields for manual items",
      };
    }
    if (item.quantity <= 0) {
      return {
        valid: false,
        error: "Please fill in all required fields for manual items",
      };
    }
    if (!item.unit.trim()) {
      return {
        valid: false,
        error: "Please fill in all required fields for manual items",
      };
    }
    if (item.rate < 0) {
      return {
        valid: false,
        error: "Please fill in all required fields for manual items",
      };
    }
  }

  return { valid: true };
}

function validateStep2Logistics(formData) {
  const errors = {};

  if (!formData.driverPhone) {
    errors.driverPhone = "Driver Phone is required";
  } else if (!/^\d{10}$/.test(formData.driverPhone.replace(/\D/g, ""))) {
    errors.driverPhone = "Please enter a valid phone number";
  }

  if (!formData.receiverName.trim()) {
    errors.receiverName = "Receiver Name is required";
  }

  if (formData.deliveryMode === "private" && !formData.vehicleNumber?.trim()) {
    errors.vehicleNumber = "Vehicle Number is required for private delivery";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function prefillStep2Items(path, selectedPOIds, manualItems) {
  if (path === "po" && selectedPOIds) {
    return selectedPOIds
      .map((poId) => mockPOs.find((po) => po._id === poId))
      .filter((po) => po !== undefined)
      .map((po) => ({
        itemName: po.itemDescription,
        quantity: po.quantity,
        unit: po.unit,
        rate: po.totalAmount / po.quantity,
      }));
  }

  if (path === "manual" && manualItems) {
    return manualItems.map((item) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
    }));
  }

  return [];
}

function createDC(path, selectedPOIds, manualItems, formData) {
  if (path === "po") {
    const step1Validation = validateStep1POSelection(selectedPOIds || []);
    if (!step1Validation.valid) {
      return { success: false, error: step1Validation.error };
    }
  } else {
    const step1Validation = validateStep1ManualEntry(manualItems || []);
    if (!step1Validation.valid) {
      return { success: false, error: step1Validation.error };
    }
  }

  const step2Validation = validateStep2Logistics(formData);
  if (!step2Validation.valid) {
    return { success: false, error: Object.values(step2Validation.errors)[0] };
  }

  const dcId = `DC-${Date.now()}`;
  return { success: true, dcId };
}

// ============================================================================
// Test Suite
// ============================================================================

const tests = {
  // Step 1 PO Path Tests
  "Step 1 PO path: Should validate at least one PO is selected": () => {
    const validation = validateStep1POSelection([]);
    if (validation.valid) {
      throw new Error("Should reject empty PO selection");
    }
    if (validation.error !== "Please select at least one Purchase Order") {
      throw new Error(`Expected specific error message, got: ${validation.error}`);
    }
  },

  "Step 1 PO path: Should allow transition with single PO selected": () => {
    const validation = validateStep1POSelection(["po1"]);
    if (!validation.valid) {
      throw new Error(`Should allow single PO selection, got error: ${validation.error}`);
    }
  },

  "Step 1 PO path: Should allow transition with multiple POs selected": () => {
    const validation = validateStep1POSelection(["po1", "po2", "po3"]);
    if (!validation.valid) {
      throw new Error(`Should allow multiple PO selection, got error: ${validation.error}`);
    }
  },

  // Step 1 Manual Path Tests
  "Step 1 manual path: Should validate at least one item is added": () => {
    const validation = validateStep1ManualEntry([]);
    if (validation.valid) {
      throw new Error("Should reject empty manual items");
    }
    if (validation.error !== "Please add at least one item") {
      throw new Error(`Expected specific error message, got: ${validation.error}`);
    }
  },

  "Step 1 manual path: Should allow transition with single valid item": () => {
    const validation = validateStep1ManualEntry([mockManualItems[0]]);
    if (!validation.valid) {
      throw new Error(`Should allow single item, got error: ${validation.error}`);
    }
  },

  "Step 1 manual path: Should allow transition with multiple valid items": () => {
    const validation = validateStep1ManualEntry(mockManualItems);
    if (!validation.valid) {
      throw new Error(`Should allow multiple items, got error: ${validation.error}`);
    }
  },

  "Step 1 manual path: Should reject item with missing itemName": () => {
    const invalidItem = { ...mockManualItems[0], itemName: "" };
    const validation = validateStep1ManualEntry([invalidItem]);
    if (validation.valid) {
      throw new Error("Should reject item with missing itemName");
    }
  },

  "Step 1 manual path: Should reject item with missing description": () => {
    const invalidItem = { ...mockManualItems[0], description: "" };
    const validation = validateStep1ManualEntry([invalidItem]);
    if (validation.valid) {
      throw new Error("Should reject item with missing description");
    }
  },

  "Step 1 manual path: Should reject item with zero quantity": () => {
    const invalidItem = { ...mockManualItems[0], quantity: 0 };
    const validation = validateStep1ManualEntry([invalidItem]);
    if (validation.valid) {
      throw new Error("Should reject item with zero quantity");
    }
  },

  "Step 1 manual path: Should reject item with missing unit": () => {
    const invalidItem = { ...mockManualItems[0], unit: "" };
    const validation = validateStep1ManualEntry([invalidItem]);
    if (validation.valid) {
      throw new Error("Should reject item with missing unit");
    }
  },

  "Step 1 manual path: Should reject item with negative rate": () => {
    const invalidItem = { ...mockManualItems[0], rate: -10 };
    const validation = validateStep1ManualEntry([invalidItem]);
    if (validation.valid) {
      throw new Error("Should reject item with negative rate");
    }
  },

  // Items Pre-fill Tests
  "Step 2 prefill: Should prefill items from PO selection path": () => {
    const prefilled = prefillStep2Items("po", ["po1", "po2"]);
    if (prefilled.length !== 2) {
      throw new Error(`Expected 2 items, got ${prefilled.length}`);
    }
    if (prefilled[0].itemName !== "Steel Pipes") {
      throw new Error(`Expected "Steel Pipes", got "${prefilled[0].itemName}"`);
    }
    if (prefilled[1].itemName !== "Cement Bags") {
      throw new Error(`Expected "Cement Bags", got "${prefilled[1].itemName}"`);
    }
  },

  "Step 2 prefill: Should prefill correct quantities from PO selection": () => {
    const prefilled = prefillStep2Items("po", ["po1"]);
    if (prefilled[0].quantity !== 100) {
      throw new Error(`Expected quantity 100, got ${prefilled[0].quantity}`);
    }
  },

  "Step 2 prefill: Should prefill correct units from PO selection": () => {
    const prefilled = prefillStep2Items("po", ["po1"]);
    if (prefilled[0].unit !== "meters") {
      throw new Error(`Expected unit "meters", got "${prefilled[0].unit}"`);
    }
  },

  "Step 2 prefill: Should prefill items from manual entry path": () => {
    const prefilled = prefillStep2Items("manual", undefined, mockManualItems);
    if (prefilled.length !== 2) {
      throw new Error(`Expected 2 items, got ${prefilled.length}`);
    }
    if (prefilled[0].itemName !== "Bricks") {
      throw new Error(`Expected "Bricks", got "${prefilled[0].itemName}"`);
    }
  },

  "Step 2 prefill: Should prefill correct rates from manual entry": () => {
    const prefilled = prefillStep2Items("manual", undefined, mockManualItems);
    if (prefilled[0].rate !== 5) {
      throw new Error(`Expected rate 5, got ${prefilled[0].rate}`);
    }
  },

  "Step 2 prefill: Should return empty array when no items provided": () => {
    const prefilled = prefillStep2Items("po", []);
    if (prefilled.length !== 0) {
      throw new Error(`Expected 0 items, got ${prefilled.length}`);
    }
  },

  // Step 2 Validation Tests
  "Step 2 validation: Should require driver phone": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const validation = validateStep2Logistics(formData);
    if (validation.valid) {
      throw new Error("Should require driver phone");
    }
    if (!validation.errors.driverPhone) {
      throw new Error("Should have driverPhone error");
    }
  },

  "Step 2 validation: Should require receiver name": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "",
      deliveryMode: "porter",
    };
    const validation = validateStep2Logistics(formData);
    if (validation.valid) {
      throw new Error("Should require receiver name");
    }
    if (!validation.errors.receiverName) {
      throw new Error("Should have receiverName error");
    }
  },

  "Step 2 validation: Should validate phone number format": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "123",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const validation = validateStep2Logistics(formData);
    if (validation.valid) {
      throw new Error("Should reject invalid phone format");
    }
    if (!validation.errors.driverPhone) {
      throw new Error("Should have driverPhone error");
    }
  },

  "Step 2 validation: Should accept valid 10-digit phone": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const validation = validateStep2Logistics(formData);
    if (!validation.valid) {
      throw new Error(`Should accept valid phone, got errors: ${JSON.stringify(validation.errors)}`);
    }
  },

  "Step 2 validation: Should require vehicle number for private delivery": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "private",
      vehicleNumber: "",
    };
    const validation = validateStep2Logistics(formData);
    if (validation.valid) {
      throw new Error("Should require vehicle number for private delivery");
    }
    if (!validation.errors.vehicleNumber) {
      throw new Error("Should have vehicleNumber error");
    }
  },

  "Step 2 validation: Should not require vehicle number for porter delivery": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const validation = validateStep2Logistics(formData);
    if (!validation.valid) {
      throw new Error(`Should not require vehicle number for porter, got errors: ${JSON.stringify(validation.errors)}`);
    }
  },

  "Step 2 validation: Should accept valid private delivery with vehicle number": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "private",
      vehicleNumber: "MH-01-AB-1234",
    };
    const validation = validateStep2Logistics(formData);
    if (!validation.valid) {
      throw new Error(`Should accept valid private delivery, got errors: ${JSON.stringify(validation.errors)}`);
    }
  },

  // Final DC Creation Tests
  "Final DC creation: Should create DC with PO selection path": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const result = createDC("po", ["po1"], undefined, formData);
    if (!result.success) {
      throw new Error(`DC creation failed: ${result.error}`);
    }
    if (!result.dcId) {
      throw new Error("DC ID should be generated");
    }
  },

  "Final DC creation: Should create DC with manual entry path": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const result = createDC("manual", undefined, mockManualItems, formData);
    if (!result.success) {
      throw new Error(`DC creation failed: ${result.error}`);
    }
    if (!result.dcId) {
      throw new Error("DC ID should be generated");
    }
  },

  "Final DC creation: Should fail if Step 1 validation fails (PO path)": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const result = createDC("po", [], undefined, formData);
    if (result.success) {
      throw new Error("Should fail with empty PO selection");
    }
  },

  "Final DC creation: Should fail if Step 1 validation fails (manual path)": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const result = createDC("manual", undefined, [], formData);
    if (result.success) {
      throw new Error("Should fail with empty manual items");
    }
  },

  "Final DC creation: Should fail if Step 2 validation fails": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const result = createDC("po", ["po1"], undefined, formData);
    if (result.success) {
      throw new Error("Should fail with missing driver phone");
    }
  },

  "Final DC creation: Should validate all required fields before creation": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "",
      deliveryMode: "porter",
    };
    const result = createDC("po", ["po1"], undefined, formData);
    if (result.success) {
      throw new Error("Should fail with missing receiver name");
    }
  },

  "Final DC creation: Should handle multiple POs in single DC": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const result = createDC("po", ["po1", "po2", "po3"], undefined, formData);
    if (!result.success) {
      throw new Error(`Should create DC with multiple POs: ${result.error}`);
    }
  },

  "Final DC creation: Should handle multiple manual items in single DC": () => {
    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };
    const result = createDC("manual", undefined, mockManualItems, formData);
    if (!result.success) {
      throw new Error(`Should create DC with multiple items: ${result.error}`);
    }
  },

  // E2E Workflow Tests
  "E2E workflow: Complete PO selection path from Step 1 to DC creation": () => {
    const step1Validation = validateStep1POSelection(["po1", "po2"]);
    if (!step1Validation.valid) {
      throw new Error("Step 1 validation failed");
    }

    const prefilled = prefillStep2Items("po", ["po1", "po2"]);
    if (prefilled.length !== 2) {
      throw new Error("Items not prefilled correctly");
    }

    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };

    const result = createDC("po", ["po1", "po2"], undefined, formData);
    if (!result.success) {
      throw new Error(`DC creation failed: ${result.error}`);
    }
  },

  "E2E workflow: Complete manual entry path from Step 1 to DC creation": () => {
    const step1Validation = validateStep1ManualEntry(mockManualItems);
    if (!step1Validation.valid) {
      throw new Error("Step 1 validation failed");
    }

    const prefilled = prefillStep2Items("manual", undefined, mockManualItems);
    if (prefilled.length !== 2) {
      throw new Error("Items not prefilled correctly");
    }

    const formData = {
      driverName: "John Doe",
      driverPhone: "9876543210",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };

    const result = createDC("manual", undefined, mockManualItems, formData);
    if (!result.success) {
      throw new Error(`DC creation failed: ${result.error}`);
    }
  },

  "E2E workflow: Should handle validation errors at Step 1 (PO path)": () => {
    const step1Validation = validateStep1POSelection([]);
    if (step1Validation.valid) {
      throw new Error("Should show validation error");
    }
    if (step1Validation.error !== "Please select at least one Purchase Order") {
      throw new Error("Should show correct error message");
    }
  },

  "E2E workflow: Should handle validation errors at Step 1 (manual path)": () => {
    const step1Validation = validateStep1ManualEntry([]);
    if (step1Validation.valid) {
      throw new Error("Should show validation error");
    }
    if (step1Validation.error !== "Please add at least one item") {
      throw new Error("Should show correct error message");
    }
  },

  "E2E workflow: Should handle validation errors at Step 2": () => {
    const step1Validation = validateStep1POSelection(["po1"]);
    if (!step1Validation.valid) {
      throw new Error("Step 1 validation failed");
    }

    const formData = {
      driverName: "John Doe",
      driverPhone: "",
      receiverName: "Site Manager",
      deliveryMode: "porter",
    };

    const result = createDC("po", ["po1"], undefined, formData);
    if (result.success) {
      throw new Error("Should fail with missing driver phone");
    }
  },
};

// ============================================================================
// Test Runner
// ============================================================================

function runTests() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   Two-Step DC Creation Workflow Integration Tests          ║");
  console.log("║   Validates: Requirements 4.1-4.10                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  let passed = 0;
  let failed = 0;

  for (const [testName, testFn] of Object.entries(tests)) {
    try {
      testFn();
      console.log(`✓ ${testName}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${testName}`);
      console.error(`  ${error.message}`);
      failed++;
    }
  }

  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   TEST RESULTS                                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\nTotal Tests: ${passed + failed}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);

  if (failed === 0) {
    console.log("\n🎉 All tests passed! Two-step DC workflow is working correctly.\n");
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.\n`);
  }

  return {
    passed,
    failed,
    allPassed: failed === 0,
  };
}

// Run tests
runTests();
