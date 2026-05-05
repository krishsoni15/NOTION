"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { VisuallyHidden } from "./visually-hidden";
import { LazyImage } from "./lazy-image";

interface ImageGalleryProps {
  images: Array<{
    imageUrl: string;
    imageKey: string;
    alt?: string;
  }>;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function ImageGallery({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
  title = "Image Gallery"
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // zoom: 0 = "fit" mode (image fills viewer), >0 = explicit scale multiplier on top of fit
  const [zoom, setZoom] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const resetView = () => { setZoom(0); setOffset({ x: 0, y: 0 }); };

  // Reset when image changes
  useEffect(() => { resetView(); }, [currentIndex]);

  // Reset when gallery opens
  useEffect(() => {
    if (open) { setCurrentIndex(initialIndex); resetView(); }
  }, [open, initialIndex]);

  const currentImage = images[currentIndex];

  const goToPrevious = () => setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const goToNext = () => setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  // zoom=0 means "fit". Steps: fit → 1.5× → 2× → 3× → fit
  const zoomSteps = [0, 1.5, 2, 3];
  const handleZoomIn = () => {
    const idx = zoomSteps.indexOf(zoom);
    setZoom(zoomSteps[Math.min(idx + 1, zoomSteps.length - 1)]);
    if (zoom === 0) setOffset({ x: 0, y: 0 });
  };
  const handleZoomOut = () => {
    const idx = zoomSteps.indexOf(zoom);
    if (idx <= 1) { resetView(); return; }
    setZoom(zoomSteps[idx - 1]);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  }, [zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom === 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const downloadImage = () => {
    const a = document.createElement('a');
    a.href = currentImage.imageUrl;
    a.download = `image-${currentIndex + 1}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!currentImage) return null;

  // In fit mode: image fills the container using CSS (width/height 100%, object-fit contain)
  // In zoom mode: image is natural size × zoom multiplier, centered, draggable
  const isFitMode = zoom === 0;
  const zoomLabel = isFitMode ? "Fit" : `${Math.round(zoom * 100)}%`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[100vw] w-screen h-screen p-0 bg-black/95 border-none shadow-none ring-0 outline-none rounded-none"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Image Gallery</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
          <div className="text-white">
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-xs text-white/60">{currentIndex + 1} of {images.length}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-white hover:bg-white/20 h-8 w-8" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white text-xs w-10 text-center font-medium">{zoomLabel}</span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-white hover:bg-white/20 h-8 w-8" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetView} className="text-white hover:bg-white/20 h-8 w-8" title="Reset to Fit">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <Button variant="ghost" size="icon" onClick={downloadImage} className="text-white hover:bg-white/20 h-8 w-8" title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/20 h-8 w-8" title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Image Area */}
        <div
          className="relative flex items-center justify-center w-full h-full"
          style={{
            overflow: isFitMode ? 'hidden' : 'auto',
            cursor: !isFitMode ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Prev/Next */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-3 z-40 text-white hover:bg-white/20 h-10 w-10 rounded-full"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-3 z-40 text-white hover:bg-white/20 h-10 w-10 rounded-full"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {isFitMode ? (
            /* FIT MODE — image fills the viewer, proper aspect ratio */
            <img
              src={currentImage.imageUrl}
              alt={currentImage.alt || `Image ${currentIndex + 1}`}
              draggable={false}
              onClick={handleZoomIn}
              style={{
                width: '100%',
                height: images.length > 1 ? 'calc(100vh - 120px)' : 'calc(100vh - 80px)',
                objectFit: 'contain',
                userSelect: 'none',
                marginTop: '56px', // below header
              }}
            />
          ) : (
            /* ZOOM MODE — natural size × zoom, draggable */
            <img
              src={currentImage.imageUrl}
              alt={currentImage.alt || `Image ${currentIndex + 1}`}
              draggable={false}
              style={{
                transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease',
                maxWidth: 'none',
                userSelect: 'none',
              }}
              onDoubleClick={resetView}
            />
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="flex gap-2 justify-center overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={`${image.imageKey}-${index}`}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 rounded-md border-2 overflow-hidden transition-all duration-200 ${
                    index === currentIndex
                      ? "border-primary shadow-lg scale-105"
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-white/50"
                  }`}
                >
                  <LazyImage
                    src={image.imageUrl}
                    alt={`Thumbnail ${index + 1}`}
                    width={56}
                    height={56}
                    className="w-14 h-14 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hint */}
        {isFitMode && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 text-white/40 text-xs pointer-events-none select-none">
            Click or scroll to zoom · Double-click to reset
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Compact version for inline display (like in request cards)
interface CompactImageGalleryProps {
  images: Array<{
    imageUrl: string;
    imageKey: string;
    alt?: string;
  }>;
  maxDisplay?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function CompactImageGallery({
  images,
  maxDisplay = 3,
  size = "md",
  className = ""
}: CompactImageGalleryProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-full h-full"
  };

  const openGallery = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  if (images.length === 0) return null;

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        {images.slice(0, maxDisplay).map((image, index) => (
          <button
            key={`${image.imageKey}-${index}`}
            onClick={(e) => openGallery(index, e)}
            className={`relative group transition-transform hover:scale-105 ${size === 'xl' ? 'w-full h-full' : ''}`}
          >
            <LazyImage
              src={image.imageUrl}
              alt={image.alt || `Image ${index + 1}`}
              width={size === "xl" ? undefined : (size === "sm" ? 32 : size === "md" ? 40 : 48)}
              height={size === "xl" ? undefined : (size === "sm" ? 32 : size === "md" ? 40 : 48)}
              className={`rounded-md border border-border shadow-sm group-hover:border-primary/50 group-hover:shadow-md transition-all object-cover bg-muted ${sizeClasses[size]}`}
            />
            {/* Notification-style badge for additional images */}
            {images.length > maxDisplay && index === maxDisplay - 1 && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-sm">
                +{images.length - maxDisplay}
              </div>
            )}
          </button>
        ))}
      </div>

      <ImageGallery
        images={images}
        initialIndex={galleryIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        title="Request Images"
      />
    </>
  );
}
