"use client";

/**
 * Notes & Timeline Dialog
 *
 * Shows user-written notes only (type="note").
 * Chat-style layout — newest note at the bottom.
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NotebookPen, Send, MessageSquarePlus, Loader2 } from "lucide-react";

interface NotesTimelineDialogProps {
    requestNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const roleMeta: Record<string, { label: string; color: string; bg: string; initials?: string }> = {
    site_engineer: { label: "Site Engineer", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" },
    manager: { label: "Manager", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/25" },
    purchase_officer: { label: "Purchase Officer", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/25" },
};

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function NotesTimelineDialog({
    requestNumber,
    open,
    onOpenChange,
}: NotesTimelineDialogProps) {
    const notes = useQuery(api.notes.getNotes, { requestNumber });
    const addNote = useMutation(api.notes.addNote);
    const [newNote, setNewNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reverse for newest-at-bottom display
    const displayNotes = notes ? [...notes].reverse() : [];

    // Scroll to bottom when new notes arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayNotes.length]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = newNote.trim();
        if (!trimmed || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await addNote({ requestNumber, content: trimmed });
            setNewNote("");
            textareaRef.current?.focus();
        } catch (error) {
            console.error("Failed to add note:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md md:max-w-lg max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/60">
                <VisuallyHidden><DialogTitle>Notes & Timeline #{requestNumber}</DialogTitle></VisuallyHidden>

                {/* ── Header ── */}
                <div className="relative flex items-center gap-3 px-5 py-4 border-b border-border/50 bg-gradient-to-r from-background to-primary/5 flex-shrink-0">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <NotebookPen className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold">Notes & Timeline</h2>
                            <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-muted/60 border border-border/40 text-muted-foreground">
                                #{requestNumber}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {notes === undefined ? "Loading…" : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}
                        </p>
                    </div>
                </div>

                {/* ── Messages area ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-muted/5">
                    {notes === undefined ? (
                        // Loading skeleton
                        <div className="space-y-3 animate-pulse">
                            {[1, 2].map(i => (
                                <div key={i} className="flex gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5 pt-1">
                                        <div className="h-2.5 bg-muted rounded-full w-24" />
                                        <div className="h-10 bg-muted rounded-xl w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayNotes.length === 0 ? (
                        // Empty state
                        <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-center">
                            <div className="relative mb-4">
                                <div className="h-14 w-14 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center">
                                    <MessageSquarePlus className="h-6 w-6 text-muted-foreground/40" />
                                </div>
                            </div>
                            <p className="text-sm font-medium text-foreground/60">No notes yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Start the conversation below</p>
                        </div>
                    ) : (
                        // Notes list
                        displayNotes.map((note, idx) => {
                            const role = roleMeta[note.userRole ?? ""] ?? {
                                label: note.userRole?.replace(/_/g, " ") ?? "User",
                                color: "text-muted-foreground",
                                bg: "bg-muted/30 border-border/40",
                            };
                            const isLatest = idx === displayNotes.length - 1;

                            return (
                                <div
                                    key={note._id}
                                    className={cn(
                                        "flex gap-3 group",
                                        isLatest && "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold border mt-0.5",
                                        role.bg, role.color
                                    )}>
                                        {getInitials(note.userName)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Author row */}
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-xs font-semibold truncate">{note.userName}</span>
                                            <span className={cn("text-[10px] truncate", role.color)}>{role.label}</span>
                                        </div>

                                        {/* Message bubble */}
                                        <div className={cn(
                                            "relative rounded-2xl rounded-tl-sm px-3.5 py-2.5 border text-sm leading-relaxed break-words",
                                            "bg-card/70 border-border/50 hover:bg-card transition-colors duration-150",
                                            isLatest && "border-primary/20 bg-primary/5 hover:bg-primary/5"
                                        )}>
                                            <div className="whitespace-pre-wrap text-[13px] text-foreground/90">
                                                {note.content}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground text-right mt-1.5">
                                                {format(new Date(note.createdAt), "dd MMM · h:mm a")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* ── Compose area ── */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-border/50 bg-background/80 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                        <div className="flex-1 relative">
                            <Textarea
                                ref={textareaRef}
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Write a note…"
                                className="min-h-[42px] max-h-28 resize-none py-2.5 pr-3 text-sm rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!newNote.trim() || isSubmitting}
                            className="h-[42px] w-[42px] shrink-0 rounded-xl"
                        >
                            {isSubmitting
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Send className="h-4 w-4" />
                            }
                        </Button>
                    </form>
                    <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                        Press <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Shift+Enter</kbd> for new line
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
