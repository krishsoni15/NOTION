# Design Document: Projects UI/UX Redesign

## Overview

This design document specifies the technical architecture and implementation approach for redesigning the Projects module UI/UX. The redesign modernizes the visual design, implements Google-style real-time search, improves project and item visibility, and adds site-specific tracking capabilities while preserving all existing backend functionality.

### Design Goals

1. **Modern Visual Design**: Implement card-based layouts with consistent spacing, visual hierarchy, and smooth transitions
2. **Real-Time Search**: Provide Google-style instant search across project name, description, and location
3. **Enhanced Discovery**: Add comprehensive filtering, sorting, and pagination controls
4. **Clear Information Architecture**: Display project details and items in an organized, scannable format
5. **Streamlined Workflows**: Simplify item management and procurement submission processes
6. **Site-Specific Tracking**: Enable users to specify delivery sites for project items
7. **Responsive Design**: Support both table and card views with adaptive layouts
8. **Performance**: Ensure fast rendering and responsive interactions
9. **Accessibility**: Provide keyboard navigation and screen reader support
10. **Data Preservation**: Maintain full compatibility with existing Convex backend

### Technology Stack

- **Frontend Framework**: React 18+ with TypeScript
- **UI Components**: Shadcn/ui component library
- **State Management**: Convex React hooks (useQuery, useMutation)
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Notifications**: Sonner toast library
- **File Upload**: Cloudflare R2 via Next.js API routes

## Architecture

### Component Hierarchy

\`\`\`
ProjectManagement (Container)
├── Search & Filter Toolbar
│   ├── SearchInput (real-time filtering)
│   ├── StatusFilter (All/Active/Inactive)
│   ├── SortSelect (Newest/Oldest/Name A-Z/Name Z-A)
│   └── ViewModeToggle (Table/Card)
├── PaginationControls (Top)
├── ProjectTable/ProjectCards (View Layer)
│   ├── ProjectCard (Card View)
│   │   ├── ProjectHeader (name, status, badges)
│   │   ├── ProjectMeta (location, timeline, description)
│   │   └── ProjectActions (view, edit, delete)
│   └── ProjectTableRow (Table View)
│       ├── ProjectCell (name, location, status, timeline)
│       └── ActionsDropdown (view, edit, delete)
├── PaginationControls (Bottom)
├── ProjectFormDialog (Create/Edit)
│   ├── BasicInfoForm (name, description, location, status)
│   ├── TimelineInput (date picker)
│   └── PDFUploadField (file upload with preview)
└── ProjectDetailModal (View/Manage)
    ├── ProjectInfoPane (left)
    │   ├── ProjectHeader (name, status, badges)
    │   ├── ProjectDetails (location, timeline, creator)
    │   ├── ProjectDescription
    │   └── PDFViewer (embedded iframe)
    └── ProjectItemsManager (right)
        ├── ItemForm (add new items)
        ├── ItemList (with selection checkboxes)
        └── ProcurementActions (send to procurement)
\`\`\`

### Data Flow

\`\`\`mermaid
graph TD
    A[User Interaction] --> B[React Component]
    B --> C{Action Type}
    
    C -->|Query| D[useQuery Hook]
    D --> E[Convex Backend]
    E --> F[Database]
    F --> E
    E --> D
    D --> G[Component State]
    
    C -->|Mutation| H[useMutation Hook]
    H --> E
    E --> F
    F --> E
    E --> H
    H --> I[Success/Error]
    I --> J[Toast Notification]
    I --> K[Refetch Queries]
    
    C -->|File Upload| L[Next.js API Route]
    L --> M[Cloudflare R2]
    M --> L
    L --> N[Return URLs]
    N --> H
    
    G --> O[UI Render]
    K --> D
\`\`\`

### State Management Strategy

**Server State (Convex)**:
- Projects list (with real-time updates)
- Project details
- Project items
- Project categories
- Sites list (for procurement)

**Client State (React)**:
- Search query (local filtering)
- Status filter (all/active/inactive)
- Sort order (newest/oldest/name)
- Current page number
- Page size (10/25/50/100)
- View mode (table/card)
- Form data (create/edit dialogs)
- Selected items (for procurement)
- Dialog open/close states

**Persistent State (localStorage)**:
- View mode preference
- Page size preference
- Filter preferences (optional)

## Components and Interfaces

### 1. ProjectManagement Component

**Purpose**: Main container component that orchestrates the entire Projects module UI.

**Props**: None (top-level component)

**State Management**:
- Uses `useProjectLogic` custom hook for all business logic
- Manages dialog open/close states locally
- Delegates view mode to `useViewMode` hook

**Key Features**:
- Renders search and filter toolbar
- Displays pagination controls (top and bottom)
- Switches between table and card views
- Opens create/edit dialogs
- Handles project selection for detail view

**Implementation Notes**:
- Already implemented in current codebase
- Follows LocationManagement component pattern
- Uses consistent styling and layout

### 2. ProjectTable Component

**Purpose**: Displays projects in either table or card view with actions.

**Props**:
\`\`\`typescript
interface ProjectTableProps {
  projects: Project[] | undefined;
  viewMode?: "table" | "card";
}
\`\`\`

**Features**:
- **Table View**: Sortable columns with project name, location, status, timeline, PDF indicator, created date, and actions
- **Card View**: Grid layout with visual emphasis on key information
- **Actions**: View details, edit project, delete project, view PDF
- **Loading States**: Skeleton loaders during data fetch
- **Empty States**: Helpful message when no projects exist

**Styling**:
- Alternating row colors in table view
- Hover effects with subtle shadows
- Smooth animations on mount (staggered fade-in)
- Responsive grid for card view (1-4 columns based on screen size)

### 3. ProjectDetailModal Component

**Purpose**: Full-screen modal for viewing project details and managing items.

**Props**:
\`\`\`typescript
interface ProjectDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects"> | null;
}
\`\`\`

**Layout**: Split-pane design (similar to LocationInfoDialog)
- **Left Pane (60%)**: Project information and PDF viewer
  - Project header with name, status badges
  - Location card with icon
  - Details grid (creator, created date, deadline)
  - Description section
  - Embedded PDF viewer with download/open actions
- **Right Pane (40%)**: Project items manager
  - Add item form
  - Items list with selection checkboxes
  - Send to procurement action

**Features**:
- Gradient header with project icon
- Embedded PDF viewer using iframe
- Real-time item updates
- Site selection for procurement
- Confirmation dialog for procurement submission

### 4. ProjectItemsManager Component

**Purpose**: Manages adding, viewing, and sending project items to procurement.

**Props**:
\`\`\`typescript
interface ProjectItemsManagerProps {
  projectId: Id<"projects">;
}
\`\`\`

**Features**:
- **Add Item Form**:
  - Item name (required)
  - Category selection with inline creation
  - Make/Brand (optional)
  - Quantity (required, numeric)
  - Rate (required, numeric)
  - Description (optional, textarea)
  - Auto-calculated total cost display
- **Items List**:
  - Checkbox selection for each item
  - Select all/deselect all toggle
  - Category badges
  - Quantity, rate, and total display
  - Delete action per item
- **Procurement Actions**:
  - Send to Procurement button (disabled when no selection)
  - Site selection dropdown
  - Confirmation dialog with selected items summary
  - Success toast with RFQ number

**Validation**:
- Required fields: name, category, quantity, rate
- Quantity must be > 0
- Rate must be >= 0
- Category must exist or be created

### 5. ProjectFormDialog Component

**Purpose**: Dialog for creating new projects or editing existing ones.

**Props**:
\`\`\`typescript
interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectData?: Project | null; // For edit mode
}
\`\`\`

**Form Fields**:
- **Project Name** (required, text input)
- **Description** (optional, textarea)
- **Location** (optional, text input)
- **Status** (required, select: active/inactive)
- **Estimated Timeline** (optional, date picker)
- **PDF Upload** (optional, file input with preview)
  - Max size: 10MB
  - Accepted format: PDF only
  - Shows filename and size before upload
  - Replace/remove existing PDF in edit mode

**Behavior**:
- Pre-populates fields in edit mode
- Validates required fields before submission
- Uploads PDF to R2 before creating/updating project
- Shows loading state during submission
- Displays success/error toasts
- Closes dialog on successful submission

### 6. useProjectLogic Hook

**Purpose**: Custom hook that encapsulates all business logic for the Projects module.

**Returns**:
\`\`\`typescript
interface UseProjectLogicReturn {
  // Data
  projects: Project[] | undefined; // Paginated projects
  allProjects: Project[] | undefined; // All filtered projects
  isLoading: boolean;
  
  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string; // "all" | "active" | "inactive"
  setStatusFilter: (filter: string) => void;
  sortBy: ProjectSortOption;
  setSortBy: (sort: ProjectSortOption) => void;
  
  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalItems: number;
  totalPages: number;
  
  // Mutations
  createProject: (args: CreateProjectArgs) => Promise<Id<"projects">>;
  updateProject: (args: UpdateProjectArgs) => Promise<{ success: boolean }>;
  deleteProject: (args: { projectId: Id<"projects"> }) => Promise<{ success: boolean }>;
  
  // Helpers
  uploadPdf: (file: File) => Promise<{ pdfUrl: string; pdfKey: string; pdfFileName: string }>;
}
\`\`\`

**Implementation Details**:
- Uses `useQuery` for projects data
- Uses `useMutation` for create/update/delete operations
- Implements client-side filtering and sorting
- Manages pagination state with localStorage persistence
- Resets to page 1 when filters change
- Provides PDF upload helper function

## Data Models

### Project Type

\`\`\`typescript
type Project = {
  _id: Id<"projects">;
  name: string;
  description?: string;
  location?: string;
  status?: "active" | "inactive";
  timeline?: string; // Legacy string-based timeline
  estimatedTimeline?: number; // Deadline timestamp
  pdfUrl?: string;
  pdfKey?: string;
  pdfFileName?: string;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
};
\`\`\`

### ProjectItem Type

\`\`\`typescript
type ProjectItem = {
  _id: Id<"projectItems">;
  projectId: Id<"projects">;
  name: string;
  description?: string;
  categoryId: Id<"projectCategories">;
  categoryName: string; // Enriched from join
  make?: string;
  quantity: number;
  rate: number;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
};
\`\`\`

### ProjectCategory Type

\`\`\`typescript
type ProjectCategory = {
  _id: Id<"projectCategories">;
  name: string;
  createdBy: Id<"users">;
  createdAt: number;
};
\`\`\`

### Form Data Types

\`\`\`typescript
interface ProjectFormData {
  name: string;
  description: string;
  location: string;
  status: "active" | "inactive";
  timeline?: string;
  estimatedTimeline: Date | null;
  pdfUrl?: string;
  pdfKey?: string;
  pdfFileName?: string;
  pdfFile?: File | null; // Local file for upload
}

interface ProjectItemFormData {
  name: string;
  description: string;
  categoryId: Id<"projectCategories"> | "";
  make: string;
  quantity: number | "";
  rate: number | "";
}
\`\`\`

## Error Handling

### Client-Side Validation

**Project Form**:
- Name is required (non-empty string)
- Status must be "active" or "inactive"
- PDF file must be <= 10MB
- PDF file must be .pdf format

**Item Form**:
- Name is required (non-empty string)
- Category is required (must select or create)
- Quantity is required and must be > 0
- Rate is required and must be >= 0

**Procurement Submission**:
- At least one item must be selected
- Site must be selected (or default to first active site)

### Error Display Strategy

**Toast Notifications**:
- Success: Green toast with checkmark icon
- Error: Red toast with error icon
- Info: Blue toast with info icon

**Inline Validation**:
- Required field indicators (asterisk)
- Red border on invalid fields
- Helper text below fields for validation errors

**Error Messages**:
- Clear, actionable error messages
- Specific to the error type (e.g., "Quantity must be greater than 0")
- Avoid technical jargon

### Backend Error Handling

**Convex Mutations**:
- Wrap mutations in try-catch blocks
- Extract error messages from ConvexError
- Display user-friendly error messages
- Log errors to console for debugging

**File Upload Errors**:
- Handle network errors gracefully
- Show upload progress for large files
- Provide retry option on failure
- Clear error state on successful retry

## Testing Strategy

### Unit Testing

**Component Tests**:
- Test ProjectManagement renders correctly
- Test ProjectTable switches between table and card views
- Test ProjectFormDialog validates required fields
- Test ProjectItemsManager calculates totals correctly
- Test useProjectLogic hook filters and sorts correctly

**Interaction Tests**:
- Test search input filters projects in real-time
- Test status filter updates project list
- Test sort dropdown changes project order
- Test pagination controls navigate pages
- Test view mode toggle switches layouts
- Test item selection checkboxes update state
- Test send to procurement button enables/disables correctly

**Form Tests**:
- Test project form submission with valid data
- Test project form validation with invalid data
- Test item form submission with valid data
- Test item form validation with invalid data
- Test PDF upload with valid file
- Test PDF upload with invalid file (size/format)

### Integration Testing

**End-to-End Workflows**:
1. Create a new project with PDF
2. Add multiple items to the project
3. Select items and send to procurement
4. Edit project details
5. Delete project items
6. Delete project

**Data Flow Tests**:
- Test Convex queries return correct data
- Test Convex mutations update database
- Test real-time updates reflect in UI
- Test PDF upload stores file in R2
- Test procurement submission creates requests

### Accessibility Testing

**Keyboard Navigation**:
- Tab through all interactive elements
- Enter/Space activates buttons and links
- Escape closes dialogs and dropdowns
- Arrow keys navigate dropdown menus

**Screen Reader Testing**:
- Test with NVDA/JAWS on Windows
- Test with VoiceOver on macOS
- Verify all images have alt text
- Verify all form inputs have labels
- Verify all buttons have descriptive text

**WCAG Compliance**:
- Color contrast meets AA standards (4.5:1 for text)
- Focus indicators are visible
- Error messages are announced
- Form validation is accessible
- Dynamic content updates are announced

**Note**: Full WCAG validation requires manual testing with assistive technologies and expert accessibility review.

### Performance Testing

**Rendering Performance**:
- Measure time to first render
- Measure time to interactive
- Test with 100+ projects
- Test with 50+ items per project
- Optimize re-renders with React.memo

**Search Performance**:
- Test search with 1000+ projects
- Measure search response time (target: <200ms)
- Optimize filtering algorithm if needed

**Pagination Performance**:
- Test pagination with large datasets
- Ensure smooth page transitions
- Optimize data slicing

## Implementation Approach

### Phase 1: Foundation (Already Complete)

✅ **Component Structure**:
- ProjectManagement container component
- ProjectTable with table/card views
- ProjectFormDialog for create/edit
- ProjectDetailModal for viewing
- ProjectItemsManager for item management
- useProjectLogic custom hook

✅ **Convex Backend**:
- Projects queries and mutations
- ProjectItems queries and mutations
- ProjectCategories queries and mutations
- PDF upload API route

✅ **Styling**:
- Tailwind CSS configuration
- Shadcn/ui components
- Consistent design tokens
- Responsive layouts

### Phase 2: Enhancements (Current Focus)

**Search Optimization**:
- Implement debounced search input
- Add search result highlighting
- Optimize filtering algorithm for large datasets

**Filter Persistence**:
- Save filter preferences to localStorage
- Restore filters on page load
- Add "Clear Filters" button

**Item Grouping**:
- Group items by category in detail view
- Add category totals
- Implement collapsible category sections

**Site Selection**:
- Add site dropdown to procurement flow
- Display site name in item list
- Validate site selection before submission

### Phase 3: Polish & Optimization

**Performance**:
- Implement virtual scrolling for large lists
- Optimize re-renders with React.memo
- Add loading skeletons for better perceived performance

**Accessibility**:
- Add keyboard shortcuts
- Improve focus management
- Add ARIA labels and descriptions
- Test with screen readers

**User Experience**:
- Add undo/redo for item deletion
- Add bulk actions (delete multiple items)
- Add export to CSV/Excel
- Add print view for projects

### Phase 4: Advanced Features (Future)

**Collaboration**:
- Add comments on projects
- Add activity log
- Add @mentions for team members

**Analytics**:
- Add project cost tracking
- Add item usage reports
- Add procurement timeline visualization

**Integrations**:
- Add calendar integration for deadlines
- Add email notifications
- Add Slack/Teams integration

## Deployment Considerations

### Environment Variables

\`\`\`bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://your-convex-url.convex.cloud
CONVEX_DEPLOY_KEY=your_deploy_key
\`\`\`

### Build Configuration

**Next.js Config**:
\`\`\`javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-bucket.r2.dev'],
  },
  // ... other config
};
\`\`\`

### Database Migration

**No schema changes required** - the redesign uses existing Convex schema:
- `projects` table (already exists)
- `projectItems` table (already exists)
- `projectCategories` table (already exists)
- `sites` table (already exists)

### Rollout Strategy

1. **Development**: Test all features in development environment
2. **Staging**: Deploy to staging for user acceptance testing
3. **Production**: Deploy to production with feature flag
4. **Monitoring**: Monitor error rates and performance metrics
5. **Rollback Plan**: Keep previous version available for quick rollback

### Performance Monitoring

**Metrics to Track**:
- Page load time
- Time to interactive
- Search response time
- Mutation success rate
- Error rate
- User engagement (projects created, items added, procurement submissions)

**Tools**:
- Vercel Analytics for page performance
- Convex Dashboard for backend metrics
- Sentry for error tracking
- Google Analytics for user behavior

## Conclusion

This design document provides a comprehensive blueprint for the Projects UI/UX redesign. The implementation leverages existing components and patterns from the codebase (LocationManagement, LocationInfoDialog) to ensure consistency and maintainability. The redesign focuses on improving usability, performance, and accessibility while preserving all existing backend functionality.

The modular component architecture allows for incremental improvements and easy testing. The use of Convex for real-time data synchronization ensures that all users see up-to-date information without manual refreshes. The responsive design adapts to different screen sizes and user preferences (table vs. card view).

By following this design, the Projects module will provide a modern, efficient, and accessible interface for managing construction projects and their material requirements.

