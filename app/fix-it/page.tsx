"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, Activity, CheckCircle2, AlertTriangle, Hammer } from "lucide-react";

export default function FixItPage() {
    const health = useQuery(api.maintenance.checkSystemHealth);
    const cleanup = useMutation(api.maintenance.cleanupDuplicateUsers);

    const [secret, setSecret] = useState("");
    const [isFixing, setIsFixing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFix = async () => {
        if (!secret) {
            toast.error("Please enter the secret key to fix the system.");
            return;
        }

        setIsFixing(true);
        try {
            const res = await cleanup({ adminSecret: secret });
            setResult(res);
            toast.success("Cleanup successful!");
            setSecret("");
        } catch (err: any) {
            toast.error(err.message || "Failed to fix. Check the secret.");
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-slate-900 px-6 py-8 text-white flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-orange-500 flex items-center justify-center">
                        <ShieldAlert className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">System Emergency Fix</h1>
                        <p className="text-slate-400 text-sm mt-1">Resolve production server errors and duplicates</p>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Status Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            <Activity className="h-4 w-4" />
                            Production Status
                        </div>

                        {!health ? (
                            <div className="animate-pulse bg-slate-100 h-24 rounded-lg flex items-center justify-center text-slate-400">
                                Checking system health...
                            </div>
                        ) : (
                            <div className={`p-4 rounded-xl border-2 flex items-start gap-4 transition-all ${health.hasDuplicateUsers
                                    ? "bg-red-50 border-red-100 text-red-900"
                                    : "bg-emerald-50 border-emerald-100 text-emerald-900"
                                }`}>
                                {health.hasDuplicateUsers ? (
                                    <AlertTriangle className="h-6 w-6 shrink-0 text-red-600 mt-1" />
                                ) : (
                                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 mt-1" />
                                )}
                                <div>
                                    <p className="font-bold text-lg leading-tight">{health.status}</p>
                                    <p className="text-sm mt-1 opacity-80">{health.recommendation}</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono uppercase">
                                        <div className="bg-white/50 p-2 rounded border border-current/10">Users: {health.userCount}</div>
                                        <div className="bg-white/50 p-2 rounded border border-current/10">GRNs: {health.grnCount}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Section */}
                    {(!health || health.hasDuplicateUsers) && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                <Hammer className="h-4 w-4" />
                                Deployment Fix
                            </div>

                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 italic">
                                Use this action if you see "Server Error" on Add Vendor or GRN pages.
                                It deletes duplicate auth records that cause the crash.
                            </p>

                            <div className="space-y-3">
                                <Input
                                    type="password"
                                    placeholder="Enter Admin Fix Secret"
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                    className="h-12 border-slate-200 focus:ring-slate-900"
                                    onKeyDown={(e) => e.key === "Enter" && handleFix()}
                                />
                                <Button
                                    onClick={handleFix}
                                    disabled={isFixing || !secret}
                                    className="w-full h-12 bg-slate-900 hover:bg-black text-white font-bold transition-all disabled:opacity-50"
                                >
                                    {isFixing ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Stabilizing System...
                                        </div>
                                    ) : "Run Emergency Cleanup"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className="p-4 bg-emerald-900 text-white rounded-xl text-center font-mono text-sm shadow-inner">
                            {result.message}
                            <div className="mt-2 text-[10px] opacity-70 italic tracking-tighter">
                                Refresh the pages now.
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                        onClick={() => window.location.href = "/dashboard"}
                        className="text-slate-500 hover:text-slate-900 text-sm font-medium underline transition-all"
                    >
                        Back to Dashboard
                    </button>
                    <span className="text-slate-300 text-[10px] uppercase font-bold tracking-widest">
                        Emergency Repair Module v1
                    </span>
                </div>
            </div>
        </div>
    );
}
