"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from "recharts";
import {
    TrendingUp,
    Users,
    Package,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    Activity,
    Settings,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Animation Variants
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
};

export function ManagerDashboardView() {
    const statsQuery = useQuery(api.dashboard.getManagerDashboardStats);

    // DEMO DATA GENERATOR
    // If real data is empty or user wants a demo, we use this rich structure
    const demoStats = {
        overview: {
            totalRequests: 1248,
            pendingRequests: 14,
            approvedRequests: 1156,
            rejectedRequests: 78,
            totalUsers: 24,
            totalInventoryItems: 342,
            lowStockItems: 12,
        },
        charts: {
            sitePerformance: [
                { name: "Ahmedabad", requests: 450 },
                { name: "Surat", requests: 320 },
                { name: "Rajkot", requests: 210 },
                { name: "Vadodara", requests: 180 },
                { name: "Gandhinagar", requests: 88 },
            ],
            statusDistribution: [
                { name: "Approved", value: 1156, color: "#10b981" },
                { name: "Pending", value: 14, color: "#f59e0b" },
                { name: "Rejected", value: 78, color: "#ef4444" },
                { name: "Processing", value: 45, color: "#3b82f6" }
            ],
            spendingTrends: [
                { name: 'Jan', value: 4000 },
                { name: 'Feb', value: 3000 },
                { name: 'Mar', value: 2000 },
                { name: 'Apr', value: 2780 },
                { name: 'May', value: 1890 },
                { name: 'Jun', value: 2390 },
                { name: 'Jul', value: 3490 },
            ]
        },
        recentActivity: [
            { _id: "1", itemName: "High Grade Cement - UltraTech", creatorName: "Rajesh Kumar", status: "pending", quantity: 500, createdAt: Date.now(), creatorImage: "" },
            { _id: "2", itemName: "Steel Rebar 12mm", creatorName: "Amit Patel", status: "approved", quantity: 250, createdAt: Date.now() - 86400000, creatorImage: "" },
            { _id: "3", itemName: "Safety Helmets (Yellow)", creatorName: "Sneha Singh", status: "delivered", quantity: 50, createdAt: Date.now() - 172800000, creatorImage: "" },
            { _id: "4", itemName: "PVC Pipes 4 inch", creatorName: "Vikram Malhotra", status: "rejected", quantity: 100, createdAt: Date.now() - 259200000, creatorImage: "" },
            { _id: "5", itemName: "Electrical Wiring Bundle", creatorName: "Priya Sharma", status: "approved", quantity: 20, createdAt: Date.now() - 345600000, creatorImage: "" },
        ],
        team: [
            { name: "Rajesh Kumar", role: "Site Engineer", image: "https://i.pravatar.cc/150?u=1" },
            { name: "Amit Patel", role: "Site Manager", image: "https://i.pravatar.cc/150?u=2" },
            { name: "Sneha Singh", role: "Purchase Officer", image: "https://i.pravatar.cc/150?u=3" },
            { name: "Vikram M.", role: "Supervisor", image: "https://i.pravatar.cc/150?u=4" },
        ]
    };

    // Use query data if available and has substance, otherwise fallback to demo for visual impressiveness
    const hasRealData = statsQuery && statsQuery.overview.totalRequests > 5;
    const stats: any = hasRealData ? { ...statsQuery, charts: { ...statsQuery.charts, spendingTrends: demoStats.charts.spendingTrends }, team: demoStats.team } : demoStats;

    if (!statsQuery && !hasRealData) { // Show loading only initially
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground animate-pulse">Loading System Data...</p>
                </div>
            </div>
        );
    }

    const growth = {
        requests: "+12.5%",
        pending: "-5.2%",
        inventory: "+2.4%",
        users: "+8.1%"
    };

    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pt-2 pb-10 relative"
        >
            {/* Dynamic Background */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_10%,#000_40%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] opacity-40 pointer-events-none" />
            <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] bg-primary/5 rounded-full blur-3xl opacity-50 mix-blend-multiply filter pointer-events-none animate-blob" />
            <div className="absolute top-0 left-0 -z-10 h-[500px] w-[500px] bg-purple-500/5 rounded-full blur-3xl opacity-50 mix-blend-multiply filter pointer-events-none animate-blob animation-delay-2000" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Executive Overview
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm font-medium flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {currentDate} • System Operational
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {!hasRealData && <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Demo Mode Active</Badge>}
                </div>
            </div>

            {/* KPI Cards - Glassmorphism */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <KPICard title="Total Requests" value={stats.overview.totalRequests} icon={FileText} trend={growth.requests} trendUp={true} description="All time volume" color="blue" delay={0} />
                <KPICard title="Pending Approval" value={stats.overview.pendingRequests} icon={Clock} trend={growth.pending} trendUp={false} description="Requires attention" color="amber" delay={0.1} />
                <KPICard title="Inventory Alerts" value={stats.overview.lowStockItems} icon={AlertCircle} trend={growth.inventory} trendUp={false} description="Items Low on Stock" color="rose" delay={0.2} />
                <KPICard title="Active Team" value={stats.overview.totalUsers} icon={Users} trend={growth.users} trendUp={true} description="On-site personnel" color="emerald" delay={0.3} />
            </div>

            {/* Quick Actions & System Status */}
            <div className="grid gap-6 md:grid-cols-12">
                <motion.div variants={item} className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Create Request', 'Add User', 'Generate Report', 'System Settings'].map((action, i) => (
                        <div key={i} className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-all cursor-pointer hover:scale-105 group backdrop-blur-sm shadow-sm hover:shadow-md">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                                {i === 0 ? <FileText className="h-5 w-5 text-primary" /> :
                                    i === 1 ? <Users className="h-5 w-5 text-primary" /> :
                                        i === 2 ? <TrendingUp className="h-5 w-5 text-primary" /> :
                                            <Settings className="h-5 w-5 text-primary" />}
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">{action}</span>
                        </div>
                    ))}
                </motion.div>
                <motion.div variants={item} className="md:col-span-4 rounded-xl border bg-card/50 p-6 flex flex-col justify-between backdrop-blur-sm shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity className="h-24 w-24" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center ring-4 ring-emerald-500/5">
                            <Activity className="h-6 w-6 text-emerald-500 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">System Status</p>
                            <p className="text-xs text-muted-foreground font-medium">Synced 2 mins ago</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <div className="text-xs text-muted-foreground">Server Load</div>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                            Operational
                        </Badge>
                    </div>
                </motion.div>
            </div>

            {/* Main Interactive Charts Area */}
            <div className="grid gap-6 md:grid-cols-12">
                {/* Visual Spending Trend Area Chart */}
                <motion.div variants={item} className="md:col-span-8 rounded-2xl border bg-card/40 backdrop-blur-xl text-card-foreground shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <CardHeader className="pb-2 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Forecast & Trends</CardTitle>
                                <CardDescription>Monthly procurement volume</CardDescription>
                            </div>
                            <select className="text-xs bg-background/50 border border-border rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary">
                                <option>Last 6 Months</option>
                                <option>Last Year</option>
                            </select>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-0 pr-4 pb-4 pt-6">
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.charts.spendingTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tick={{ dy: 10 }} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} tick={{ dx: -10 }} />
                                    <Tooltip
                                        formatter={(value: any) => [`₹${value}`, 'Volume']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--popover)/0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </motion.div>

                {/* Status Donut Chart */}
                <motion.div variants={item} className="md:col-span-4 rounded-2xl border bg-card/40 backdrop-blur-xl text-card-foreground shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
                    <CardHeader className="pb-2 border-b border-border/50">
                        <CardTitle>Request Status</CardTitle>
                        <CardDescription>Live breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-center items-center pb-6 pt-6">
                        <div className="h-[220px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.charts.statusDistribution} cx="50%" cy="50%" innerRadius={75} outerRadius={95} paddingAngle={5} dataKey="value" stroke="none">
                                        {stats.charts.statusDistribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'hsl(var(--popover)/0.9)', backdropFilter: 'blur(8px)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                <span className="text-4xl font-extrabold tracking-tighter">{stats.overview.totalRequests}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Requests</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4 w-full px-4">
                            {stats.charts.statusDistribution.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 w-2.5 rounded-full ring-1 ring-offset-1 ring-offset-card" style={{ backgroundColor: entry.color }} />
                                        <span className="text-muted-foreground font-medium">{entry.name}</span>
                                    </div>
                                    <span className="font-bold font-mono">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </motion.div>
            </div>

            {/* Operational Intelligence Section (New) */}
            <div className="grid gap-6 md:grid-cols-12">
                {/* Inventory Health */}
                <motion.div variants={item} className="md:col-span-6 lg:col-span-4 rounded-2xl border bg-card/40 backdrop-blur-xl text-card-foreground shadow-sm hover:shadow-lg transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-rose-500" />
                                Inventory Alerts
                            </CardTitle>
                        </div>
                        <Badge variant="secondary" className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20">Action Needed</Badge>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-3">
                            {[
                                { name: "Grade 53 Cement", stock: "45 Bags", status: "Critical", color: "bg-rose-500" },
                                { name: "Steel Rebar 10mm", stock: "120 kg", status: "Low", color: "bg-amber-500" },
                                { name: "Red Bricks", stock: "500 pcs", status: "Low", color: "bg-amber-500" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-2 w-2 rounded-full ${item.color} animate-pulse`} />
                                        <div>
                                            <p className="text-sm font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">Stock: {item.stock}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors border border-primary/20">
                            View All Inventory →
                        </button>
                    </CardContent>
                </motion.div>

                {/* Procurement Breakdown */}
                <motion.div variants={item} className="md:col-span-6 lg:col-span-4 rounded-2xl border bg-card/40 backdrop-blur-xl text-card-foreground shadow-sm hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2 border-b border-border/50">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            Procurement Mix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <span>Raw Materials</span>
                                    <span>65%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[65%]" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <span>Safety Gear</span>
                                    <span>20%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[20%]" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <span>Machinery</span>
                                    <span>15%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[15%]" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted/40 rounded-lg">
                                <p className="text-xs text-muted-foreground">Top Category</p>
                                <p className="text-sm font-bold mt-1">Cement</p>
                            </div>
                            <div className="p-3 bg-muted/40 rounded-lg">
                                <p className="text-xs text-muted-foreground">M-o-M Growth</p>
                                <p className="text-sm font-bold mt-1 text-emerald-500">+12%</p>
                            </div>
                        </div>
                    </CardContent>
                </motion.div>

                {/* Team / Insights */}
                <motion.div variants={item} className="md:col-span-12 lg:col-span-4 rounded-2xl border bg-gradient-to-b from-indigo-900 to-violet-900 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden flex flex-col">
                    {/* Decorative blobs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />

                    <CardHeader className="relative z-10 pb-2 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                Top Performers
                            </CardTitle>
                            <Badge className="bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md">Week 42</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10 flex-1 flex flex-col gap-4 pt-4">
                        <div className="flex-1 space-y-3">
                            {stats.team && stats.team.slice(0, 3).map((member: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors cursor-pointer group">
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-indigo-400/30">
                                            <AvatarImage src={member.image} />
                                            <AvatarFallback className="bg-indigo-800 text-white font-bold">{member.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -top-1 -right-1 bg-amber-400 text-[8px] text-black font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-indigo-900">
                                            #{i + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-200 transition-colors">{member.name}</p>
                                        <p className="text-xs text-indigo-300 truncate">{member.role}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1 text-emerald-300 text-xs font-bold">
                                            <TrendingUp className="h-3 w-3" />
                                            98%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </motion.div>
            </div>

            {/* Bottom Section: Recent Activity (Full Width with new Style) */}
            <div className="grid gap-6 md:grid-cols-12 pb-8">
                <motion.div variants={item} className="md:col-span-12 rounded-2xl border bg-card/40 backdrop-blur-xl text-card-foreground shadow-sm hover:shadow-lg transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle>Recent Activity Stream</CardTitle>
                                <CardDescription>Real-time updates across all sites</CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="text-xs font-medium px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">View All</button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[300px]">
                            <div className="flex flex-col">
                                {stats.recentActivity.map((req: any, i: number) => (
                                    <div key={req._id} className="flex items-center justify-between p-4 border-b border-border/40 hover:bg-muted/30 transition-colors group last:border-0">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="h-10 w-10 ring-2 ring-offset-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                    <AvatarImage src={req.creatorImage} alt={req.creatorName} />
                                                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs">{req.creatorName?.[0] || "?"}</AvatarFallback>
                                                </Avatar>
                                                <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center ${req.status === 'approved' ? 'bg-emerald-500' :
                                                    req.status === 'pending' ? 'bg-amber-500' :
                                                        'bg-slate-500'
                                                    }`}>
                                                    {req.status === 'approved' ? <CheckCircle2 className="h-2.5 w-2.5 text-white" /> :
                                                        req.status === 'pending' ? <Clock className="h-2.5 w-2.5 text-white" /> :
                                                            <Activity className="h-2.5 w-2.5 text-white" />}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold group-hover:text-primary transition-colors">{req.itemName}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground/80">{req.creatorName}</span>
                                                    <span>•</span>
                                                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                                    <span className="hidden md:inline">•</span>
                                                    <span className="hidden md:inline text-xs bg-muted px-1.5 py-0.5 rounded">Site A</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</p>
                                                <p className="text-sm font-bold font-mono">{req.quantity} units</p>
                                            </div>
                                            <Badge className={`uppercase text-[10px] font-bold tracking-wider px-2 py-1 h-7 min-w-[90px] justify-center ${req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' :
                                                req.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20' :
                                                    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                }`}>
                                                {req.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </motion.div>
            </div>
        </motion.div>
    );
}

// Sub-component for KPI Cards
function KPICard({ title, value, icon: Icon, trend, trendUp, description, color, delay }: any) {
    const colors: Record<string, string> = {
        blue: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
        amber: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
        rose: "text-rose-500 bg-rose-50 dark:bg-rose-950/30",
        emerald: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
    };

    return (
        <motion.div variants={item} transition={{ delay }}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <Icon className={`h-4 w-4 ${(colors[color] || "").split(' ')[0]}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="flex items-center text-xs mt-1">
                        {trendUp ? (
                            <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
                        ) : (
                            <ArrowDownRight className={`mr-1 h-3 w-3 ${color === 'rose' || color === 'amber' ? 'text-emerald-500' : 'text-rose-500'}`} />
                        )}
                        <span className={trendUp ? "text-emerald-500 font-medium" : "text-emerald-500 font-medium"}>
                            {trend}
                        </span>
                        <span className="text-muted-foreground ml-1">
                            from last month
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{description}</p>
                </CardContent>
            </Card>
        </motion.div>
    );
}
