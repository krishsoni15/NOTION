# Direct Actions Module - Quick Reference

## Overview
The Direct Actions module provides a unified dashboard for viewing and managing Cost Comparisons (CC), Delivery Challans (DC), and Purchase Orders (PO).

## File Structure
```
components/direct-actions/
├── direct-actions-section.tsx          # Main component (embeddable)
└── shared/
    ├── index.ts                        # Barrel export
    ├── types.ts                        # Type definitions
    ├── utils.ts                        # Formatting & filtering
    ├── data-fetcher.ts                 # Data transformation
    ├── direct-actions-table.tsx        # Table component
    └── direct-actions-filters.tsx      # Filter component
```

## Usage

### Basic Integration
```tsx
import { DirectActionsSection } from "@/components/direct-actions/direct-actions-section";

export default function Dashboard() {
  return <DirectActionsSection />;
}
```

### With Options
```tsx
<DirectActionsSection 
  showHeader={true}           // Show title and description
  showCreateButton={true}     // Show create dropdown
  compact={false}             // Normal or compact mode
/>
```

## Component Props

### DirectActionsSection
```tsx
interface DirectActionsSectionProps {
  showHeader?: boolean;        // Default: true
  showCreateButton?: boolean;  // Default: true
  compact?: boolean;           // Default: false
}
```

### DirectActionsTable
```tsx
interface DirectActionsTableProps {
  items: DirectActionItem[];
  isLoading?: boolean;
  onEdit?: (item: DirectActionItem) => void;
  emptyMessage?: string;
}
```

### DirectActionsFilters
```tsx
interface DirectActionsFiltersProps {
  filters: DirectActionFilters;
  onFiltersChange: (filters: DirectActionFilters) => void;
}
```

## Data Types

### DirectActionItem
```tsx
interface DirectActionItem {
  id: string;                    // Unique ID
  type: "cc" | "dc" | "po";     // Entity type
  displayId: string;             // Formatted ID (CC-001)
  customTitle?: string;          // User-defined title
  status: string;                // Current status
  createdDate: number;           // Timestamp
  createdBy: Id<"users">;        // Creator ID
  requestId?: Id<"requests">;    // Associated request
  isDirect: boolean;             // Direct action flag
  rawData: any;                  // Original entity data
}
```

### DirectActionFilters
```tsx
interface DirectActionFilters {
  entityType: "all" | "cc" | "dc" | "po";
  actionType: "all" | "direct" | "request-based";
  searchQuery?: string;
  statusFilter?: string;
}
```

## Key Functions

### Data Transformation
```tsx
// Transform individual entities
transformCC(cc: CostComparison, itemName?: string): DirectActionItem
transformPO(po: PurchaseOrder): DirectActionItem
transformDC(dc: DeliveryChallan): DirectActionItem

// Combine all entities
combineDirectActions(
  costComparisons: CostComparison[],
  purchaseOrders: PurchaseOrder[],
  deliveryChallans: DeliveryChallan[]
): DirectActionItem[]
```

### Filtering & Sorting
```tsx
// Filter items based on criteria
filterDirectActions(items: DirectActionItem[], filters: DirectActionFilters): DirectActionItem[]

// Sort by creation date (newest first)
sortByDate(items: DirectActionItem[]): DirectActionItem[]
```

### Formatting
```tsx
// Format entity ID
formatEntityId(entity: any, type: "cc" | "dc" | "po"): string
// Returns: "CC-001", "DC-20260418-0001", "PO-001"

// Get status color
getStatusColor(status: string, type: "cc" | "dc" | "po"): string

// Get status label
getStatusLabel(status: string): string

// Format date
formatDate(timestamp: number): string
// Returns: "Apr 18, 2026"

// Get entity label
getEntityLabel(type: "cc" | "dc" | "po"): string
// Returns: "Cost Comparison", "Delivery Challan", "Purchase Order"
```

## Status Values

### Cost Comparison (CC)
- `draft` - Draft (not submitted)
- `cc_pending` - Pending Approval
- `cc_approved` - Approved
- `cc_rejected` - Rejected

### Delivery Challan (DC)
- `pending` - Out for Delivery
- `delivered` - Delivered
- `cancelled` - Cancelled

### Purchase Order (PO)
- `pending_approval` - Pending Approval
- `sign_pending` - Awaiting Signature
- `approved` - Approved
- `ordered` - Ordered
- `delivered` - Delivered
- `rejected` - Rejected
- `cancelled` - Cancelled

## ID Formats

| Entity | Format | Example |
|--------|--------|---------|
| CC | CC-XXX | CC-001 |
| DC | DC-YYYYMMDD-XXXX | DC-20260418-0001 |
| PO | PO-XXX | PO-001 |

## Common Tasks

### Display All Records
```tsx
<DirectActionsSection />
```

### Display in Compact Mode
```tsx
<DirectActionsSection compact={true} />
```

### Hide Create Button
```tsx
<DirectActionsSection showCreateButton={false} />
```

### Handle Edit Event
```tsx
const handleEdit = (item: DirectActionItem) => {
  switch (item.type) {
    case "cc":
      // Open CC dialog
      break;
    case "dc":
      // Open DC dialog
      break;
    case "po":
      // Open PO dialog
      break;
  }
};
```

## Important Notes

1. **Creation**: CC and DC cannot be created from Direct Actions. Users must create them from request details.

2. **Editing**: Edit button opens the appropriate dialog with pre-filled data.

3. **Filtering**: Filters work dynamically without page reload.

4. **Responsive**: Component is fully responsive and supports dark mode.

5. **Performance**: Data is fetched once and filtered client-side for better UX.

## Troubleshooting

### No records showing
- Check if data is loading (loading state should show)
- Verify filters are not too restrictive
- Check browser console for errors

### Edit button not working
- Ensure requestId is available for the record
- Check if the appropriate dialog component is imported
- Verify dialog state management

### Filters not working
- Check if filter values are correct
- Verify search query is not empty
- Check if entity type filter is set to "all"

## Related Components

- `CostComparisonDialog` - Edit CC
- `CreateDeliveryDialog` - Edit DC
- `PurchaseOrderDialog` - Edit PO (TODO)

## API Queries Used

- `api.costComparisons.getPendingCostComparisons`
- `api.purchaseOrders.getAllPurchaseOrders`
- `api.deliveries.getAllDeliveries`

---

**Last Updated**: April 18, 2026
