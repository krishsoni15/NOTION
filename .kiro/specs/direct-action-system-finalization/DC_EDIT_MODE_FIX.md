# Direct Delivery Challan (DC) Edit Mode Fix

## Problem Statement
The Direct Delivery Dialog was missing edit mode functionality. When users clicked "Edit" on an existing DC, the form would:
1. Not load the existing data
2. Erase data when clicking "Preview & Create"
3. Not transition to the read-only viewer after save

## Solution Implemented

### 1. Enhanced DirectDeliveryDialog Props
Added support for edit mode:
```typescript
interface DirectDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    editingDeliveryId?: Id<"deliveries"> | null;  // NEW: For edit mode
    onViewDC?: (deliveryId: Id<"deliveries">) => void;  // NEW: Callback to open viewer
}
```

### 2. Smart Form Reset Logic
**Before:** Form always reset on dialog open, erasing data during edits.

**After:** Conditional reset based on mode:
- **New Creation Mode** (`!editingDeliveryId`): Reset all fields
- **Edit Mode** (`editingDeliveryId`): Load existing delivery data from database

```typescript
useEffect(() => {
    if (open && !editingDeliveryId) {
        // New creation - reset everything
        setDeliveryMode("porter");
        setDeliveryPersonName("");
        // ... reset all fields
    } else if (open && editingDeliveryId && existingDelivery) {
        // Edit mode - load existing data
        setDeliveryMode(existingDelivery.deliveryType === "public" ? "porter" : "private");
        setDeliveryPersonName(existingDelivery.deliveryPerson || "");
        // ... load all fields from existingDelivery
    }
}, [open, editingDeliveryId, existingDelivery]);
```

### 3. Create vs. Update Logic in handleSubmit
**Before:** Only supported creation.

**After:** Intelligent routing based on mode:

```typescript
const isEditing = !!editingDeliveryId;
let deliveryId: Id<"deliveries">;

if (isEditing) {
    // UPDATE MODE: Call API to update existing DC
    const response = await fetch("/api/update-delivery", {
        method: "POST",
        body: JSON.stringify({
            deliveryId: editingDeliveryId,
            items: validItems.map(item => ({...})),
            deliveryType: deliveryMode === "porter" ? "public" : "private",
            // ... other fields
        }),
    });
    deliveryId = editingDeliveryId;
    toast.success("Delivery Challan updated successfully");
} else {
    // CREATE MODE: Call createDelivery mutation
    const result = await createDelivery({
        items: validItems.map(item => ({...})),
        deliveryType: deliveryMode === "porter" ? "public" : "private",
        // ... other fields
        directDelivery: true,
    });
    deliveryId = result;
    toast.success("Delivery Challan created successfully");
}
```

### 4. Edit-to-View Transition Protocol
**Before:** Dialog just closed, no viewer opened.

**After:** Seamless transition from edit form to read-only viewer:

```typescript
// TRANSITION PROTOCOL: Close form → Open viewer
onOpenChange(false);

// Trigger the view modal with the delivery ID
if (onViewDC) {
    // Small delay to ensure dialog closes first
    setTimeout(() => {
        onViewDC(deliveryId);
    }, 300);
}
```

### 5. Dynamic Button Text
**Before:** Always showed "Preview & Create"

**After:** Context-aware button text:
```typescript
{showPreview 
    ? (editingDirectDCId ? "Save & View" : "Create DC")
    : (editingDirectDCId ? "Preview & Save" : "Preview & Create")
}
```

### 6. Dynamic Dialog Title
**Before:** Always showed "Create Direct Delivery Challan"

**After:** Mode-aware title:
```typescript
{showPreview 
    ? "Preview Delivery Challan" 
    : (editingDeliveryId ? "Edit Delivery Challan" : "Create Direct Delivery Challan")
}
```

### 7. Integration in DirectActionsSection
Updated the parent component to:
- Track editing DC ID: `editingDirectDCId`
- Pass edit ID to dialog: `editingDeliveryId={editingDirectDCId}`
- Implement view callback: `onViewDC={handleViewDC}`
- Clear edit ID on dialog close

```typescript
const handleEditItem = (item: DirectActionItem, resetCallback: () => void) => {
    if (item.type === "dc" && item.id) {
        setEditingDirectDCId(item.id as Id<"deliveries">);
        setDirectDeliveryOpen(true);
    }
};

const handleViewDC = (deliveryId: Id<"deliveries">) => {
    setSelectedDCId(deliveryId);
    setDCPreviewOpen(true);
};
```

## Key Features

✅ **Data Preservation**: Form loads existing data without erasing it
✅ **Smart Reset**: Only resets on new creation, not on edit
✅ **Create/Update Logic**: Automatically routes to correct mutation
✅ **Seamless Transition**: Edit → Save → View in one flow
✅ **User Feedback**: Button text and title reflect current mode
✅ **No Data Loss**: No form.reset() calls during edit process

## API Requirements

The implementation expects an `/api/update-delivery` endpoint to handle DC updates. This endpoint should:
- Accept `deliveryId`, `items`, `deliveryType`, `deliveryPerson`, `deliveryContact`, `vehicleNumber`, `receiverName`, `loadingPhoto`, `invoicePhoto`
- Update the delivery record in the database
- Return success/error response

## Testing Checklist

- [ ] Create new DC: Form starts empty, saves successfully, opens viewer
- [ ] Edit existing DC: Form loads data, can modify, saves without data loss
- [ ] Preview mode: Works in both create and edit modes
- [ ] Button text: Changes appropriately based on mode
- [ ] Dialog title: Reflects current operation (Create/Edit)
- [ ] Transition: After save, viewer opens automatically
- [ ] Cancel: Closes dialog without saving
- [ ] Data validation: Still validates required fields in both modes
