"use client";

/**
 * Camera Dialog Component
 * 
 * Custom camera implementation using native MediaDevices API.
 * Features:
 * - Smart camera switching (auto-detects if multiple cameras exist)
 * - Flash support (checks device capabilities)
 * - Zoom support
 * - Mobile-first UI
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, ZoomIn, ZoomOut, Zap, ZapOff, Check, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  multiple?: boolean;
}

export function CameraDialog({ open, onOpenChange, onCapture, multiple = false }: CameraDialogProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);

  // Initialize camera when open
  useEffect(() => {
    if (open) {
      initializeCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, facingMode]);

  const initializeCamera = async () => {
    try {
      // 1. Get List of Cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);

      // 2. Determine constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 }, // High res
          height: { ideal: 1080 },
          // If we have a specific camera ID selected, prioritize it (optional, usually facingMode is enough for simple switch)
        }
      };

      // 3. Start Stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
        };
      }

      setHasPermission(true);

      // 4. Check Capabilities (Flash, Zoom)
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() || {};

      // Check Flash/Torch
      if ('torch' in capabilities) {
        setFlashSupported(true);
      } else {
        setFlashSupported(false);
      }

      // Check Zoom
      if ('zoom' in capabilities) {
        setZoomSupported(true);
        setMaxZoom((capabilities as any).zoom.max || 5);
        setZoom((capabilities as any).zoom.min || 1);
      } else {
        setZoomSupported(false);
      }

    } catch (error) {
      console.error("Camera initialization failed:", error);
      setHasPermission(false);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setFlashEnabled(false);
  };

  const handleSwitchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // The useEffect will trigger re-initialization
  }, []);

  const toggleFlash = async () => {
    if (!streamRef.current || !flashSupported) return;

    const track = streamRef.current.getVideoTracks()[0];
    const newFlashState = !flashEnabled;

    try {
      await track.applyConstraints({
        advanced: [{ torch: newFlashState } as any]
      });
      setFlashEnabled(newFlashState);
    } catch (err) {
      console.error("Flash toggle failed", err);
      toast.error("Failed to toggle flash");
    }
  };

  const handleZoom = async (newZoom: number) => {
    if (!streamRef.current || !zoomSupported) return;

    const track = streamRef.current.getVideoTracks()[0];
    // Clamp zoom
    const safeZoom = Math.max(1, Math.min(maxZoom, newZoom));
    setZoom(safeZoom);

    try {
      await track.applyConstraints({
        advanced: [{ zoom: safeZoom } as any]
      });
    } catch (err) {
      console.error("Zoom failed", err);
      // Fallback to CSS Zoom if hardware zoom fails? 
      // Usually better to just rely on hardware zoom for quality, but CSS zoom is a visual fallback.
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Match resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror if user facing
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0);

      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);

          // Show thumbnail
          const url = URL.createObjectURL(blob);
          setCapturedThumbnail(url);

          toast.success("Photo captured!");

          if (!multiple) {
            setTimeout(() => onOpenChange(false), 500); // Small delay to show feedback
          }
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.95);
    }
  };

  const handleClose = () => {
    setCapturedThumbnail(null); // Clear thumbnail on close
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-[100vw] h-[100dvh] p-0 border-none bg-black sm:max-w-[100vw] sm:max-h-[100dvh] sm:rounded-none flex flex-col"
        showCloseButton={false} // Custom close button
      >
        <DialogTitle className="sr-only">Camera</DialogTitle>
        <DialogDescription className="sr-only">Take photos</DialogDescription>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded-full"
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="flex gap-4">
            {/* Flash Control */}
            {flashSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFlash}
                className={cn(
                  "rounded-full transition-colors",
                  flashEnabled ? "text-yellow-400 bg-white/10" : "text-white hover:bg-white/20"
                )}
              >
                {flashEnabled ? <Zap className="h-6 w-6 fill-current" /> : <ZapOff className="h-6 w-6" />}
              </Button>
            )}
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
          {!hasPermission && (
            <div className="text-white text-center p-6">
              <p className="mb-4">Camera access is required.</p>
              <Button onClick={() => initializeCamera()} variant="outline">Request Access</Button>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              facingMode === 'user' && "scale-x-[-1]" // Mirror frontend
            )}
          />

          {/* Zoom Controls Overlay (if supported) */}
          {zoomSupported && maxZoom > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 mb-24 sm:mb-8">
              <button
                onClick={() => handleZoom(1)}
                className={cn("text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center transition-all", zoom === 1 ? "bg-yellow-400 text-black" : "text-white")}
              >1x</button>
              <button
                onClick={() => handleZoom(2)}
                disabled={maxZoom < 2}
                className={cn("text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center transition-all", zoom === 2 ? "bg-yellow-400 text-black" : "text-white", maxZoom < 2 && "opacity-30")}
              >2x</button>
              <button
                onClick={() => handleZoom(Math.min(5, maxZoom))}
                disabled={maxZoom < 5}
                className={cn("text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center transition-all", zoom >= 5 ? "bg-yellow-400 text-black" : "text-white", maxZoom < 5 && "opacity-30")}
              >5x</button>
            </div>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-sm pb-8 pt-6 px-6">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Thumbnail / Multiple Indicator */}
            <div className="w-12 h-12 relative flex items-center justify-center">
              {capturedThumbnail && (
                <div className="absolute inset-0 rounded-lg overflow-hidden border-2 border-white animate-in zoom-in fade-in duration-300">
                  <img src={capturedThumbnail} className="w-full h-full object-cover" alt="Last capture" />
                </div>
              )}
            </div>

            {/* Shutter Button */}
            <button
              onClick={capturePhoto}
              disabled={isCapturing}
              className="relative w-20 h-20 rounded-full flex items-center justify-center p-1 border-[4px] border-white transition-transform active:scale-95 touch-manipulation"
            >
              <div className="w-full h-full bg-white rounded-full" />
            </button>

            {/* Switch Camera */}
            <div className="w-12 flex items-center justify-center">
              {cameras.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSwitchCamera}
                  className="rounded-full h-12 w-12 bg-white/10 text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-6 w-6" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
