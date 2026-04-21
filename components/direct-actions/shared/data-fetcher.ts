/**
 * Unified Data Fetcher for Direct Actions
 * 
 * Fetches and transforms CC, DC, and PO data into unified format
 */

import type { DirectActionItem } from "./types";
import { formatEntityId, isDirect } from "./utils";
import type { CostComparison, PurchaseOrder, DeliveryChallan } from "./types";

/**
 * Transform Cost Comparison to DirectActionItem
 */
export function transformCC(cc: CostComparison, allCCs?: CostComparison[]): DirectActionItem {
  // For direct CCs, use itemName from CC record; for request-based, use from request
  const itemName = cc.itemName || (cc.request?.itemName);
  
  return {
    id: cc._id,
    type: "cc",
    displayId: formatEntityId(cc, "cc", allCCs),
    customTitle: cc.ccTitle || itemName,
    status: cc.status,
    createdDate: cc.createdAt,
    createdBy: cc.createdBy,
    requestId: cc.requestId,
    isDirect: isDirect(cc, "cc"),
    rawData: cc,
  };
}

/**
 * Transform Purchase Order to DirectActionItem
 */
export function transformPO(po: PurchaseOrder, allPOs?: PurchaseOrder[]): DirectActionItem {
  return {
    id: po._id,
    type: "po",
    displayId: formatEntityId(po, "po", allPOs),
    customTitle: po.customTitle || po.itemDescription,
    status: po.status,
    createdDate: po.createdAt,
    createdBy: po.createdBy,
    requestId: po.requestId,
    isDirect: isDirect(po, "po"),
    rawData: po,
  };
}

/**
 * Transform Delivery Challan to DirectActionItem
 */
export function transformDC(dc: DeliveryChallan, allDCs?: DeliveryChallan[]): DirectActionItem {
  return {
    id: dc._id,
    type: "dc",
    displayId: formatEntityId(dc, "dc", allDCs),
    customTitle: dc.customTitle || dc.receiverName,
    status: dc.status,
    createdDate: dc.createdAt,
    createdBy: dc.createdBy,
    isDirect: isDirect(dc, "dc"),
    rawData: dc,
  };
}

/**
 * Combine all entities into unified list with chronological IDs
 */
export function combineDirectActions(
  costComparisons: CostComparison[] = [],
  purchaseOrders: PurchaseOrder[] = [],
  deliveryChallans: DeliveryChallan[] = []
): DirectActionItem[] {
  const items: DirectActionItem[] = [];

  // Add CCs with chronological IDs
  costComparisons.forEach((cc) => {
    items.push(transformCC(cc, costComparisons));
  });

  // Add POs with chronological IDs
  purchaseOrders.forEach((po) => {
    items.push(transformPO(po, purchaseOrders));
  });

  // Add DCs with chronological IDs
  deliveryChallans.forEach((dc) => {
    items.push(transformDC(dc, deliveryChallans));
  });

  return items;
}
