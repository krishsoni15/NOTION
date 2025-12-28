"use client";

/**
 * Site Requests Content Component
 * 
 * Client component for site engineer requests page.
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MaterialRequestForm } from "@/components/requests/material-request-form";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { Id } from "@/convex/_generated/dataModel";

export function SiteRequestsContent() {
  const [formOpen, setFormOpen] = useState(false);
  const [editDraftNumber, setEditDraftNumber] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [activeTab, setActiveTab] = useState<string>("new");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [draftToSend, setDraftToSend] = useState<string | null>(null);
  const [newlySentRequestNumbers, setNewlySentRequestNumbers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const previousRequestsRef = useRef<typeof allRequests>(undefined);
  
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
      
      // Ensure we're on the Active tab to see the new request
      setActiveTab("new");
      
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

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        return (
          r.requestNumber.toLowerCase().includes(query) ||
          r.itemName.toLowerCase().includes(query) ||
          r.site?.name?.toLowerCase().includes(query) ||
          r.site?.code?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  };

  const filteredNewRequests = filterRequests(newRequests);
  const filteredHistoryRequests = filterRequests(historyRequests);

  return (
    <>
      {/* Search, Filters, and Actions Bar */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        {/* Top Row: Search and New Request Button */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by request #, item, site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 sm:h-10 text-sm"
            />
          </div>
          <Button 
            onClick={() => setFormOpen(true)} 
            size="sm"
            className="w-full sm:w-auto h-9 sm:h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Bottom Row: Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="ready_for_cc">Ready for CC</SelectItem>
              <SelectItem value="cc_pending">CC Pending</SelectItem>
              <SelectItem value="cc_approved">CC Approved</SelectItem>
              <SelectItem value="ready_for_po">Ready for PO</SelectItem>
              <SelectItem value="delivery_stage">Delivery Stage</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2 flex-1 sm:flex-initial justify-end">
            <Button
              variant={viewMode === "card" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="h-9 sm:h-10 px-3"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-9 sm:h-10 px-3"
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
          <TabsTrigger value="new" className="text-xs sm:text-sm">
            Active ({filteredNewRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            History ({filteredHistoryRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          <RequestsTable
            requests={filteredNewRequests}
            onViewDetails={(requestId) => setSelectedRequestId(requestId)}
            onEditDraft={handleEditDraft}
            onDeleteDraft={handleDeleteDraft}
            onSendDraft={handleSendDraft}
            newlySentRequestNumbers={newlySentRequestNumbers}
            viewMode={viewMode}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <RequestsTable
            requests={filteredHistoryRequests}
            onViewDetails={(requestId) => setSelectedRequestId(requestId)}
            viewMode={viewMode}
          />
        </TabsContent>
      </Tabs>

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
            <AlertDialogDescription className="text-sm space-y-4 pt-2">
              {draftDetails && draftDetails.length > 0 ? (
                <>
                  <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Site Location</p>
                        <p className="text-sm font-medium">
                          {draftDetails[0].site?.name || "Selected site"}
                        </p>
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
            </AlertDialogDescription>
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

