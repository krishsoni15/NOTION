"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileDown, CalendarIcon, Upload, CheckCircle2, Package, Search, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { MediaInput } from "@/components/shared/media-input";
import { PDFPreviewDialog } from "@/components/purchase/pdf-preview-dialog";
import type { Id } from "@/convex/_generated/dataModel";

export function GRNPageContent() {
    const pendingPOs = useQuery(api.grn.getPendingPOsForGRN);
    const grns = useQuery(api.grn.getAllGRNs);
    const createGRN = useMutation(api.grn.createGRN);
    const updateGRN = useMutation(api.grn.updateGRN);

    const [activeTab, setActiveTab] = useState("pending");
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog state
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<any>(null);
    const [receivedQty, setReceivedQty] = useState<number | "">("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(undefined);
    const [invoicePhoto, setInvoicePhoto] = useState<{ imageUrl: string; imageKey: string } | undefined>(undefined);
    const [invoicePhotoFile, setInvoicePhotoFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inline Upload State
    const [inlineUploadGRNId, setInlineUploadGRNId] = useState<Id<"grns"> | null>(null);
    const [inlineUploadPhoto, setInlineUploadPhoto] = useState<File | null>(null);
    const [isUploadingInline, setIsUploadingInline] = useState(false);

    // PDF Preview state
    const [pdfPreviewPoNumber, setPdfPreviewPoNumber] = useState<string | null>(null);
    const [pdfPreviewRequestId, setPdfPreviewRequestId] = useState<string | null>(null);

    const filteredPendingPOs = pendingPOs?.filter(po =>
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.itemDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor?.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGRNs = grns?.filter(grn =>
        grn.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.po?.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.vendor?.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openCreateDialog = (po: any) => {
        setSelectedPO(po);
        setReceivedQty(po.remainingQuantity);
        setInvoiceNo("");
        setInvoiceDate(new Date());
        setInvoicePhoto(undefined);
        setInvoicePhotoFile(null);
        setIsCreateDialogOpen(true);
    };

    const handleCreateGRN = async () => {
        if (!selectedPO || !receivedQty || Number(receivedQty) <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        if (Number(receivedQty) > selectedPO.remainingQuantity) {
            toast.error(`Cannot receive more than remaining quantity (${selectedPO.remainingQuantity})`);
            return;
        }

        setIsSubmitting(true);
        try {
            let finalInvoicePhoto = invoicePhoto;

            if (invoicePhotoFile) {
                const formData = new FormData();
                formData.append("file", invoicePhotoFile);

                const response = await fetch("/api/upload/image", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error("Failed to upload invoice document");
                }

                const data = await response.json();
                finalInvoicePhoto = {
                    imageUrl: data.imageUrl,
                    imageKey: data.imageKey,
                };
            }

            await createGRN({
                poId: selectedPO._id,
                receivedQuantity: Number(receivedQty),
                invoiceNo: invoiceNo || undefined,
                invoiceDate: invoiceDate ? invoiceDate.getTime() : undefined,
                siteId: selectedPO.deliverySiteId || selectedPO.request?.siteId || undefined,
                invoicePhoto: finalInvoicePhoto,
            });
            toast.success("GRN created successfully");
            setIsCreateDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to create GRN");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6 text-primary" />
                        Goods Receipt Notes (GRN)
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage incoming deliveries and create receipt notes.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <TabsList className="w-full sm:w-auto grid grid-cols-2 h-11 p-1">
                        <TabsTrigger value="pending" className="flex items-center gap-2">
                            Pending POs
                            {pendingPOs && pendingPOs.length > 0 && (
                                <Badge variant="secondary" className="ml-1.5 bg-primary/10 text-primary">
                                    {pendingPOs.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="flex items-center gap-2">
                            Completed GRNs
                            {grns && grns.length > 0 && (
                                <Badge variant="secondary" className="ml-1.5">
                                    {grns.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by PO#, Vendor, Item..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-11 bg-card/50 border-input hover:border-accent-foreground/50 transition-colors"
                        />
                    </div>
                </div>

                <TabsContent value="pending" className="mt-0 outline-none">
                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>PO Date</TableHead>
                                        <TableHead>PO Number</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Material</TableHead>
                                        <TableHead className="text-center">Total Qty</TableHead>
                                        <TableHead className="text-center">Received</TableHead>
                                        <TableHead className="text-center text-primary font-semibold">Remaining</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!pendingPOs ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                                Loading Pending POs...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPendingPOs?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                                No pending POs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPendingPOs?.map((po) => (
                                            <TableRow key={po._id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">
                                                    {format(new Date(po.createdAt), "dd/MM/yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className="font-mono cursor-pointer hover:bg-accent transition-colors"
                                                        onClick={() => {
                                                            setPdfPreviewPoNumber(po.poNumber);
                                                            if (po.requestId) setPdfPreviewRequestId(po.requestId);
                                                        }}
                                                    >
                                                        {po.poNumber}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-sm max-w-[150px] truncate" title={po.vendor?.companyName}>
                                                        {po.vendor?.companyName}
                                                        {po.vendor?.contactName && (
                                                            <div className="text-xs text-muted-foreground truncate hidden md:block">
                                                                {po.vendor.contactName}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm max-w-[200px] truncate" title={po.itemDescription}>
                                                        {po.itemDescription.split(' ').slice(0, 5).join(' ')}{po.itemDescription.split(' ').length > 5 ? '...' : ''}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">{po.quantity} {po.unit}</TableCell>
                                                <TableCell className="text-center text-muted-foreground">{po.receivedQuantity}</TableCell>
                                                <TableCell className="text-center font-bold text-primary">
                                                    {po.remainingQuantity}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        className="shadow-sm hover:scale-105 transition-all"
                                                        onClick={() => openCreateDialog(po)}
                                                    >
                                                        Create GRN
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="completed" className="mt-0 outline-none">
                    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                                        <TableHead className="whitespace-nowrap font-semibold">GR No.</TableHead>
                                        <TableHead className="whitespace-nowrap font-semibold">Date</TableHead>
                                        <TableHead className="min-w-[150px] font-semibold">Invoice No.</TableHead>
                                        <TableHead className="whitespace-nowrap font-semibold">P.O. No.</TableHead>
                                        <TableHead className="font-semibold">Vendor Name</TableHead>
                                        <TableHead className="min-w-[120px] font-semibold">Material Name</TableHead>
                                        <TableHead className="whitespace-nowrap text-center font-semibold">Qty</TableHead>
                                        <TableHead className="min-w-[130px] text-right font-semibold">Rate / Total</TableHead>
                                        <TableHead className="font-semibold">Site</TableHead>
                                        <TableHead className="min-w-[130px] font-semibold">Inv. Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!grns ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                                Loading GRNs...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredGRNs?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                                No completed GRNs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredGRNs?.map((grn) => {
                                            // Calculate per GRN totals
                                            const po = grn.po;
                                            const basis = po?.perUnitBasis || 1;
                                            const discount = po?.discountPercent || 0;
                                            const baseAmount = (grn.receivedQuantity / basis) * (po?.unitRate || 0);
                                            const discountAmount = (baseAmount * discount) / 100;
                                            const taxableAmount = baseAmount - discountAmount;
                                            const taxAmount = (taxableAmount * (po?.gstTaxRate || 0)) / 100;
                                            const totalAmount = taxableAmount + taxAmount;

                                            return (
                                                <TableRow key={grn._id} className="hover:bg-muted/30 align-top">
                                                    <TableCell className="font-semibold text-xs whitespace-nowrap pt-3">
                                                        {grn.grnNumber.replace('GRN-', '')}
                                                    </TableCell>
                                                    <TableCell className="text-xs whitespace-nowrap pt-3">
                                                        {format(new Date(grn.createdAt), "dd/MM/yy")}
                                                    </TableCell>
                                                    <TableCell className="pt-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <Input
                                                                defaultValue={grn.invoiceNo || ""}
                                                                placeholder="Enter Invoice..."
                                                                className="h-8 max-w-[130px] text-xs font-mono px-2 py-1 shadow-sm border-muted-foreground/30 focus-visible:ring-1 focus-visible:border-primary"
                                                                onBlur={(e) => {
                                                                    if (e.target.value !== (grn.invoiceNo || "")) {
                                                                        updateGRN({ grnId: grn._id, invoiceNo: e.target.value })
                                                                            .catch(err => toast.error("Failed to update"));
                                                                    }
                                                                }}
                                                            />
                                                            {grn.invoicePhoto ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-colors"
                                                                    title="View Invoice"
                                                                    onClick={() => {
                                                                        window.open(grn.invoicePhoto!.imageUrl, '_blank');
                                                                    }}
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary transition-colors border-dashed"
                                                                    title="Upload Invoice"
                                                                    onClick={() => setInlineUploadGRNId(grn._id)}
                                                                >
                                                                    <Upload className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="pt-3">
                                                        <span
                                                            className="font-mono text-xs cursor-pointer text-blue-600 hover:text-blue-800 hover:underline hover:bg-blue-50 py-0.5 px-1 rounded transition-colors"
                                                            onClick={() => {
                                                                if (po?.poNumber) {
                                                                    setPdfPreviewPoNumber(po.poNumber);
                                                                    if (po.requestId) setPdfPreviewRequestId(po.requestId);
                                                                }
                                                            }}
                                                            title="View PO PDF"
                                                        >
                                                            {po?.poNumber || "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="pt-3">
                                                        <div className="text-xs font-medium max-w-[140px] truncate" title={grn.vendor?.companyName}>
                                                            {grn.vendor?.companyName}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="pt-3">
                                                        <div className="text-xs max-w-[140px] truncate" title={po?.itemDescription}>
                                                            {po?.itemDescription.split('\n')[0]}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs whitespace-nowrap pt-3">
                                                        <span className="font-semibold">{grn.receivedQuantity}</span> <span className="text-muted-foreground text-[10px] uppercase ml-0.5">{po?.unit}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs pt-2">
                                                        <div className="space-y-1 bg-muted/20 p-1.5 rounded-md border border-border/50">
                                                            <div className="flex justify-between items-center text-[11px] gap-2">
                                                                <span className="text-muted-foreground">Rate:</span>
                                                                <span>₹{(po?.unitRate || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            {po?.gstTaxRate ? (
                                                                <div className="flex justify-between items-center text-[10px] text-muted-foreground gap-2">
                                                                    <span>GST {po.gstTaxRate}%:</span>
                                                                    <span>₹{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                                </div>
                                                            ) : null}
                                                            <div className="flex justify-between items-center font-bold text-primary border-t border-border pt-1 mt-1 gap-2">
                                                                <span className="text-[10px] uppercase text-muted-foreground">Total:</span>
                                                                <span>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="pt-3">
                                                        <div className="text-xs text-muted-foreground max-w-[100px] truncate" title={grn.site?.name}>
                                                            {grn.site?.name || "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="pt-2">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "h-8 w-full min-w-[110px] justify-start text-left font-normal text-[11px] px-2 py-1 shadow-sm",
                                                                        !grn.invoiceDate && "text-muted-foreground border-dashed"
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-1.5 h-3 w-3 opacity-70" />
                                                                    {grn.invoiceDate ? format(new Date(grn.invoiceDate), "dd/MMM/yy") : <span>Select Date</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0 z-[100]" align="end">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={grn.invoiceDate ? new Date(grn.invoiceDate) : undefined}
                                                                    onSelect={(date) => {
                                                                        updateGRN({ grnId: grn._id, invoiceDate: date ? date.getTime() : undefined })
                                                                            .catch(err => toast.error("Failed to update"));
                                                                    }}
                                                                    initialFocus
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create GRN Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Create Goods Receipt Note
                        </DialogTitle>
                        <DialogDescription>
                            Receive items for PO <span className="font-mono text-primary font-semibold">{selectedPO?.poNumber}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPO && (
                        <div className="grid gap-5 py-4">
                            <div className="bg-muted/50 p-3 rounded-lg border text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Item:</span>
                                    <span className="font-medium text-right max-w-[250px] truncate" title={selectedPO.itemDescription}>
                                        {selectedPO.itemDescription.split('\n')[0]}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Vendor:</span>
                                    <span className="font-medium text-right">{selectedPO.vendor?.companyName}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-2">
                                    <div className="text-center px-4">
                                        <div className="text-xs text-muted-foreground">PO Qty</div>
                                        <div className="font-semibold">{selectedPO.quantity}</div>
                                    </div>
                                    <div className="text-center px-4 border-x border-border/50">
                                        <div className="text-xs text-muted-foreground">Received</div>
                                        <div className="font-semibold">{selectedPO.receivedQuantity}</div>
                                    </div>
                                    <div className="text-center px-4">
                                        <div className="text-xs text-muted-foreground">Remaining</div>
                                        <div className="font-bold text-primary">{selectedPO.remainingQuantity}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                    Receiving Quantity (Unit: {selectedPO.unit}) <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="number"
                                    value={receivedQty}
                                    onChange={(e) => setReceivedQty(e.target.value === "" ? "" : Number(e.target.value))}
                                    max={selectedPO.remainingQuantity}
                                    min={1}
                                    placeholder={`Max: ${selectedPO.remainingQuantity}`}
                                    className="font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Invoice Number</label>
                                    <Input
                                        placeholder="e.g. INV-2023-001"
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Invoice Date</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "justify-start text-left font-normal",
                                                    !invoiceDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={invoiceDate}
                                                onSelect={setInvoiceDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Invoice Document (Optional)</label>
                                <MediaInput
                                    onValueChange={(file) => setInvoicePhotoFile(file)}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreateGRN}
                            disabled={isSubmitting || !receivedQty || Number(receivedQty) <= 0}
                        >
                            {isSubmitting ? "Generating..." : "Generate GRN"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Inline Upload Dialog */}
            <Dialog open={!!inlineUploadGRNId} onOpenChange={(open) => {
                if (!open) {
                    setInlineUploadGRNId(null);
                    setInlineUploadPhoto(null);
                }
            }}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Upload Invoice Photo/Doc</DialogTitle>
                        <DialogDescription>Add an invoice photo or document for this GRN. PDFs and images are supported via Camera/Upload.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <MediaInput
                            onValueChange={(file) => setInlineUploadPhoto(file)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setInlineUploadGRNId(null);
                            setInlineUploadPhoto(null);
                        }}>Cancel</Button>
                        <Button
                            disabled={!inlineUploadPhoto || isUploadingInline}
                            onClick={async () => {
                                if (!inlineUploadPhoto || !inlineUploadGRNId) return;
                                setIsUploadingInline(true);
                                try {
                                    const formData = new FormData();
                                    formData.append("file", inlineUploadPhoto);

                                    const response = await fetch("/api/upload/image", {
                                        method: "POST",
                                        body: formData,
                                    });
                                    if (!response.ok) throw new Error("Upload failed");

                                    const data = await response.json();
                                    await updateGRN({
                                        grnId: inlineUploadGRNId,
                                        invoicePhoto: {
                                            imageUrl: data.imageUrl,
                                            imageKey: data.imageKey,
                                        }
                                    });
                                    toast.success("Invoice uploaded successfully");
                                    setInlineUploadGRNId(null);
                                    setInlineUploadPhoto(null);
                                } catch (error) {
                                    toast.error("Failed to upload invoice");
                                } finally {
                                    setIsUploadingInline(false);
                                }
                            }}
                        >
                            {isUploadingInline ? "Uploading..." : "Upload & Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PDF Preview Dialog */}
            <PDFPreviewDialog
                open={!!pdfPreviewPoNumber}
                onOpenChange={(open) => {
                    if (!open) {
                        setPdfPreviewPoNumber(null);
                        setPdfPreviewRequestId(null);
                    }
                }}
                poNumber={pdfPreviewPoNumber}
                requestId={pdfPreviewRequestId}
            />
        </div>
    );
}
