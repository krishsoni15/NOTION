# Action Button System Integration Tests

## Overview

Comprehensive integration tests for the action button system that validate correct button display and editability for all document types (CC, DC, PO) and status combinations.

**Validates Requirements:** 2.1, 2.2, 2.5, 2.6, 2.7, 2.8

## Test Coverage

### 1. CC Edit Button Tests (4 tests)
Tests that Cost Comparison documents show Edit button in draft status:
- ✓ CC draft status shows Edit button
- ✓ CC draft status is editable
- ✓ CC draft with custom title shows Edit button
- ✓ CC draft allows title editing

**Requirement Coverage:**
- 2.5: CC draft status shows Edit button with Pencil Icon
- 8.5: Title editing functionality for CC documents

### 2. CC View Button Tests (6 tests)
Tests that Cost Comparison documents show View button in finalized/approved status:
- ✓ CC finalized status shows View button
- ✓ CC finalized status is not editable
- ✓ CC approved status shows View button
- ✓ CC pending status shows View button
- ✓ CC rejected status shows View button
- ✓ CC finalized with custom title shows View button

**Requirement Coverage:**
- 2.6: CC finalized/approved status shows View button with Eye Icon
- 2.1: Eliminates "Not Implemented" errors

### 3. DC Edit Button Tests (6 tests)
Tests that Delivery Challan documents show Edit button in draft/pending status:
- ✓ DC draft status shows Edit button
- ✓ DC draft status is editable
- ✓ DC pending status shows Edit button
- ✓ DC pending status is editable
- ✓ DC draft with custom title shows Edit button
- ✓ DC pending with custom title shows Edit button

**Requirement Coverage:**
- 2.7: DC draft/pending status shows Edit button with Pencil Icon

### 4. DC View Button Tests (6 tests)
Tests that Delivery Challan documents show View button in finalized/delivered status:
- ✓ DC finalized status shows View button
- ✓ DC finalized status is not editable
- ✓ DC delivered status shows View button
- ✓ DC cancelled status shows View button
- ✓ DC delivered with custom title shows View button
- ✓ DC cancelled with custom title shows View button

**Requirement Coverage:**
- 2.8: DC finalized/delivered status shows View button with Eye Icon

### 5. PO View Button Tests (11 tests)
Tests that Purchase Order documents always show View button regardless of status:
- ✓ PO pending_approval status shows View button
- ✓ PO pending_approval is never editable
- ✓ PO sign_pending status shows View button
- ✓ PO approved status shows View button
- ✓ PO approved is never editable
- ✓ PO ordered status shows View button
- ✓ PO delivered status shows View button
- ✓ PO rejected status shows View button
- ✓ PO cancelled status shows View button
- ✓ PO with custom title always shows View button
- ✓ PO with custom title is never editable

**Requirement Coverage:**
- 2.2: PO always shows View button with Eye Icon
- 2.1: Eliminates "Not Implemented" errors for PO

### 6. Cross-Document Consistency Tests (4 tests)
Tests consistency across different document types:
- ✓ All draft documents show Edit button
- ✓ All finalized documents show View button
- ✓ PO always shows View regardless of other document types
- ✓ CC and DC have different edit status rules

**Requirement Coverage:**
- 2.1: Consistent button mapping across all document types
- 2.5, 2.6, 2.7, 2.8: Status-based button rules

### 7. Status Transition Tests (5 tests)
Tests button behavior during document status transitions:
- ✓ CC transitions from draft to pending correctly
- ✓ CC transitions from pending to approved correctly
- ✓ DC transitions from draft to pending correctly
- ✓ DC transitions from pending to delivered correctly
- ✓ PO remains View throughout all transitions

**Requirement Coverage:**
- 2.1: Dynamic button mapping based on status changes

### 8. Edge Case Tests (5 tests)
Tests edge cases and boundary conditions:
- ✓ Unknown status defaults to View
- ✓ Empty custom title still shows correct button
- ✓ Null custom title still shows correct button
- ✓ Very long custom title still shows correct button
- ✓ Special characters in title don't affect button

**Requirement Coverage:**
- 2.1: Robust error handling for edge cases

## Test Statistics

- **Total Tests:** 47
- **Test Suites:** 8
- **Pass Rate:** 100%
- **Coverage:** All document types (CC, DC, PO) and status combinations

## Running the Tests

### Option 1: Run Integration Tests Only
```bash
node components/direct-actions/shared/__tests__/run-integration-tests.js
```

### Option 2: Run All Tests (Including Unit Tests)
```bash
node components/direct-actions/shared/__tests__/run-all-tests.ts
```

## Test Implementation Details

### Test Structure
Each test follows a consistent pattern:
1. Create mock DirectActionItem with specific type and status
2. Call `getActionButtonType()` or `isItemEditable()`
3. Assert expected button type or editability
4. Throw descriptive error if assertion fails

### Mock Data
Tests use `createMockDirectActionItem()` helper to create realistic DirectActionItem objects with:
- Unique ID generation
- Proper type and status
- Optional custom title
- Complete rawData structure

### Assertion Strategy
Tests validate:
- **Button Type:** "edit" or "view" based on status
- **Editability:** Boolean flag for whether item can be edited
- **Consistency:** Same rules applied across all instances
- **Edge Cases:** Behavior with unusual inputs

## Requirements Mapping

| Requirement | Tests | Coverage |
|-------------|-------|----------|
| 2.1 | All suites | Dynamic button mapping, error elimination |
| 2.2 | PO View Button Tests | PO always shows View |
| 2.5 | CC Edit Button Tests | CC draft shows Edit |
| 2.6 | CC View Button Tests | CC finalized shows View |
| 2.7 | DC Edit Button Tests | DC draft/pending shows Edit |
| 2.8 | DC View Button Tests | DC finalized shows View |
| 8.5 | CC Edit Button Tests | Title editing support |

## Key Validations

### CC Document Rules
- **Draft:** Edit button (editable)
- **Pending/Approved/Rejected:** View button (read-only)

### DC Document Rules
- **Draft/Pending:** Edit button (editable)
- **Delivered/Cancelled:** View button (read-only)

### PO Document Rules
- **All Statuses:** View button (never editable)

## Integration Points

These tests validate integration with:
- `isItemEditable()` utility function
- `getActionButtonType()` utility function
- DirectActionItem data structure
- Status-based button mapping logic

## Future Enhancements

Potential areas for expansion:
1. Component-level integration tests with DirectActionsTable
2. User interaction tests (click handlers)
3. Dialog opening tests for Edit/View actions
4. Performance tests with large datasets
5. Accessibility tests for button labels and icons
