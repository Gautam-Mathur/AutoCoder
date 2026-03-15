import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Server, AlertTriangle, CheckCircle, Clock, Target,
  Plus, Play, Calendar, Users, FileText, Activity,
  TrendingUp, AlertCircle, Search, Filter, RefreshCw,
  Trash2, Edit, Eye, Download
} from "lucide-react";

interface VaptAsset {
  id: number;
  name: string;
  type: string;
  value: string;
  criticality: string;
  tags: string[] | null;
  status: string | null;
  createdAt: string;
}

interface VaptVulnerability {
  id: number;
  assetId: number | null;
  cveId: string | null;
  title: string;
  description: string;
  severity: string;
  cvssScore: string | null;
  component: string | null;
  owaspCategory: string | null;
  status: string | null;
  assignedTo: string | null;
  deadline: string | null;
  remediation: string | null;
  createdAt: string;
}

interface VaptScan {
  id: number;
  assetId: number | null;
  scanType: string;
  status: string | null;
  progress: number | null;
  findingsCount: number | null;
  criticalCount: number | null;
  highCount: number | null;
  mediumCount: number | null;
  lowCount: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface VaptSchedule {
  id: number;
  name: string;
  assetId: number | null;
  cronExpression: string;
  scanType: string;
  enabled: boolean | null;
  nextRun: string | null;
}

interface VaptTeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface VaptAuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  createdAt: string;
}

interface DashboardStats {
  totalAssets: number;
  totalVulnerabilities: number;
  totalScans: number;
  openVulnerabilities: number;
  resolvedVulnerabilities: number;
  severityCounts: { critical: number; high: number; medium: number; low: number; info: number };
  statusCounts: { open: number; in_progress: number; resolved: number; verified: number; false_positive: number };
  owaspCounts: Record<string, number>;
  riskScore: number;
  criticalAssets: number;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-blue-500 text-white",
  info: "bg-gray-400 text-white"
};

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  verified: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  false_positive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
};

export default function VaptDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [vulnDialogOpen, setVulnDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/vapt/dashboard"],
  });

  const { data: assets = [], refetch: refetchAssets } = useQuery<VaptAsset[]>({
    queryKey: ["/api/vapt/assets"],
  });

  const { data: vulnerabilities = [], refetch: refetchVulns } = useQuery<VaptVulnerability[]>({
    queryKey: ["/api/vapt/vulnerabilities"],
  });

  const { data: scans = [] } = useQuery<VaptScan[]>({
    queryKey: ["/api/vapt/scans"],
  });

  const { data: schedules = [] } = useQuery<VaptSchedule[]>({
    queryKey: ["/api/vapt/schedules"],
  });

  const { data: team = [] } = useQuery<VaptTeamMember[]>({
    queryKey: ["/api/vapt/team"],
  });

  const { data: auditLogs = [] } = useQuery<VaptAuditLog[]>({
    queryKey: ["/api/vapt/audit-logs"],
  });

  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vapt/seed-demo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vapt"] });
      refetchStats();
      refetchAssets();
      refetchVulns();
      toast({ title: "Demo data loaded", description: "Sample assets, vulnerabilities, and scans have been added." });
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/vapt/assets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vapt/assets"] });
      refetchStats();
      setAssetDialogOpen(false);
      toast({ title: "Asset created", description: "The asset has been added successfully." });
    },
  });

  const runScanMutation = useMutation({
    mutationFn: async (scanId: number) => {
      const res = await apiRequest("POST", `/api/vapt/scans/${scanId}/run`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vapt"] });
      refetchStats();
      refetchVulns();
      toast({ title: "Scan completed", description: "Vulnerabilities have been discovered and logged." });
    },
  });

  const createScanMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/vapt/scans", data);
      return res.json();
    },
    onSuccess: (scan: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vapt/scans"] });
      setScanDialogOpen(false);
      toast({ title: "Scan created", description: "Running scan now..." });
      runScanMutation.mutate(scan.id);
    },
  });

  const updateVulnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/vapt/vulnerabilities/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vapt/vulnerabilities"] });
      refetchStats();
      toast({ title: "Vulnerability updated" });
    },
  });

  const filteredVulns = vulnerabilities.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.cveId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.component?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || v.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const owaspTop10 = [
    { id: "A01:2021", name: "Broken Access Control", description: "Access control enforces policy so users cannot act outside their intended permissions." },
    { id: "A02:2021", name: "Cryptographic Failures", description: "Failures related to cryptography which often lead to sensitive data exposure." },
    { id: "A03:2021", name: "Injection", description: "SQL, NoSQL, OS, and LDAP injection occurs when untrusted data is sent to an interpreter." },
    { id: "A04:2021", name: "Insecure Design", description: "Missing or ineffective control design patterns and security architecture." },
    { id: "A05:2021", name: "Security Misconfiguration", description: "Missing appropriate security hardening across any part of the application stack." },
    { id: "A06:2021", name: "Vulnerable Components", description: "Using components with known vulnerabilities." },
    { id: "A07:2021", name: "Auth Failures", description: "Authentication and session management implementation flaws." },
    { id: "A08:2021", name: "Software and Data Integrity", description: "Code and infrastructure not protected against integrity violations." },
    { id: "A09:2021", name: "Security Logging", description: "Insufficient logging and monitoring enables malicious activity." },
    { id: "A10:2021", name: "SSRF", description: "Server-Side Request Forgery occurs when a web app fetches a remote resource without validating the URL." },
  ];

  return (
    <div className="min-h-screen bg-background p-6" data-testid="vapt-dashboard">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              VAPT Security Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Vulnerability Assessment and Penetration Testing Platform</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchStats()} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => seedDemoMutation.mutate()} variant="secondary" data-testid="button-load-demo">
              <Play className="h-4 w-4 mr-2" />
              Load Demo Data
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="assets" data-testid="tab-assets">Assets</TabsTrigger>
            <TabsTrigger value="vulnerabilities" data-testid="tab-vulnerabilities">Vulnerabilities</TabsTrigger>
            <TabsTrigger value="scans" data-testid="tab-scans">Scans</TabsTrigger>
            <TabsTrigger value="owasp" data-testid="tab-owasp">OWASP</TabsTrigger>
            <TabsTrigger value="remediation" data-testid="tab-remediation">Remediation</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getRiskColor(stats?.riskScore || 0)}`}>
                    {stats?.riskScore || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Overall security posture</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.totalAssets || 0}</div>
                  <p className="text-xs text-muted-foreground">{stats?.criticalAssets || 0} critical</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Open Vulnerabilities</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">{stats?.openVulnerabilities || 0}</div>
                  <p className="text-xs text-muted-foreground">{stats?.totalVulnerabilities || 0} total found</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                  <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{stats?.resolvedVulnerabilities || 0}</div>
                  <p className="text-xs text-muted-foreground">Remediated issues</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Severity Distribution</CardTitle>
                  <CardDescription>Breakdown by vulnerability severity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Critical", count: stats?.severityCounts?.critical || 0, color: "bg-red-600" },
                      { label: "High", count: stats?.severityCounts?.high || 0, color: "bg-orange-500" },
                      { label: "Medium", count: stats?.severityCounts?.medium || 0, color: "bg-yellow-500" },
                      { label: "Low", count: stats?.severityCounts?.low || 0, color: "bg-blue-500" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="flex-1 text-sm">{item.label}</span>
                        <span className="font-semibold">{item.count}</span>
                        <div className="w-24 bg-secondary rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${item.color}`}
                            style={{ width: `${Math.min(100, (item.count / Math.max(1, stats?.totalVulnerabilities || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Overview</CardTitle>
                  <CardDescription>Vulnerability remediation status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Open", count: stats?.statusCounts?.open || 0, color: "bg-red-500" },
                      { label: "In Progress", count: stats?.statusCounts?.in_progress || 0, color: "bg-yellow-500" },
                      { label: "Resolved", count: stats?.statusCounts?.resolved || 0, color: "bg-green-500" },
                      { label: "Verified", count: stats?.statusCounts?.verified || 0, color: "bg-blue-500" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="flex-1 text-sm">{item.label}</span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Vulnerabilities</CardTitle>
                <CardDescription>Latest discovered security issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vulnerabilities.slice(0, 5).map(vuln => (
                    <div key={vuln.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <Badge className={severityColors[vuln.severity]}>{vuln.severity}</Badge>
                      <div className="flex-1">
                        <p className="font-medium">{vuln.title}</p>
                        <p className="text-sm text-muted-foreground">{vuln.component} {vuln.cveId && `- ${vuln.cveId}`}</p>
                      </div>
                      <Badge variant="outline" className={statusColors[vuln.status || 'open']}>{vuln.status}</Badge>
                    </div>
                  ))}
                  {vulnerabilities.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No vulnerabilities found. Load demo data to see examples.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Asset Management</h2>
              <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-asset">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Asset</DialogTitle>
                    <DialogDescription>Add a target for vulnerability scanning</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createAssetMutation.mutate({
                      name: formData.get("name"),
                      type: formData.get("type"),
                      value: formData.get("value"),
                      criticality: formData.get("criticality"),
                      tags: formData.get("tags")?.toString().split(",").map(t => t.trim()).filter(Boolean) || [],
                    });
                  }}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Asset Name</Label>
                        <Input id="name" name="name" placeholder="Production Web Server" required data-testid="input-asset-name" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select name="type" defaultValue="ip">
                          <SelectTrigger data-testid="select-asset-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ip">IP Address</SelectItem>
                            <SelectItem value="domain">Domain</SelectItem>
                            <SelectItem value="url">URL</SelectItem>
                            <SelectItem value="network_range">Network Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="value">Target Value</Label>
                        <Input id="value" name="value" placeholder="192.168.1.1 or example.com" required data-testid="input-asset-value" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="criticality">Criticality</Label>
                        <Select name="criticality" defaultValue="medium">
                          <SelectTrigger data-testid="select-asset-criticality">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="tags">Tags (comma-separated)</Label>
                        <Input id="tags" name="tags" placeholder="web, production, external" data-testid="input-asset-tags" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createAssetMutation.isPending} data-testid="button-submit-asset">
                        {createAssetMutation.isPending ? "Creating..." : "Create Asset"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assets.map(asset => (
                <Card key={asset.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{asset.name}</CardTitle>
                      <Badge className={severityColors[asset.criticality]}>{asset.criticality}</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      {asset.value}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="outline">{asset.type}</Badge>
                      {asset.tags?.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        createScanMutation.mutate({ assetId: asset.id, scanType: 'standard' });
                      }}>
                        <Play className="h-3 w-3 mr-1" />
                        Scan
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {assets.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No assets yet. Add your first asset or load demo data.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vulnerabilities" className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-bold">Vulnerabilities</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vulnerabilities..."
                    className="pl-9 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-vulns"
                  />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32" data-testid="select-severity-filter">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-muted-foreground">
                        <th className="p-4">Severity</th>
                        <th className="p-4">Title</th>
                        <th className="p-4">CVE</th>
                        <th className="p-4">CVSS</th>
                        <th className="p-4">Component</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVulns.map(vuln => (
                        <tr key={vuln.id} className="border-b hover:bg-secondary/30">
                          <td className="p-4">
                            <Badge className={severityColors[vuln.severity]}>{vuln.severity}</Badge>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{vuln.title}</p>
                              {vuln.owaspCategory && (
                                <p className="text-xs text-muted-foreground">{vuln.owaspCategory}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-sm">{vuln.cveId || "-"}</td>
                          <td className="p-4">{vuln.cvssScore || "-"}</td>
                          <td className="p-4 text-sm">{vuln.component || "-"}</td>
                          <td className="p-4">
                            <Select
                              value={vuln.status || "open"}
                              onValueChange={(status) => updateVulnMutation.mutate({ id: vuln.id, data: { status } })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="false_positive">False Positive</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredVulns.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      {vulnerabilities.length === 0
                        ? "No vulnerabilities found. Run a scan to discover issues."
                        : "No vulnerabilities match your filters."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scans" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Vulnerability Scans</h2>
              <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-scan">
                    <Play className="h-4 w-4 mr-2" />
                    New Scan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Scan</DialogTitle>
                    <DialogDescription>Configure and run a vulnerability scan</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createScanMutation.mutate({
                      assetId: parseInt(formData.get("assetId") as string),
                      scanType: formData.get("scanType"),
                    });
                  }}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Target Asset</Label>
                        <Select name="assetId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an asset" />
                          </SelectTrigger>
                          <SelectContent>
                            {assets.map(asset => (
                              <SelectItem key={asset.id} value={asset.id.toString()}>{asset.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Scan Type</Label>
                        <Select name="scanType" defaultValue="standard">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quick">Quick Scan (5 min)</SelectItem>
                            <SelectItem value="standard">Standard Scan (30 min)</SelectItem>
                            <SelectItem value="deep">Deep Scan (2 hours)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createScanMutation.isPending || assets.length === 0}>
                        {createScanMutation.isPending ? "Starting..." : "Start Scan"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {scans.map(scan => {
                const asset = assets.find(a => a.id === scan.assetId);
                return (
                  <Card key={scan.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`w-3 h-3 rounded-full ${scan.status === 'completed' ? 'bg-green-500' : scan.status === 'running' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`} />
                      <div className="flex-1">
                        <p className="font-medium">{asset?.name || `Asset #${scan.assetId}`}</p>
                        <p className="text-sm text-muted-foreground">{scan.scanType} scan - {scan.status}</p>
                      </div>
                      {scan.status === 'completed' && (
                        <div className="flex gap-4 text-sm">
                          <span className="text-red-500">{scan.criticalCount} Critical</span>
                          <span className="text-orange-500">{scan.highCount} High</span>
                          <span className="text-yellow-600">{scan.mediumCount} Medium</span>
                          <span className="text-blue-500">{scan.lowCount} Low</span>
                        </div>
                      )}
                      <Badge variant="outline">{new Date(scan.createdAt).toLocaleDateString()}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
              {scans.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No scans yet. Add an asset and start scanning.
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Scheduled Scans</CardTitle>
                <CardDescription>Automated recurring vulnerability assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {schedules.map(schedule => (
                    <div key={schedule.id} className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{schedule.name}</p>
                        <p className="text-sm text-muted-foreground">{schedule.cronExpression} - {schedule.scanType}</p>
                      </div>
                      <Badge variant={schedule.enabled ? "default" : "secondary"}>
                        {schedule.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
                  {schedules.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No scheduled scans configured.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owasp" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">OWASP Top 10 Compliance</h2>
                <p className="text-muted-foreground">Track vulnerabilities against OWASP Top 10 2021</p>
              </div>
            </div>

            <div className="grid gap-4">
              {owaspTop10.map(item => {
                const count = stats?.owaspCounts?.[item.id] || 0;
                return (
                  <Card key={item.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${count > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200'}`}>
                        {count > 0 ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.id}: {item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge variant={count > 0 ? "destructive" : "secondary"}>
                        {count} {count === 1 ? 'issue' : 'issues'}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="remediation" className="space-y-4">
            <h2 className="text-2xl font-bold">Remediation Tracking</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned to Team</CardTitle>
                  <CardDescription>Vulnerabilities assigned to team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {team.map(member => {
                      const assigned = vulnerabilities.filter(v => v.assignedTo === member.name);
                      return (
                        <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {member.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                          <Badge variant="outline">{assigned.length} assigned</Badge>
                        </div>
                      );
                    })}
                    {team.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No team members. Load demo data to see examples.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Deadlines</CardTitle>
                  <CardDescription>Vulnerabilities with remediation deadlines</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vulnerabilities.filter(v => v.deadline).slice(0, 5).map(vuln => (
                      <div key={vuln.id} className="flex items-center gap-3 p-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{vuln.title}</p>
                          <p className="text-xs text-muted-foreground">Due: {new Date(vuln.deadline!).toLocaleDateString()}</p>
                        </div>
                        <Badge className={severityColors[vuln.severity]}>{vuln.severity}</Badge>
                      </div>
                    ))}
                    {vulnerabilities.filter(v => v.deadline).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No deadlines set.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <h2 className="text-2xl font-bold">Reports</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="cursor-pointer hover-elevate">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold">Executive Summary</h3>
                  <p className="text-sm text-muted-foreground mt-2">High-level overview for management</p>
                  <Button className="mt-4" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover-elevate">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold">Technical Report</h3>
                  <p className="text-sm text-muted-foreground mt-2">Detailed findings with remediation steps</p>
                  <Button className="mt-4" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover-elevate">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold">Trend Analysis</h3>
                  <p className="text-sm text-muted-foreground mt-2">Security posture over time</p>
                  <Button className="mt-4" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <h2 className="text-2xl font-bold">Audit Log</h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left text-sm text-muted-foreground">
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Entity</th>
                        <th className="p-4">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log.id} className="border-b">
                          <td className="p-4 text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="p-4">
                            <Badge variant="outline">{log.action}</Badge>
                          </td>
                          <td className="p-4 text-sm">{log.entityType} #{log.entityId}</td>
                          <td className="p-4 text-sm text-muted-foreground">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {auditLogs.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No audit logs yet. Actions will be recorded here.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}