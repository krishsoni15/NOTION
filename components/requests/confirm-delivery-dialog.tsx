"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, Upload, Loader2, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface ConfirmDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: Id<"requests"> | null;
}

export function ConfirmDeliveryDialog({
    open,
    onOpenChange,
    requestId,
}: ConfirmDeliveryDialogProps) {
    const confirmDelivery = useMutation(api.requests.confirmDelivery);
    const [notes, setNotes] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setNotes("");
        setImages([]);
        setImagePreviews([]);
        setIsUploading(false);
        setIsSubmitting(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        const validFiles = newFiles.filter((file) => file.type.startsWith("image/"));

        if (validFiles.length === 0) {
            toast.error("Please select valid image files");
            return;
        }

        const updatedImages = [...images, ...validFiles];
        const updatedPreviews = [...imagePreviews];

        validFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                updatedPreviews.push(reader.result as string);
                setImagePreviews([...updatedPreviews]);
            };
            reader.readAsDataURL(file);
        });

        setImages(updatedImages);
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
        setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    };

    const uploadImage = async (file: File): Promise<{
        imageUrl: string;
        imageKey: string;
    } | null> => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("itemId", "delivery-confirmation");

            const response = await fetch("/api/upload/image", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to upload image");
            }

            const data = await response.json();
            return { imageUrl: data.imageUrl, imageKey: data.imageKey };
        } catch (error) {
            console.error("Error uploading image:", error);
            return null;
        }
    };

    const handleConfirm = async () => {
        if (!requestId) return;



        setIsSubmitting(true);
        setIsUploading(images.length > 0);

        try {
            let uploadedPhotos: { imageUrl: string; imageKey: string }[] = [];

            if (images.length > 0) {
                const uploadPromises = images.map((file) => uploadImage(file));
                const results = await Promise.all(uploadPromises);
                uploadedPhotos = results.filter((r): r is { imageUrl: string; imageKey: string } => r !== null);

                if (uploadedPhotos.length !== images.length) {
                    toast.error("Some images failed to upload. Submitting standard confirmation.");
                }
            }

            await confirmDelivery({
                requestId,
                notes: notes.trim() || undefined,
                photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
            });

            toast.success("Delivery confirmed successfully!");
            handleOpenChange(false);
        } catch (error: any) {
            console.error("Error confirming delivery:", error);
            toast.error(error.message || "Failed to confirm delivery");
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        Confirm Delivery
                    </DialogTitle>
                    <DialogDescription>
                        Add proof of delivery photos and notes (optional) to complete the process.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Proof of Delivery Photos <span className="text-muted-foreground font-normal">(Optional)</span>
                            </Label>
                            <div
                                className="grid grid-cols-3 gap-3"
                            >
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative aspect-square rounded-lg border bg-muted group">
                                        <img
                                            src={preview}
                                            alt={`Preview ${index}`}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => removeImage(index)}
                                            disabled={isSubmitting}
                                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors"
                                >
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-medium">Upload</span>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                                disabled={isSubmitting}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Supported formats: JPG, PNG, WEBP. Max size: 5MB.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-sm font-semibold">Delivery Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Any comments, shortages, or observations..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-24 resize-none"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {isUploading ? "Uploading..." : "Confirming..."}
                            </>
                        ) : (
                            "Confirm Receipt"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
