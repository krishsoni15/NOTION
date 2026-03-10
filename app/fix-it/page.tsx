"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, Activity, CheckCircle2, AlertTriangle, Hammer, Trash2 } from "lucide-react";

export default function FixItPage() {
    const health = useQuery(api.maintenance.checkSystemHealth);
    const cleanup = useMutation(api.maintenance.cleanupDuplicateUsers);
    const deleteVendors = useMutation(api.maintenance.deleteAllVendors);
    const deleteGrns = useMutation(api.maintenance.deleteAllGrns);

    const [secret, setSecret] = useState("");
    const [isFixing, setIsFixing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFix = async () => {
        if (!secret) return toast.error("Please enter the secret key.");
        setIsFixing(true);
        try {
            const res = await cleanup({ adminSecret: secret });
            setResult(res);
            toast.success("Cleanup successful!");
        } catch (err: any) {
            toast.error(err.message || "Failed to fix.");
        } finally {
            setIsFixing(false);
        }
    };

    const handleDeleteVendors = async () => {
        if (!secret) return toast.error("Please enter the secret key.");
        if (!confirm("Are you sure you want to delete ALL vendor data? This is irreversible!")) return;
        setIsFixing(true);
        try {
            const res = await deleteVendors({ adminSecret: secret });
            setResult(res);
            toast.success("All vendors deleted successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to delete vendors.");
        } finally {
            setIsFixing(false);
        }
    };

    const handleDeleteGrns = async () => {
        if (!secret) return toast.error("Please enter the secret key.");
        if (!confirm("Are you sure you want to delete ALL GRN data? This is irreversible!")) return;
        setIsFixing(true);
        try {
            const res = await deleteGrns({ adminSecret: secret });
            setResult(res);
            toast.success("All GRNs deleted successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to delete GRNs.");
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="bg-slate-900 px-6 py-8 text-white flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-red-500 flex items-center justify-center">
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
                            Database Records Status
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
                                        <div className="bg-white/50 p-2 rounded border border-current/10">Vendors: {health.vendorCount}</div>
                                        <div className="bg-white/50 p-2 rounded border border-current/10">GRNs: {health.grnCount}</div>
                                        <div className="bg-white/50 p-2 rounded border border-current/10">POs: {health.poCount}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Section */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            <Hammer className="h-4 w-4" />
                            Dangerous Operations
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100 italic gap-2 flex flex-col">
                            <span>Use "Run Cleanup" to fix Duplicate Auth.</span>
                            <span className="text-red-600 font-bold">Use "Delete" buttons to wipe corrupt data tables to fix errors. THIS CANNOT BE UNDONE.</span>
                        </p>

                        <div className="space-y-3">
                            <Input
                                type="password"
                                placeholder="Enter Admin Fix Secret (notion-fix-2026)"
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                className="h-12 border-slate-200 focus:ring-slate-900"
                                onKeyDown={(e) => e.key === "Enter" && handleFix()}
                            />

                            <Button
                                onClick={handleFix}
                                disabled={isFixing || !secret}
                                variant="outline"
                                className="w-full h-12"
                            >
                                {isFixing ? "Running..." : "Run Cleanup"}
                            </Button>

                            <div className="flex gap-2 w-full mt-4">
                                <Button
                                    onClick={handleDeleteVendors}
                                    disabled={isFixing || !secret}
                                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete All Vendors
                                </Button>

                                <Button
                                    onClick={handleDeleteGrns}
                                    disabled={isFixing || !secret}
                                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold transition-all disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete All GRNs
                                </Button>
                            </div>
                        </div>
                    </div>

                    {result && (
                        <div className="p-4 bg-emerald-900 text-white rounded-xl text-center font-mono text-sm shadow-inner overflow-hidden text-ellipsis whitespace-nowrap">
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
                        Emergency Repair Module v2
                    </span>
                </div>
            </div>
        </div>
    );
}
