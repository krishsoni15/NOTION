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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Package,
  IndianRupee,
  Loader2,
  Send,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import type { ProjectItemFormData } from "../types/project.types";

interface ProjectItemsManagerProps {
  projectId: Id<"projects">;
}

const EMPTY: ProjectItemFormData = {
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

  const [form, setForm] = useState<ProjectItemFormData>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [selected, setSelected] = useState<Set<Id<"projectItems">>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const hasCategories = (categories?.length ?? 0) > 0;

  const toggle = (id: Id<"projectItems">) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectAll = () => {
    if (!items) return;
    setSelected(selected.size === items.length ? new Set() : new Set(items.map((i) => i._id)));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.categoryId || form.quantity === "" || form.rate === "") {
      toast.error("Fill in all required fields");
      return;
    }
    if (Number(form.quantity) <= 0) { toast.error("Quantity must be > 0"); return; }
    if (Number(form.rate) < 0) { toast.error("Rate cannot be negative"); return; }

    setIsSubmitting(true);
    try {
      await createItem({
        projectId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        categoryId: form.categoryId as Id<"projectCategories">,
        make: form.make.trim() || undefined,
        quantity: Number(form.quantity),
        rate: Number(form.rate),
      });
      toast.success("Item added");
      setForm(EMPTY);
    } catch {
      toast.error("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: Id<"projectItems">) => {
    try {
      await deleteItem({ itemId: id });
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const result = await sendToProcurement({ projectId, itemIds: Array.from(selected) });
      toast.success(`${selected.size} item(s) sent — RFQ #${result.requestNumber}`);
      setSelected(new Set());
      setIsConfirmOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const id = await createCategory({ name: newCatName });
      setForm((prev) => ({ ...prev, categoryId: id }));
      setNewCatName("");
      setIsCatOpen(false);
      toast.success("Category created");
    } catch {
      toast.error("Failed to create category");
    }
  };

  const totalEstimate = items?.reduce((s, i) => s + i.quantity * i.rate, 0) ?? 0;
  const selectedItems = items?.filter((i) => selected.has(i._id)) ?? [];

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* ── LEFT: Add Item Form ──────────────────────────────────────── */}
      <div className="lg:w-72 xl:w-80 shrink-0">
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4 sticky top-4">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add New Item
          </h4>

          <form onSubmit={handleAdd} className="space-y-3">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Item Name *
              </Label>
              <Input
                placeholder="e.g. 10mm Steel TMT Bar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-9 text-sm"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category *
              </Label>
              <div className="flex gap-2">
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v as Id<"projectCategories"> })}
                >
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setIsCatOpen(true)}
                  title="New category"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {!hasCategories && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Click <strong>+</strong> to create a category first.
                </p>
              )}
            </div>

            {/* Make */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Make / Brand
              </Label>
              <Input
                placeholder="e.g. Tata, Jindal"
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            {/* Qty + Rate */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Qty *
                </Label>
                <div className="relative">
                  <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number" min="0" step="0.01"
                    className="pl-8 h-9 text-sm" placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value as number | "" })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Rate *
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number" min="0" step="0.01"
                    className="pl-8 h-9 text-sm" placeholder="0.00"
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value as number | "" })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notes <span className="normal-case font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                placeholder="Additional details…"
                className="resize-none h-14 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-9 font-semibold text-sm"
              disabled={isSubmitting || !hasCategories}
            >
              {isSubmitting
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Plus className="h-4 w-4 mr-2" />}
              Add Item
            </Button>
          </form>
        </div>
      </div>

      {/* ── RIGHT: Items Table ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Table header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Items</span>
            {items && items.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{items.length}</Badge>
            )}
            {totalEstimate > 0 && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                · Est. total:{" "}
                <span className="font-semibold text-foreground">₹{totalEstimate.toLocaleString()}</span>
              </span>
            )}
          </div>
          {items && items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              {selected.size === items.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>

        {/* Table */}
        {!items ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground rounded-xl border border-border">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground rounded-xl border border-dashed border-border">
            <Package className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">No items yet</p>
            <p className="text-xs opacity-70 mt-1">Use the form to add material items.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10 pl-3">
                      <Checkbox
                        checked={selected.size === items.length && items.length > 0}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Item
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[110px]">
                      Category
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[80px] text-right">
                      Qty
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[90px] text-right">
                      Rate
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[100px] text-right">
                      Total
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => {
                    const isSel = selected.has(item._id);
                    return (
                      <TableRow
                        key={item._id}
                        className={cn(
                          "transition-colors",
                          isSel ? "bg-primary/5" : i % 2 === 1 ? "bg-muted/10" : ""
                        )}
                      >
                        <TableCell className="pl-3 py-2.5">
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => toggle(item._id)}
                          />
                        </TableCell>
                        <TableCell className="py-2.5">
                          <p className="text-sm font-semibold text-foreground">{item.name}</p>
                          {item.make && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.make}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium">
                            {item.categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-sm text-right font-medium">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="py-2.5 text-sm text-right text-muted-foreground">
                          ₹{item.rate.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 text-sm text-right font-bold text-foreground">
                          ₹{(item.quantity * item.rate).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 pr-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(item._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Total row + Send button */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/10">
              <div className="text-sm text-muted-foreground">
                {selected.size > 0 ? (
                  <span>
                    <strong className="text-foreground">{selected.size}</strong> item{selected.size !== 1 ? "s" : ""} selected
                  </span>
                ) : (
                  <span>Select items to send to procurement</span>
                )}
              </div>
              <Button
                onClick={() => {
                  if (selected.size === 0) { toast.error("Select at least one item"); return; }
                  setIsConfirmOpen(true);
                }}
                disabled={selected.size === 0}
                size="sm"
                className={cn(
                  "gap-2 font-semibold text-sm h-8",
                  selected.size > 0
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm"
                    : ""
                )}
                variant={selected.size === 0 ? "outline" : "default"}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Send to Procurement
                {selected.size > 0 && (
                  <Badge className="h-4 px-1 text-[10px] bg-white/20 text-white border-0">
                    {selected.size}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Send Dialog ──────────────────────────────────────── */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send to Procurement
            </DialogTitle>
            <DialogDescription>
              Creates an RFQ with {selected.size} item(s) and sends them to the Cost Comparison queue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[260px] overflow-y-auto py-2">
            {selectedItems.map((item, idx) => (
              <div key={item._id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Badge variant="secondary" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {idx + 1}
                </Badge>
                <div className="flex-1 min-w-0">
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
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
            >
              {isSending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                : <><Send className="h-4 w-4 mr-2" />Confirm & Send</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Category Dialog ──────────────────────────────────────── */}
      <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
            <DialogDescription>
              Create a material category available across all projects.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCat} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                placeholder="e.g. Plumbing, Civil, Electrical"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCatOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!newCatName.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
