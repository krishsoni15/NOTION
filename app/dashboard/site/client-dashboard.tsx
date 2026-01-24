"use client";

/**
 * Client Component for Site Engineer Dashboard
 *
 * Dashboard with create request button, chat, and sticky notes in responsive grid.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Activity, ChevronRight, MapPin, Calendar, Package, AlertTriangle, CheckCircle2, X, Send } from "lucide-react";
import { MaterialRequestForm } from "@/components/requests/material-request-form";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";
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
import { format } from "date-fns";
import { ConfirmDeliveryDialog } from "@/components/requests/confirm-delivery-dialog";

export default function SiteEngineerDashboardClient() {
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [editDraftNumber, setEditDraftNumber] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);

  // Handlers state
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [draftToSend, setDraftToSend] = useState<string | null>(null);
  const [confirmDeliveryId, setConfirmDeliveryId] = useState<Id<"requests"> | null>(null);

  const requests = useQuery(api.requests.getUserRequests);
  const deleteDraft = useMutation(api.requests.deleteDraftRequest);
  const sendDraft = useMutation(api.requests.sendDraftRequest);

  const draftDetails = useQuery(
    api.requests.getRequestsByRequestNumber,
    draftToSend ? { requestNumber: draftToSend } : "skip"
  );

  // Sort by updatedAt desc and take top 20
  const recentRequests = requests
    ? [...requests].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20)
    : [];

  const handleEditDraft = (requestNumber: string) => {
    setEditDraftNumber(requestNumber);
    setIsCreateRequestOpen(true);
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
      toast.error("Failed to delete draft");
    }
  };

  const handleSendDraft = (requestNumber: string) => {
    setDraftToSend(requestNumber);
    setSendConfirmOpen(true);
  };

  const confirmSendDraft = async () => {
    if (!draftToSend) return;
    try {
      await sendDraft({ requestNumber: draftToSend });
      toast.success("Request sent successfully!");
      setSendConfirmOpen(false);
      setDraftToSend(null);
    } catch (error: any) {
      toast.error("Failed to send request");
    }
  };

  const handleConfirmDelivery = (requestId: Id<"requests">) => {
    setConfirmDeliveryId(requestId);
  };

  return (
    <>
      <div className="space-y-8 pb-safe animate-in fade-in duration-500">
        {/* Header Section */}
        <section className="space-y-4">
          {/* BIG CREATE REQUEST BUTTON */}
          <Button
            onClick={() => setIsCreateRequestOpen(true)}
            className="w-full h-16 text-lg font-bold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-95 touch-manipulation rounded-xl border border-white/10"
          >
            <Plus className="h-6 w-6 mr-3 stroke-[3px]" />
            Create New Request
          </Button>
        </section>

        {/* Live Activity Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Live Activity
            </h2>
            <Link href="/dashboard/site/requests" className="text-xs font-semibold text-primary hover:underline flex items-center bg-primary/10 px-2 py-1 rounded-full">
              View All <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </div>

          <div className="min-h-[200px]">
            {/* Using RequestsTable ensures exact UI consistency */}
            <RequestsTable
              requests={recentRequests}
              viewMode="card"
              onViewDetails={(requestId) => setSelectedRequestId(requestId)}
              onEditDraft={handleEditDraft}
              onDeleteDraft={handleDeleteDraft}
              onSendDraft={handleSendDraft}
              onConfirmDelivery={handleConfirmDelivery}
              newlySentRequestNumbers={new Set()}
              singleColumn={true}
              alwaysExpanded={true}
              simplifiedStatuses={true}
            />

            {recentRequests.length === 0 && requests && (
              <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-muted mt-2">
                No recent activity to show
              </div>
            )}
          </div>
        </section>
      </div>

      <MaterialRequestForm
        open={isCreateRequestOpen}
        onOpenChange={(open) => {
          setIsCreateRequestOpen(open);
          if (!open) setEditDraftNumber(null);
        }}
        draftRequestNumber={editDraftNumber}
      />

      <RequestDetailsDialog
        open={!!selectedRequestId}
        onOpenChange={(open) => {
          if (!open) setSelectedRequestId(null);
        }}
        requestId={selectedRequestId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDraftToDelete(null)}>Cancel</AlertDialogCancel>
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
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Location</p>
                        {draftDetails[0].site ? (
                          <div className="text-sm font-medium text-foreground">
                            {draftDetails[0].site.name}
                            {draftDetails[0].site.code && (
                              <span className="text-muted-foreground ml-1">({draftDetails[0].site.code})</span>
                            )}
                          </div>
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

      {/* Confirm Delivery Dialog */}
      <ConfirmDeliveryDialog
        open={!!confirmDeliveryId}
        onOpenChange={(open) => !open && setConfirmDeliveryId(null)}
        requestId={confirmDeliveryId}
      />
    </>
  );
}
