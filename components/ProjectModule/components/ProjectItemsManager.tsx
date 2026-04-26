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
import { toast } from "sonner";
import { Plus, Trash2, Tag, Layers, Package, IndianRupee, Loader2 } from "lucide-react";
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

  const [formData, setFormData] = useState<ProjectItemFormData>(INITIAL_ITEM_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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
          <div className="grid grid-cols-2 gap-4">
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Submit / Save Item
          </Button>
        </form>
      </div>

      {/* Summary List */}
      <div className="flex-1 overflow-y-auto p-5 bg-muted/5">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Added Items ({items?.length || 0})
        </h4>
        
        {!items ? (
          <div className="flex justify-center p-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground text-sm">
            No items added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item._id} className="shadow-sm border-border/50">
                <CardContent className="p-3 flex justify-between items-start gap-3">
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteItem(item._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
