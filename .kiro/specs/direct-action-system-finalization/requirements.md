# Requirements Document

## Introduction

The Direct Action System Finalization feature enhances the existing Direct Actions module to provide a standardized, user-friendly interface for managing Cost Comparisons (CC), Purchase Orders (PO), and Delivery Challans (DC). This system eliminates implementation gaps, standardizes document identification, and provides seamless integration with existing validated UI components.

## Glossary

- **Direct_Action_System**: The unified interface for managing CC, DC, and PO records
- **Standardized_ID_System**: Sequential three-digit padded identification system (CC-001, PO-002, DC-003)
- **Action_Button**: Dynamic UI element that changes between Edit (pencil) and View (eye) based on document status
- **ViewPOComponent**: Existing component used in "Approved Requests" sidebar for displaying PO documents
- **Two_Step_DC_Creation**: Hybrid workflow splitting DC creation into Selection and Logistics phases
- **Chronological_ID**: Real database-based sequential numbering (0, 1, 2...) converted to padded format
- **Direct_DC**: Delivery Challan created without request linkage using direct item entry or PO selection

## Requirements

### Requirement 1: Standardized Prefix ID System

**User Story:** As a user, I want all Direct Action documents to have consistent, sequential IDs, so that I can easily identify and reference documents chronologically.

#### Acceptance Criteria

1. THE Direct_Action_System SHALL generate sequential three-digit padded IDs for all document types
2. WHEN a Cost Comparison is created, THE Direct_Action_System SHALL assign ID format CC-### (e.g., CC-001, CC-012)
3. WHEN a Purchase Order is created, THE Direct_Action_System SHALL assign ID format PO-### (e.g., PO-003, PO-045)
4. WHEN a Delivery Challan is created, THE Direct_Action_System SHALL assign ID format DC-### (e.g., DC-005, DC-078)
5. THE Direct_Action_System SHALL fetch real chronological IDs from database (0, 1, 2...) and convert to padded format
6. THE Direct_Action_System SHALL keep Title field distinct and fully editable by user independent of ID system
7. FOR ALL document types, THE Direct_Action_System SHALL maintain chronological ordering based on creation timestamp

### Requirement 2: Dynamic Action Button Mapping

**User Story:** As a user, I want action buttons to automatically show the correct option based on document status, so that I never encounter "Not Implemented" errors.

#### Acceptance Criteria

1. THE Direct_Action_System SHALL eliminate all "Not Implemented" errors by dynamically mapping buttons to correct state
2. WHEN a PO record is displayed, THE Action_Button SHALL always show [View] with Eye Icon
3. WHEN a PO View button is clicked, THE Direct_Action_System SHALL open the existing ViewPOComponent used in "Approved Requests" sidebar
4. THE PO popup SHALL display the same "Notion Electronics" document layout and download options as existing implementation
5. WHEN a CC record has status "draft" or "saved", THE Action_Button SHALL show [Edit] with Pencil Icon
6. WHEN a CC record has status "finalized" or "approved", THE Action_Button SHALL show [View] with Eye Icon
7. WHEN a DC record has status "draft" or "saved", THE Action_Button SHALL show [Edit] with Pencil Icon
8. WHEN a DC record has status "finalized" or "approved", THE Action_Button SHALL show [View] with Eye Icon

### Requirement 3: PO View Integration with Existing Component

**User Story:** As a user, I want PO viewing to use the same interface as the approved requests sidebar, so that I have a consistent experience across the application.

#### Acceptance Criteria

1. THE Direct_Action_System SHALL reuse the existing ViewPOComponent for all PO view operations
2. WHEN a PO View button is clicked, THE Direct_Action_System SHALL open the PDFPreviewDialog component
3. THE PO view popup SHALL display identical "Notion Electronics" document layout as existing approved requests
4. THE PO view popup SHALL provide same download, print, and sharing options as existing implementation
5. THE Direct_Action_System SHALL pass correct poNumber parameter to existing ViewPOComponent
6. THE PO view integration SHALL maintain all existing functionality including WhatsApp sharing and email sending

### Requirement 4: Two-Step Direct DC Creation Workflow

**User Story:** As a user, I want to create Delivery Challans through a guided two-step process, so that I can avoid validation errors and have a smooth creation experience.

#### Acceptance Criteria

1. THE Direct_Action_System SHALL implement Two_Step_DC_Creation to eliminate "Driver Phone is required" validation errors
2. WHEN Direct DC creation is initiated, THE Direct_Action_System SHALL display Step 1: Selection UI
3. THE Step 1 Selection UI SHALL provide options for "Using Purchase Orders" and "Manual Entry"
4. WHEN "Using Purchase Orders" is selected, THE Direct_Action_System SHALL display recent PO quick selection interface
5. WHEN "Manual Entry" is selected, THE Direct_Action_System SHALL display manual item entry form with fields for itemName, description, quantity, unit, rate, and discount
6. WHEN user clicks "Continue" in Step 1, THE Direct_Action_System SHALL clear selection state and proceed to Step 2
7. THE Step 2 Logistics UI SHALL reuse existing Standard DC Creation UI from request-based system
8. THE Direct_Action_System SHALL pre-fill items selected in Step 1 into the line-item table automatically
9. THE Step 2 form SHALL include validated fields for Driver Name, Phone, Vehicle No., and Transporter
10. THE Direct_Action_System SHALL validate all "Required" fields only when user clicks final "Create DC" button

### Requirement 5: Code Reuse and Component Integration

**User Story:** As a developer, I want the system to maximize reuse of existing validated components, so that we maintain consistency and reduce development effort.

#### Acceptance Criteria

1. THE Direct_Action_System SHALL reuse existing CreateDeliveryDialog component for Step 2 of DC creation
2. THE Direct_Action_System SHALL reuse existing PDFPreviewDialog component for PO viewing
3. THE Direct_Action_System SHALL reuse existing form validation logic from request-based DC creation
4. THE Direct_Action_System SHALL maintain functional parity with existing validated UI components
5. THE Direct_Action_System SHALL integrate with existing photo upload functionality for DC creation
6. THE Direct_Action_System SHALL preserve all existing error handling and user feedback mechanisms

### Requirement 6: Validation and Error Handling Enhancement

**User Story:** As a user, I want clear validation feedback during DC creation, so that I understand what information is required at each step.

#### Acceptance Criteria

1. WHEN Step 1 validation fails, THE Direct_Action_System SHALL display specific error messages for missing selections
2. IF "Using Purchase Orders" is selected AND no POs are chosen, THE Direct_Action_System SHALL display "Please select at least one Purchase Order"
3. IF "Manual Entry" is selected AND no valid items are added, THE Direct_Action_System SHALL display "Please add at least one valid item with all required fields"
4. THE Direct_Action_System SHALL validate Driver Phone field before allowing Step 2 progression
5. THE Direct_Action_System SHALL validate Receiver Name field before allowing Step 2 progression
6. WHEN final "Create DC" is clicked, THE Direct_Action_System SHALL perform comprehensive validation of all required fields
7. IF validation fails at final step, THE Direct_Action_System SHALL display specific field-level error messages

### Requirement 7: Database Integration and ID Generation

**User Story:** As a system administrator, I want document IDs to be generated from actual database records, so that numbering is accurate and consistent across all instances.

#### Acceptance Criteria

1. THE Direct_Action_System SHALL fetch all existing documents of each type from database for ID generation
2. THE Direct_Action_System SHALL sort documents by creation timestamp (createdAt field) in ascending order
3. THE Direct_Action_System SHALL calculate sequential position of current document in sorted list
4. THE Direct_Action_System SHALL generate three-digit padded number from sequential position (001, 002, 003...)
5. THE Direct_Action_System SHALL combine type prefix with padded number (CC-001, PO-002, DC-003)
6. THE Direct_Action_System SHALL handle concurrent document creation without ID conflicts
7. THE Direct_Action_System SHALL maintain ID consistency across application restarts and deployments

### Requirement 8: User Interface Enhancement

**User Story:** As a user, I want an intuitive interface for managing all Direct Action documents, so that I can efficiently perform my daily tasks.

#### Acceptance Criteria

1. THE Direct_Action_System SHALL display all document types in a unified table interface
2. THE table SHALL show columns for ID, Title, Status, Created Date, and Action
3. THE Direct_Action_System SHALL provide filtering options by document type (CC/PO/DC)
4. THE Direct_Action_System SHALL provide search functionality across document IDs and titles
5. THE Direct_Action_System SHALL allow inline title editing for all document types
6. THE Direct_Action_System SHALL provide visual status indicators using color-coded badges
7. THE Direct_Action_System SHALL maintain responsive design for mobile and desktop usage
8. THE Direct_Action_System SHALL provide loading states and error feedback for all operations