"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Camera, PenTool, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CameraDialog } from "@/components/inventory/camera-dialog";

interface MediaInputProps {
    onValueChange: (file: File | null) => void;
    initialPreview?: string | null;
    className?: string;
    type?: "image" | "signature"; // 'signature' enables drawing
    label?: string;
}

export function MediaInput({
    onValueChange,
    initialPreview,
    className,
    type = "image",
    label
}: MediaInputProps) {
    const [preview, setPreview] = useState<string | null>(initialPreview || null);
    const [activeTab, setActiveTab] = useState<string>("upload");
    // Camera state
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Canvas/Draw refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawing, setHasDrawing] = useState(false);

    // Initialize preview
    useEffect(() => {
        if (initialPreview) {
            setPreview(initialPreview);
        }
    }, [initialPreview]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (!file.type.startsWith("image/")) {
                toast.error("Please select an image file");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
            onValueChange(file);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onValueChange(null);
        setHasDrawing(false);
        if (activeTab === "camera") {
            // Do nothing special on remove
        }
        if (activeTab === "draw") {
            clearCanvas();
        }
    };

    // Canvas Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsDrawing(true);
        setHasDrawing(true);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveDrawing();
        }
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasDrawing(false);
            // If we are clearing, we should probably clear the value too if we were in draw mode
            // But maybe user wants to redraw. We only clear value if they explicitly remove or save empty
        }
    };

    const saveDrawing = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawing) return;

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
                onValueChange(file);
            }
        }, "image/png");
    };

    // Init canvas when switching to draw tab
    useEffect(() => {
        if (activeTab === "draw" && canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.strokeStyle = "#000";
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
            }
        }
    }, [activeTab]);

    // Handle Camera Capture
    const handleCameraCapture = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        onValueChange(file);
        setIsCameraOpen(false);
    };

    // Construct grid cols class based on available tabs
    const gridCols = type === "signature" ? "grid-cols-3" : "grid-cols-2";

    const handleTabChange = (val: string) => {
        setActiveTab(val);
    };

    return (
        <div className={cn("space-y-3", className)}>
            {label && <p className="text-sm font-medium">{label}</p>}

            {/* If preview exists, show it with remove option */}
            {preview ? (
                <div className="relative group w-fit mx-auto">
                    <div className="h-32 w-auto min-w-[120px] rounded-lg border border-border bg-muted/20 flex items-center justify-center p-2 overflow-hidden">
                        <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
                    </div>
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-sm hover:bg-destructive/90 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className={`grid w-full ${gridCols}`}>
                        <TabsTrigger value="upload" className="flex gap-2">
                            <Upload className="h-4 w-4" />
                            <span className="hidden sm:inline">Upload</span>
                        </TabsTrigger>
                        <TabsTrigger value="camera" className="flex gap-2">
                            <Camera className="h-4 w-4" />
                            <span className="hidden sm:inline">Camera</span>
                        </TabsTrigger>
                        {type === "signature" && (
                            <TabsTrigger value="draw" className="flex gap-2">
                                <PenTool className="h-4 w-4" />
                                <span className="hidden sm:inline">Draw</span>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <div className="mt-2 border rounded-lg p-4 bg-muted/10 min-h-[200px] flex flex-col justify-center items-center relative overflow-hidden">

                        <TabsContent value="upload" className="w-full mt-0">
                            <label className="flex flex-col items-center justify-center gap-4 cursor-pointer w-full h-full min-h-[150px] border-2 border-dashed border-muted-foreground/25 hover:border-primary/50  rounded-md transition-colors">
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Upload className="h-8 w-8 opacity-50" />
                                    <p className="text-sm font-medium">Click to upload file</p>
                                    <p className="text-xs text-muted-foreground/70">PNG, JPG, JPEG</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </TabsContent>

                        <TabsContent value="camera" className="w-full mt-0 flex flex-col items-center gap-3">
                            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                                <div className="p-4 bg-muted rounded-full">
                                    <Camera className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Take a photo</p>
                                    <p className="text-xs text-muted-foreground">Use your device camera</p>
                                </div>
                                <Button type="button" onClick={() => setIsCameraOpen(true)} className="gap-2">
                                    <Camera className="h-4 w-4" /> Open Camera
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="draw" className="w-full mt-0">
                            <div className="space-y-2">
                                <div className="border-2 border-dashed border-muted-foreground/25 bg-white rounded-md overflow-hidden relative touch-none">
                                    <canvas
                                        ref={canvasRef}
                                        className="w-full h-[150px] cursor-crosshair block"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    {!hasDrawing && !isDrawing && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/30 text-sm">
                                            Sign here
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="text-xs h-7">
                                        Clear
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" onClick={() => { stopDrawing(); toast.success("Signature saved"); }} disabled={!hasDrawing} className="text-xs h-7">
                                        <Check className="h-3 w-3 mr-1" /> Save
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                    </div>
                </Tabs>
            )}
            {/* Camera Dialog */}
            <CameraDialog
                open={isCameraOpen}
                onOpenChange={setIsCameraOpen}
                onCapture={handleCameraCapture}
            />
        </div>
    );
}
