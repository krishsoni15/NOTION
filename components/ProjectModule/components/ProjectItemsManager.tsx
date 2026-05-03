"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Layers, Package, IndianRupee, Loader2, Send, ShoppingCart, CheckCircle2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { ProjectItemFormData } from "../types/project.types";

interface ProjectItemsManagerProps {
  projectId: Id<"projects">;
}

const INITIAL_ITEM_FORM: ProjectItemFormData = {
  name: "",
  description: "",
  categoryId: "",
  make: "",
  quantity: "",
  rate: "",
};

export function ProjectItemsManager({ projectId }: ProjectItemsManagerProps) {
  const items = useQuery(api.projectItems.getItemsByProjectId, { projectId });
  const categories = useQuery(api.projectItems.getCategories);
  const createItem = useMutation(api.projectItems.createItem);
  const deleteItem = useMutation(api.projectItems.deleteItem);
  const createCategory = useMutation(api.projectItems.createCategory);
  const sendToProcurement = useMutation(api.projectItems.sendItemsToProcurement);

  const [formData, setFormData] = useState<ProjectItemFormData>(INITIAL_ITEM_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const hasCategories = (categories?.length ?? 0) > 0;

  // Selection state for "Send to Procurement"
  const [selectedItemIds, setSelectedItemIds] = useState<Set<Id<"projectItems">>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const toggleItemSelection = (itemId: Id<"projectItems">) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!items) return;
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map(i => i._id)));
    }
  };

  const handleSendToProcurement = async () => {
    if (selectedItemIds.size === 0) {
      toast.error("Please select at least one item");
      return;
    }

    setIsSending(true);
    try {
      const result = await sendToProcurement({
        projectId,
        itemIds: Array.from(selectedItemIds),
      });
      toast.success(`${selectedItemIds.size} item(s) sent to procurement as RFQ #${result.requestNumber}`);
      setSelectedItemIds(new Set());
      setShowConfirmDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send items to procurement");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const catId = await createCategory({ name: newCategoryName });
      setFormData((prev) => ({ ...prev, categoryId: catId }));
      setNewCategoryName("");
      setIsCategoryDialogOpen(false);
      toast.success("Category created");
    } catch (error) {
      toast.error("Failed to create category");
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.categoryId || formData.quantity === "" || formData.rate === "") {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (Number(formData.quantity) <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    if (Number(formData.rate) < 0) {
      toast.error("Rate cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createItem({
        projectId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        categoryId: formData.categoryId as Id<"projectCategories">,
        make: formData.make.trim() || undefined,
        quantity: Number(formData.quantity),
        rate: Number(formData.rate),
      });
      toast.success("Item added successfully");
      setFormData(INITIAL_ITEM_FORM);
    } catch (error) {
      toast.error("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: Id<"projectItems">) => {
    try {
      await deleteItem({ itemId });
      // Also remove from selection if selected
      setSelectedItemIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      toast.success("Item deleted");
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/10 rounded-xl overflow-hidden border border-border">
      {/* Add Item Form */}
      <div className="p-5 border-b border-border bg-card">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          Add New Item
        </h3>
        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Item Name *</Label>
              <Input
                placeholder="e.g. 10mm Steel TMT Bar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Category *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) => setFormData({ ...formData, categoryId: val as Id<"projectCategories"> })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setIsCategoryDialogOpen(true)} title="Add Category">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {!hasCategories && (
                <p className="text-xs text-muted-foreground">
                  No categories yet. Click <strong>+</strong> to create one first.
                </p>
              )}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Make / Brand</Label>
              <Input
                placeholder="e.g. Tata, Jindal"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Quantity *</Label>
              <div className="relative">
                <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value as number | "" })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Estimated Rate *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value as number | "" })}
                  required
                />
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Description</Label>
              <Textarea
                placeholder="Additional details..."
                className="resize-none h-16"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || !hasCategories}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Submit / Save Item
          </Button>
        </form>
      </div>

      {/* Summary List */}
      <div className="flex-1 overflow-y-auto p-5 bg-muted/5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Added Items ({items?.length || 0})
          </h4>
          {items && items.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {selectedItemIds.size === items.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          )}
        </div>
        
        {!items ? (
          <div className="flex justify-center p-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground text-sm">
            No items added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isSelected = selectedItemIds.has(item._id);
              return (
                <Card key={item._id} className={`shadow-sm border-border/50 transition-all ${isSelected ? "ring-2 ring-primary/40 border-primary/30 bg-primary/5" : ""}`}>
                  <CardContent className="p-3 flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Selection Checkbox */}
                      <div className="pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItemSelection(item._id)}
                          className="h-4.5 w-4.5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            <Tag className="h-3 w-3" />
                            {item.categoryName}
                          </span>
                          {item.make && <span>Make: {item.make}</span>}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs font-medium">
                          <span>Qty: {item.quantity}</span>
                          <span>Rate: ₹{item.rate.toLocaleString()}</span>
                          <span className="text-foreground">Total: ₹{(item.quantity * item.rate).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteItem(item._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Send to Procurement Action Bar */}
      {items && items.length > 0 && (
        <div className="shrink-0 p-4 border-t border-border bg-card">
          <Button
            onClick={() => {
              if (selectedItemIds.size === 0) {
                toast.error("Please select at least one item to send");
                return;
              }
              setShowConfirmDialog(true);
            }}
            disabled={selectedItemIds.size === 0}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold shadow-lg"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Send to Procurement ({selectedItemIds.size})
          </Button>
        </div>
      )}

      {/* Confirm Send Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Items to Procurement
            </DialogTitle>
            <DialogDescription>
              This will create an RFQ (Request for Quotation) with {selectedItemIds.size} item(s) and send them directly to the Cost Comparison queue.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
            {items?.filter(i => selectedItemIds.has(i._id)).map((item, idx) => (
              <div key={item._id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                <Badge variant="secondary" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × ₹{item.rate.toLocaleString()} = ₹{(item.quantity * item.rate).toLocaleString()}
                  </p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSendToProcurement}
              disabled={isSending}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm & Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new material category available across all projects.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                placeholder="e.g. Plumbing, Civil"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!newCategoryName.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
