# Direct Actions Module - Quick Start Guide

## 🚀 Getting Started

### Access the Dashboard
1. Login to the application
2. Ensure you have **Purchase Officer** or **Manager** role
3. Click **"Direct Actions"** in the sidebar (⚡ icon)
4. You'll see the unified dashboard

### URL
```
/dashboard/purchase/direct-actions
```

## 📊 Dashboard Overview

### What You'll See

```
┌─────────────────────────────────────────────────────────────┐
│ Direct Actions                                              │
│ Manage Cost Comparisons, Delivery Challans, and POs        │
│                                                    [Create ▼] │
├─────────────────────────────────────────────────────────────┤
│ Stats Cards:                                                │
│ [Total] [CC] [DC] [PO] [Direct Actions]                   │
├─────────────────────────────────────────────────────────────┤
│ Filters:                                                    │
│ [All] [CC] [DC] [PO]  [Search...] [All Types ▼]          │
├─────────────────────────────────────────────────────────────┤
│ Table:                                                      │
│ Title          │ Status │ Created Date │ Actions           │
│ CC-001 | ...   │ Pending│ Jan 15, 2024 │ [View] [Edit]    │
│ DC-20240115... │ Pending│ Jan 15, 2024 │ [View] [Edit]    │
│ PO-001 | ...   │ Ordered│ Jan 14, 2024 │ [View] [Edit]    │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Filtering Records

### Primary Tabs (Entity Type)
Click to filter by record type:
- **All** - Show everything
- **Cost Comparison** - Show only CC records
- **Delivery Challan** - Show only DC records
- **Purchase Orders** - Show only PO records

### Secondary Filters

**Search Box**
- Type ID or title
- Example: "CC-001" or "cement"
- Real-time filtering

**Action Type Dropdown**
- **All Types** - Show all
- **Direct Actions** - Show only direct (no request)
- **Request-based** - Show only request-linked

## ➕ Creating Records

### Step 1: Click Create Button
Located in top-right corner

### Step 2: Select Type
- **Cost Comparison** - Compare vendor quotes
- **Delivery Challan** - Create delivery record

### Step 3: Fill Form
The existing dialog will open with all fields

### Step 4: Submit
Click submit button to create record

## 👁️ Viewing Records

### Method 1: Click Row
Click anywhere on the table row to view details

### Method 2: Click View Button
Click the "View" button in the Actions column

### What Opens
The appropriate dialog for that record type:
- CC → Cost Comparison Dialog
- DC → Delivery Challan Dialog
- PO → Purchase Order Dialog

## ✏️ Editing Records

### Step 1: Click Edit Button
In the Actions column

### Step 2: Modify Details
Update the fields in the dialog

### Step 3: Save
Click save/submit button

## 📈 Understanding the Table

### Title Column
Shows record ID and description:
- `CC-001 | Cost Comparison`
- `DC-20240115-0001 | Delivery Challan`
- `PO-001 | Purchase Order`

Also shows:
- Record type icon (📊 🚚 📋)
- "Direct Action" or "Request-based" label

### Status Column
Color-coded badge showing current status:
- **Blue** - Pending/Awaiting approval
- **Green** - Approved/Delivered
- **Red** - Rejected/Cancelled
- **Yellow** - In progress

### Created Date Column
When the record was created (formatted date)

### Actions Column
- **View** - Open record details
- **Edit** - Modify record

## 📊 Understanding Stats Cards

Shows counts for:
- **Total** - All records combined
- **Cost Comparisons** - CC records only
- **Delivery Challans** - DC records only
- **Purchase Orders** - PO records only
- **Direct Actions** - Records without request link

## 🎯 Common Tasks

### Find All Pending Cost Comparisons
1. Click "Cost Comparison" tab
2. All CC records appear
3. Filter by status if needed

### Find Direct Purchase Orders
1. Click "Purchase Orders" tab
2. Select "Direct Actions" in filter
3. Only direct POs appear

### Search for Specific Record
1. Type ID in search box (e.g., "PO-001")
2. Table updates in real-time
3. Click to view details

### Create New Cost Comparison
1. Click "Create" button
2. Select "Cost Comparison"
3. Fill in vendor quotes
4. Submit

### Create New Delivery Challan
1. Click "Create" button
2. Select "Delivery Challan"
3. Fill in delivery details
4. Submit

## 🔐 Access Control

### Who Can Access
- **Purchase Officers** - Full access
- **Managers** - Full access
- **Site Engineers** - No access

### What You Can Do
- View all records
- Create new records
- Edit existing records
- Filter and search

## 💡 Tips & Tricks

### Tip 1: Use Search for Quick Access
Instead of scrolling, type the ID in search box

### Tip 2: Combine Filters
Use tabs + search + action type together for precise filtering

### Tip 3: Check Stats First
Stats cards show quick overview before filtering

### Tip 4: Use Action Type Filter
Quickly find direct vs request-based records

### Tip 5: Click Row for Quick View
Faster than clicking View button

## ⚠️ Important Notes

### Data Independence
- CC, DC, and PO are separate entities
- Deleting one doesn't affect others
- Each has its own workflow

### No Page Reload
- All filtering is instant
- No need to refresh page
- Changes appear immediately

### Existing Dialogs
- Uses same dialogs as before
- Same validation rules
- Same submission logic

### Role-Based Access
- Only Purchase Officers and Managers can access
- Site Engineers cannot see this page
- Permissions enforced at backend

## 🆘 Troubleshooting

### Records Not Showing
**Problem:** Table is empty
**Solution:**
1. Check if you have correct role
2. Try refreshing page
3. Check filters aren't too restrictive
4. Check search box is empty

### Filters Not Working
**Problem:** Filters don't change results
**Solution:**
1. Check if data exists for that filter
2. Try clearing search box
3. Try resetting to "All" tab
4. Refresh page

### Dialog Won't Open
**Problem:** View/Edit button doesn't work
**Solution:**
1. Check if record data is loaded
2. Try clicking row instead
3. Check browser console for errors
4. Refresh page

### Can't Create Record
**Problem:** Create button doesn't work
**Solution:**
1. Check if you have correct role
2. Check if required fields are filled
3. Check browser console for errors
4. Try refreshing page

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review DIRECT_ACTIONS_MODULE.md for detailed docs
3. Check browser console for error messages
4. Contact system administrator

## 🎓 Learning Resources

### Full Documentation
See `DIRECT_ACTIONS_MODULE.md` for:
- Complete architecture
- Data models
- Component details
- Advanced features

### Implementation Details
See `DIRECT_ACTIONS_IMPLEMENTATION_SUMMARY.md` for:
- What was created
- How it works
- Future enhancements
- Testing recommendations

## ✅ Checklist

Before using the module:
- [ ] You have Purchase Officer or Manager role
- [ ] You can see "Direct Actions" in sidebar
- [ ] You can access `/dashboard/purchase/direct-actions`
- [ ] Dashboard loads without errors
- [ ] You can see stats cards
- [ ] You can see table with records
- [ ] Filters work
- [ ] Create button works
- [ ] View/Edit buttons work

## 🎉 You're Ready!

The Direct Actions module is ready to use. Start by:
1. Exploring the dashboard
2. Trying different filters
3. Creating a test record
4. Viewing and editing records

Enjoy the unified dashboard! 🚀
