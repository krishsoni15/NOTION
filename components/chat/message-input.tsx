"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { Send, ImageIcon, Camera, Plus, MapPin, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CameraDialog } from "@/components/inventory/camera-dialog";
import { LocationPickerDialog } from "@/components/chat/location-picker-dialog";

interface MessageInputProps {
  onSend: (
    content: string,
    imageUrl?: string,
    imageKey?: string,
    location?: { lat: number, lng: number, address?: string },
    file?: { url: string, key: string, name: string, type: string, size: number }
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // For Images
  const docInputRef = useRef<HTMLInputElement>(null); // For Documents

  const uploadImage = async (file: File): Promise<{ imageUrl: string; imageKey: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload/chat-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return {
      imageUrl: data.imageUrl,
      imageKey: data.imageKey,
    };
  };

  const uploadFile = async (file: File): Promise<{ fileUrl: string; fileKey: string; fileName: string; fileType: string; fileSize: number }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload/chat-file', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to upload file');
    }

    const data = await response.json();
    return {
      fileUrl: data.fileUrl,
      fileKey: data.fileKey,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
    };
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    const hasContent = trimmedMessage || selectedImages.length > 0 || selectedFiles.length > 0;

    if (!hasContent || disabled || isUploading) return;

    setIsUploading(true);
    try {
      // Send text message first
      if (trimmedMessage) {
        onSend(trimmedMessage);
      }

      // Upload and send images
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          try {
            const uploadResult = await uploadImage(image);
            onSend("", uploadResult.imageUrl, uploadResult.imageKey);
          } catch (error) {
            console.error('Failed to upload/send image:', error);
            toast.error(`Failed to send image ${image.name}`);
          }
        }
      }

      // Upload and send documents
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            const uploadResult = await uploadFile(file);
            onSend("", undefined, undefined, undefined, {
              url: uploadResult.fileUrl,
              key: uploadResult.fileKey,
              name: uploadResult.fileName,
              type: uploadResult.fileType,
              size: uploadResult.fileSize
            });
          } catch (error) {
            console.error('Failed to upload/send file:', error);
            toast.error(`Failed to send file ${file.name}`);
          }
        }
      }

      setMessage("");
      setSelectedImages([]);
      setSelectedFiles([]);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const validFiles: File[] = [];

      newFiles.forEach(file => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`Skipped ${file.name}: Not an image`);
          return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Skipped ${file.name}: Size > 5MB`);
          return;
        }
        validFiles.push(file);
      });

      setSelectedImages(prev => [...prev, ...validFiles]);

      // Reset input value to allow selecting same files again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const validFiles: File[] = [];

      newFiles.forEach(file => {
        // Validate file size (max 25MB)
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`Skipped ${file.name}: Size > 25MB`);
          return;
        }
        validFiles.push(file);
      });

      setSelectedFiles(prev => [...prev, ...validFiles]);

      if (docInputRef.current) {
        docInputRef.current.value = '';
      }
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedImages(prev => [...prev, file]);
  };

  const handleLocationSelect = (loc: { lat: number, lng: number, address?: string }) => {
    const locationText = loc.address || "Shared location";
    onSend(locationText, undefined, undefined, loc);
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className={cn("flex flex-col gap-2 p-3 sm:p-4 md:p-5 border-t border-border/50 bg-background/80 backdrop-blur-md shadow-sm safe-area-inset-bottom", className)}>
        {/* Image Previews */}
        {selectedImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/30">
            {selectedImages.map((file, index) => (
              <div key={index} className="relative shrink-0">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Selected ${index + 1}`}
                  className="h-20 w-20 rounded-lg border border-border/50 object-cover"
                />
                <Button
                  onClick={() => removeSelectedImage(index)}
                  size="icon"
                  variant="destructive"
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full"
                >
                  <span className="text-[10px]">×</span>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* File Previews */}
        {selectedFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/30 px-1">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative shrink-0 flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/50 max-w-[200px]">
                <div className="h-8 w-8 rounded-md bg-background flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button
                  onClick={() => removeSelectedFile(index)}
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0"
                >
                  <span className="text-xl leading-none">×</span>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input and Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            className="flex-1 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 rounded-xl h-11 sm:h-12 text-base"
            maxLength={5000}
          />

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attachment Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={disabled || isUploading}
                size="icon"
                variant="outline"
                className="shrink-0 rounded-xl h-11 w-11 sm:h-12 sm:w-12 border-border/50 hover:bg-muted/50 transition-all touch-manipulation active:scale-95"
                title="Attach..."
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Plus className="h-5 w-5 sm:h-6 sm:w-6" />}
                <span className="sr-only">Attach options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                <ImageIcon className="mr-2 h-4 w-4" />
                <span>Photos</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => docInputRef.current?.click()} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                <span>Document</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCameraOpen(true)} className="cursor-pointer">
                <Camera className="mr-2 h-4 w-4" />
                <span>Camera</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsLocationOpen(true)} className="cursor-pointer">
                <MapPin className="mr-2 h-4 w-4" />
                <span>Location</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={disabled || isUploading || (!message.trim() && selectedImages.length === 0 && selectedFiles.length === 0)}
            size="icon"
            className="shrink-0 rounded-xl h-11 w-11 sm:h-12 sm:w-12 bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md hover:shadow-lg touch-manipulation active:scale-95"
          >
            <Send className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>

      <CameraDialog
        open={isCameraOpen}
        onOpenChange={setIsCameraOpen}
        onCapture={handleCameraCapture}
        multiple={true}
      />

      <LocationPickerDialog
        open={isLocationOpen}
        onOpenChange={setIsLocationOpen}
        onSelectLocation={handleLocationSelect}
      />
    </>
  );
}
