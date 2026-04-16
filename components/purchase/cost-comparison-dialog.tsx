"use client";

/**
 * Cost Comparison Dialog Component
 * 
 * Allows Purchase Officers to compare multiple vendor quotes for a request
 * or create a Direct Cost Comparison (Direct CC).
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { 
    Plus, 
    Save, 
    Send, 
    AlertCircle, 
    Package, 
    CheckCircle, 
    Building, 
    Info, 
    ExternalLink, 
    Mail, 
    Phone, 
    Hash, 
    MapPin,
    Zap,
    ShoppingCart,
    Truck,
    FileText,
    Search,
    ChevronDown,
    ChevronUp,
    X,
    Check,
    AlertTriangle,
    Eye,
    Edit
} from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { VendorCreationForm } from "./vendor-creation-form";
import { LazyImage } from "@/components/ui/lazy-image";
import { ImageSlider } from "@/components/ui/image-slider";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { DraggableDialogContent } from "@/components/ui/dialog";

interface VendorQuote {
    vendorId: Id<"vendors">;
    vendorName: string;
    unitPrice: number;
    amount?: number;
    unit?: string;
    discountPercent?: number;
    gstPercent?: number;
    remarks?: string;
}

interface CostComparisonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId?: Id<"requests">;
    requestIds?: Id<"requests">[]; // Added for batch support
    isDirect?: boolean;
    directCCId?: Id<"costComparisons">;
}

export function CostComparisonDialog({
    open,
    onOpenChange,
    requestId,
    requestIds,
    isDirect = false,
    directCCId,
}: CostComparisonDialogProps) {
    const convex = useConvex();
    
    // Batch navigation state
    const [currentCCIndex, setCurrentCCIndex] = useState(0);
    const ccRequestIds = requestIds && requestIds.length > 0 ? requestIds : (requestId ? [requestId] : []);
    const activeRequestId = ccRequestIds[currentCCIndex] || requestId;
    const hasMultipleCCs = ccRequestIds.length > 1;
    
    // Recovery / Initial state
    const [vendorQuotes, setVendorQuotes] = useState<VendorQuote[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showVendorDetails, setShowVendorDetails] = useState<string | null>(null);
    const [showCreateVendorDialog, setShowCreateVendorDialog] = useState(false);
    
    // Direct CC specific state
    const [directItem, setDirectItem] = useState({
        itemName: "",
        description: "",
        quantity: 1,
        unit: "nos",
        specs: "",
    });

    // Mutations
    const upsertCC = useMutation(api.costComparisons.upsertCostComparison);
    const submitCC = useMutation(api.costComparisons.submitCostComparison);
    
    // Queries
    const request = useQuery(
        api.requests.getRequestById,
        activeRequestId ? { requestId: activeRequestId } : "skip"
    );
    
    const existingCC = useQuery(
        api.costComparisons.getCostComparisonByRequestId,
        activeRequestId ? { requestId: activeRequestId } : "skip"
    );

    const directCC = useQuery(
        api.costComparisons.getCostComparisonByRequestId,
        directCCId ? { ccId: directCCId } : "skip"
    );

    const vendors = useQuery(api.vendors.getAllVendors);
    const currentUser = useQuery(api.users.getCurrentUser);

    // Sync state with existing data
    useEffect(() => {
        const data = isDirect ? (directCCId ? directCC : null) : existingCC;
        if (data && open) {
            setVendorQuotes(data.vendorQuotes ? data.vendorQuotes.map((q: any) => ({
                vendorId: q.vendorId,
                vendorName: q.vendor?.companyName || "Unknown Vendor",
                unitPrice: q.unitPrice,
                amount: q.amount,
                unit: q.unit,
                discountPercent: q.discountPercent,
                gstPercent: q.gstPercent,
                remarks: q.remarks
            })) : []);
            if (isDirect && data.directItem) {
                setDirectItem({
                    itemName: data.directItem.itemName,
                    description: data.directItem.description || "",
                    quantity: data.directItem.quantity,
                    unit: data.directItem.unit,
                    specs: data.directItem.specs || "",
                });
            }
        } else if (open && !data) {
            setVendorQuotes([]);
            if (isDirect) {
                setDirectItem({
                    itemName: "",
                    description: "",
                    quantity: 1,
                    unit: "nos",
                    specs: "",
                });
            }
        }
    }, [existingCC, directCC, open, isDirect, directCCId]);

    const handleSave = async (submit = false) => {
        if (vendorQuotes.length === 0) {
            toast.error("Please add at least one vendor quote");
            return;
        }

        if (isDirect && !directItem.itemName) {
            toast.error("Please provide an item name for the direct CC");
            return;
        }

        const action = submit ? "Submitting" : "Saving";
        if (submit) setIsSubmitting(true);
        else setIsSaving(true);
        
        try {
            const ccId = await upsertCC({
                requestId: activeRequestId,
                isDirect,
                directItem: isDirect ? directItem : undefined,
                isDirectDelivery: false,
                vendorQuotes: vendorQuotes.map(q => ({
                    vendorId: q.vendorId,
                    unitPrice: q.unitPrice,
                    unit: q.unit || (isDirect ? directItem.unit : request?.unit || "nos"),
                    discountPercent: q.discountPercent || 0,
                    gstPercent: q.gstPercent || 0,
                    remarks: q.remarks
                })),
                status: (submit && isDirect) ? "cc_approved" : (submit ? "cc_pending" : "draft")
            });

            if (submit) {
                await submitCC({ ccId, requestId: activeRequestId });
                toast.success(isDirect ? "Direct CC Finalized (Approved)" : "CC Submitted for Approval");
            } else {
                toast.success("CC Saved as Draft");
            }

            if (hasMultipleCCs && currentCCIndex < ccRequestIds.length - 1) {
                setCurrentCCIndex(prev => prev + 1);
            } else {
                onOpenChange(false);
            }
        } catch (error: any) {
            toast.error(`Failed to ${action.toLowerCase()} CC: ${error.message}`);
        } finally {
            setIsSaving(false);
            setIsSubmitting(false);
        }
    };

    // Helper to find lowest price
    const lowestPrice = useMemo(() => {
        if (vendorQuotes.length === 0) return 0;
        return Math.min(...vendorQuotes.map(q => q.unitPrice));
    }, [vendorQuotes]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                {isDirect ? <Zap className="h-5 w-5 text-orange-500" /> : <FileText className="h-5 w-5 text-blue-500" />}
                                {isDirect ? "Direct Cost Comparison" : `Cost Comparison — Req #${request?.requestNumber}`}
                                {hasMultipleCCs && <span className="text-sm font-normal text-muted-foreground ml-2">({currentCCIndex + 1} of {ccRequestIds.length})</span>}
                            </DialogTitle>
                            <DialogDescription>
                                {isDirect ? "Create a standalone CC bypassing the request flow" : `Compare quotes for ${request?.itemName}`}
                            </DialogDescription>
                        </div>
                        {hasMultipleCCs && (
                            <div className="flex gap-1 mr-4">
                                <Button variant="ghost" size="icon" onClick={() => setCurrentCCIndex(prev => Math.max(0, prev - 1))} disabled={currentCCIndex === 0}>
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setCurrentCCIndex(prev => Math.min(ccRequestIds.length - 1, prev + 1))} disabled={currentCCIndex === ccRequestIds.length - 1}>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Item Information Section */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" /> Item Details
                        </h3>
                        {isDirect ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Item Name</Label>
                                    <Input 
                                        value={directItem.itemName}
                                        onChange={(e) => setDirectItem(prev => ({...prev, itemName: e.target.value}))}
                                        placeholder="e.g. Cement, 53 Grade"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="number"
                                            value={directItem.quantity}
                                            onChange={(e) => setDirectItem(prev => ({...prev, quantity: parseFloat(e.target.value)}))}
                                            className="w-24"
                                        />
                                        <Input 
                                            value={directItem.unit}
                                            onChange={(e) => setDirectItem(prev => ({...prev, unit: e.target.value}))}
                                            placeholder="Unit"
                                            className="w-20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input 
                                        value={directItem.description}
                                        onChange={(e) => setDirectItem(prev => ({...prev, description: e.target.value}))}
                                        placeholder="Optional description"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <Label className="text-muted-foreground">Item</Label>
                                    <p className="font-medium">{request?.itemName}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Quantity</Label>
                                    <p className="font-medium">{request?.quantity} {request?.unit}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground">Specs/Description</Label>
                                    <p className="font-medium">{request?.description || "No description provided"}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Vendor Quotes Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Building className="h-4 w-4" /> Vendor Quotes
                            </h3>
                            <Button variant="outline" size="sm" onClick={() => setShowVendorDetails("new")} className="h-8">
                                <Plus className="h-4 w-4 mr-1" /> Add Quote
                            </Button>
                        </div>

                        {vendorQuotes.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                                <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">No quotes added yet. Click "Add Quote" to begin comparison.</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">Vendor</th>
                                            <th className="text-right p-3 font-semibold">Unit Price</th>
                                            <th className="text-right p-3 font-semibold">GST %</th>
                                            <th className="text-right p-3 font-semibold">Net Rate</th>
                                            <th className="text-right p-3 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {vendorQuotes.map((quote, idx) => {
                                            const isLowest = quote.unitPrice === lowestPrice;
                                            const netRate = quote.unitPrice * (1 + (quote.gstPercent || 0) / 100);
                                            return (
                                                <tr key={idx} className={cn(isLowest && vendorQuotes.length > 1 ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "")}>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{quote.vendorName}</span>
                                                            {isLowest && vendorQuotes.length > 1 && <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px] h-4">Lowest</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">₹{quote.unitPrice.toLocaleString()}</td>
                                                    <td className="p-3 text-right">{quote.gstPercent}%</td>
                                                    <td className="p-3 text-right font-bold text-primary">₹{netRate.toLocaleString()}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                                                const newQuotes = [...vendorQuotes];
                                                                newQuotes.splice(idx, 1);
                                                                setVendorQuotes(newQuotes);
                                                            }}>
                                                                <X className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t pt-4 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isSubmitting}>
                        Cancel
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => handleSave(false)} disabled={isSaving || isSubmitting}>
                            {isSaving && !isSubmitting ? "Saving..." : "Save Draft"}
                        </Button>
                        <Button onClick={() => handleSave(true)} disabled={isSaving || isSubmitting}>
                            {isSubmitting ? "Finalizing..." : (isDirect ? "Complete & Approve" : "Submit for Approval")}
                        </Button>
                    </div>
                </DialogFooter>
            </DraggableDialogContent>

            {/* Sub-dialog for Adding Quote */}
            <AlertDialog open={!!showVendorDetails} onOpenChange={(o) => !o && setShowVendorDetails(null)}>
                <AlertDialogContent className="sm:max-w-[500px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Add Vendor Quote</AlertDialogTitle>
                        <AlertDialogDescription>Select a vendor and provide their quoted unit price.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Select Vendor</Label>
                            <Select onValueChange={(val) => {
                                const v = vendors?.find(v => v._id === val);
                                if (v) setShowVendorDetails(JSON.stringify({ id: v._id, name: v.companyName }));
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Search vendors..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors?.map(v => (
                                        <SelectItem key={v._id} value={v._id}>{v.companyName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Unit Price (₹)</Label>
                                <Input id="temp-price" type="number" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <Label>GST %</Label>
                                <Input id="temp-gst" type="number" placeholder="18" defaultValue={18} />
                            </div>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            const price = parseFloat((document.getElementById('temp-price') as HTMLInputElement).value);
                            const gst = parseFloat((document.getElementById('temp-gst') as HTMLInputElement).value || "0");
                            
                            if (isNaN(price)) {
                                toast.error("Please enter a valid price");
                                return;
                            }
                            
                            if (!showVendorDetails || showVendorDetails === "new") {
                                toast.error("Please select a vendor");
                                return;
                            }

                            const vendorInfo = JSON.parse(showVendorDetails);
                            setVendorQuotes(prev => [...prev, {
                                vendorId: vendorInfo.id,
                                vendorName: vendorInfo.name,
                                unitPrice: price,
                                gstPercent: gst,
                                unit: (isDirect ? directItem.unit : request?.unit) || "nos"
                            }]);
                            setShowVendorDetails(null);
                        }}>Add Quote</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
