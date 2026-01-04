"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LazyImage } from "./lazy-image";
import { VisuallyHidden } from "./visually-hidden";

interface ImageSliderProps {
  images: Array<{
    imageUrl: string;
    imageKey: string;
  }>;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName?: string;
}

export function ImageSlider({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
  itemName = "Item"
}: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  const currentImage = images[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  const downloadImage = async () => {
    if (!currentImage) return;

    try {
      const response = await fetch(currentImage.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${itemName.replace(/\s+/g, '_')}_${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onOpenChange(false);
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          downloadImage();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, isFullscreen, currentIndex]);

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-4xl w-full p-0 bg-black/95 border-none",
          isFullscreen ? "max-w-none w-screen h-screen" : "max-h-[90vh]"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <VisuallyHidden>
          <DialogTitle>{itemName} - Image {currentIndex + 1} of {images.length}</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="text-white">
            <h3 className="font-medium">{itemName}</h3>
            <p className="text-sm text-white/70">
              {currentIndex + 1} of {images.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadImage}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Image */}
        <div className="relative flex items-center justify-center h-full min-h-[400px]">
          {/* Previous Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={goToPrevious}
              className="absolute left-4 z-10 text-white hover:bg-white/20 disabled:opacity-50"
              disabled={images.length <= 1}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Image */}
          <div className="relative max-h-full max-w-full flex items-center justify-center">
            <LazyImage
              src={currentImage.imageUrl}
              alt={`${itemName} ${currentIndex + 1}`}
              className={cn(
                "max-h-full max-w-full object-contain",
                isFullscreen ? "h-screen w-auto" : "h-auto w-auto"
              )}
              priority
            />
          </div>

          {/* Next Button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={goToNext}
              className="absolute right-4 z-10 text-white hover:bg-white/20 disabled:opacity-50"
              disabled={images.length <= 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
        </div>

        {/* Thumbnail Navigation */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center justify-center gap-2 max-w-full overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image.imageKey}
                  onClick={() => goToImage(index)}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all",
                    index === currentIndex
                      ? "border-white shadow-lg scale-110"
                      : "border-white/50 opacity-70 hover:opacity-100"
                  )}
                >
                  <LazyImage
                    src={image.imageUrl}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-4 right-4 text-white/50 text-xs">
          <div className="bg-black/50 rounded px-2 py-1">
            ← → Navigate • F Fullscreen • D Download • Esc Close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
