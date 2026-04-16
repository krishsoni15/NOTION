"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LazyImage } from "./lazy-image";
import { VisuallyHidden } from "./visually-hidden";

interface ImageViewerProps {
  images: Array<{
    imageUrl: string;
    imageKey: string;
  }>;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName?: string;
}

export function ImageViewer({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
  itemName = "Item"
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsLoading(true);
  }, [initialIndex, open]);

  const currentImage = images[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsLoading(true);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsLoading(true);
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(currentImage.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${itemName}-image-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return;

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
        onOpenChange(false);
        break;
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-full max-h-[90vh] p-0 bg-black/95 border-none" showCloseButton={false}>
        <VisuallyHidden>
          <DialogTitle>{itemName} - Image {currentIndex + 1}</DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="text-white">
            <h3 className="font-semibold text-lg">{itemName}</h3>
            <p className="text-sm text-gray-300">
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
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Image Display */}
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="lg"
                onClick={goToPrevious}
                className="absolute left-4 z-40 text-white hover:bg-white/20 h-12 w-12 rounded-full"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={goToNext}
                className="absolute right-4 z-40 text-white hover:bg-white/20 h-12 w-12 rounded-full"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Image */}
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={currentImage.imageUrl}
              alt={`${itemName} ${currentIndex + 1}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-opacity duration-300",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>
        </div>

        {/* Thumbnail Strip (Mobile-friendly) */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex gap-2 justify-center max-w-full overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={image.imageKey}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsLoading(true);
                  }}
                  className={cn(
                    "flex-shrink-0 rounded border-2 overflow-hidden transition-all",
                    index === currentIndex
                      ? "border-white shadow-lg scale-110"
                      : "border-gray-400 hover:border-gray-300"
                  )}
                >
                  <LazyImage
                    src={image.imageUrl}
                    alt={`Thumbnail ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-16 h-16"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Touch/Swipe Support for Mobile */}
        <div
          className="absolute inset-0"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            const startX = touch.clientX;

            const handleTouchEnd = (endE: TouchEvent) => {
              const endTouch = endE.changedTouches[0];
              const endX = endTouch.clientX;
              const deltaX = startX - endX;

              // Minimum swipe distance
              if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                  goToNext();
                } else {
                  goToPrevious();
                }
              }

              document.removeEventListener('touchend', handleTouchEnd);
            };

            document.addEventListener('touchend', handleTouchEnd);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
