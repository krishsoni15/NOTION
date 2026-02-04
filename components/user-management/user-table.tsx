"use client";

/**
 * User Table Component
 * 
 * Displays all users in a table or card view with actions.
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";
import { api } from "@/convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoreHorizontal, Edit, UserX, UserCheck, Trash2, ChevronLeft, ChevronRight, User, Phone, Calendar, MapPin, Shield, Info, Building2, Hash } from "lucide-react";
import { ROLE_LABELS, ROLES } from "@/lib/auth/roles";
import { Doc } from "@/convex/_generated/dataModel";
import { EditUserDialog } from "./edit-user-dialog";
import { toast } from "sonner";
import { OnlineIndicator } from "@/components/chat/online-indicator";
import { useMultipleUserPresence } from "@/hooks/use-presence";
import { UserAvatar } from "./user-avatar";
import { UserInfoDialog } from "./user-info-dialog";

type ViewMode = "table" | "card";

interface UserTableProps {
  users: typeof import("@/convex/_generated/api").api.users.getAllUsers._returnType | undefined;
  viewMode?: ViewMode;
}

const ITEMS_PER_PAGE = 10;

export function UserTable({ users, viewMode = "table" }: UserTableProps) {
  const { user: clerkUser } = useUser();
  const disableUser = useMutation(api.users.disableUser);
  const enableUser = useMutation(api.users.enableUser);
  const deleteUser = useMutation(api.users.deleteUser);
  const allSites = useQuery(api.sites.getAllSites, {});

  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Doc<"users"> | null>(null);
  const [viewingUser, setViewingUser] = useState<Doc<"users"> | null>(null);
  const [deletingUser, setDeletingUser] = useState<Doc<"users"> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSiteId, setSelectedSiteId] = useState<Doc<"sites">["_id"] | null>(null);

  const handleOpenInMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

  // Reset to page 1 when users change
  useEffect(() => {
    setCurrentPage(1);
  }, [users]);

  // Users are already paginated by the parent component
  const paginatedUsers = users ?? [];

  // Get presence status for all paginated users
  const userIds = paginatedUsers.map((u) => u._id);
  const userPresence = useMultipleUserPresence(userIds);

  if (!users) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No users found. {users.length === 0 && "Create your first user to get started."}
      </div>
    );
  }

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    setLoadingUserId(userId);
    try {
      // Cast to Id<"users"> type
      const userIdTyped = userId as unknown as Parameters<typeof disableUser>[0]['userId'];
      if (isActive) {
        await disableUser({ userId: userIdTyped });
        toast.success("User disabled successfully");
      } else {
        await enableUser({ userId: userIdTyped });
        toast.success("User enabled successfully");
      }
    } catch (error) {
      toast.error("Failed to update user status");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    setLoadingUserId(deletingUser._id);
    try {
      // Delete from Convex first
      const userIdTyped = deletingUser._id as unknown as Parameters<typeof deleteUser>[0]['userId'];
      await deleteUser({ userId: userIdTyped, clerkUserId: deletingUser.clerkUserId });

      // Delete from Clerk
      try {
        await fetch("/api/admin/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkUserId: deletingUser.clerkUserId }),
        });
      } catch (clerkError) {
        // Continue anyway - Convex delete was successful
      }

      toast.success("User deleted successfully");
      setDeletingUser(null);
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setLoadingUserId(null);
    }
  };

  const UserActions = ({ user }: { user: Doc<"users"> }) => {
    const isCurrentUser = user.clerkUserId === clerkUser?.id;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={loadingUserId === user._id}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setViewingUser(user)}
          >
            <User className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setEditingUser(user)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleToggleStatus(user._id, user.isActive)}
            disabled={loadingUserId === user._id || isCurrentUser}
          >
            {user.isActive ? (
              <>
                <UserX className="h-4 w-4 mr-2" />
                {isCurrentUser ? "Cannot Disable Yourself" : "Disable User"}
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                {isCurrentUser ? "Cannot Enable Yourself" : "Enable User"}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeletingUser(user)}
            disabled={isCurrentUser}
            className={isCurrentUser ? "opacity-50" : "text-destructive focus:text-destructive"}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isCurrentUser ? "Cannot Delete Yourself" : "Delete User"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const UserCard = ({ user }: { user: Doc<"users"> }) => {
    const isCurrentUser = user.clerkUserId === clerkUser?.id;
    const isOnline = userPresence?.[user._id]?.isOnline ?? false;

    return (
      <Card className="h-full flex flex-col hover:shadow-md transition-all duration-200 border border-border bg-card group rounded-xl overflow-hidden hover:border-primary/20">
        <CardHeader className="p-4 pb-3 border-b border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="relative">
                  <UserAvatar
                    name={user.fullName}
                    image={user.profileImage}
                    size="md"
                    className="shadow-sm border-primary/10"
                  />
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-bold truncate pr-2 leading-tight flex items-center gap-2">
                    {user.fullName}
                    {isCurrentUser && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-primary/10 text-primary border-primary/10">You</Badge>}
                  </CardTitle>
                </div>
              </div>
              <div className="pl-11 flex flex-col gap-1">
                <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5 w-fit text-muted-foreground border-border/50 bg-background/40 backdrop-blur-sm flex items-center gap-1">
                  <Shield className="h-3 w-3 opacity-50" />
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
            </div>
            <UserActions user={user} />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-4 space-y-4 flex-1 flex flex-col text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Username</span>
              </div>
              <p className="font-medium pl-0.5 truncate text-foreground/80">@{user.username}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Status</span>
              </div>
              <Badge variant={user.isActive ? "default" : "secondary"} className="h-5 text-[10px] px-1.5 font-bold tracking-wide">
                {user.isActive ? "ACTIVE" : "DISABLED"}
              </Badge>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Phone</span>
            </div>
            <p className="font-medium pl-5 truncate font-mono text-xs text-foreground/80">{user.phoneNumber || "-"}</p>
          </div>

          {user.address && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Address</span>
              </div>
              <div className="pl-5 flex items-start gap-2">
                <p className="text-balance text-muted-foreground leading-relaxed line-clamp-2 text-xs">{user.address}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenInMap(user.address);
                  }}
                  className="text-primary hover:text-primary/80 hover:bg-primary/5 p-1 rounded-md transition-colors shrink-0"
                  title="Open in Maps"
                >
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Assigned Sites Summary */}
          {user.role === ROLES.SITE_ENGINEER && user.assignedSites && user.assignedSites.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Assigned Sites</span>
              </div>
              <div className="pl-5 flex flex-wrap gap-1.5">
                {user.assignedSites.slice(0, 3).map(siteId => {
                  const site = allSites?.find(s => s._id === siteId);
                  return site ? (
                    <Badge
                      key={siteId}
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5 cursor-pointer hover:bg-primary/20 transition-colors border-transparent hover:border-primary/20"
                      onClick={() => setSelectedSiteId(site._id)}
                      title="View Site Details"
                    >
                      {site.name}
                    </Badge>
                  ) : null;
                })}
                {user.assignedSites.length > 3 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-1.5 cursor-pointer hover:bg-muted/80 transition-colors"
                      >
                        +{user.assignedSites.length - 3} more
                      </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground px-2 pb-1 border-b">
                          Remaining Assigned Sites
                        </div>
                        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                          {user.assignedSites.slice(3).map(siteId => {
                            const site = allSites?.find(s => s._id === siteId);
                            return site ? (
                              <Button
                                key={siteId}
                                variant="ghost"
                                size="sm"
                                className="justify-start h-8 px-2 text-xs w-full font-normal truncate"
                                onClick={() => setSelectedSiteId(site._id)}
                              >
                                <Building2 className="h-3 w-3 mr-2 text-muted-foreground" />
                                <span className="truncate">{site.name}</span>
                              </Button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[180px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Full Name</TableHead>
                  <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Username</TableHead>
                  <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Role</TableHead>
                  <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Phone</TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Address</TableHead>
                  <TableHead className="w-[150px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Sites</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Created</TableHead>
                  <TableHead className="w-[60px] text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user, index) => {
                  const isCurrentUser = user.clerkUserId === clerkUser?.id;

                  return (
                    <TableRow
                      key={user._id}
                      className={`
                          group transition-all duration-300 border-b last:border-0 hover:bg-primary/5 hover:shadow-sm hover:z-10 hover:relative
                          ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                          animate-in fade-in slide-in-from-bottom-3
                      `}
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    >
                      <TableCell className="align-top py-4 pl-4 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <UserAvatar
                              name={user.fullName}
                              image={user.profileImage}
                              size="sm"
                            />
                            {userPresence?.[user._id]?.isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                            )}
                          </div>

                          <span
                            className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer hover:underline underline-offset-4 decoration-primary/30"
                            onClick={() => setViewingUser(user)}
                          >
                            {user.fullName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4 text-sm font-medium text-muted-foreground">@{user.username}</TableCell>
                      <TableCell className="align-top py-4">
                        <Badge variant="outline" className="font-mono text-[10px] bg-background/50 h-5 px-2">{ROLE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell className="align-top py-4 text-xs font-mono">{user.phoneNumber || <span className="text-muted-foreground/30 font-sans text-sm">—</span>}</TableCell>
                      <TableCell className="align-top py-4 max-w-xs">
                        {user.address ? (
                          <div className="flex items-start gap-2 group/addr">
                            <span className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">{user.address}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInMap(user.address);
                              }}
                              className="text-primary opacity-0 group-hover/addr:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded"
                              title="Open in Maps"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-4">
                        {user.role === ROLES.SITE_ENGINEER && user.assignedSites && user.assignedSites.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {user.assignedSites.slice(0, 2).map((siteId) => {
                              const site = allSites?.find((s) => s._id === siteId);
                              return site ? (
                                <Badge
                                  key={siteId}
                                  variant="secondary"
                                  className="text-[10px] cursor-pointer hover:bg-primary/20 transition-colors h-5 px-1.5 border-transparent hover:border-primary/20"
                                  onClick={() => setSelectedSiteId(site._id)}
                                >
                                  {site.name}
                                </Badge>
                              ) : null;
                            })}
                            {user.assignedSites.length > 2 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground cursor-pointer hover:bg-muted/80">+{user.assignedSites.length - 2}</Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2" align="start">
                                  <div className="space-y-2">
                                    <div className="text-xs font-semibold text-muted-foreground px-2 pb-1 border-b">
                                      All Assigned Sites ({user.assignedSites.length})
                                    </div>
                                    <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                                      {user.assignedSites.slice(2).map(siteId => {
                                        const site = allSites?.find(s => s._id === siteId);
                                        return site ? (
                                          <Button
                                            key={siteId}
                                            variant="ghost"
                                            size="sm"
                                            className="justify-start h-8 px-2 text-xs w-full font-normal truncate"
                                            onClick={() => setSelectedSiteId(site._id)}
                                          >
                                            <Building2 className="h-3 w-3 mr-2 text-muted-foreground" />
                                            <span className="truncate">{site.name}</span>
                                          </Button>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        ) : user.role === ROLES.SITE_ENGINEER ? (
                          <span className="text-xs text-muted-foreground/50 italic">No sites assigned</span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <Badge variant={user.isActive ? "default" : "secondary"} className="h-5 text-[10px] px-2 uppercase tracking-wider font-bold">
                          {user.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground/70 text-xs align-top py-4">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right align-top py-4 pr-4">
                        <UserActions user={user} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )
      }

      {/* Card View */}
      {
        viewMode === "card" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 pt-2 pb-10">
            {paginatedUsers.map((user, index) => (
              <div
                key={user._id}
                className="animate-in fade-in slide-in-from-bottom-5 h-full"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                <UserCard user={user} />
              </div>
            ))}
          </div>
        )
      }

      {/* Edit User Dialog */}
      <EditUserDialog
        open={editingUser !== null}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingUser !== null} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingUser?.fullName}</strong> (@{deletingUser?.username}) and remove all their data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LocationInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        locationId={selectedSiteId}
      />

      <UserInfoDialog
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
        user={viewingUser}
      />
    </div >
  );
}
