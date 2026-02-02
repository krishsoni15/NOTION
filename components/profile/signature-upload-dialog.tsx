"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Pen, Trash2, Check, RotateCcw, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignatureUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SignatureUploadDialog({ open, onOpenChange }: SignatureUploadDialogProps) {
    const currentUser = useQuery(api.users.getCurrentUser);
    const generateUploadUrl = useMutation(api.users.generateSignatureUploadUrl);
    const updateSignature = useMutation(api.users.updateSignature);
    const deleteSignature = useMutation(api.users.deleteSignature);

    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<"upload" | "draw">("draw");

    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    // File upload refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Initialize canvas
    useEffect(() => {
        if (open && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = "#1e293b";
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }
        }
    }, [open, activeTab]);

    // Clear canvas
    const clearCanvas = () => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                setHasDrawn(false);
            }
        }
    };

    // Drawing handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ("touches" in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        // Scale for high DPI
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        ctx.beginPath();
        ctx.moveTo(x * scaleX, y * scaleY);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ("touches" in e) {
            e.preventDefault();
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        // Scale for high DPI
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        ctx.lineTo(x * scaleX, y * scaleY);
        ctx.stroke();
        setHasDrawn(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // File selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image must be less than 2MB");
            return;
        }

        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    // Upload from canvas
    const handleSaveDrawnSignature = async () => {
        if (!canvasRef.current || !hasDrawn) {
            toast.error("Please draw your signature first");
            return;
        }

        setIsUploading(true);
        try {
            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvasRef.current?.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Failed to create blob"));
                    },
                    "image/png",
                    1.0
                );
            });

            // Get upload URL
            const uploadUrl = await generateUploadUrl();

            // Upload
            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": "image/png" },
                body: blob,
            });

            if (!response.ok) throw new Error("Upload failed");

            const { storageId } = await response.json();

            // Save to user
            await updateSignature({ storageId });

            toast.success("Signature saved successfully!");
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to save signature");
        } finally {
            setIsUploading(false);
        }
    };

    // Upload from file
    const handleUploadFile = async () => {
        if (!selectedFile) {
            toast.error("Please select an image first");
            return;
        }

        setIsUploading(true);
        try {
            // Get upload URL
            const uploadUrl = await generateUploadUrl();

            // Upload
            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": selectedFile.type },
                body: selectedFile,
            });

            if (!response.ok) throw new Error("Upload failed");

            const { storageId } = await response.json();

            // Save to user
            await updateSignature({ storageId });

            toast.success("Signature uploaded successfully!");
            setSelectedFile(null);
            setPreviewUrl(null);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload signature");
        } finally {
            setIsUploading(false);
        }
    };

    // Delete signature
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteSignature();
            toast.success("Signature deleted");
        } catch (error) {
            toast.error("Failed to delete signature");
        } finally {
            setIsDeleting(false);
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    if (currentUser?.role !== "manager") {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pen className="h-5 w-5 text-primary" />
                        Signature
                    </DialogTitle>
                    <DialogDescription>
                        Upload or draw your signature for Purchase Orders
                    </DialogDescription>
                </DialogHeader>

                {/* Current Signature Preview */}
                {currentUser?.signatureUrl && (
                    <div className="border rounded-lg p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">Current Signature</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-white rounded border p-2 h-16 flex items-center justify-center">
                                <img
                                    src={currentUser.signatureUrl}
                                    alt="Current signature"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-destructive hover:text-destructive"
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "draw")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="draw" className="gap-2">
                            <Pen className="h-4 w-4" />
                            Draw
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload
                        </TabsTrigger>
                    </TabsList>

                    {/* Draw Tab */}
                    <TabsContent value="draw" className="space-y-4">
                        <div className="relative">
                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={150}
                                className="border rounded-lg bg-white w-full cursor-crosshair touch-none"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                            {!hasDrawn && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <p className="text-muted-foreground text-sm">Sign here</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearCanvas}
                                className="flex-1"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveDrawnSignature}
                                disabled={!hasDrawn || isUploading}
                                className="flex-1"
                            >
                                {isUploading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Save Signature
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Upload Tab */}
                    <TabsContent value="upload" className="space-y-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {previewUrl ? (
                            <div className="border rounded-lg p-4 bg-white">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="max-h-32 mx-auto object-contain"
                                />
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                                    "hover:border-primary/50 hover:bg-primary/5"
                                )}
                            >
                                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Click to select signature image
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PNG or JPG, max 2MB
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            {previewUrl && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setPreviewUrl(null);
                                    }}
                                    className="flex-1"
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Change
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleUploadFile}
                                disabled={!selectedFile || isUploading}
                                className={cn("flex-1", !previewUrl && "w-full")}
                            >
                                {isUploading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                )}
                                Upload Signature
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
