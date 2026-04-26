# Implementation Plan: Direct Action System Finalization

## Overview

This implementation plan breaks down the Direct Action System Finalization feature into discrete, actionable coding tasks. The tasks are organized to build incrementally from core infrastructure (ID generation) through UI enhancements to the two-step DC creation workflow. Each task builds on previous work and includes validation checkpoints.

## Tasks

- [x] 1. Set up ID generation infrastructure and utilities
  - Create ID generation service with chronological sorting logic
  - Implement ID formatting utilities with three-digit padding
  - Add ID caching layer for performance optimization
  - _Requirements: 1.1, 1.5, 1.6, 1.7_

- [x] 2. Integrate standardized IDs into DirectActionsTable display
  - Update DirectActionsTable to display formatted IDs (CC-001, PO-002, DC-003)
  - Modify data transformation to include displayId field
  - Test ID display with multiple document types
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement dynamic action button mapping logic
  - Create action button service with status-based mapping
  - Implement isItemEditable function for CC, DC, PO status rules
  - Implement getActionButtonType function returning "edit" or "view"
  - Update DirectActionsTable to use dynamic button types
  - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.8_

- [x] 4. Integrate PO viewing with existing PDFPreviewDialog
  - Create handleViewPO function in DirectActionsSection
  - Wire PO View button to open existing PDFPreviewDialog component
  - Pass correct poNumber parameter to viewer
  - Test PO viewing maintains existing functionality (download, print, sharing)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Implement inline title editing in DirectActionsTable
  - Add title editing state management (editingId, editingTitle, titleInput)
  - Implement handleStartTitleEdit and handleSaveTitleEdit functions
  - Add edit icon that appears on hover for title column
  - Integrate with existing updateCCTitle, updatePOTitle, updateDCTitle mutations
  - _Requirements: 8.5_

- [x] 6. Create Step 1 Selection UI for two-step DC creation
  - Build path selection radio group (Using Purchase Orders / Manual Entry)
  - Implement PO quick selection interface showing recent 3 POs
  - Add "Browse All POs" button for extended selection
  - Implement manual item entry form with fields (itemName, description, qty, unit, rate, discount)
  - Add "+ Add Item" button for bulk entry capability
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 7. Implement Step 1 validation and error handling
  - Validate PO selection path (at least one PO selected)
  - Validate manual entry path (at least one valid item with all required fields)
  - Display specific error messages for each validation failure
  - Implement handleNextStep function with validation logic
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Integrate Step 2 with existing CreateDeliveryDialog
  - Modify CreateDeliveryDialog to accept isDirectCreation flag
  - Pre-fill items from Step 1 selection into line-item table
  - Reuse existing validation logic for Driver Name, Phone, Vehicle No., Transporter
  - Maintain existing photo upload functionality
  - _Requirements: 4.6, 4.7, 4.8, 4.9, 5.1, 5.5_

- [x] 9. Implement two-step DC workflow state management
  - Create DCWorkflowState interface for managing step progression
  - Implement state transitions between Step 1 and Step 2
  - Handle state reset when dialog closes
  - Manage selected PO IDs and manual items across steps
  - _Requirements: 4.1, 4.6_

- [x] 10. Add Step 2 validation and final DC creation
  - Validate all required fields before final DC creation
  - Implement comprehensive validation of Driver Phone and Receiver Name
  - Display field-level error messages on validation failure
  - Wire final "Create DC" button to createDelivery mutation
  - _Requirements: 6.4, 6.5, 6.6, 6.7_

- [x] 11. Implement global filters in DirectActionsFilters
  - Add Type filter (All/CC/DC/PO) to filter by document type
  - Add Source filter (Direct/Requested) to filter by action type
  - Update filterDirectActions utility to support new filter criteria
  - Test filter combinations work correctly
  - _Requirements: 8.3, 8.4_

- [x] 12. Add system logging for Direct Action navigation and updates
  - Create logging service for tracking Direct Action events
  - Log all navigation events (view, edit, create)
  - Log all update events (title changes, status changes)
  - Integrate logging into DirectActionsSection and DirectActionsTable
  - _Requirements: 5.0_

- [x] 13. Checkpoint - Verify core functionality
  - Ensure all ID generation tests pass
  - Verify action button mapping works for all status combinations
  - Test PO viewing opens correctly
  - Confirm title editing saves and displays correctly
  - Ensure all tests pass, ask the user if questions arise.

 - [x] 14. Create integration tests for two-step DC creation workflow
  - Test Step 1 → Step 2 transition with PO selection path
  - Test Step 1 → Step 2 transition with manual entry path
  - Test items pre-fill correctly in Step 2
  - Test validation errors display correctly at each step
  - Test final DC creation with all required fields
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 15. Create integration tests for action button system
  - Test CC Edit button appears for draft status
  - Test CC View button appears for finalized/approved status
  - Test DC Edit button appears for draft/pending status
  - Test DC View button appears for finalized/delivered status
  - Test PO always shows View button regardless of status
  - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.8_

- [x] 16. Create integration tests for ID generation system
  - Test chronological sorting of documents by createdAt
  - Test sequential numbering with three-digit padding
  - Test ID format for each document type (CC-###, PO-###, DC-###)
  - Test ID consistency across application restarts
  - Test concurrent document creation doesn't cause ID conflicts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 17. Create integration tests for component reuse
  - Test CreateDeliveryDialog reuse for Step 2 DC creation
  - Test PDFPreviewDialog reuse for PO viewing
  - Test existing validation logic works in direct DC context
  - Test photo upload functionality maintained
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 18. Create integration tests for filters and search
  - Test Type filter (All/CC/DC/PO) works correctly
  - Test Source filter (Direct/Requested) works correctly
  - Test search query filters by ID and title
  - Test filter combinations work together
  - _Requirements: 8.3, 8.4_

- [x] 19. Final checkpoint - Ensure all tests pass
  - Run complete test suite for all implemented features
  - Verify no regressions in existing functionality
  - Test end-to-end workflows for all document types
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Performance optimization and caching
  - Implement ID caching to reduce database queries
  - Add memoization for filtered results
  - Optimize chronological sorting for large datasets
  - Test performance with 1000+ documents
  - _Requirements: 1.5, 1.7_

## Notes

- All tasks focus on code implementation only (no UI/UX design, no deployment)
- Each task builds incrementally on previous work
- Checkpoints at tasks 13 and 19 ensure validation before proceeding
- Integration tests (tasks 14-18) validate complete workflows
- Component reuse (CreateDeliveryDialog, PDFPreviewDialog) maintains consistency
- ID generation uses existing database indexes on createdAt field
- No database migrations required (additive changes only)
- All error handling follows existing patterns in the codebase
