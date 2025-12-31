"use client";

/**
 * Site Requests Content Component
 * 
 * Client component for site engineer requests page.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialRequestForm } from "@/components/requests/material-request-form";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { SiteInfoDialog } from "@/components/requests/site-info-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, CheckCircle2, Send, X, MapPin, Calendar, Package, AlertTriangle, Search, LayoutGrid, Table2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeSearchQuery, matchesSearchQuery } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

// Enhanced precise search function with priority for exact matches
const fuzzySearch = (request: any, query: string): boolean => {
  if (!query || !query.trim()) return true;

  const searchTerm = normalizeSearchQuery(query);
  if (!searchTerm) return true;

  // Split query into individual words for multi-term search
  const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
  if (searchWords.length === 0) return true;

  // PRIORITY 1: Exact request number matches (highest priority)
  if (request.requestNumber) {
    const requestNum = normalizeSearchQuery(request.requestNumber);
    // Check exact match with "REQ-" prefix
    if (requestNum === searchTerm || requestNum === `req-${searchTerm}`) {
      return true;
    }
    // Check just the number part
    const justNumber = requestNum.replace(/^req-/, '');
    if (justNumber === searchTerm) {
      return true;
    }
  }

  // PRIORITY 2: Exact item order matches
  if (request.itemOrder?.toString() === searchTerm) {
    return true;
  }

  // PRIORITY 3: Exact matches in other fields
  const exactMatchFields = [
    request.itemName,
    request.site?.name,
    request.description,
    request.specsBrand
  ];

  for (const field of exactMatchFields) {
    if (field && normalizeSearchQuery(field) === searchTerm) {
      return true;
    }
  }

  // PRIORITY 4: Contains matches (substring search)
  const containsMatchFields = [
    request.requestNumber,
    request.requestNumber?.replace(/^REQ-/, ''), // Just the number part
    request.itemOrder?.toString(),
    request.itemName,
    request.site?.name,
    request.description,
    request.specsBrand
  ];

  // Check if search term is contained in any field
  // Allow substring matching for all terms, but be more selective for short terms
  for (const field of containsMatchFields) {
    if (!field) continue;

    const normalizedField = normalizeSearchQuery(field);

    // For very short terms (1-2 chars), only match at the beginning of request numbers
    if (searchTerm.length <= 2) {
      // Special handling for request numbers - allow substring match
      if (field === request.requestNumber?.replace(/^REQ-/, '') && normalizedField.includes(searchTerm)) {
        return true;
      }
      // For item orders, allow exact prefix match
      if (field === request.itemOrder?.toString() && normalizedField.startsWith(searchTerm)) {
        return true;
      }
    } else {
      // Normal substring matching for longer terms
      if (normalizedField.includes(searchTerm)) {
        return true;
      }
    }
  }

  // PRIORITY 5: Fuzzy matching only for longer terms (>4 chars) or specific cases
  if (searchTerm.length > 4) {
    const matchesAnyWord = (fieldValue: string | undefined | null): boolean => {
      if (!fieldValue) return false;
      const normalizedField = normalizeSearchQuery(fieldValue);

      return searchWords.every(word => {
        // Exact substring match first
        if (normalizedField.includes(word)) return true;
        // Only do fuzzy matching for longer words
        if (word.length > 3) {
          return fuzzyMatch(normalizedField, word);
        }
        return false;
      });
    };

    const fuzzyMatchFields = [
      request.itemName,
      request.site?.name,
      request.description
    ];

    if (fuzzyMatchFields.some(field => matchesAnyWord(field))) {
      return true;
    }
  }

  return false;
};

// Simplified fuzzy matching - only for longer terms
const fuzzyMatch = (text: string, pattern: string): boolean => {
  if (pattern.length <= 3) return false; // No fuzzy matching for short terms

  // Simple fuzzy: allow 1 character difference
  let differences = 0;
  let i = 0;
  let j = 0;

  while (i < text.length && j < pattern.length) {
    if (text[i] === pattern[j]) {
      i++;
      j++;
    } else {
      differences++;
      if (differences > 1) return false;
      // Try skipping a character in text or pattern
      if (text[i + 1] === pattern[j]) {
        i++;
      } else if (text[i] === pattern[j + 1]) {
        j++;
      } else {
        i++;
        j++;
      }
    }
  }

  return differences <= 1 && j === pattern.length;
};

// Status color mapping for dropdown
const getStatusColor = (status: string) => {
  switch (status) {
    case "draft":
      return "text-gray-700 dark:text-gray-300";
    case "pending":
      return "text-yellow-700 dark:text-yellow-300";
    case "approved":
      return "text-green-700 dark:text-green-300";
    case "ready_for_cc":
      return "text-blue-700 dark:text-blue-300";
    case "cc_pending":
      return "text-purple-700 dark:text-purple-300";
    case "cc_approved":
      return "text-indigo-700 dark:text-indigo-300";
    case "ready_for_po":
      return "text-cyan-700 dark:text-cyan-300";
    case "delivery_stage":
      return "text-orange-700 dark:text-orange-300";
    case "rejected":
      return "text-red-700 dark:text-red-300";
    case "delivered":
      return "text-blue-700 dark:text-blue-300";
    default:
      return "text-foreground";
  }
};

const getStatusDot = (status: string) => {
  switch (status) {
    case "draft":
      return "bg-gray-400";
    case "pending":
      return "bg-yellow-400";
    case "approved":
      return "bg-green-400";
    case "ready_for_cc":
      return "bg-blue-400";
    case "cc_pending":
      return "bg-purple-400";
    case "cc_approved":
      return "bg-indigo-400";
    case "ready_for_po":
      return "bg-cyan-400";
    case "delivery_stage":
      return "bg-orange-400";
    case "rejected":
      return "bg-red-400";
    case "delivered":
      return "bg-blue-400";
    default:
      return "bg-muted-foreground";
  }
};

export function SiteRequestsContent() {
  const [formOpen, setFormOpen] = useState(false);

  // Listen for external form open requests (from dashboard)
  useEffect(() => {
    const handleOpenForm = () => setFormOpen(true);
    window.addEventListener('openRequestForm', handleOpenForm);
    return () => window.removeEventListener('openRequestForm', handleOpenForm);
  }, []);
  const [editDraftNumber, setEditDraftNumber] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [draftToSend, setDraftToSend] = useState<string | null>(null);
  const [newlySentRequestNumbers, setNewlySentRequestNumbers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const previousRequestsRef = useRef<typeof allRequests>(undefined);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Super search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery("");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);
  
  const allRequests = useQuery(api.requests.getUserRequests);
  const draftDetails = useQuery(
    api.requests.getRequestsByRequestNumber,
    draftToSend ? { requestNumber: draftToSend } : "skip"
  );
  const sendDraft = useMutation(api.requests.sendDraftRequest);
  const deleteDraft = useMutation(api.requests.deleteDraftRequest);

  // Track newly sent requests for animation
  useEffect(() => {
    if (allRequests && previousRequestsRef.current) {
      // Find requests that were drafts and are now pending (newly sent)
      const previousDrafts = new Map(
        previousRequestsRef.current
          .filter((r) => r.status === "draft")
          .map((r) => [r.requestNumber, r])
      );

      const newPending = allRequests.filter(
        (r) => r.status === "pending" && previousDrafts.has(r.requestNumber)
      );

      if (newPending.length > 0) {
        const newNumbers = new Set(newPending.map((r) => r.requestNumber));
        setNewlySentRequestNumbers(newNumbers);
        
        // Scroll to top after a short delay
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 200);
        
        // Clear animation after 3 seconds
        setTimeout(() => {
          setNewlySentRequestNumbers(new Set());
        }, 3000);
      }
    }
    previousRequestsRef.current = allRequests;
  }, [allRequests]);

  // Separate new requests from history (include drafts in new)
  // Sort by updatedAt descending (newest first) - newly sent requests will be at top
  const newRequests = (allRequests?.filter((r) => 
    ["draft", "pending", "ready_for_cc", "cc_pending", "ready_for_po", "delivery_stage"].includes(r.status)
  ) || []).sort((a, b) => {
    // Non-drafts first (pending, etc.), sorted by updatedAt (newest first)
    if (a.status !== "draft" && b.status !== "draft") {
      return b.updatedAt - a.updatedAt;
    }
    if (a.status !== "draft") return -1; // Non-draft comes before draft
    if (b.status !== "draft") return 1; // Non-draft comes before draft
    // Both are drafts, sort by createdAt (newest first)
    return b.createdAt - a.createdAt;
  });
  
  const historyRequests = allRequests?.filter((r) => 
    ["approved", "rejected", "delivered"].includes(r.status)
  ) || [];

  const handleEditDraft = (requestNumber: string) => {
    setEditDraftNumber(requestNumber);
    setFormOpen(true);
  };

  const handleDeleteDraft = (requestNumber: string) => {
    setDraftToDelete(requestNumber);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    
    try {
      await deleteDraft({ requestNumber: draftToDelete });
      toast.success("Draft deleted successfully");
      setDeleteConfirmOpen(false);
      setDraftToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete draft");
    }
  };

  const handleSendDraft = (requestNumber: string) => {
    setDraftToSend(requestNumber);
    setSendConfirmOpen(true);
  };

  const confirmSendDraft = async () => {
    if (!draftToSend) return;
    
    try {
      const result = await sendDraft({ requestNumber: draftToSend });
      // Mark as newly sent for animation
      setNewlySentRequestNumbers(new Set([result.requestNumber]));
      toast.success(`Draft sent successfully! Request #${result.requestNumber} has been created.`);
      
      // Close confirmation dialog
      setSendConfirmOpen(false);
      setDraftToSend(null);

      // Scroll to top after a short delay to allow the request to appear
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 300);
      
      // Clear animation after 3 seconds
      setTimeout(() => {
        setNewlySentRequestNumbers(new Set());
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || "Failed to send draft");
      setSendConfirmOpen(false);
      setDraftToSend(null);
    }
  };

  // Filter requests based on search and status
  const filterRequests = (requestsList: typeof newRequests) => {
    let filtered = requestsList;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Enhanced fuzzy search with priority on ID, order ID, and item name
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter((r) => fuzzySearch(r, debouncedSearchQuery));
    }

    return filtered;
  };

  const filteredNewRequests = filterRequests(newRequests);
  const filteredHistoryRequests = filterRequests(historyRequests);

  // Combine all requests for single view
  const allFilteredRequests = [...filteredNewRequests, ...filteredHistoryRequests];

  // Search result stats for better UX
  const searchStats = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return null;

    const totalBeforeSearch = [...newRequests, ...historyRequests].length;
    const totalAfterSearch = allFilteredRequests.length;

    return {
      totalBeforeSearch,
      totalAfterSearch,
      searchTerm: debouncedSearchQuery.trim()
    };
  }, [debouncedSearchQuery, allFilteredRequests.length, newRequests, historyRequests]);

  return (
    <>
      {/* Search, Filters, and Actions Bar */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        {/* Row 1: Search and View Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search: order ID (001, 002...), item name, or site name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 pr-9 h-9 sm:h-10 text-sm w-full ${debouncedSearchQuery.trim() ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}`}
              title="Press Ctrl+K to focus search, Escape to clear"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                title="Clear search (Esc)"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {/* Search results counter */}
            {searchStats && (
              <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
                Found {searchStats.totalAfterSearch} of {searchStats.totalBeforeSearch} requests
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "card" ? "table" : "card")}
            className="h-9 sm:h-10 px-3 flex-shrink-0"
            title={`Switch to ${viewMode === "card" ? "table" : "card"} view`}
          >
            {viewMode === "card" ? (
              <Table2 className="h-4 w-4" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Row 2: Status Filter and New Request */}
        <div className="flex gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  All Status
                </div>
              </SelectItem>
              <SelectItem value="draft">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("draft")}`}></div>
                  <span className={getStatusColor("draft")}>Draft</span>
                </div>
              </SelectItem>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("pending")}`}></div>
                  <span className={getStatusColor("pending")}>Pending</span>
                </div>
              </SelectItem>
              <SelectItem value="approved">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("approved")}`}></div>
                  <span className={getStatusColor("approved")}>Approved</span>
                </div>
              </SelectItem>
              <SelectItem value="ready_for_cc">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("ready_for_cc")}`}></div>
                  <span className={getStatusColor("ready_for_cc")}>Ready for CC</span>
                </div>
              </SelectItem>
              <SelectItem value="cc_pending">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("cc_pending")}`}></div>
                  <span className={getStatusColor("cc_pending")}>CC Pending</span>
                </div>
              </SelectItem>
              <SelectItem value="cc_approved">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("cc_approved")}`}></div>
                  <span className={getStatusColor("cc_approved")}>CC Approved</span>
                </div>
              </SelectItem>
              <SelectItem value="ready_for_po">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("ready_for_po")}`}></div>
                  <span className={getStatusColor("ready_for_po")}>Ready for PO</span>
                </div>
              </SelectItem>
              <SelectItem value="delivery_stage">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("delivery_stage")}`}></div>
                  <span className={getStatusColor("delivery_stage")}>Delivery Stage</span>
                </div>
              </SelectItem>
              <SelectItem value="delivered">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("delivered")}`}></div>
                  <span className={getStatusColor("delivered")}>Delivered</span>
                </div>
              </SelectItem>
              <SelectItem value="rejected">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusDot("rejected")}`}></div>
                  <span className={getStatusColor("rejected")}>Rejected</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setFormOpen(true)}
            size="sm"
            className="h-9 sm:h-10 ml-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Bottom Row: Filters and View Toggle */}
       
      </div>

      <RequestsTable
        requests={allFilteredRequests}
        onViewDetails={(requestId) => setSelectedRequestId(requestId)}
        onEditDraft={handleEditDraft}
        onDeleteDraft={handleDeleteDraft}
        onSendDraft={handleSendDraft}
        newlySentRequestNumbers={newlySentRequestNumbers}
        viewMode={viewMode}
      />

      <MaterialRequestForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditDraftNumber(null);
          }
        }}
        draftRequestNumber={editDraftNumber}
      />

      <RequestDetailsDialog
        open={!!selectedRequestId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequestId(null);
          }
        }}
        requestId={selectedRequestId}
      />

      <SiteInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        siteId={selectedSiteId}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDraftToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Draft Confirmation Dialog */}
      <AlertDialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <AlertDialogTitle className="text-lg sm:text-xl font-bold">Confirm & Send Draft</AlertDialogTitle>
            </div>
            <div className="text-sm text-muted-foreground space-y-4 pt-2">
              {draftDetails && draftDetails.length > 0 ? (
                <>
                  <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Site Location</p>
                        {draftDetails[0].site ? (
                          <button
                            onClick={() => setSelectedSiteId(draftDetails[0].site!._id)}
                            className="text-sm font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer text-left"
                          >
                            {draftDetails[0].site.name}
                            {draftDetails[0].site.code && (
                              <span className="text-muted-foreground ml-1">({draftDetails[0].site.code})</span>
                            )}
                          </button>
                        ) : (
                          <p className="text-sm font-medium">Selected site</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Required By</p>
                        <p className="text-sm font-medium">
                          {draftDetails[0].requiredBy ? format(new Date(draftDetails[0].requiredBy), "dd/MM/yyyy") : "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Items</p>
                        <p className="text-sm font-medium">
                          {draftDetails.length} item{draftDetails.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {draftDetails.filter((i) => i.isUrgent).length > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-destructive mb-1">Urgent Items</p>
                        <p className="text-sm text-destructive/90">
                          {draftDetails.filter((i) => i.isUrgent).length} item{draftDetails.filter((i) => i.isUrgent).length > 1 ? 's are' : ' is'} marked as urgent and will be prioritized.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-foreground">
                      Are you sure you want to send this draft? It will be converted to a request and sent for approval. This action cannot be undone.
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  Loading draft details...
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <AlertDialogCancel 
              className="w-full sm:w-auto order-2 sm:order-1 h-10 sm:h-11 text-sm font-semibold border-2"
              onClick={() => {
                setSendConfirmOpen(false);
                setDraftToSend(null);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSendDraft}
              className="w-full sm:w-auto order-1 sm:order-2 h-10 sm:h-11 text-sm font-bold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
            >
              <Send className="h-4 w-4 mr-2" />
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

