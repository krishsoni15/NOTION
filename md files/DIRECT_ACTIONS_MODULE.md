# Direct Actions Module - Architecture & Implementation Guide

## Overview

The **Direct Actions Module** is a centralized dashboard for managing Cost Comparisons (CC), Delivery Challans (DC), and Purchase Orders (PO) in a unified interface while keeping each entity independent and connected.

## Folder Structure

```
components/direct-actions/
├── shared/
│   ├── types.ts                    # Unified types for CC, DC, PO
│   ├── utils.ts                    # Shared utilities (formatting, filtering, sorting)
│   ├── data-fetcher.ts             # Data transformation functions
│   ├── direct-actions-table.tsx    # Unified table component
│   ├── direct-actions-filters.tsx  # Filter component
│   └── index.ts                    # Shared exports
└── direct-actions-page.tsx         # Main page component

app/dashboard/purchase/
└── direct-actions/
    └── page.tsx                    # Route handler
```

## Key Features

### 1. Unified Dashboard
- Single page to view all CC, DC, and PO records
- Real-time filtering without page reload
- Responsive design for desktop and mobile

### 2. Primary Tabs (Entity Type Filter)
- **All** - Show all records
- **Cost Comparison (CC)** - Show only CC records
- **Delivery Challan (DC)** - Show only DC records
- **Purchase Orders (PO)** - Show only PO records

### 3. Secondary Filters
- **Search** - Search by ID or title
- **Action Type** - Filter by:
  - All Types
  - Direct Actions (no request linked)
  - Request-based (linked to request)

### 4. Table Design
Columns:
- **Title** (Primary) - Displays ID and description
  - CC → `CC-001 | Cost Comparison`
  - DC → `DC-YYYYMMDD-XXXX | Delivery Challan`
  - PO → `PO-001 | Purchase Order`
- **Status** - Color-coded badge
- **Created Date** - Formatted date
- **Actions** - View and Edit buttons

### 5. Creation Flow
- **Create Button** with dropdown menu
- Options:
  - Create Cost Comparison
  - Create Delivery Challan
- Reuses existing dialogs:
  - `CostComparisonDialog`
  - `CreateDeliveryDialog`
- No new dialog UI created

### 6. Statistics Cards
- Total count
- CC count
- DC count
- PO count
- Direct Actions count

## Data Architecture

### Unified Data Model

```typescript
interface DirectActionItem {
  id: string;                    // Formatted ID (CC-001, DC-XXXX, PO-001)
  type: "cc" | "dc" | "po";     // Entity type
  title: string;                 // Display title
  status: string;                // Current status
  createdDate: number;           // Timestamp
  createdBy: Id<"users">;        // Creator ID
  requestId?: Id<"requests">;    // Linked request (if any)
  isDirect: boolean;             // Is direct action (not request-based)
  rawData: any;                  // Original entity data
}
```

### Data Flow

1. **Fetch** - Query data from Convex:
   - `api.costComparisons.getPendingCostComparisons()`
   - `api.purchaseOrders.getAllPurchaseOrders()`
   - `api.deliveries.getAllDeliveries()`

2. **Transform** - Convert to unified format:
   - `transformCC()` - CC → DirectActionItem
   - `transformPO()` - PO → DirectActionItem
   - `transformDC()` - DC → DirectActionItem

3. **Combine** - Merge all entities:
   - `combineDirectActions()` - Combine all transformed items

4. **Filter** - Apply user filters:
   - `filterDirectActions()` - Filter by entity type, action type, search

5. **Sort** - Sort by creation date:
   - `sortByDate()` - Newest first

6. **Display** - Render in table:
   - `DirectActionsTable` - Unified table component

## Shared Utilities

### Formatting Functions

```typescript
// Format ID display
formatEntityId(entity, type) → "CC-001" | "DC-YYYYMMDD-XXXX" | "PO-001"

// Format title with ID and description
formatTitle(entity, type, itemName) → "CC-001 | Cost Comparison"

// Get status badge color
getStatusColor(status, type) → "bg-blue-100 text-blue-800 ..."

// Get status label
getStatusLabel(status) → "Pending Approval" | "Approved" | ...

// Format date
formatDate(timestamp) → "Jan 15, 2024"

// Get entity icon
getEntityIcon(type) → "📊" | "🚚" | "📋"

// Get entity label
getEntityLabel(type) → "Cost Comparison" | "Delivery Challan" | "Purchase Order"
```

### Filtering Functions

```typescript
// Determine if entity is direct action
isDirect(entity, type) → boolean

// Filter items based on criteria
filterDirectActions(items, filters) → DirectActionItem[]

// Sort items by creation date
sortByDate(items) → DirectActionItem[]
```

### Data Transformation

```typescript
// Transform individual entities
transformCC(cc, itemName) → DirectActionItem
transformPO(po) → DirectActionItem
transformDC(dc) → DirectActionItem

// Combine all entities
combineDirectActions(ccs, pos, dcs) → DirectActionItem[]
```

## Component Architecture

### DirectActionsPage (Main Component)

**Responsibilities:**
- Fetch data from Convex
- Manage filter state
- Manage dialog states
- Handle view/edit actions
- Render stats cards
- Render filters
- Render table

**Props:** None (uses Convex hooks)

**State:**
- `filters` - Current filter state
- `ccDialogOpen` - CC dialog visibility
- `dcDialogOpen` - DC dialog visibility
- `selectedCCRequestId` - Selected CC request
- `selectedDCRequestId` - Selected DC request

### DirectActionsFilters (Filter Component)

**Responsibilities:**
- Render primary tabs (entity type)
- Render secondary filters (action type, search)
- Handle filter changes

**Props:**
- `filters: DirectActionFilters` - Current filters
- `onFiltersChange: (filters) => void` - Filter change callback

### DirectActionsTable (Table Component)

**Responsibilities:**
- Render unified table
- Display entity information
- Handle view/edit actions
- Show loading state
- Show empty state

**Props:**
- `items: DirectActionItem[]` - Items to display
- `isLoading?: boolean` - Loading state
- `onView?: (item) => void` - View callback
- `onEdit?: (item) => void` - Edit callback
- `emptyMessage?: string` - Empty state message

## Navigation

### Sidebar Integration

Added "Direct Actions" link to sidebar:
- **Label:** Direct Actions
- **Icon:** Zap (⚡)
- **Route:** `/dashboard/purchase/direct-actions`
- **Roles:** Purchase Officer, Manager
- **Position:** After Dashboard, before Approved Requests

### Route Structure

```
/dashboard/purchase/
├── page.tsx                    # Purchase Dashboard
├── requests/                   # Approved Requests
├── vendors/                    # Vendors Management
├── direct-actions/
│   └── page.tsx               # Direct Actions Dashboard
└── ...
```

## Status Management

### Cost Comparison Statuses
- `draft` - Being created
- `cc_pending` - Awaiting manager approval
- `cc_approved` - Approved by manager
- `cc_rejected` - Rejected by manager

### Delivery Challan Statuses
- `pending` - Out for delivery
- `delivered` - Successfully delivered
- `cancelled` - Cancelled

### Purchase Order Statuses
- `pending_approval` - Awaiting approval
- `sign_pending` - Awaiting signature
- `approved` - Approved
- `ordered` - Ordered
- `delivered` - Delivered
- `rejected` - Rejected
- `cancelled` - Cancelled

## ID Generation Patterns

### Cost Comparison
- Format: `CC-{requestId.slice(-3)}`
- Example: `CC-001`

### Delivery Challan
- Format: `DC-{YYYYMMDD}-{XXXX}`
- Example: `DC-20240115-0001`

### Purchase Order
- Format: `PO-{number}`
- Example: `PO-001`

## Filtering Logic

### Entity Type Filter
- **All** - Show all records
- **CC** - Show only cost comparisons
- **DC** - Show only delivery challans
- **PO** - Show only purchase orders

### Action Type Filter
- **All Types** - Show all
- **Direct Actions** - Show only direct (no request linked)
- **Request-based** - Show only request-based

### Search Filter
- Searches by ID and title
- Case-insensitive
- Real-time filtering

## Important Rules

### Do NOT Break Existing Workflows
- ✅ Reuse existing dialogs (CostComparisonDialog, CreateDeliveryDialog)
- ✅ Keep CC, DC, PO as separate entities
- ✅ Maintain same ID generation patterns
- ✅ Keep UI consistent with current system
- ❌ Do NOT create new dialog UI
- ❌ Do NOT merge schemas
- ❌ Do NOT duplicate backend logic

### Data Independence
- CC, DC, PO remain separate in database
- No new fields or schema changes
- Shared utilities only for formatting/filtering
- Data can be accessed globally across modules

### Scalability
- Module structure allows easy addition of new entities
- Shared utilities can be extended
- Filter system is extensible
- Table component is reusable

## Future Enhancements

1. **Batch Operations**
   - Select multiple items
   - Bulk actions (approve, reject, delete)

2. **Advanced Filtering**
   - Date range filter
   - Status-specific filters
   - User/creator filter

3. **Export Functionality**
   - Export to CSV/Excel
   - Export to PDF

4. **Sorting**
   - Sort by status
   - Sort by date
   - Sort by creator

5. **Pagination**
   - Handle large datasets
   - Lazy loading

6. **Real-time Updates**
   - WebSocket integration
   - Live status updates

## Testing Checklist

- [ ] Filters work without page reload
- [ ] Search functionality works
- [ ] Entity type tabs switch correctly
- [ ] Action type filter works
- [ ] Table displays correct data
- [ ] View button opens correct dialog
- [ ] Edit button opens correct dialog
- [ ] Create dropdown works
- [ ] Stats cards show correct counts
- [ ] Empty state displays correctly
- [ ] Loading state displays correctly
- [ ] Responsive design works on mobile
- [ ] Sidebar link navigates correctly
- [ ] Role-based access works

## Troubleshooting

### Data Not Loading
- Check Convex queries are returning data
- Verify user has correct role
- Check browser console for errors

### Filters Not Working
- Verify filter state is updating
- Check filterDirectActions logic
- Verify data transformation is correct

### Dialogs Not Opening
- Check dialog state management
- Verify dialog components are imported
- Check onClick handlers

### Styling Issues
- Verify Tailwind classes are correct
- Check dark mode compatibility
- Verify responsive breakpoints

## Code Examples

### Using the Module

```typescript
// In a component
import { DirectActionsPage } from "@/components/direct-actions/direct-actions-page";

export default function Page() {
  return <DirectActionsPage />;
}
```

### Adding a New Entity Type

```typescript
// 1. Add type to DirectActionEntity
export type DirectActionEntity = "cc" | "dc" | "po" | "new";

// 2. Create transform function
export function transformNew(entity: NewEntity): DirectActionItem {
  return {
    id: formatEntityId(entity, "new"),
    type: "new",
    title: formatTitle(entity, "new"),
    status: entity.status,
    createdDate: entity.createdAt,
    createdBy: entity.createdBy,
    isDirect: isDirect(entity, "new"),
    rawData: entity,
  };
}

// 3. Add to combineDirectActions
export function combineDirectActions(
  costComparisons = [],
  purchaseOrders = [],
  deliveryChallans = [],
  newEntities = []
): DirectActionItem[] {
  const items: DirectActionItem[] = [];
  // ... existing code ...
  newEntities.forEach((entity) => {
    items.push(transformNew(entity));
  });
  return items;
}
```

## Performance Considerations

- Data fetching uses Convex queries (optimized)
- Filtering is client-side (fast)
- Sorting is client-side (fast)
- Table uses React keys for efficient rendering
- Memoization used for computed values

## Security

- Role-based access control (Purchase Officer, Manager)
- Data fetching respects user permissions
- Dialog actions use existing mutation functions
- No new security vulnerabilities introduced
