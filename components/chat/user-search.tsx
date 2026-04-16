/**
 * User Search Component
 * 
 * Search and select users to start a chat with.
 */

"use client";

import { useState } from "react";
import { Search, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChattableUsers } from "@/hooks/use-chat";
import { useUserPresence } from "@/hooks/use-presence";
import { OnlineIndicator } from "./online-indicator";
import { getRoleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface UserSearchProps {
  onSelectUser: (userId: Id<"users">) => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function UserItem({
  user,
  onSelect,
}: {
  user: {
    _id: Id<"users">;
    fullName: string;
    username: string;
    role: string;
  };
  onSelect: () => void;
}) {
  const presence = useUserPresence(user._id);

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors text-left"
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator isOnline={presence?.isOnline ?? false} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{user.fullName}</p>
          {presence?.isOnline && (
            <span className="text-xs text-green-600 dark:text-green-500">
              Online
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
          <Badge variant="secondary" className="text-xs">
            {getRoleLabel(user.role as any)}
          </Badge>
        </div>
      </div>

      <MessageCircle className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}

export function UserSearch({ onSelectUser, className }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const users = useChattableUsers(searchQuery);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-2">
        {users === undefined ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center px-4">
              {searchQuery
                ? "No users found matching your search."
                : "No users available to chat with."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {users.map((user) => (
              <UserItem
                key={user._id}
                user={user}
                onSelect={() => onSelectUser(user._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

