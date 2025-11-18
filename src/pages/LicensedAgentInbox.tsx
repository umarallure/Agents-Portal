import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavigationHeader } from "@/components/NavigationHeader";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, Inbox, Eye, Search, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface AppFixTask {
  id: string;
  submission_id: string;
  customer_name: string | null;
  fix_type: string;
  status: string;
  created_by_name: string | null;
  assigned_to_name: string | null;
  created_at: string;
  completed_at: string | null;
  notes: string | null;
}

const LicensedAgentInbox = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AppFixTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTaskType, setFilterTaskType] = useState<string>("all");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all");
  
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const { data: tasksData, error } = await supabase
        .from('app_fix_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching tasks:", error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks",
          variant: "destructive",
        });
        return;
      }

      setTasks(tasksData || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleViewDetails = (task: AppFixTask) => {
    navigate(`/task/${task.id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          In Progress
        </Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFixTypeLabel = (fixType: string) => {
    switch (fixType) {
      case 'banking_info':
        return 'Banking Info';
      case 'carrier_requirement':
        return 'Carrier Requirement';
      case 'updated_banking_info': // Legacy support
        return 'Banking Update';
      default:
        return fixType;
    }
  };

  // Filter tasks based on search and filters
  const filterTasks = (taskList: AppFixTask[]) => {
    return taskList.filter(task => {
      // Search filter (customer name or submission ID)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        task.customer_name?.toLowerCase().includes(searchLower) ||
        task.submission_id.toLowerCase().includes(searchLower);

      // Task type filter
      const matchesTaskType = filterTaskType === 'all' || task.fix_type === filterTaskType;

      // Created by filter
      const matchesCreatedBy = filterCreatedBy === 'all' || 
        task.created_by_name?.toLowerCase() === filterCreatedBy.toLowerCase();

      return matchesSearch && matchesTaskType && matchesCreatedBy;
    });
  };

  // Get unique creator names for filter dropdown
  const uniqueCreators = Array.from(new Set(
    tasks.map(t => t.created_by_name).filter(Boolean)
  )).sort();

  const pendingTasks = filterTasks(tasks.filter(t => t.status === 'pending' || t.status === 'in_progress'));
  const completedTasks = filterTasks(tasks.filter(t => t.status === 'completed'));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading Inbox...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Licensed Agent Inbox" />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Manage app fix tasks assigned to you
              </p>
            </div>
            <Button variant="outline" onClick={fetchTasks}>
              <Loader2 className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Customer name or Submission ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Task Type Filter */}
                <div className="space-y-2">
                  <Label htmlFor="taskType">Task Type</Label>
                  <Select value={filterTaskType} onValueChange={setFilterTaskType}>
                    <SelectTrigger id="taskType">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="banking_info">Banking Info</SelectItem>
                      <SelectItem value="carrier_requirement">Carrier Requirement</SelectItem>
                      <SelectItem value="updated_banking_info">Banking Update (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Created By Filter */}
                <div className="space-y-2">
                  <Label htmlFor="createdBy">Created By</Label>
                  <Select value={filterCreatedBy} onValueChange={setFilterCreatedBy}>
                    <SelectTrigger id="createdBy">
                      <SelectValue placeholder="All agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {uniqueCreators.map((creator) => (
                        <SelectItem key={creator} value={creator || 'unknown'}>
                          {creator || 'Unknown Agent'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || filterTaskType !== 'all' || filterCreatedBy !== 'all') && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterTaskType("all");
                      setFilterCreatedBy("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Pending ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-lg">No pending tasks</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        All caught up!
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Submission ID</TableHead>
                            <TableHead>Task Type</TableHead>
                            <TableHead>Assigned By</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingTasks.map((task) => (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium">
                                {task.customer_name || 'N/A'}
                              </TableCell>
                              <TableCell>{task.submission_id}</TableCell>
                              <TableCell>{getFixTypeLabel(task.fix_type)}</TableCell>
                              <TableCell>{task.created_by_name || 'N/A'}</TableCell>
                              <TableCell>
                                {format(new Date(task.created_at), 'MM/dd/yyyy HH:mm')}
                              </TableCell>
                              <TableCell>{getStatusBadge(task.status)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(task)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View & Complete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {completedTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-lg">No completed tasks</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Submission ID</TableHead>
                            <TableHead>Task Type</TableHead>
                            <TableHead>Assigned By</TableHead>
                            <TableHead>Completed</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {completedTasks.map((task) => (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium">
                                {task.customer_name || 'N/A'}
                              </TableCell>
                              <TableCell>{task.submission_id}</TableCell>
                              <TableCell>{getFixTypeLabel(task.fix_type)}</TableCell>
                              <TableCell>{task.created_by_name || 'N/A'}</TableCell>
                              <TableCell>
                                {task.completed_at 
                                  ? format(new Date(task.completed_at), 'MM/dd/yyyy HH:mm')
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>{getStatusBadge(task.status)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(task)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LicensedAgentInbox;
