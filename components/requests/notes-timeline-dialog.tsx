import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NotebookPen, Send, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NotesTimelineDialogProps {
    requestNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        try {
            await addNote({ requestNumber, content: newNote });
            setNewNote("");
        } catch (error) {
            console.error("Failed to add note:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md md:max-w-lg h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <NotebookPen className="h-5 w-5" />
                        Notes & Timeline #{requestNumber}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative bg-muted/10">
                    <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                        <div className="space-y-6">
                            {!notes ? (
                                <div className="text-center text-muted-foreground py-8 animate-pulse">Loading notes...</div>
                            ) : notes.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
                                    <NotebookPen className="h-10 w-10 opacity-20" />
                                    <p>No notes yet.</p>
                                    <p className="text-xs opacity-70">Be the first to add a note.</p>
                                </div>
                            ) : (
                                notes.map((note) => (
                                    <div key={note._id} className="flex gap-3 relative group">
                                        {/* Timeline line */}
                                        <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-border group-last:hidden" />

                                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm z-10 shrink-0">
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                <User className="h-5 w-5" />
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 space-y-1.5 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-sm truncate">{note.userName}</span>
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <span className="text-xs text-muted-foreground capitalize truncate flex-shrink-0">
                                                            {note.userRole?.replace("_", " ")}
                                                        </span>
                                                        {(note as any).status && (
                                                            <Badge
                                                                variant="secondary"
                                                                className={cn(
                                                                    "text-[10px] h-4 px-1 py-0 capitalize flex-shrink-0 font-normal opacity-80",
                                                                    (note as any).status === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
                                                                    (note as any).status === "draft" && "bg-muted text-muted-foreground",
                                                                    (note as any).status === "approved" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                                                                    (note as any).status === "rejected" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                                                                    (note as any).status === "direct_po" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                                                                )}
                                                            >
                                                                {(note as any).status.replace("_", " ")}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-card p-3 rounded-lg border shadow-sm text-sm leading-relaxed break-words group-hover:bg-muted/40 transition-colors">
                                                <div className="whitespace-pre-wrap">{note.content}</div>
                                                <div className="text-[10px] text-muted-foreground text-right mt-1.5 select-none">
                                                    {format(new Date(note.createdAt), "h:mm a")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-background mt-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                        <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Type a note..."
                            className="min-h-[44px] max-h-32 resize-none py-3"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!newNote.trim() || isSubmitting}
                            className="h-[44px] w-[44px] shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
