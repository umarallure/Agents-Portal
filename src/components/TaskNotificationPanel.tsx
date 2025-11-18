import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, Bell, Clock, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AppFixTask {
  id: string;
  submission_id: string;
  customer_name: string | null;
  fix_type: string;
  status: string;
  created_at: string;
  assigned_to_name: string | null;
}

export const TaskNotificationPanel = () => {
  const navigate = useNavigate();
  const [pendingTasks, setPendingTasks] = useState<AppFixTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDisplayName, setUserDisplayName] = useState<string>("");

  useEffect(() => {
    fetchPendingTasks();
    
    // Set up real-time subscription for new tasks
    const channel = supabase
      .channel('task-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_fix_tasks',
        },
        () => {
          fetchPendingTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingTasks = async () => {
    try {
      setLoading(true);

      // Get current user's display name
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const displayName = profile?.display_name || '';
      setUserDisplayName(displayName);

      // Fetch pending tasks assigned to this user
      const { data: tasksData, error } = await supabase
        .from('app_fix_tasks')
        .select('*')
        .eq('assigned_to_name', displayName)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching tasks:", error);
        return;
      }

      setPendingTasks(tasksData || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFixTypeLabel = (fixType: string) => {
    switch (fixType) {
      case 'banking_info':
        return 'Banking Info';
      case 'carrier_requirement':
        return 'Carrier Requirement';
      case 'updated_banking_info':
        return 'Banking Update';
      default:
        return fixType;
    }
  };

  const getFixTypeIcon = (fixType: string) => {
    return <Wrench className="h-3 w-3" />;
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/task/${taskId}`);
  };

  const handleViewAll = () => {
    navigate('/licensed-agent-inbox');
  };

  const pendingCount = pendingTasks.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          <span className="hidden sm:inline">Tasks</span>
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Pending Tasks</span>
          <Badge variant="outline">{pendingCount}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading tasks...
          </div>
        ) : pendingTasks.length === 0 ? (
          <div className="p-4 text-center">
            <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No pending tasks</p>
            <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <>
            {pendingTasks.map((task) => (
              <DropdownMenuItem
                key={task.id}
                onClick={() => handleTaskClick(task.id)}
                className="cursor-pointer p-3 flex-col items-start gap-1"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {getFixTypeIcon(task.fix_type)}
                    <span className="font-medium text-sm">
                      {getFixTypeLabel(task.fix_type)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {task.status === 'in_progress' ? 'In Progress' : 'New'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <p className="font-medium">{task.customer_name || 'N/A'}</p>
                  <p>{task.submission_id}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(task.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleViewAll}
              className="cursor-pointer justify-center font-medium text-primary"
            >
              View All Tasks
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
