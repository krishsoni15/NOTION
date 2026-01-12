"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";
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

  const currentImage = images[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const downloadImage = async () => {
    try {
      const response = await fetch(currentImage.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-transparent border-none shadow-none ring-0 outline-none" showCloseButton={false}>
        <VisuallyHidden>
          <DialogTitle>Image Gallery</DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="text-white">
            <h3 className="font-semibold text-lg">{title}</h3>
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
          <div className="relative max-w-full max-h-full flex items-center justify-center p-4">
            <img
              src={currentImage.imageUrl}
              alt={currentImage.alt || `Image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="flex gap-2 justify-center max-w-full overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={image.imageKey}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 rounded border overflow-hidden transition-all ${index === currentIndex
                    ? "border-white shadow-lg scale-110"
                    : "border-gray-400 hover:border-gray-300"
                    }`}
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
  size?: "sm" | "md" | "lg";
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
    lg: "w-12 h-12"
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
            key={image.imageKey}
            onClick={(e) => openGallery(index, e)}
            className="relative group"
          >
            <LazyImage
              src={image.imageUrl}
              alt={image.alt || `Image ${index + 1}`}
              width={size === "sm" ? 32 : size === "md" ? 40 : 48}
              height={size === "sm" ? 32 : size === "md" ? 40 : 48}
              className={`rounded border hover:border-primary transition-colors ${sizeClasses[size]}`}
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
