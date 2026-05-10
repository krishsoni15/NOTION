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
 * CCs sharing the same requestNumber are grouped into one merged entry
 */
export function combineDirectActions(
  costComparisons: CostComparison[] = [],
  purchaseOrders: PurchaseOrder[] = [],
  deliveryChallans: DeliveryChallan[] = []
): DirectActionItem[] {
  const items: DirectActionItem[] = [];

  // Group CCs by requestNumber to detect merged CCs
  const ccByRequestNumber = new Map<string, CostComparison[]>();
  const ungroupedCCs: CostComparison[] = [];

  costComparisons.forEach((cc) => {
    const reqNum = (cc as any).request?.requestNumber;
    if (reqNum) {
      if (!ccByRequestNumber.has(reqNum)) ccByRequestNumber.set(reqNum, []);
      ccByRequestNumber.get(reqNum)!.push(cc);
    } else {
      ungroupedCCs.push(cc);
    }
  });

  // Add grouped CCs — merged groups become one entry, singles stay as-is
  ccByRequestNumber.forEach((group) => {
    if (group.length > 1) {
      // Merged CC: use the first CC as the representative entry
      const first = group[0];
      const baseItem = transformCC(first, costComparisons);
      const itemNames = group.map(cc => cc.request?.itemName || cc.itemName || "").filter(Boolean);
      // Use the "worst" status (pending > rejected > approved > draft)
      const statusPriority = ["cc_pending", "cc_rejected", "draft", "cc_approved"];
      const worstStatus = statusPriority.find(s => group.some(cc => cc.status === s)) || first.status;
      items.push({
        ...baseItem,
        customTitle: `${(first as any).request?.requestNumber} (${group.length} items)`,
        status: worstStatus,
        mergedRequestIds: group.map(cc => cc.requestId).filter(Boolean) as any[],
        mergedCount: group.length,
        mergedItemNames: itemNames,
      });
    } else {
      items.push(transformCC(group[0], costComparisons));
    }
  });

  // Add ungrouped CCs (direct CCs with no requestNumber)
  ungroupedCCs.forEach((cc) => {
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
