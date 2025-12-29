"use client";

/**
 * User Information Dialog
 * 
 * Shows detailed information about a site engineer/user
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Phone, MapPin, Briefcase, Mail, Calendar } from "lucide-react";
import { getRoleLabel } from "@/lib/auth/roles";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";

interface UserInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: Id<"users"> | null;
}

export function UserInfoDialog({
  open,
  onOpenChange,
  userId,
}: UserInfoDialogProps) {
  const user = useQuery(
    api.users.getUserById,
    userId ? { userId } : "skip"
  );

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </DialogTitle>
          <DialogDescription>
            Details about {user.fullName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Full Name</Label>
              <p className="font-medium text-base">{user.fullName}</p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                Role
              </Label>
              <Badge variant="outline" className="font-semibold">
                {getRoleLabel(user.role)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Username</Label>
              <p className="font-mono text-sm">{user.username}</p>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Contact Information</h3>
            
            {user.phoneNumber && (
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <p className="text-sm">{user.phoneNumber}</p>
              </div>
            )}
            
            {user.address && (
              <div className="flex items-start justify-between gap-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5 flex-shrink-0">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <p className="text-sm text-right break-words">{user.address}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Status</Label>
            <Badge variant={user.isActive ? "default" : "destructive"}>
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Dates */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Created
              </span>
              <span>{format(new Date(user.createdAt), "dd MMM yyyy")}</span>
            </div>
            {user.updatedAt !== user.createdAt && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last Updated</span>
                <span>{format(new Date(user.updatedAt), "dd MMM yyyy")}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

