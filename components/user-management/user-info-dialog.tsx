"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Doc } from "@/convex/_generated/dataModel";
import { UserAvatar } from "./user-avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, ROLES } from "@/lib/auth/roles";
import { Calendar, MapPin, Phone, Shield, User, Building2, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";

interface UserInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: Doc<"users"> | null;
}

export function UserInfoDialog({ open, onOpenChange, user }: UserInfoDialogProps) {
    const allSites = useQuery(api.sites.getAllSites, {}) || [];

    if (!user) return null;

    const assignedSites = user.assignedSites?.map(siteId =>
        allSites.find(s => s._id === siteId)
    ).filter(Boolean) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-0 shadow-2xl bg-card">
                <DialogHeader className="sr-only">
                    <DialogTitle>User Profile: {user.fullName}</DialogTitle>
                </DialogHeader>
                {/* Header Background */}
                <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative">
                    <div className="absolute top-4 right-4">
                        <Badge variant={user.isActive ? "default" : "destructive"} className="shadow-sm">
                            {user.isActive ? (
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Active
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <XCircle className="h-3.5 w-3.5" /> Disabled
                                </span>
                            )}
                        </Badge>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-6 -mt-16 relative">
                    <div className="flex flex-col items-center">
                        {/* Avatar */}
                        <div className="p-1.5 bg-background rounded-full shadow-md mb-3">
                            <UserAvatar
                                name={user.fullName}
                                image={user.profileImage}
                                className="h-28 w-28 text-3xl"
                            />
                        </div>

                        {/* Name & Role */}
                        <h2 className="text-2xl font-bold text-center">{user.fullName}</h2>
                        <div className="flex items-center gap-2 mt-1 mb-4">
                            <span className="text-muted-foreground font-medium text-sm">@{user.username}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            <Badge variant="secondary" className="font-normal text-xs px-2.5 py-0.5">
                                {ROLE_LABELS[user.role]}
                            </Badge>
                        </div>

                        {/* Main Details Grid */}
                        <div className="grid grid-cols-1 w-full gap-4 mt-2">
                            <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                                {/* Contact Info */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Phone className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Phone</p>
                                            <p className="font-medium text-foreground">{user.phoneNumber || "—"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <MapPin className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Address</p>
                                            <p className="font-medium text-foreground leading-snug text-balance">
                                                {user.address || "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Calendar className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Joined</p>
                                            <p className="font-medium text-foreground">
                                                {user.createdAt ? format(new Date(user.createdAt), "MMMM d, yyyy") : "—"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned Sites (Site Engineer only) */}
                                {user.role === ROLES.SITE_ENGINEER && (
                                    <div className="pt-3 border-t border-border/50">
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Assigned Sites</p>
                                        </div>
                                        {assignedSites.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {assignedSites.map((site) => (
                                                    <Badge
                                                        key={site?._id}
                                                        variant="secondary"
                                                        className="bg-background border border-border shadow-sm hover:bg-muted font-normal"
                                                    >
                                                        {site?.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">No sites assigned</p>
                                        )}
                                    </div>
                                )}

                                {/* Manager Signature */}
                                {user.role === ROLES.MANAGER && user.signatureUrl && (
                                    <div className="pt-3 border-t border-border/50">
                                        <div className="flex items-center gap-2 mb-2.5">
                                            <Shield className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Digital Signature</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-border flex justify-center">
                                            <img
                                                src={user.signatureUrl}
                                                alt="Signature"
                                                className="h-16 object-contain opacity-90"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
