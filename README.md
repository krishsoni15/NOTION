<div align="center">

# 🏗️ NOTION CRM

### **Enterprise-Grade Construction Material & Purchase Management System**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Convex](https://img.shields.io/badge/Convex-Realtime_DB-FF6B35)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF)](https://clerk.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4)](https://tailwindcss.com/)

---

*A full-stack, real-time CRM for managing material requests, cost comparisons, purchase orders, delivery challans, inventory, vendors, chat, and sticky notes — built for construction & enterprise teams.*

</div>

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Tech Stack](#-tech-stack)
3. [Project Structure](#-project-structure)
4. [User Roles & Permissions](#-user-roles--permissions)
5. [📒 GRN — Complete Action Logs](#-grn--complete-action-logs)
   - [GRN-1: Material Requests](#grn-1-material-requests)
   - [GRN-2: Manager Approval](#grn-2-manager-approval)
   - [GRN-3: Purchase Officer Recheck](#grn-3-purchase-officer-recheck)
   - [GRN-4: Cost Comparison](#grn-4-cost-comparison)
   - [GRN-5: Purchase Orders](#grn-5-purchase-orders)
   - [GRN-6: PO Digital Signature](#grn-6-po-digital-signature)
   - [GRN-7: Delivery Challan](#grn-7-delivery-challan)
   - [GRN-8: Delivery Confirmation](#grn-8-delivery-confirmation)
   - [GRN-9: Inventory Management](#grn-9-inventory-management)
   - [GRN-10: Vendor Management](#grn-10-vendor-management)
   - [GRN-11: User Management](#grn-11-user-management)
   - [GRN-12: Site Management](#grn-12-site-management)
   - [GRN-13: Chat System](#grn-13-chat-system)
   - [GRN-14: Sticky Notes](#grn-14-sticky-notes)
   - [GRN-15: Notifications](#grn-15-notifications)
   - [GRN-16: Profile & Signature](#grn-16-profile--signature)
   - [GRN-17: View-Only Actions](#grn-17-view-only-actions)
   - [GRN-18: Shortcut Workflows](#grn-18-shortcut-workflows)
6. [Complete Status Registry](#-complete-status-registry)
7. [Database Schema](#-database-schema)
8. [API Reference — All 58 Mutations](#-api-reference--all-58-mutations)
9. [Features](#-features)
10. [Quick Start](#-quick-start)
11. [Environment Variables](#-environment-variables)
12. [Deployment](#-deployment)
13. [End-to-End Testing](#-end-to-end-testing)
14. [Security](#-security)
15. [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

**NOTION CRM** is an enterprise-grade, real-time construction material management system. It tracks the complete lifecycle of material requests — from creation to delivery confirmation — with full audit trails, role-based access control, digital signatures, PDF generation, and inventory integration.

| Feature | Description |
|:--------|:------------|
| 🔄 **Real-time** | Convex-powered live data — all dashboards update instantly |
| 🔐 **RBAC** | 3 roles with 16+ granular permissions |
| 📋 **Audit Trail** | Every action timestamped with actor, role, and notes |
| 📄 **PDF Generation** | Auto-generated PO PDFs with digital signatures |
| 📦 **Inventory Sync** | Stock auto-updates on delivery confirmation |
| 💬 **Chat** | Real-time 1:1 messaging with images, location, read receipts |
| 📝 **Sticky Notes** | Draggable, color-coded, checklists, reminders |
| 🌓 **Themes** | Light / dark mode |
| 📱 **Responsive** | Mobile-first with card + table view toggle |

---

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19 + shadcn/ui (34 components) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Auth** | Clerk (username + password **only**) |
| **Database** | Convex (real-time reactive) |
| **Images** | Cloudinary + Cloudflare R2 |
| **PDF** | @react-pdf/renderer, jspdf, html2pdf.js |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Maps** | Leaflet + React Leaflet |
| **Forms** | React Hook Form + Zod |

---

## 📁 Project Structure

```
NOTION/
├── app/                           # Next.js App Router
│   ├── (auth)/login/              # Login page
│   ├── api/                       # API routes (upload, admin, webhooks)
│   ├── dashboard/
│   │   ├── site/                  # 🟢 Site Engineer dashboard
│   │   ├── manager/               # 🔵 Manager dashboard
│   │   └── purchase/              # 🟣 Purchase Officer dashboard
│   └── po/                        # Public PO viewer (no auth)
├── components/
│   ├── purchase/ (19 files)       # POs, DCs, check dialogs, CC
│   ├── requests/ (10 files)       # Requests, details, delivery confirm
│   ├── chat/ (17 files)           # Real-time messaging
│   ├── inventory/ (8 files)       # Stock management
│   ├── user-management/ (9 files) # CRUD users
│   ├── vendors/ (4 files)         # Vendor CRUD
│   ├── sticky-notes/ (8 files)    # Notes system
│   ├── locations/ (5 files)       # Site management
│   ├── profile/ (5 files)         # User profile + signature
│   └── ui/ (34 files)             # shadcn components
├── convex/ (14 modules)           # Backend — 58 mutations total
├── lib/auth/                      # Permissions + roles
└── docs/                          # Additional docs
```

---

## 👥 User Roles & Permissions

| Role | Route | Primary Job |
|:-----|:------|:------------|
| 🟢 **Site Engineer (SE)** | `/dashboard/site` | Create requests, confirm deliveries |
| 🔵 **Manager (MGR)** | `/dashboard/manager` | Approve/reject, sign POs, manage users |
| 🟣 **Purchase Officer (PO)** | `/dashboard/purchase` | CCs, POs, DCs, vendors, inventory |

### Permission Matrix

| Permission | 🟢 SE | 🔵 MGR | 🟣 PO |
|:-----------|:---:|:---:|:---:|
| Create Material Request | ✅ | ❌ | ❌ |
| View Own Requests | ✅ | ❌ | ❌ |
| View All Requests | ❌ | ✅ | ✅ |
| Approve / Reject Request | ❌ | ✅ | ❌ |
| Confirm Delivery | ✅ | ❌ | ❌ |
| Create / Edit Users | ❌ | ✅ | ❌ |
| Assign Roles | ❌ | ✅ | ❌ |
| Disable / Enable Users | ❌ | ✅ | ❌ |
| Create / View / Edit POs | ❌ | ❌ | ✅ |
| Sign / Reject PO | ❌ | ✅ | ❌ |
| Create / Edit / Delete Vendors | ❌ | ❌ | ✅ |
| View Vendors | ❌ | ✅ | ✅ |
| Create / Edit / Delete Inventory | ❌ | ❌ | ✅ |
| View Inventory | ✅ | ✅ | ✅ |
| Add Inventory Images | ✅ | ❌ | ✅ |

---

## 📒 GRN — Complete Action Logs

> **GRN (General Record of Notifications)** — The master audit log of **every action button** in the application. Every main action automatically writes a GRN log entry to the `request_notes` table, recording: **who** did it, **what role** they have, **which status** the item was in, **what action** was taken, and **when** it happened. These logs are visible in the **Notes Timeline** dialog for every request.
>
> 📌 **GRN logs are implemented in the backend code** — every mutation below inserts a `request_notes` record with the actor, role, status, descriptive content, and timestamp.

> **Total: 58 backend mutations across 14 modules, 78+ UI components — ALL main actions log GRN entries**

---

### GRN-1: Material Requests

> **Role:** 🟢 Site Engineer  
> **Components:** `material-request-form.tsx`, `requests-table.tsx`, `site-requests-content.tsx`

| GRN # | Button | Component | Mutation | Before → After | Data Logged |
|:------|:-------|:----------|:---------|:---------------|:------------|
| GRN-1.1 | **Save as Draft** | `material-request-form` | `requests.saveMultipleMaterialRequestsAsDraft` | — → `draft` | `createdBy`, `createdAt`, `siteId`, items[], photos[], notes, requestNumber=`DRAFT-XXX` |
| GRN-1.2 | **Submit Request** | `material-request-form` | `requests.createMultipleMaterialRequests` | — → `pending` | Same as 1.1 but with sequential number `001, 002...` |
| GRN-1.3 | **Edit Draft** ✏️ | `requests-table` | `requests.updateDraftRequest` | `draft` → `draft` | Deletes old items, creates new with same DRAFT# |
| GRN-1.4 | **Delete Draft** 🗑️ | `requests-table` | `requests.deleteDraftRequest` | `draft` → *(deleted)* | Permanently removed from DB |
| GRN-1.5 | **Send Request** ✈️ | `requests-table` / `site-requests-content` | `requests.sendDraftRequest` | `draft` → `pending` | Reassigns sequential number, migrates notes |
| GRN-1.6 | **Save as Draft** *(edit mode)* | `material-request-form` | `requests.updateDraftRequest` | `draft` → `draft` | Updates existing draft items |

**Per-item fields:** `itemName`, `description`, `specsBrand`, `quantity`, `unit`, `requiredBy`, `isUrgent`, `photos[]`, `notes`, `siteId`

---

### GRN-2: Manager Approval

> **Role:** 🔵 Manager  
> **Components:** `request-details-dialog.tsx`, `requests-table.tsx`

| GRN # | Button | Component | Mutation | Before → After | Data Logged |
|:------|:-------|:----------|:---------|:---------------|:------------|
| GRN-2.1 | **Approve All** | `request-details-dialog` | `requests.updateRequestStatus` (status: `approved`) | `pending` → `recheck` | `approvedBy`, `approvedAt` |
| GRN-2.2 | **Reject All** | `request-details-dialog` | `requests.updateRequestStatus` (status: `rejected`) | `pending` → `rejected` | `rejectionReason`, `approvedBy`, `approvedAt`, timeline note |
| GRN-2.3 | **Direct PO** *(all items)* | `request-details-dialog` | `requests.updateRequestStatus` (status: `direct_po`, directAction: `po`) | `pending` → `recheck` | `directAction: "po"`, `approvedBy` |
| GRN-2.4 | **Direct PO** *(per-item toggle)* | `request-details-dialog` | `requests.updateRequestStatus` per item | `pending` → `recheck` | Individual item directAction flag |
| GRN-2.5 | **Confirm Direct PO** *(dialog)* | `request-details-dialog` | `requests.updateRequestStatus` bulk | All pending → `recheck` | Batch directAction for all items |
| GRN-2.6 | **Bulk Approve** | `requests-table` | `requests.bulkUpdateRequestStatus` (status: `approved`) | Multiple → `recheck` | `approvedBy` for each |
| GRN-2.7 | **Bulk Reject** | `requests-table` | `requests.bulkUpdateRequestStatus` (status: `rejected`) | Multiple → `rejected` | `rejectionReason` for each |
| GRN-2.8 | **Sign PO** *(from details)* | `request-details-dialog` | `purchaseOrders.approveDirectPOByRequest` | `sign_pending` → `pending_po` | `approvedBy`, `approvedAt`, digital signature |
| GRN-2.9 | **Reject PO** *(from details)* | `request-details-dialog` | `purchaseOrders.rejectDirectPOByRequest` | `sign_pending` → `sign_rejected` | `rejectionReason`, timeline note |

---

### GRN-3: Purchase Officer Recheck

> **Role:** 🟣 Purchase Officer  
> **Components:** `check-dialog.tsx`, `purchase-request-group-card.tsx`, `requests-table.tsx`

#### GRN-3A: Card & Table Buttons

| GRN # | Button | Icon | Component | Shows When | Action |
|:------|:-------|:-----|:----------|:-----------|:-------|
| GRN-3.1 | **Check/Split** | ✨ Sparkles | Card + Table | `approved` or `recheck` | Opens `CheckDialog` |
| GRN-3.2 | **Create CC** | 📄 FileText | Card + Table | `ready_for_cc` | Opens `CostComparisonDialog` |
| GRN-3.3 | **Review CC** | ✅ CheckCircle | Card + Table | `cc_pending` (Manager only) | Opens `CostComparisonDialog` |
| GRN-3.4 | **Resubmit CC** | 🔄 RotateCw | Card + Table | `cc_rejected` (PO only) | Opens `CostComparisonDialog` |
| GRN-3.5 | **Create PO** | 🛒 ShoppingCart | Card + Table | `ready_for_po` or `direct_po` | Opens `DirectPODialog` |
| GRN-3.6 | **Create DC** | 🚚 Truck | Card + Table | `ready_for_delivery` | Opens `CreateDCMultiDialog` |
| GRN-3.7 | **View DC** | 👁️ Eye | Card + Table | `out_for_delivery` / `delivered` + has `deliveryId` | Opens `ViewDCDialog` |
| GRN-3.8 | **Confirm Delivered** | ✅ CheckCircle | Card + Table | `out_for_delivery` | Opens `ConfirmDeliveryDialog` |
| GRN-3.9 | **View PDF** | 📄 FileText | Card + Table | Has `poNumber` | Opens `PDFPreviewDialog` |
| GRN-3.10 | **View Details** | 👁️ Eye | Card + Table | Always | Opens `RequestDetailsDialog` |
| GRN-3.11 | **Notes Timeline** | 📝 NotebookPen | Card + Table | Always | Opens `NotesTimelineDialog` |
| GRN-3.12 | **Open in Map** | 📍 MapPin | Card | Has site address | Opens Google Maps |
| GRN-3.13 | **View Site** | 🏢 Building | Card + Table | Has site | Opens site filter |
| GRN-3.14 | **View User** | 👤 User | Card + Table | Always | Opens user profile card |
| GRN-3.15 | **Item Name Click** | — | Card + Table | Always | Opens `ItemInfoDialog` (inventory details) |

#### GRN-3B: Check Dialog Buttons (`check-dialog.tsx`)

| GRN # | Button | Mutation | Before → After | Data Logged |
|:------|:-------|:---------|:---------------|:------------|
| GRN-3.16 | **Ready for CC** | `requests.updatePurchaseRequestStatus` (→ `ready_for_cc`) | `recheck` → `ready_for_cc` | Notes, category, timestamps |
| GRN-3.17 | **Ready for PO** | `requests.updatePurchaseRequestStatus` (→ `ready_for_po`) | `recheck` → `ready_for_po` | Creates CC entry with directPO flag |
| GRN-3.18 | **Ready for Delivery** | `requests.updatePurchaseRequestStatus` (→ `ready_for_delivery`) | `recheck` → `ready_for_delivery` | Deducts from inventory stock |
| GRN-3.19 | **Split & Confirm** | `requests.splitAndDeliverInventory` | Splits request | Creates new request for inventory portion, deducts stock |
| GRN-3.20 | **Confirm Delivery** *(direct)* | `inventory.deductInventoryStockByName` | Stock reduced | Inventory deduction log |
| GRN-3.21 | **Confirm & Approve** *(MGR split)* | `costComparisons.approveSplitFulfillment` | Approves split plan | `inventoryQuantity`, manager notes |
| GRN-3.22 | **Confirm & Send for Approval** | `requests.updatePurchaseRequestStatus` + `costComparisons.upsertCostComparison` | `recheck` → `ready_for_cc` | CC data saved, request status updated |
| GRN-3.23 | **Confirm PO** *(direct PO dialog)* | `requests.directToPO` | `recheck` → `ready_for_po` | CC upserted with direct flag |
| GRN-3.24 | **Split & Deliver** *(split dialog)* | `requests.splitAndDeliverInventory` | Splits into portions | Inventory qty, PO qty, new request |
| GRN-3.25 | **Link Vendor to Item** | `inventory.linkVendorToItem` | — | Vendor linked to inventory item |
| GRN-3.26 | **Save Vendor Details** *(inline)* | Updates item vendor info | — | vendor, unitRate, qty |

#### GRN-3C: Card-Level Confirmation Dialogs

| GRN # | Dialog | Button | Mutation | Result |
|:------|:-------|:-------|:---------|:-------|
| GRN-3.27 | Ready for CC Confirm | **Confirm** | `requests.updatePurchaseRequestStatus` | `recheck` → `ready_for_cc` |
| GRN-3.28 | Ready for PO Confirm | **Confirm** | `requests.updatePurchaseRequestStatus` | `recheck` → `ready_for_po` |
| GRN-3.29 | Ready for Delivery Confirm | **Confirm Delivery** | `requests.updatePurchaseRequestStatus` | `recheck` → `ready_for_delivery` |

---

### GRN-4: Cost Comparison

> **Roles:** 🟣 PO creates → 🔵 MGR reviews  
> **Component:** `cost-comparison-dialog.tsx`

| GRN # | Button | Role | Mutation | Before → After | Data Logged |
|:------|:-------|:-----|:---------|:---------------|:------------|
| GRN-4.1 | **Save CC** *(draft)* | 🟣 PO | `costComparisons.upsertCostComparison` | — → CC `draft` | `vendorQuotes[]`, `requestId`, `createdBy` |
| GRN-4.2 | **Submit CC** | 🟣 PO | `costComparisons.submitCostComparison` | CC: `draft` → `cc_pending`, Request: → `cc_pending` | `submittedAt`, all quotes |
| GRN-4.3 | **Approve CC** | 🔵 MGR | `costComparisons.reviewCostComparison` (approve) | CC: → `cc_approved`, Request: → `ready_for_po` | `selectedVendorId`, `approvedBy`, `managerNotes` |
| GRN-4.4 | **Reject CC** | 🔵 MGR | `costComparisons.reviewCostComparison` (reject) | CC: → `cc_rejected`, Request: → `cc_rejected` | `rejectionReason`, `rejectedBy` |
| GRN-4.5 | **Resubmit CC** | 🟣 PO | `costComparisons.resubmitCostComparison` | CC: `cc_rejected` → `cc_pending` | Updated quotes |
| GRN-4.6 | **Approve Split** | 🔵 MGR | `costComparisons.approveSplitFulfillment` | Approves mixed plan | `inventoryQuantity`, manager notes |
| GRN-4.7 | **Save Quote** *(per vendor)* | 🟣 PO | Part of CC form | — | Vendor quote saved locally before submit |
| GRN-4.8 | **Add Vendor** *(inline)* | 🟣 PO | `vendors.createVendor` | — | New vendor created from CC dialog |

---

### GRN-5: Purchase Orders

> **Role:** 🟣 Purchase Officer  
> **Components:** `direct-po-dialog.tsx`, `purchase-request-group-card.tsx`, `po-selection-dialog.tsx`

| GRN # | Button | Component | Mutation | Before → After | Data Logged |
|:------|:-------|:----------|:---------|:---------------|:------------|
| GRN-5.1 | **Create PO** *(single)* | `direct-po-dialog` | `purchaseOrders.createDirectPO` | Request: → `sign_pending`, PO: → `sign_pending` | PO#, vendor, items[], amounts, GST, site |
| GRN-5.2 | **Create PO** *(multi-select)* | `direct-po-dialog` | `purchaseOrders.createDirectPO` (multiple items) | All: → `sign_pending` | Same, multiple items in single PO |
| GRN-5.3 | **Edit PO Qty** | `edit-po-quantity-dialog` | `requests.updateRequestDetails` | PO qty updated | Old qty → new qty |
| GRN-5.4 | **Mark Ready** *(from edit dialog)* | `edit-po-quantity-dialog` | `requests.markReadyForDelivery` | `pending_po` → `ready_for_delivery` | Delivery qty |
| GRN-5.5 | **Split PO Qty** | `purchase-request-group-card` | `requests.splitPendingPOQuantity` | Reduces PO qty | New request for remainder |
| GRN-5.6 | **Select PO** | `po-selection-dialog` | Opens PO details | — | PO number selection |
| GRN-5.7 | **Cancel PO** | — | `purchaseOrders.cancelPO` | PO: → `cancelled`, Request: → `rejected` | Cannot cancel if delivered |
| GRN-5.8 | **Update PO Status** | — | `purchaseOrders.updatePOStatus` | `ordered`/`delivered`/`cancelled` | Syncs request status |
| GRN-5.9 | **Select All for PO** ☑️ | Card checkbox | Multi-select toggle | — | Batch selection for PO |

**PO Fields:** `poNumber`, `vendorId`, `deliverySiteId`, `validTill`, `notes`, `isDirect`, `isUrgent`  
**Per-item:** `itemDescription`, `hsnSacCode`, `quantity`, `unit`, `unitRate`, `gstTaxRate`, `discountPercent`, `perUnitBasis`, `perUnitBasisUnit`  
**Calculated:** `baseAmount`, `discountAmount`, `taxableAmount`, `taxAmount`, `totalAmount`

---

### GRN-6: PO Digital Signature

> **Role:** 🔵 Manager  
> **Components:** `direct-po-management.tsx`, `request-details-dialog.tsx`

| GRN # | Button | Component | Mutation | Before → After | Data Logged |
|:------|:-------|:----------|:---------|:---------------|:------------|
| GRN-6.1 | **Approve PO** | `direct-po-management` | `purchaseOrders.approveDirectPO` | PO: `sign_pending` → `ordered`, Request: → `pending_po` | `approvedBy`, `approvedAt`, signature |
| GRN-6.2 | **Reject PO** | `direct-po-management` | `purchaseOrders.rejectDirectPO` | PO: → `sign_rejected`, Request: → `sign_rejected` | `reason`, note: `"Digitally Rejected: {reason}"` |
| GRN-6.3 | **Sign PO** *(from request)* | `request-details-dialog` | `purchaseOrders.approveDirectPOByRequest` | Same as 6.1 | Same as 6.1 |
| GRN-6.4 | **Reject PO** *(from request)* | `request-details-dialog` | `purchaseOrders.rejectDirectPOByRequest` | Same as 6.2 | Same as 6.2 |

---

### GRN-7: Delivery Challan

> **Role:** 🟣 Purchase Officer  
> **Components:** `create-dc-multi-dialog.tsx`, `create-delivery-dialog.tsx`, `bulk-delivery-dialog.tsx`, `mark-delivery-dialog.tsx`

| GRN # | Button | Component | Mutation | Before → After | Data Logged |
|:------|:-------|:----------|:---------|:---------------|:------------|
| GRN-7.1 | **Mark Ready for Delivery** | `purchase-request-group-card` | `requests.markReadyForDelivery` | `pending_po` → `ready_for_delivery` | Delivery qty, partial support |
| GRN-7.2 | **Create DC** *(multi)* | `create-dc-multi-dialog` | `deliveries.createDelivery` | `ready_for_delivery` → `out_for_delivery` | Full DC data (see below) |
| GRN-7.3 | **Create DC** *(single)* | `create-delivery-dialog` | `deliveries.createDelivery` | Same | Same |
| GRN-7.4 | **Bulk Delivery** | `bulk-delivery-dialog` | `deliveries.createDelivery` | Multiple items → `out_for_delivery` | Batch delivery |
| GRN-7.5 | **Mark Delivery** | `mark-delivery-dialog` | `requests.markDelivery` | Various → `delivered` | Legacy delivery marking |

**DC Fields Logged:**

| Field | Type | Description |
|:------|:-----|:------------|
| `deliveryId` | Auto | `DC-YYYYMMDD-XXXX` |
| `deliveryType` | Enum | `private` / `public` / `vendor` |
| `deliveryPerson` | String | Driver name |
| `deliveryContact` | String | Driver phone |
| `vehicleNumber` | String | Vehicle registration |
| `transportName` | String | Transport company |
| `transportId` | ID | Transport vendor ID |
| `receiverName` | String | Receiver at site |
| `purchaserName` | String | Purchaser name |
| `loadingPhoto` | URL | Photo of loaded goods |
| `invoicePhoto` | URL | Invoice image |
| `receiptPhoto` | URL | Receipt image |
| `approvedByRole` | Enum | `manager` / `pe` |
| `paymentAmount` | Number | Payment amount |
| `paymentStatus` | Enum | `pending` / `paid` / `partial` |
| `items[]` | Array | Items with quantities |

---

### GRN-8: Delivery Confirmation

> **Role:** 🟢 Site Engineer  
> **Component:** `confirm-delivery-dialog.tsx`

| GRN # | Button | Component | Mutation | Before → After | Data Logged |
|:------|:-------|:----------|:---------|:---------------|:------------|
| GRN-8.1 | **Confirm Delivered** *(card)* | `purchase-request-group-card` → `confirm-delivery-dialog` | `requests.confirmDelivery` | `out_for_delivery` → `delivered` | `deliveryNotes`, `deliveryPhotos[]`, `deliveryMarkedAt` |
| GRN-8.2 | **Confirm Delivered** *(table)* | `requests-table` → `confirm-delivery-dialog` | `requests.confirmDelivery` | Same | Same |
| GRN-8.3 | **Upload Photos** *(in dialog)* | `confirm-delivery-dialog` | Cloudinary upload | — | Image URLs stored |
| GRN-8.4 | **Add Notes** *(in dialog)* | `confirm-delivery-dialog` | Part of confirm | — | Text notes |

---

### GRN-9: Inventory Management

> **Role:** 🟣 Purchase Officer (CRUD), 🟢 SE + 🟣 PO (images)  
> **Components:** `inventory-management.tsx`, `inventory-form-dialog.tsx`, `inventory-card.tsx`, `inventory-table.tsx`, `camera-dialog.tsx`

| GRN # | Button | Mutation | Data Logged |
|:------|:-------|:---------|:------------|
| GRN-9.1 | **Create Item** | `inventory.createInventoryItem` | `itemName`, `hsnSacCode`, `unit`, `centralStock`, `vendorIds[]` |
| GRN-9.2 | **Edit Item** | `inventory.updateInventoryItem` | Updated fields |
| GRN-9.3 | **Delete Item** | `inventory.deleteInventoryItem` | Item ID |
| GRN-9.4 | **Add Image** 📸 | `inventory.addImageToInventory` | Image URL + item ID |
| GRN-9.5 | **Remove Image** | `inventory.removeImageFromInventory` | Image URL removed |
| GRN-9.6 | **Deduct Stock** | `inventory.deductInventoryStockByName` | Item name, qty deducted |
| GRN-9.7 | **Link Vendor** | `inventory.linkVendorToItem` | Vendor ID linked |

---

### GRN-10: Vendor Management

> **Role:** 🟣 Purchase Officer  
> **Components:** `vendor-management.tsx`, `vendor-form-dialog.tsx`, `vendor-info-dialog.tsx`, `vendor-creation-form.tsx`

| GRN # | Button | Mutation | Data Logged |
|:------|:-------|:---------|:------------|
| GRN-10.1 | **Create Vendor** | `vendors.createVendor` | `companyName`, `email`, `phone`, `gstNumber`, `address`, `bankDetails` |
| GRN-10.2 | **Edit Vendor** | `vendors.updateVendor` | Updated fields |
| GRN-10.3 | **Delete Vendor** | `vendors.deleteVendor` | Vendor ID (checks for usage first) |
| GRN-10.4 | **Open in Map** 📍 | External link | Opens Google Maps with address |
| GRN-10.5 | **Create Vendor** *(inline from CC)* | `vendors.createVendor` | Quick-add vendor during CC |

---

### GRN-11: User Management

> **Role:** 🔵 Manager  
> **Components:** `user-management.tsx`, `user-form-dialog.tsx`, `user-table.tsx`

| GRN # | Button | Mutation | Data Logged |
|:------|:-------|:---------|:------------|
| GRN-11.1 | **Create User** | `users.createUser` | `username`, `fullName`, `role`, `phone`, `address`, `assignedSites[]` |
| GRN-11.2 | **Edit User** | `users.updateUser` | Updated fields |
| GRN-11.3 | **Delete User** | `users.deleteUser` | User ID removed |
| GRN-11.4 | **Disable User** | `users.disableUser` | User deactivated, cannot login |
| GRN-11.5 | **Enable User** | `users.enableUser` | User reactivated |

---

### GRN-12: Site Management

> **Role:** 🔵 Manager  
> **Components:** `location-management.tsx`, `location-form-dialog.tsx`, `location-table.tsx`

| GRN # | Button | Mutation | Data Logged |
|:------|:-------|:---------|:------------|
| GRN-12.1 | **Create Site** | `sites.createSite` | `name`, `code`, `address`, `type` (site/inventory/other) |
| GRN-12.2 | **Edit Site** | `sites.updateSite` | Updated fields |
| GRN-12.3 | **Delete Site** | `sites.deleteSite` | Site ID removed |
| GRN-12.4 | **Toggle Status** | `sites.toggleSiteStatus` | Active ↔ Inactive |
| GRN-12.5 | **View Site Info** | Opens `LocationInfoDialog` | View-only |

---

### GRN-13: Chat System

> **Role:** All roles  
> **Components:** `chat-window.tsx`, `message-input.tsx`, `conversation-list.tsx`

| GRN # | Button | Mutation | Data Logged |
|:------|:-------|:---------|:------------|
| GRN-13.1 | **Send Message** | `chat.sendMessage` | `content`, `senderId`, `conversationId`, `imageUrl`, `location` |
| GRN-13.2 | **Start Conversation** | `chat.getOrCreateConversation` | `participants[]` |
| GRN-13.3 | **Mark as Read** | `chat.markAsRead` | `conversationId`, `userId` |
| GRN-13.4 | **Share Location** 📍 | `chat.sendMessage` (with location) | `lat`, `lng`, `label` |
| GRN-13.5 | **Send Image** 📸 | `chat.sendMessage` (with image) | Image URL |

---

### GRN-14: Sticky Notes

> **Role:** All roles  
> **Components:** `sticky-notes/`

| GRN # | Button | Mutation | Data Logged |
|:------|:-------|:---------|:------------|
| GRN-14.1 | **Create Note** | `stickyNotes.create` | `title`, `content`, `color`, `assignedTo`, `reminderAt` |
| GRN-14.2 | **Edit Note** | `stickyNotes.update` | Updated fields |
| GRN-14.3 | **Delete Note** | `stickyNotes.deleteNote` | Note ID |
| GRN-14.4 | **Complete Checklist** | `stickyNotes.complete` | Checklist item toggled |
| GRN-14.5 | **Mark Read** | `stickyNotes.markAllRead` | User ID |
| GRN-14.6 | **Dismiss Reminder** | `stickyNotes.markReminderTriggered` | Note ID |

---

### GRN-15: Notifications

> **Role:** All roles  
> **Component:** `notification-bell.tsx`

| GRN # | Button | Mutation | Data Logged |
|:------|:-------|:---------|:------------|
| GRN-15.1 | **Mark as Read** | `notifications.markAsRead` | Notification ID |
| GRN-15.2 | **Mark All Read** | `notifications.markAllAsRead` | User ID |

---

### GRN-16: Profile & Signature

> **Role:** All roles  
> **Components:** `profile-content.tsx`, `personal-info-form.tsx`, `password-form.tsx`, `signature-upload-dialog.tsx`

| GRN # | Button | Mutation | Data Logged |
|:------|:-------|:---------|:------------|
| GRN-16.1 | **Update Profile** | `users.updateProfile` | `fullName`, `phone`, `address` |
| GRN-16.2 | **Upload Signature** | `users.updateSignature` | `signatureUrl` (used on PO PDFs) |
| GRN-16.3 | **Delete Signature** | `users.deleteSignature` | Signature removed |
| GRN-16.4 | **Generate Upload URL** | `users.generateSignatureUploadUrl` | Pre-signed URL for upload |
| GRN-16.5 | **Sync User** | `users.syncCurrentUser` | Syncs Clerk → Convex user data |
| GRN-16.6 | **Set Offline** | `presence.setOffline` | User presence updated |

---

### GRN-17: View-Only Actions

> **No mutations — these are read-only UI actions**

| GRN # | Button | Component | Opens |
|:------|:-------|:----------|:------|
| GRN-17.1 | **View Details** 👁️ | Card + Table | `RequestDetailsDialog` — full request + items |
| GRN-17.2 | **View DC** 🚚 | Card + Table | `ViewDCDialog` — delivery challan details, photos |
| GRN-17.3 | **View PDF** 📄 | Card + Table | `PDFPreviewDialog` — PO PDF with signatures |
| GRN-17.4 | **Notes Timeline** 📝 | Card + Table | `NotesTimelineDialog` — full audit history |
| GRN-17.5 | **Item Info** | Click item name | `ItemInfoDialog` — inventory status for item |
| GRN-17.6 | **User Profile** 👤 | Click user name | User profile popover |
| GRN-17.7 | **Site Info** 🏢 | Click site name | Site details / filter |
| GRN-17.8 | **Open in Map** 📍 | Card | Google Maps external link |
| GRN-17.9 | **Vendor Info** | Vendor click | `VendorInfoDialog` — vendor details + stats |
| GRN-17.10 | **Vendor Details** | Inventory item | `VendorDetailsDialog` — vendor info from inventory |
| GRN-17.11 | **Toggle Card/Table** | Layout switch | Switches between card and table view |
| GRN-17.12 | **Expand/Collapse** | Group header | Toggle grouped items visibility |
| GRN-17.13 | **Public PO View** | `/po/[id]` | Public PO page for vendors (no auth needed) |

---

### GRN-18: Shortcut Workflows

| GRN # | Shortcut | `directAction` Flag | Flow | Use Case |
|:------|:---------|:------------------|:-----|:---------|
| GRN-18.1 | **Direct PO** | `"po"` | `pending` → `recheck` → `ready_for_po` → `sign_pending` → `pending_po` | Price known, skip CC |
| GRN-18.2 | **Direct Delivery** | `"delivery"` | `pending` → `recheck` → `ready_for_delivery` → `out_for_delivery` → `delivered` | Item in stock |
| GRN-18.3 | **Direct All** | `"all"` | Part inventory + part PO | Mixed fulfillment |
| GRN-18.4 | **Split PO** | `"split_po"` | Part from inventory + part new PO | Partial stock |
| GRN-18.5 | **Split Delivery** | `"split_delivery"` | Partial inventory delivery | Partial from warehouse |
| GRN-18.6 | **Split PO + Delivery** | `"split_po_delivery"` | Combined complex split | Multi-source fulfillment |

---

## 📊 Complete Status Registry

### Request Statuses (18 states)

| # | Status | Label | Color | Next By |
|:--|:-------|:------|:------|:--------|
| 1 | `draft` | Draft | Gray | 🟢 SE |
| 2 | `pending` | Pending Approval | Yellow | 🔵 MGR |
| 3 | `recheck` | Recheck | Indigo | 🟣 PO |
| 4 | `rejected` | Rejected | Red | ❌ Terminal |
| 5 | `ready_for_cc` | Ready for CC | Purple | 🟣 PO |
| 6 | `cc_pending` | CC Pending | Amber | 🔵 MGR |
| 7 | `cc_approved` | CC Approved | Green | 🟣 PO |
| 8 | `cc_rejected` | CC Rejected | Rose | 🟣 PO |
| 9 | `ready_for_po` | Ready for PO | Emerald | 🟣 PO |
| 10 | `direct_po` | Direct PO | Cyan | 🟣 PO |
| 11 | `sign_pending` | Sign Pending | Orange | 🔵 MGR |
| 12 | `sign_rejected` | Sign Rejected | Red | 🟣 PO |
| 13 | `pending_po` | PO Ordered | Blue | 🟣 PO |
| 14 | `rejected_po` | PO Rejected | Red | ❌ Terminal |
| 15 | `ready_for_delivery` | Ready for Delivery | Teal | 🟣 PO |
| 16 | `delivery_stage` | *(deprecated)* | — | — |
| 17 | `out_for_delivery` | Out for Delivery | Sky | 🟢 SE |
| 18 | `delivered` | ✅ Delivered | Green | ✅ Done |

### PO Statuses (8) · CC Statuses (4) · Delivery Statuses (3)

| PO Status | CC Status | Delivery Status |
|:----------|:----------|:----------------|
| `pending_approval` | `draft` | `pending` |
| `sign_pending` | `cc_pending` | `delivered` |
| `approved` | `cc_approved` | `cancelled` |
| `rejected` | `cc_rejected` | |
| `sign_rejected` | | |
| `ordered` | | |
| `delivered` | | |
| `cancelled` | | |

---

## 🗄️ Database Schema (14 Tables)

| Table | Key Fields |
|:------|:-----------|
| **users** | clerkUserId, username, fullName, role, assignedSites[], signatureUrl |
| **requests** | requestNumber, createdBy, siteId, itemName, quantity, unit, status, directAction, deliveryId |
| **purchaseOrders** | poNumber, requestId, vendorId, quantity, unitRate, totalAmount, status, isDirect |
| **costComparisons** | requestId, vendorQuotes[], selectedVendorId, status, isDirectDelivery |
| **deliveries** | deliveryId, poId, deliveryType, deliveryPerson, vehicleNumber, status, items[], photos |
| **vendors** | companyName, email, phone, gstNumber, address, bankDetails |
| **inventory** | itemName, hsnSacCode, unit, centralStock, vendorIds[], images[] |
| **sites** | name, code, address, type, isActive |
| **conversations** | participants[], lastMessage, unreadCount |
| **messages** | conversationId, senderId, content, imageUrl, location, readBy[] |
| **stickyNotes** | title, content, color, assignedTo, reminderAt, checklistItems[] |
| **request_notes** | requestNumber, userId, role, status, content |
| **notifications** | userId, title, message, type, isRead |
| **userPresence** | userId, isOnline, lastSeenAt |

---

## 🔌 API Reference — All 58 Mutations

### requests (14 mutations)

| Mutation | Description |
|:---------|:------------|
| `createMultipleMaterialRequests` | Create grouped material requests |
| `saveMultipleMaterialRequestsAsDraft` | Save as draft |
| `sendDraftRequest` | Draft → pending |
| `updateDraftRequest` | Edit draft |
| `deleteDraftRequest` | Delete draft |
| `updateRequestStatus` | Manager approve/reject |
| `bulkUpdateRequestStatus` | Bulk approve/reject |
| `updatePurchaseRequestStatus` | Change workflow status |
| `updateRequestDetails` | Edit qty/unit/desc |
| `directToPO` | Skip CC to PO |
| `splitAndDeliverInventory` | Split inventory/purchase |
| `markReadyForDelivery` | Ready for dispatch |
| `markDelivery` | Mark delivered (legacy) |
| `confirmDelivery` | Confirm with photos |

### purchaseOrders (7 mutations)

| Mutation | Description |
|:---------|:------------|
| `createDirectPO` | Create PO |
| `updatePOStatus` | Update status |
| `cancelPO` | Cancel PO |
| `approveDirectPO` | Manager sign by PO ID |
| `rejectDirectPO` | Manager reject by PO ID |
| `approveDirectPOByRequest` | Manager sign by request ID |
| `rejectDirectPOByRequest` | Manager reject by request ID |

### costComparisons (5 mutations)

| Mutation | Description |
|:---------|:------------|
| `upsertCostComparison` | Create/update CC |
| `submitCostComparison` | Submit for review |
| `reviewCostComparison` | Manager approve/reject |
| `resubmitCostComparison` | Resubmit rejected |
| `approveSplitFulfillment` | Approve split plan |

### deliveries (1 mutation)

| Mutation | Description |
|:---------|:------------|
| `createDelivery` | Create delivery challan |

### inventory (6 mutations)

| Mutation | Description |
|:---------|:------------|
| `createInventoryItem` | Create item |
| `updateInventoryItem` | Edit item |
| `deleteInventoryItem` | Delete item |
| `addImageToInventory` | Add photo |
| `removeImageFromInventory` | Remove photo |
| `deductInventoryStockByName` | Deduct stock |
| `linkVendorToItem` | Link vendor |

### vendors (3 mutations)

| Mutation | Description |
|:---------|:------------|
| `createVendor` | Create vendor |
| `updateVendor` | Edit vendor |
| `deleteVendor` | Delete vendor |

### users (8 mutations)

| Mutation | Description |
|:---------|:------------|
| `createUser` | Create user |
| `updateUser` | Edit user |
| `deleteUser` | Delete user |
| `disableUser` | Disable user |
| `enableUser` | Enable user |
| `updateProfile` | Update own profile |
| `updateSignature` | Upload signature |
| `deleteSignature` | Remove signature |

### sites (4 mutations)

| Mutation | Description |
|:---------|:------------|
| `createSite` | Create site |
| `updateSite` | Edit site |
| `deleteSite` | Delete site |
| `toggleSiteStatus` | Active ↔ Inactive |

### Other (6 mutations)

| Mutation | Description |
|:---------|:------------|
| `chat.sendMessage` | Send chat message |
| `chat.getOrCreateConversation` | Start conversation |
| `chat.markAsRead` | Mark messages read |
| `notifications.markAsRead` | Mark notification read |
| `notifications.markAllAsRead` | Mark all read |
| `stickyNotes.markReminderTriggered` | Dismiss reminder |

---

## ✨ Features

| Module | Capabilities |
|:-------|:-------------|
| 📋 **Material Requests** | Multi-item grouped, drafts, photos, notes timeline, bulk actions |
| 💰 **Cost Comparisons** | Multi-vendor quotes, per-unit pricing, GST, discounts, split fulfillment |
| 📄 **Purchase Orders** | Auto PDFs, digital signatures, public vendor link, partial qty |
| 🚚 **Delivery Challans** | 3 types, vehicle tracking, photos, payment tracking |
| 📦 **Inventory** | Central stock, multi-vendor, auto deduction, images |
| 👥 **Vendors** | Full CRUD, GST, purchase stats |
| 👤 **Users** | CRUD, roles, sites, signatures |
| 💬 **Chat** | Real-time 1:1, images, location, read receipts |
| 📝 **Notes** | Draggable, color, checklists, reminders |
| 🔔 **Notifications** | In-app: info/success/warning/error |

---

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Setup Clerk (username+password only) → copy keys to .env.local

# 3. Setup Convex
npx convex login && npx convex dev

# 4. Create first Manager manually in Clerk + Convex

# 5. Run
npm run dev:all    # Next.js + Convex together
```

Open **http://localhost:3000**

---

## 🔑 Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
CONVEX_DEPLOYMENT=dev:...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://...
```

---

## 🚢 Deployment

```bash
npx convex deploy          # Convex production
npm run build && npm start  # Next.js production
```

---

## 🧪 End-to-End Testing

| # | Role | Action | Result |
|:--|:-----|:-------|:-------|
| 1 | 🔵 MGR | Create SE + PO users | Users active |
| 2 | 🔵 MGR | Create site → assign SE | Site linked |
| 3 | 🟢 SE | Create request (draft) | Draft saved |
| 4 | 🟢 SE | Send request | Status → `pending` |
| 5 | 🔵 MGR | Approve | Status → `recheck` |
| 6 | 🟣 PO | Check → Ready for CC | Status → `ready_for_cc` |
| 7 | 🟣 PO | Create CC → Submit | Status → `cc_pending` |
| 8 | 🔵 MGR | Approve CC | Status → `ready_for_po` |
| 9 | 🟣 PO | Create PO | Status → `sign_pending` |
| 10 | 🔵 MGR | Sign PO | Status → `pending_po` |
| 11 | 🟣 PO | Mark Ready → Create DC | Status → `out_for_delivery` |
| 12 | 🟢 SE | Confirm Delivered | Status → `delivered` ✅ |

---

## 🔒 Security

- ✅ Username + password **ONLY** (no social/email login)
- ✅ **NO public signup** — Manager creates all users
- ✅ Server-side role checks on every Convex mutation
- ✅ Middleware protects all routes
- ✅ Clerk session management

---

## 🐛 Troubleshooting

| Issue | Fix |
|:------|:----|
| "Unauthorized" on login | Check `role` in Clerk `publicMetadata` + user in Convex |
| Cannot create users | Verify Manager login + Clerk API keys |
| Images not uploading | Check Cloudinary/R2 credentials |
| PO PDF blank | Check @react-pdf installed + vendor data exists |
| Duplicate keys | Check request grouping in table render |

---

## 📚 Docs

- [Chat System](./docs/CHAT.md) · [Notifications](./docs/NOTIFICATIONS.md) · [Theme](./docs/THEME.md) · [Status Workflow](./STATUS_WORKFLOW.md)

---

## 📜 Scripts

```bash
npm run dev          # Next.js (port 3000)
npm run dev:convex   # Convex dev server
npm run dev:all      # Both simultaneously
npm run build        # Production build
npm run lint         # ESLint
```

---

**Proprietary** — NOTION CRM © 2024–2026

<div align="center">

*Next.js 16 • React 19 • TypeScript • Convex • Clerk • Tailwind CSS v4*

</div>
