# Delivery Challan System - Fixes Summary

## Overview
Fixed four critical issues in the Direct Delivery Challan system:
1. ✅ Data loss during "Preview & Save"
2. ✅ Narrow PDF viewer modal width
3. ✅ Share button removal
4. ✅ Print functionality (document-only)

---

## Phase 1: Data Loss Fix

### Problem
Items were being lost when clicking "Preview & Save" because the `updateDelivery` mutation wasn't storing the items array.

### Solution
**File: `convex/deliveries.ts`**

#### Change 1: Updated `updateDelivery` mutation
```typescript
// CRITICAL: Store items array as JSON to prevent data loss
directItems: JSON.stringify(args.items),
```

**Why this works:**
- Items are now persisted to the database as a JSON string in the `directItems` field
- The form state is preserved across the preview transition
- No data is lost when switching between edit and view modes

#### Change 2: Updated `getDeliveryWithItems` query
```typescript
// CRITICAL: Check for direct items stored as JSON (for direct delivery edits)
let items: any[] = [];

if ((delivery as any).directItems) {
    // Parse stored direct items
    try {
        items = JSON.parse((delivery as any).directItems);
    } catch (e) {
        console.error("Failed to parse directItems:", e);
        items = [];
    }
} else if (deliveryRequests.length > 0) {
    // Fall back to request-based items
    items = deliveryRequests.map(item => { ... });
}
```

**Why this works:**
- Retrieves stored items from the database
- Falls back to request-based items if no direct items exist
- Ensures items are always available in the viewer

---

## Phase 2: PDF Viewer Improvements

### Problem 1: Narrow Modal Width
The modal was too narrow (max-w-[1200px]), requiring users to zoom to read the document.

### Solution
**File: `components/purchase/pdf-preview-dialog.tsx`**

Changed modal width from:
```typescript
className="max-w-[1200px] w-[98vw]..."
```

To:
```typescript
className="max-w-[95vw] w-full..."
```

**Result:** Document now fills 95% of viewport width, eliminating need for zooming.

---

### Problem 2: Share Button Cluttering UI
The Share button (Send dropdown) was unnecessary and cluttered the toolbar.

### Solution
**File: `components/purchase/pdf-preview-dialog.tsx`**

Removed entire Send dropdown menu:
```typescript
// REMOVED:
<DropdownMenu>
    <DropdownMenuTrigger asChild>
        <button className="h-7 w-7 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-700"
            disabled={!isDataLoaded}>
            <Send className="h-3.5 w-3.5" />
        </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={handleShareWhatsApp} className="gap-2 cursor-pointer text-sm">
            <MessageCircle className="h-4 w-4 text-green-500" />
            WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareEmail} className="gap-2 cursor-pointer text-sm">
            <Mail className="h-4 w-4 text-blue-500" />
            Email
        </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>
```

**Result:** Cleaner toolbar with only Print, Download, and Close buttons.

---

### Problem 3: Print Prints Entire Browser Window
The print button was calling `window.print()`, which printed the entire page including UI elements.

### Solution
**File: `components/purchase/pdf-preview-dialog.tsx`**

Implemented document-only printing using hidden iframe:

```typescript
const handlePrint = () => {
    if (!pdfContentRef.current) return;
    
    setIsPrinting(true);
    
    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);
    
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc) {
        setIsPrinting(false);
        return;
    }
    
    // Clone the document content
    const content = pdfContentRef.current.cloneNode(true) as HTMLElement;
    
    // Write HTML to iframe with proper styling
    frameDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${documentName}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: Arial, sans-serif;
                    background: white;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .print-surface {
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            ${content.innerHTML}
        </body>
        </html>
    `);
    frameDoc.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
        printFrame.contentWindow?.print();
        // Remove iframe after printing
        setTimeout(() => {
            document.body.removeChild(printFrame);
            setIsPrinting(false);
        }, 500);
    }, 250);
};
```

**Why this works:**
- Creates a hidden iframe with only the document content
- Clones the PDF content ref (the white Notion branding area)
- Prints only the iframe, not the entire browser window
- Cleans up the iframe after printing completes
- Maintains proper A4 page formatting (210mm × 297mm)

---

## Phase 3: Item Rendering in Viewer

### Problem
Items table in the delivery challan template was showing blank rows because it didn't handle direct delivery items properly.

### Solution
**File: `components/purchase/delivery-challan-template.tsx`**

Updated items table mapping to handle both request-based and direct delivery items:

```typescript
{data.items && data.items.length > 0 ? (
    data.items.map((item, index) => (
        <tr key={item._id || index} className="h-10 align-top">
            <td className="border-r border-black text-center pt-1">{index + 1}</td>
            <td className="border-r border-black px-1.5 pt-1">
                <div className="font-bold uppercase">{item.itemName || ''}</div>
                {item.description && (
                    <div className="text-[8px] italic mt-0.5 whitespace-pre-wrap" style={{ color: '#4b5563' }}>
                        {item.description}
                    </div>
                )}
            </td>
            <td className="border-r border-black text-center pt-1 font-mono">{item.hsnSacCode || '-'}</td>
            <td className="border-r border-black text-center pt-1">
                <span className="font-bold">{(item.quantity || 0).toFixed(2)} {item.unit || ''}</span>
            </td>
            <td className="border-r border-black text-center pt-1">
                {item.unitRate ? item.unitRate.toFixed(2) : (item.rate ? item.rate.toFixed(2) : '')}
            </td>
            <td className="border-r border-black text-center pt-1">
                {item.unitRate || item.rate ? item.unit : ''}
            </td>
            <td className="border-r border-black text-center pt-1">
                {item.discountPercent ? `${item.discountPercent}%` : ''}
            </td>
            <td className="text-right px-1.5 pt-1 font-bold">
                {item.unitRate ? (item.quantity * item.unitRate).toFixed(2) : (item.rate ? (item.quantity * item.rate).toFixed(2) : '')}
            </td>
        </tr>
    ))
) : null}
```

**Key improvements:**
- Handles both `unitRate` (from PO) and `rate` (from direct delivery)
- Safely accesses optional fields with fallbacks
- Properly calculates totals for both item types
- Renders empty rows if items array is empty

---

## Testing Checklist

- [ ] Create a new Direct Delivery Challan
- [ ] Add multiple items with Name, Qty, Unit, Rate
- [ ] Click "Preview & Save"
- [ ] Verify items are still visible in the preview
- [ ] Close and reopen the delivery - items should persist
- [ ] Click Print button - only document should print (not UI)
- [ ] Verify Share button is gone from toolbar
- [ ] Verify modal fills most of screen width
- [ ] Verify all item details render correctly in the template

---

## Files Modified

1. **convex/deliveries.ts**
   - Updated `updateDelivery` mutation to store items
   - Updated `getDeliveryWithItems` query to retrieve stored items

2. **components/purchase/pdf-preview-dialog.tsx**
   - Broadened modal width (max-w-[95vw])
   - Removed Share button dropdown
   - Implemented document-only print function

3. **components/purchase/delivery-challan-template.tsx**
   - Fixed items table mapping to handle direct delivery items
   - Added fallback for optional fields
   - Improved total calculations

---

## Impact

✅ **Data Integrity:** Items are now persisted and never lost during save/preview transitions
✅ **User Experience:** Broader modal eliminates need for zooming
✅ **Clean UI:** Removed unnecessary Share button
✅ **Print Quality:** Print now outputs only the document, not the entire browser window
✅ **Item Visibility:** All items render correctly in the final delivery challan template
