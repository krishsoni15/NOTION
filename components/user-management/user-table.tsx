"use client";

/**
 * User Table Component
 * 
 * Displays all users in a table or card view with actions.
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
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
import { MoreHorizontal, Edit, UserX, UserCheck, Trash2, ChevronLeft, ChevronRight, User, Phone, Calendar, MapPin, Shield } from "lucide-react";
import { ROLE_LABELS, ROLES } from "@/lib/auth/roles";
import { Doc } from "@/convex/_generated/dataModel";
import { EditUserDialog } from "./edit-user-dialog";
import { toast } from "sonner";
import { OnlineIndicator } from "@/components/chat/online-indicator";
import { useMultipleUserPresence } from "@/hooks/use-presence";

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
  const [deletingUser, setDeletingUser] = useState<Doc<"users"> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when users change
  useEffect(() => {
    setCurrentPage(1);
  }, [users]);

  const totalPages = users ? Math.ceil(users.length / ITEMS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = users?.slice(startIndex, endIndex) ?? [];

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
      <Card className="hover:shadow-lg transition-all border-border/50">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2 mb-1">
                <OnlineIndicator 
                  isOnline={isOnline}
                  className="shrink-0"
                />
                <span className="truncate">{user.fullName}</span>
                {isCurrentUser && (
                  <Badge variant="secondary" className="text-xs shrink-0">You</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">@{user.username}</span>
              </div>
            </div>
            <UserActions user={user} />
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Role and Status Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                <Shield className="h-3 w-3" />
                <span>Role</span>
              </div>
              <Badge variant="outline" className="text-xs font-medium">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                <span>Status</span>
              </div>
              <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs font-medium">
                {user.isActive ? "Active" : "Disabled"}
              </Badge>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Contact Information */}
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Phone</p>
                <p className="text-sm font-medium">{user.phoneNumber || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Created</p>
                <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Assigned Sites Section */}
          {user.role === ROLES.SITE_ENGINEER && user.assignedSites && user.assignedSites.length > 0 && (
            <>
              <div className="border-t border-border/50" />
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Assigned Sites</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {user.assignedSites.map((siteId) => {
                    const site = allSites?.find((s) => s._id === siteId);
                    return site ? (
                      <Badge key={siteId} variant="secondary" className="text-xs font-medium">
                        {site.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-foreground">Full Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Username</TableHead>
                  <TableHead className="font-semibold text-foreground">Role</TableHead>
                  <TableHead className="font-semibold text-foreground">Phone</TableHead>
                  <TableHead className="font-semibold text-foreground">Sites</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">Created</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const isCurrentUser = user.clerkUserId === clerkUser?.id;
                  
                  return (
                    <TableRow key={user._id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <OnlineIndicator 
                            isOnline={userPresence?.[user._id]?.isOnline ?? false}
                            className="shrink-0"
                          />
                          <span>{user.fullName}</span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="ml-1 text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell>{user.phoneNumber}</TableCell>
                      <TableCell>
                        {user.role === ROLES.SITE_ENGINEER && user.assignedSites && user.assignedSites.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.assignedSites.map((siteId) => {
                              const site = allSites?.find((s) => s._id === siteId);
                              return site ? (
                                <Badge key={siteId} variant="secondary" className="text-xs">
                                  {site.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        ) : user.role === ROLES.SITE_ENGINEER ? (
                          <span className="text-xs text-muted-foreground">No sites assigned</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserActions user={user} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {paginatedUsers.map((user) => (
            <UserCard key={user._id} user={user} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2">...</span>;
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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
    </div>
  );
}
