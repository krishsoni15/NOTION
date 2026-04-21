# Filters and Search Integration Tests

**Task:** 18 - Create integration tests for filters and search  
**Requirements:** 8.3, 8.4  
**Status:** ✅ Complete

## Overview

Comprehensive integration tests for the Direct Actions filter and search functionality. These tests validate that:
- Type filter (All/CC/DC/PO) works correctly
- Source filter (Direct/Requested) works correctly
- Search query filters by ID and title
- Filter combinations work together

## Test Coverage

### Type Filter Tests (4 tests)
- ✅ Type filter 'all' should return all items
- ✅ Type filter 'cc' should return only CC items
- ✅ Type filter 'dc' should return only DC items
- ✅ Type filter 'po' should return only PO items

**Validates:** Requirement 8.3 - Type filter functionality

### Source Filter Tests (3 tests)
- ✅ Source filter 'all' should return all items
- ✅ Source filter 'direct' should return only direct items
- ✅ Source filter 'request-based' should return only request-based items

**Validates:** Requirement 8.4 - Source filter functionality

### Search Query Tests (7 tests)
- ✅ Search by ID should find matching items
- ✅ Search by title should find matching items
- ✅ Search should be case-insensitive
- ✅ Search should find partial matches in ID
- ✅ Search should find partial matches in title
- ✅ Search with empty query should return all items
- ✅ Search with no query should return all items

**Validates:** Requirement 8.4 - Search functionality

### Filter Combination Tests (7 tests)
- ✅ Type filter CC + Source filter direct should work together
- ✅ Type filter DC + Source filter request-based should work together
- ✅ Type filter PO + Source filter direct + Search should work together
- ✅ Type filter CC + Search should work together
- ✅ Source filter direct + Search should work together
- ✅ All filters combined should work together
- ✅ No results should return empty array

**Validates:** Requirements 8.3, 8.4 - Filter combinations

### Edge Case Tests (4 tests)
- ✅ Items without custom title should still be searchable by ID
- ✅ Search should work with special characters in title
- ✅ Empty items array should return empty result
- ✅ Filter should not modify original items array

**Validates:** Robustness and edge case handling

## Test Data

The tests use a comprehensive dataset with 15 items:

### Cost Comparisons (5 items)
- CC-001: Direct, Draft
- CC-002: Direct, Pending
- CC-003: Direct, Approved
- CC-004: Request-based, Draft
- CC-005: Request-based, Pending

### Delivery Challans (5 items)
- DC-001: Direct, Pending
- DC-002: Direct, Delivered
- DC-003: Direct, Cancelled
- DC-004: Request-based, Pending
- DC-005: Request-based, Delivered

### Purchase Orders (5 items)
- PO-001: Direct, Pending Approval
- PO-002: Direct, Approved
- PO-003: Direct, Ordered
- PO-004: Request-based, Pending Approval
- PO-005: Request-based, Approved

## Running the Tests

### Using the JavaScript Runner (Recommended)
```bash
node components/direct-actions/shared/__tests__/filters-and-search-runner.js
```

### Using the TypeScript Test File
```bash
# Import and run in your test suite
import { runFiltersAndSearchTests } from "./filters-and-search.test.ts";
runFiltersAndSearchTests();
```

### Using the All Tests Runner
```bash
# Run all direct actions tests including filters and search
node components/direct-actions/shared/__tests__/run-all-tests.ts
```

## Test Results

**Total Tests:** 25  
**Passed:** 25 ✅  
**Failed:** 0  

All tests pass successfully, validating that:
1. Type filtering works correctly for all document types
2. Source filtering correctly distinguishes direct vs request-based items
3. Search functionality works with IDs and titles
4. All filter combinations work together without conflicts
5. Edge cases are handled properly

## Implementation Details

### Filter Logic
The `filterDirectActions` utility function implements the following logic:

1. **Entity Type Filter**: Filters by document type (CC, DC, PO, or All)
2. **Action Type Filter**: Filters by source (Direct, Request-based, or All)
3. **Search Query Filter**: Searches in both ID and custom title fields
4. **Status Filter**: Optional filtering by document status

### Direct vs Request-Based Detection
- **CC**: Direct if no `requestId`
- **DC**: Direct if no `poId`
- **PO**: Direct if `isDirect === true` or no `requestId`

### Search Behavior
- Case-insensitive matching
- Searches both ID and title fields
- Supports partial matches
- Handles special characters in titles
- Returns empty array when no matches found

## Requirements Validation

### Requirement 8.3: Type Filter
✅ **Validated** - Tests confirm that:
- Type filter with "All" returns all items
- Type filter with "CC" returns only Cost Comparisons
- Type filter with "DC" returns only Delivery Challans
- Type filter with "PO" returns only Purchase Orders

### Requirement 8.4: Source Filter and Search
✅ **Validated** - Tests confirm that:
- Source filter with "Direct" returns only direct actions
- Source filter with "Request-based" returns only request-based items
- Search query filters by ID and title
- Filter combinations work together correctly

## Files

- `filters-and-search.test.ts` - TypeScript test file with full test suite
- `filters-and-search-runner.js` - Standalone JavaScript test runner
- `FILTERS_AND_SEARCH_TESTS.md` - This documentation file

## Integration with Existing Code

The tests validate the `filterDirectActions` utility function from `utils.ts`, which is used by:
- `DirectActionsTable` component for displaying filtered results
- `DirectActionsFilters` component for managing filter state
- `DirectActionsSection` component for coordinating filters and display

All tests pass with the current implementation, confirming that the filter and search functionality is working correctly.
