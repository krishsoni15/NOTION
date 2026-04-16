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
        <DialogHeader className="p-0">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-24 w-24 rounded-full border-4 border-slate-50 dark:border-slate-800 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl font-black text-slate-300 dark:text-slate-700">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="text-center space-y-1">
              <DialogTitle className="text-2xl font-black tracking-tight">{user.fullName}</DialogTitle>
              <DialogDescription className="sr-only">Profile details for {user.fullName}</DialogDescription>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="font-bold px-3">
                  {getRoleLabel(user.role)}
                </Badge>
                <Badge variant={user.isActive ? "default" : "destructive"} className="h-5 text-[10px] font-black uppercase tracking-wider">
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Username</Label>
              <p className="font-mono text-sm">{user.username}</p>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground/50">Contact Information</h3>

            {user.phoneNumber && (
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-primary" />
                  Phone
                </Label>
                <p className="text-sm font-bold">{user.phoneNumber}</p>
              </div>
            )}

            {user.address && (
              <div className="flex items-start justify-between gap-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5 flex-shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                  Address
                </Label>
                <p className="text-sm text-right break-words font-medium">{user.address}</p>
              </div>
            )}
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

