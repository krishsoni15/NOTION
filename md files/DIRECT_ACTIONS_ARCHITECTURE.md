# Direct Actions Module - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DIRECT ACTIONS DASHBOARD                    │
│                    /dashboard/purchase/direct-actions               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │ Convex Query │ │ Convex Query │ │ Convex Query │
            │     (CC)     │ │     (PO)     │ │     (DC)     │
            └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   Data Transformation Layer   │
                    │  (data-fetcher.ts)            │
                    │                               │
                    │  transformCC()                │
                    │  transformPO()                │
                    │  transformDC()                │
                    │  combineDirectActions()       │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   Unified Data Format         │
                    │  DirectActionItem[]           │
                    │                               │
                    │  {                            │
                    │    id, type, title,           │
                    │    status, createdDate,       │
                    │    isDirect, rawData          │
                    │  }                            │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   Filtering & Sorting Layer   │
                    │  (utils.ts)                   │
                    │                               │
                    │  filterDirectActions()        │
                    │  sortByDate()                 │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   Filtered & Sorted Items     │
                    │  DirectActionItem[]           │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   UI Rendering Layer          │
                    │  (direct-actions-page.tsx)    │
                    │                               │
                    │  ┌─────────────────────────┐  │
                    │  │  Stats Cards            │  │
                    │  ├─────────────────────────┤  │
                    │  │  Filters Component      │  │
                    │  │  - Primary Tabs         │  │
                    │  │  - Secondary Filters    │  │
                    │  ├─────────────────────────┤  │
                    │  │  Table Component        │  │
                    │  │  - Rows                 │  │
                    │  │  - Actions              │  │
                    │  └─────────────────────────┘  │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   Dialog Layer                │
                    │  (Reused Components)          │
                    │                               │
                    │  CostComparisonDialog         │
                    │  CreateDeliveryDialog         │
                    └───────────────────────────────┘
```

## Component Hierarchy

```
DirectActionsPage (Main Container)
│
├── Header Section
│   ├── Title & Description
│   └── Create Button (Dropdown)
│       ├── Create Cost Comparison
│       └── Create Delivery Challan
│
├── Stats Section
│   ├── Total Card
│   ├── CC Card
│   ├── DC Card
│   ├── PO Card
│   └── Direct Actions Card
│
├── Filters Section
│   └── DirectActionsFilters
│       ├── Primary Tabs
│       │   ├── All
│       │   ├── Cost Comparison
│       │   ├── Delivery Challan
│       │   └── Purchase Orders
│       └── Secondary Filters
│           ├── Search Input
│           └── Action Type Select
│
├── Table Section
│   └── DirectActionsTable
│       ├── Table Header
│       │   ├── Title
│       │   ├── Status
│       │   ├── Created Date
│       │   └── Actions
│       └── Table Body
│           └── Table Rows (DirectActionItem[])
│               ├── Title Cell
│               ├── Status Cell
│               ├── Date Cell
│               └── Actions Cell
│                   ├── View Button
│                   └── Edit Button
│
└── Dialog Layer
    ├── CostComparisonDialog
    └── CreateDeliveryDialog
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                         │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    [Filter]           [Search]            [Create]
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────▼───────────┐
                │  Update Filter State  │
                │  (React State)        │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    [Fetch Data]      [Transform]         [Filter]
    (Convex)          (data-fetcher)      (utils)
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────▼───────────┐
                │  Filtered Items       │
                │  (DirectActionItem[]) │
                └───────────┬───────────┘
                            │
                ┌───────────▼───────────┐
                │  Render Table         │
                │  (DirectActionsTable) │
                └───────────┬───────────┘
                            │
                ┌───────────▼───────────┐
                │  User Sees Results    │
                │  (Real-time Update)   │
                └───────────────────────┘
```

## File Structure

```
components/direct-actions/
│
├── shared/
│   ├── types.ts
│   │   └── Exports:
│   │       ├── DirectActionEntity
│   │       ├── DirectActionItem
│   │       ├── DirectActionFilters
│   │       ├── CostComparison
│   │       ├── PurchaseOrder
│   │       └── DeliveryChallan
│   │
│   ├── utils.ts
│   │   └── Exports:
│   │       ├── formatEntityId()
│   │       ├── formatTitle()
│   │       ├── getStatusColor()
│   │       ├── getStatusLabel()
│   │       ├── isDirect()
│   │       ├── filterDirectActions()
│   │       ├── sortByDate()
│   │       ├── formatDate()
│   │       ├── getEntityIcon()
│   │       └── getEntityLabel()
│   │
│   ├── data-fetcher.ts
│   │   └── Exports:
│   │       ├── transformCC()
│   │       ├── transformPO()
│   │       ├── transformDC()
│   │       └── combineDirectActions()
│   │
│   ├── direct-actions-table.tsx
│   │   └── Component:
│   │       ├── Props: items, isLoading, onView, onEdit
│   │       └── Renders: Table with rows
│   │
│   ├── direct-actions-filters.tsx
│   │   └── Component:
│   │       ├── Props: filters, onFiltersChange
│   │       └── Renders: Tabs + Secondary filters
│   │
│   └── index.ts
│       └── Re-exports all shared items
│
├── direct-actions-page.tsx
│   └── Component:
│       ├── Fetches data from Convex
│       ├── Manages filter state
│       ├── Manages dialog state
│       ├── Renders: Header, Stats, Filters, Table
│       └── Handles: View, Edit, Create actions
│
└── (No other files in this folder)

app/dashboard/purchase/direct-actions/
└── page.tsx
    └── Route handler
        ├── Checks role (Purchase Officer, Manager)
        └── Renders: DirectActionsPage
```

## State Management

```
DirectActionsPage State:
│
├── filters: DirectActionFilters
│   ├── entityType: "all" | "cc" | "dc" | "po"
│   ├── actionType: "all" | "direct" | "request-based"
│   └── searchQuery?: string
│
├── ccDialogOpen: boolean
├── dcDialogOpen: boolean
├── selectedCCRequestId: Id<"requests"> | null
└── selectedDCRequestId: Id<"requests"> | null

Computed Values (useMemo):
│
├── allItems: DirectActionItem[]
│   └── Combined from CC, PO, DC
│
├── filteredItems: DirectActionItem[]
│   └── Applied filters to allItems
│
└── stats: {
    total, cc, dc, po, direct
}
```

## Data Transformation Pipeline

```
Raw Data (Convex)
│
├── costComparisons: CostComparison[]
├── purchaseOrders: PurchaseOrder[]
└── deliveries: DeliveryChallan[]
│
▼
Transform Layer (data-fetcher.ts)
│
├── transformCC(cc) → DirectActionItem
├── transformPO(po) → DirectActionItem
└── transformDC(dc) → DirectActionItem
│
▼
Combine Layer
│
└── combineDirectActions() → DirectActionItem[]
│
▼
Filter Layer (utils.ts)
│
├── filterDirectActions(items, filters) → DirectActionItem[]
└── sortByDate(items) → DirectActionItem[]
│
▼
Display Layer
│
└── DirectActionsTable renders filtered items
```

## Filtering Logic Flow

```
User Input
│
├── Entity Type Tab Click
│   └── filters.entityType = "cc" | "dc" | "po" | "all"
│
├── Search Input
│   └── filters.searchQuery = "text"
│
└── Action Type Select
    └── filters.actionType = "direct" | "request-based" | "all"
│
▼
filterDirectActions(items, filters)
│
├── Check entityType
│   └── if (filters.entityType !== "all" && item.type !== filters.entityType) skip
│
├── Check actionType
│   ├── if (filters.actionType === "direct" && !isDirect(item)) skip
│   └── if (filters.actionType === "request-based" && isDirect(item)) skip
│
├── Check searchQuery
│   └── if (query && !title.includes(query) && !id.includes(query)) skip
│
└── Return matching items
│
▼
Display in Table
```

## Entity Type Identification

```
Cost Comparison (CC)
├── ID Format: CC-{requestId.slice(-3)}
├── Status: draft | cc_pending | cc_approved | cc_rejected
├── isDirect: false (always request-based)
└── Icon: 📊

Delivery Challan (DC)
├── ID Format: DC-{YYYYMMDD}-{XXXX}
├── Status: pending | delivered | cancelled
├── isDirect: !poId (true if no PO)
└── Icon: 🚚

Purchase Order (PO)
├── ID Format: PO-{number}
├── Status: pending_approval | sign_pending | approved | ordered | delivered | rejected | cancelled
├── isDirect: isDirect === true || !requestId
└── Icon: 📋
```

## Integration Points

```
Existing System
│
├── Convex Backend
│   ├── costComparisons table
│   ├── purchaseOrders table
│   ├── deliveries table
│   └── requests table
│
├── Existing Dialogs
│   ├── CostComparisonDialog
│   └── CreateDeliveryDialog
│
├── Existing UI Components
│   ├── Button, Badge, Table
│   ├── Tabs, Select, Input
│   └── Card, Dialog
│
└── Existing Utilities
    ├── date-fns (formatting)
    └── cn() (class merging)
│
▼
Direct Actions Module
│
├── Queries data from Convex
├── Transforms to unified format
├── Filters and sorts
├── Renders in unified table
└── Opens existing dialogs
```

## Role-Based Access

```
Access Control
│
├── Purchase Officer
│   ├── Can access: ✅
│   ├── Can view: All CC, DC, PO
│   ├── Can create: CC, DC
│   └── Can edit: Own records
│
└── Manager
    ├── Can access: ✅
    ├── Can view: All CC, DC, PO
    ├── Can create: CC, DC
    └── Can edit: All records

Site Engineer
├── Can access: ❌
└── Redirected to: /dashboard/site
```

## Performance Considerations

```
Data Fetching
├── Convex queries (optimized)
├── Parallel queries (3 queries)
└── Cached results

Filtering
├── Client-side (fast)
├── Real-time (no delay)
└── Memoized (no re-computation)

Rendering
├── React keys (efficient)
├── Memoized components
└── Lazy loading (future)

Memory
├── No data duplication
├── Efficient state management
└── Proper cleanup
```

## Error Handling

```
Error Scenarios
│
├── Data Fetch Error
│   └── Show loading state, retry on refresh
│
├── Transform Error
│   └── Skip item, log error
│
├── Filter Error
│   └── Show all items, log error
│
├── Dialog Error
│   └── Show error toast, close dialog
│
└── Permission Error
    └── Redirect to login/dashboard
```

## Future Architecture Extensions

```
Potential Additions
│
├── Batch Operations
│   ├── Select multiple items
│   └── Bulk actions
│
├── Advanced Filtering
│   ├── Date range filter
│   ├── Status-specific filters
│   └── User/creator filter
│
├── Export Functionality
│   ├── CSV export
│   ├── Excel export
│   └── PDF export
│
├── Sorting
│   ├── Sort by status
│   ├── Sort by date
│   └── Sort by creator
│
├── Pagination
│   ├── Handle large datasets
│   └── Lazy loading
│
└── Real-time Updates
    ├── WebSocket integration
    └── Live status updates
```

This architecture ensures:
- ✅ Clean separation of concerns
- ✅ Reusable components
- ✅ Scalable design
- ✅ No breaking changes
- ✅ Easy to maintain
- ✅ Easy to extend
