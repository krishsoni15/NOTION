# NOTION CRM - Status Workflow Guide

This guide explains the lifecycle of a material request in the NOTION CRM system. It clarifies the statuses used across Site Engineer, Manager, and Purchase Officer dashboards.

## 1. Quick Status Glossary

| Status ID | UI Label | Meaning | Who Actions It? |
| :--- | :--- | :--- | :--- |
| **draft** | Draft | Created but not sent. | Site Engineer |
| **pending** | Pending Approval | Sent, waiting for Site Manager check. | Manager |
| **recheck** | Recheck | Sent back to Site Engineer for changes. | Site Engineer |
| **sign_pending** | Sign Pending | Waiting for secondary signature (if configured). | Manager |
| **ready_for_cc** | Ready for CC | Approved. Needed implementation (quotes). | Purchase Officer |
| **cc_pending** | CC Pending | Quotes submitted. Waiting for Manager choice. | Manager |
| **ready_for_po** | Ready for PO | Vendor selected. Ready to order. | Purchase Officer |
| **pending_po** | Pending PO | PO created/sent. Waiting for vendor. | Purchase Officer |
| **ready_for_delivery** | **Ready for Delivery** | Item purchased/in stock. Ready to ship. | Purchase Officer |
| **delivery_processing** | **Out for Delivery** | Item physically on the way (Truck/Dispatch). | Site Engineer (View) |
| **delivered** | **Delivered** | Item received at site (Confirmed). | Site Engineer |
| **rejected** | Rejected | Request completely denied. | Manager |
| **cc_rejected** | CC Rejected | Quotes rejected, do it again. | Purchase Officer |

---

## 2. Standard Workflow (The Happy Path)

1.  **Creation**: Site Engineer creates a request.
    *   Status: `draft` -> **`pending`**
2.  **Manager Approval**: Manager reviews the request.
    *   Action: Approve -> Status: **`ready_for_cc`**
3.  **Cost Comparison (CC)**: Purchase Officer adds vendor quotes.
    *   Action: Submit CC -> Status: **`cc_pending`**
4.  **Vendor Selection**: Manager selects a vendor.
    *   Action: Approve Quote -> Status: **`ready_for_po`**
5.  **Purchase Order (PO)**: Purchase Officer creates the formal PO.
    *   Action: Create PO -> Status: **`pending_po`**
    *   *(Note: This is when the order is sent to the vendor)*
6.  **Fulfillment**: Vendor confirms items are ready.
    *   Action: Mark Ready -> Status: **`ready_for_delivery`**
7.  **Dispatch**: Items are loaded onto transport.
    *   Action: Mark Dispatched -> Status: **`delivery_processing`** (Shows as "Out for Delivery")
8.  **Receipt**: Item arrives at site.
    *   Action: Confirm Delivery -> Status: **`delivered`**

---

## 3. Direct Workflows (Shortcuts)

### Direct PO (Skip CC)
*   Used when price is known or item is small.
*   **Manager** or **Purchase Officer** can skip Cost Comparison.
*   Flow: `pending` -> **`ready_for_po`** or `direct_po`.

### Direct Inventory Delivery
*   Used when item is already in central stock.
*   Flow: `pending` -> **`ready_for_delivery`**.

---

## 4. Addressing Duplication & Confusion

### Why were there duplicate names?
Previously, multiple technical IDs mapped to similar UI labels (e.g., `delivery_stage` vs `delivery_processing`).
**Fix Applied:** We have standardized the mapping.
*   `ready_for_delivery` = **"Ready for Delivery"** (In stock/Warehouse)
*   `delivery_processing` = **"Out for Delivery"** (On the truck)
*   `delivery_stage` = **Deprecated** (Legacy status, treated same as Out for Delivery)

### Why things didn't show on Dashboard?
The dashboard was strictly looking for "High Priority" items.
**Fix Applied:** Dashboard now sorts simply by **"Latest Activity"**.
*   If you touch a request (update status, add note), it jumps to the top.
*   "Processing" badge covers all internal steps (`ready_for_cc`, `ready_for_po`, `Ready for Delivery`).
*   "Out for Delivery" and "Delivered" have unique badges for visibility.
