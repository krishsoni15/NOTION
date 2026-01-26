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
          "max-w-6xl w-full p-0 bg-black/95 border-none overflow-hidden",
          isFullscreen ? "max-w-none w-screen h-screen" : "h-[90vh]"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <VisuallyHidden>
          <DialogTitle>{itemName} - Image {currentIndex + 1} of {images.length}</DialogTitle>
        </VisuallyHidden>

        <div className="flex w-full h-full">
          {/* Sidebar Thumbnails (Left) */}
          {images.length > 1 && (
            <div className="w-28 flex-shrink-0 h-full border-r border-white/10 bg-black/40 overflow-y-auto custom-scrollbar p-2 hidden sm:flex flex-col gap-3">
              {images.map((image, index) => (
                <button
                  key={image.imageKey}
                  onClick={() => goToImage(index)}
                  className={cn(
                    "w-full aspect-square rounded-md overflow-hidden transition-all relative group flex-shrink-0",
                    index === currentIndex
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-black"
                      : "opacity-60 hover:opacity-100 ring-1 ring-white/10"
                  )}
                >
                  <LazyImage
                    src={image.imageUrl}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  {index === currentIndex && (
                    <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 relative flex flex-col h-full bg-black/50">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <div className="text-white pointer-events-auto">
                <h3 className="font-medium text-sm md:text-base line-clamp-1">{itemName}</h3>
                <p className="text-xs text-white/70">
                  {currentIndex + 1} / {images.length}
                </p>
              </div>

              <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={downloadImage}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-9 w-9 rounded-full transition-colors"
                  title="Download Image"
                >
                  <Download className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-9 w-9 rounded-full transition-colors"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="bg-white/10 text-white hover:bg-red-500 hover:text-white h-9 w-9 rounded-full transition-all border border-white/10 shadow-sm"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Main Image */}
            <div className="flex-1 relative flex items-center justify-center p-4">
              {/* Previous Button */}
              {images.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="absolute left-4 z-10 text-white hover:bg-white/10 disabled:opacity-50 h-12 w-12 rounded-full hidden md:flex"
                  disabled={images.length <= 1}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              {/* Image */}
              <div className="relative w-full h-full flex items-center justify-center">
                <LazyImage
                  src={currentImage.imageUrl}
                  alt={`${itemName} ${currentIndex + 1}`}
                  className={cn(
                    "max-h-full max-w-full object-contain shadow-2xl transition-all duration-300",
                    isFullscreen ? "scale-100" : "scale-[0.98]"
                  )}
                  priority
                />
              </div>

              {/* Next Button */}
              {images.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="absolute right-4 z-10 text-white hover:bg-white/10 disabled:opacity-50 h-12 w-12 rounded-full hidden md:flex"
                  disabled={images.length <= 1}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}
            </div>

            {/* Mobile Bottom Thumbnails (Visible only on small screens) */}
            {images.length > 1 && (
              <div className="sm:hidden h-20 flex-shrink-0 border-t border-white/10 p-2 bg-black/60 overflow-x-auto">
                <div className="flex gap-2 min-w-min">
                  {images.map((image, index) => (
                    <button
                      key={image.imageKey}
                      onClick={() => goToImage(index)}
                      className={cn(
                        "h-full aspect-square rounded-md overflow-hidden relative flex-shrink-0",
                        index === currentIndex ? "ring-2 ring-white" : "opacity-60"
                      )}
                    >
                      <LazyImage
                        src={image.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts Hint */}
            <div className="absolute bottom-4 right-4 text-white/30 text-[10px] hidden md:block">
              <div className="bg-black/40 backdrop-blur-md rounded px-2 py-1 border border-white/5">
                ← → Navigate • F Fullscreen • Esc Close
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
