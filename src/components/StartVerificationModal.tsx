import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BufferAgent {
  id: string;
  display_name: string;
  email: string;
  status: 'available' | 'busy' | 'on_call' | 'offline';
}

interface StartVerificationModalProps {
  submissionId: string;
  onVerificationStarted: (sessionId: string) => void;
}

export const StartVerificationModal = ({ submissionId, onVerificationStarted }: StartVerificationModalProps) => {
  const [open, setOpen] = useState(false);
  const [bufferAgents, setBufferAgents] = useState<BufferAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingAgents, setFetchingAgents] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchBufferAgents();
    }
  }, [open]);

  const fetchBufferAgents = async () => {
    setFetchingAgents(true);
    try {
      // Get buffer agents with their current status
      const { data: agents, error } = await supabase
        .from('agent_status')
        .select(`
          user_id,
          status
        `)
        .eq('agent_type', 'buffer');

      if (error) {
        throw error;
      }

      // Get profiles separately for the buffer agents
      const userIds = agents?.map(agent => agent.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.warn('Could not fetch profiles:', profilesError);
      }

      const formattedAgents = agents?.map(agent => {
        const profile = profiles?.find(p => p.user_id === agent.user_id);
        return {
          id: agent.user_id,
          display_name: profile?.display_name || 'Unknown',
          email: '', // We'll get this separately if needed
          status: agent.status as any
        };
      }) || [];

      setBufferAgents(formattedAgents);
    } catch (error) {
      console.error('Error fetching buffer agents:', error);
      toast({
        title: "Error",
        description: "Failed to load buffer agents",
        variant: "destructive",
      });
    } finally {
      setFetchingAgents(false);
    }
  };

  const startVerification = async () => {
    if (!selectedAgent) {
      toast({
        title: "Error",
        description: "Please select a buffer agent",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user (licensed agent)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Create verification session
      const { data: session, error: sessionError } = await supabase
        .from('verification_sessions')
        .insert({
          submission_id: submissionId,
          buffer_agent_id: selectedAgent,
          // licensed_agent_id should only be set when LA claims a transfer
          status: 'pending',
          progress_percentage: 0,
          verified_fields: 0,
          total_fields: 0
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Initialize verification items using our database function
      const { error: initError } = await supabase.rpc(
        'initialize_verification_items',
        {
          session_id_param: session.id,
          submission_id_param: submissionId
        }
      );

      if (initError) {
        throw initError;
      }

      // Update buffer agent status to 'on_call'
      const { error: statusError } = await supabase
        .from('agent_status')
        .upsert({
          user_id: selectedAgent,
          status: 'on_call',
          current_session_id: session.id,
          last_activity: new Date().toISOString()
        });

      if (statusError) {
        console.warn('Failed to update agent status:', statusError);
      }

      toast({
        title: "Success",
        description: "Verification session started successfully",
      });

      setOpen(false);
      onVerificationStarted(session.id);
    } catch (error) {
      console.error('Error starting verification:', error);
      toast({
        title: "Error",
        description: "Failed to start verification session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600';
      case 'on_call': return 'text-red-600';
      case 'busy': return 'text-yellow-600';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'on_call': return 'On Call';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Start Verification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Verification Process</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buffer-agent">Select Buffer Agent</Label>
            {fetchingAgents ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading agents...</span>
              </div>
            ) : (
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {bufferAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{agent.display_name}</span>
                        <span className={`ml-2 text-xs ${getStatusColor(agent.status)}`}>
                          {getStatusLabel(agent.status)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {bufferAgents.length === 0 && !fetchingAgents && (
            <p className="text-sm text-muted-foreground">
              No buffer agents available. Please ensure buffer agents are registered in the system.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={startVerification} 
              disabled={!selectedAgent || loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Start Verification
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
