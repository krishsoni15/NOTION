"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ChevronsUpDown, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface CategoryComboboxProps {
  value: string; // categoryId or ""
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function CategoryCombobox({
  value,
  onChange,
  disabled = false,
  placeholder = "Select category…",
  className,
  triggerClassName,
}: CategoryComboboxProps) {
  const categories = useQuery(api.inventory.getInventoryCategories);
  const createCategory = useMutation(api.inventory.createInventoryCategory);

  const [open, setOpen] = useState(false);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selected = categories?.find((c) => c._id === value);

  const handleCreate = async () => {
    if (!newCatName.trim()) return;
    setIsCreating(true);
    try {
      const id = await createCategory({ name: newCatName.trim() });
      onChange(id);
      setNewCatName("");
      setNewCatOpen(false);
      toast.success("Category created");
    } catch {
      toast.error("Failed to create category");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex-1 justify-between font-normal text-sm h-9 border-2 hover:border-primary/30 transition-all",
              !selected && "text-muted-foreground",
              triggerClassName
            )}
          >
            <span className="truncate">{selected ? selected.name : placeholder}</span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search category…" className="h-9" />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                No category found.
              </CommandEmpty>
              <CommandGroup>
                {value && (
                  <CommandItem
                    value="__clear__"
                    onSelect={() => { onChange(""); setOpen(false); }}
                    className="text-muted-foreground text-xs"
                  >
                    Clear selection
                  </CommandItem>
                )}
                {categories?.map((cat) => (
                  <CommandItem
                    key={cat._id}
                    value={cat.name}
                    onSelect={() => { onChange(cat._id); setOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", value === cat._id ? "opacity-100" : "opacity-0")} />
                    {cat.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* + button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 border-2"
        disabled={disabled}
        onClick={() => { setNewCatName(""); setNewCatOpen(true); }}
        title="New category"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      {/* New category dialog */}
      <Dialog open={newCatOpen} onOpenChange={(o) => { if (!isCreating) setNewCatOpen(o); }}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            <Label>Category Name</Label>
            <Input
              placeholder="e.g. Civil, Electrical, Plumbing"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
                if (e.key === "Escape") setNewCatOpen(false);
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewCatOpen(false)} disabled={isCreating}>Cancel</Button>
            <Button type="button" onClick={handleCreate} disabled={!newCatName.trim() || isCreating}>
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
