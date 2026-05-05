# Requirements Document: Projects UI/UX Redesign

## Introduction

This document specifies the requirements for redesigning the Projects module UI/UX to address usability issues and improve the user experience. The current Projects interface suffers from cluttered design, poor search functionality, and unclear item management. This redesign will modernize the visual design, implement Google-style search, improve project and item visibility, and add site-specific tracking capabilities while preserving all existing backend functionality.

## Glossary

- **Projects_Module**: The application component that manages construction/operational projects
- **Project**: A construction or operational initiative with name, description, location, timeline, and associated items
- **Project_Item**: A material or resource needed for a project, with category, quantity, rate, and make
- **Project_Category**: A classification system for project items (shared across all projects)
- **Site**: A physical location where project items may be needed
- **Search_Engine**: The component that processes user search queries and returns matching projects
- **Item_Manager**: The component that handles adding, editing, and viewing project items
- **Procurement_Pipeline**: The system that processes project items into material requests
- **User**: A manager or purchase officer who can access the Projects module

## Requirements

### Requirement 1: Modern Visual Design

**User Story:** As a user, I want a clean and modern interface, so that I can work efficiently without visual clutter.

#### Acceptance Criteria

1. THE Projects_Module SHALL use a card-based layout with consistent spacing and visual hierarchy
2. THE Projects_Module SHALL apply modern design patterns including rounded corners, subtle shadows, and smooth transitions
3. THE Projects_Module SHALL use a cohesive color scheme that aligns with the application's design system
4. THE Projects_Module SHALL display project status with clear visual indicators (badges, colors, or icons)
5. THE Projects_Module SHALL maintain responsive design that adapts to different screen sizes

### Requirement 2: Google-Style Search

**User Story:** As a user, I want to search projects like Google, so that I can quickly find any project by typing keywords.

#### Acceptance Criteria

1. WHEN a user types in the search field, THE Search_Engine SHALL filter projects in real-time without requiring a submit action
2. THE Search_Engine SHALL match search queries against project name, description, and location fields
3. THE Search_Engine SHALL perform case-insensitive matching
4. THE Search_Engine SHALL highlight or emphasize matching results
5. WHEN the search query is empty, THE Search_Engine SHALL display all projects according to current filters
6. THE Search_Engine SHALL display search results within 200ms of the last keystroke

### Requirement 3: Enhanced Project Discovery

**User Story:** As a user, I want to easily browse and filter projects, so that I can find relevant projects without searching.

#### Acceptance Criteria

1. THE Projects_Module SHALL provide status filters (All, Active, Inactive)
2. THE Projects_Module SHALL provide sort options (Newest First, Oldest First, Name A-Z, Name Z-A)
3. WHEN a user applies filters or sorting, THE Projects_Module SHALL update the project list immediately
4. THE Projects_Module SHALL display the total count of projects matching current filters
5. THE Projects_Module SHALL persist filter and sort preferences in browser storage

### Requirement 4: Clear Project Overview

**User Story:** As a user, I want to see project details and all items in one place, so that I understand what each project needs.

#### Acceptance Criteria

1. WHEN a user views a project, THE Projects_Module SHALL display project name, description, location, status, and timeline in a clear layout
2. WHEN a user views a project, THE Projects_Module SHALL display all associated items with their categories, quantities, rates, and makes
3. THE Projects_Module SHALL calculate and display the total estimated cost for all project items
4. THE Projects_Module SHALL display item count for each project
5. WHEN a project has a PDF attachment, THE Projects_Module SHALL provide a visible download link
6. THE Projects_Module SHALL group items by category for easier scanning

### Requirement 5: Streamlined Item Management

**User Story:** As a user, I want to add and edit project items easily, so that I can maintain accurate project requirements.

#### Acceptance Criteria

1. WHEN a user adds an item, THE Item_Manager SHALL provide a form with fields for name, description, category, make, quantity, and rate
2. THE Item_Manager SHALL validate that required fields (name, category, quantity, rate) are provided before saving
3. WHEN a user selects a category that doesn't exist, THE Item_Manager SHALL allow creating a new category inline
4. WHEN a user edits an item, THE Item_Manager SHALL pre-populate the form with existing values
5. THE Item_Manager SHALL calculate and display the total cost (quantity × rate) for each item
6. THE Item_Manager SHALL provide visual feedback when items are successfully saved or deleted

### Requirement 6: Site-Specific Item Tracking

**User Story:** As a user, I want to specify which site needs which items, so that procurement knows where to deliver materials.

#### Acceptance Criteria

1. WHEN a user sends items to procurement, THE Projects_Module SHALL allow selecting a target site
2. THE Projects_Module SHALL display available sites from the existing sites table
3. WHERE no site is selected, THE Projects_Module SHALL use the first active site as default
4. WHEN items are sent to procurement, THE Projects_Module SHALL include the selected site in the material request
5. THE Projects_Module SHALL display which site each item is assigned to in the project view

### Requirement 7: Improved Item Selection for Procurement

**User Story:** As a user, I want to select specific items to send to procurement, so that I can control which materials are requested.

#### Acceptance Criteria

1. THE Projects_Module SHALL provide checkboxes for selecting individual project items
2. THE Projects_Module SHALL provide a "Select All" option to select all items at once
3. THE Projects_Module SHALL display the count of selected items
4. WHEN no items are selected, THE Projects_Module SHALL disable the "Send to Procurement" button
5. WHEN items are sent to procurement, THE Projects_Module SHALL show a confirmation with the request number
6. THE Projects_Module SHALL clear item selection after successful procurement submission

### Requirement 8: Enhanced Project Creation and Editing

**User Story:** As a user, I want to create and edit projects with a clear form, so that I can manage project information efficiently.

#### Acceptance Criteria

1. WHEN a user creates a project, THE Projects_Module SHALL provide a form with fields for name, description, location, status, and estimated timeline
2. THE Projects_Module SHALL validate that the project name is provided before saving
3. WHEN a user uploads a PDF, THE Projects_Module SHALL display the file name and size before submission
4. THE Projects_Module SHALL support PDF files up to 10MB in size
5. WHEN a user edits a project, THE Projects_Module SHALL pre-populate all existing values
6. WHEN a project has an existing PDF, THE Projects_Module SHALL allow replacing or removing it
7. THE Projects_Module SHALL provide clear success or error messages after save operations

### Requirement 9: Responsive Table and Card Views

**User Story:** As a user, I want to switch between table and card views, so that I can choose the layout that works best for my task.

#### Acceptance Criteria

1. THE Projects_Module SHALL provide a toggle button to switch between table and card views
2. THE Projects_Module SHALL persist the selected view mode in browser storage
3. WHEN in table view, THE Projects_Module SHALL display projects in a sortable table with columns for name, location, status, timeline, and item count
4. WHEN in card view, THE Projects_Module SHALL display projects as cards with visual emphasis on key information
5. THE Projects_Module SHALL maintain current filters and sorting when switching views

### Requirement 10: Pagination and Performance

**User Story:** As a user, I want to navigate large project lists efficiently, so that the interface remains responsive.

#### Acceptance Criteria

1. THE Projects_Module SHALL paginate project lists with configurable page sizes (10, 25, 50, 100)
2. THE Projects_Module SHALL display pagination controls at both top and bottom of the project list
3. THE Projects_Module SHALL persist the selected page size in browser storage
4. WHEN filters change, THE Projects_Module SHALL reset to page 1
5. THE Projects_Module SHALL display the current page range (e.g., "Showing 1-10 of 45")
6. THE Projects_Module SHALL render the project list within 500ms after data is loaded

### Requirement 11: Accessibility and Usability

**User Story:** As a user, I want an accessible interface, so that I can use the Projects module efficiently with keyboard and assistive technologies.

#### Acceptance Criteria

1. THE Projects_Module SHALL support keyboard navigation for all interactive elements
2. THE Projects_Module SHALL provide focus indicators for keyboard navigation
3. THE Projects_Module SHALL use semantic HTML elements for proper screen reader support
4. THE Projects_Module SHALL provide descriptive labels for all form inputs
5. THE Projects_Module SHALL use appropriate ARIA attributes for dynamic content updates
6. THE Projects_Module SHALL maintain a logical tab order throughout the interface

### Requirement 12: Data Preservation

**User Story:** As a user, I want all existing project data and functionality preserved, so that the redesign doesn't disrupt current operations.

#### Acceptance Criteria

1. THE Projects_Module SHALL maintain compatibility with the existing projects table schema
2. THE Projects_Module SHALL maintain compatibility with the existing projectItems table schema
3. THE Projects_Module SHALL maintain compatibility with the existing projectCategories table schema
4. THE Projects_Module SHALL preserve all existing Convex mutations (create, update, delete for projects and items)
5. THE Projects_Module SHALL preserve the existing procurement pipeline integration
6. THE Projects_Module SHALL preserve role-based access control (manager and purchase_officer only)
7. THE Projects_Module SHALL preserve PDF upload and storage functionality
