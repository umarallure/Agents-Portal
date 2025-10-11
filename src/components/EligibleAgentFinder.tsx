import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, CheckCircle2, XCircle, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EligibleAgent {
  agent_user_id: string;
  agent_name: string;
  agent_email: string;
  agent_code: string | null;
  carrier_licensed: boolean;
  state_licensed: boolean;
}

interface Carrier {
  id: string;
  carrier_name: string;
}

interface State {
  id: string;
  state_name: string;
}

export default function EligibleAgentFinder() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [carrierName, setCarrierName] = useState('');
  const [stateName, setStateName] = useState('');
  const [eligibleAgents, setEligibleAgents] = useState<EligibleAgent[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Fetch carriers and states on component mount
  useEffect(() => {
    fetchCarriersAndStates();
  }, []);

  const fetchCarriersAndStates = async () => {
    setLoadingOptions(true);
    try {
      // Fetch carriers
      const { data: carriersData, error: carriersError } = await supabase
        .from('carriers')
        .select('id, carrier_name')
        .order('carrier_name');

      if (carriersError) throw carriersError;
      setCarriers(carriersData || []);

      // Fetch states
      const { data: statesData, error: statesError } = await supabase
        .from('states')
        .select('id, state_name')
        .order('state_name');

      if (statesError) throw statesError;
      setStates(statesData || []);
    } catch (error) {
      console.error('Error fetching carriers and states:', error);
      toast({
        title: 'Error',
        description: 'Failed to load carriers and states.',
        variant: 'destructive'
      });
    } finally {
      setLoadingOptions(false);
    }
  };

  const searchEligibleAgents = async () => {
    if (!carrierName.trim() || !stateName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select both carrier and state.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase
        .rpc('get_eligible_agents', {
          p_carrier_name: carrierName,
          p_state_name: stateName
        });

      if (error) throw error;

      setEligibleAgents(data || []);

      if (!data || data.length === 0) {
        toast({
          title: 'No Eligible Agents Found',
          description: `No agents are licensed for ${carrierName} in ${stateName}.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Search Complete',
          description: `Found ${data.length} eligible agent(s).`,
        });
      }
    } catch (error) {
      console.error('Error searching for agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for eligible agents. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Eligible Agents
          </CardTitle>
          <CardDescription>
            Search for agents licensed to sell a specific carrier in a specific state
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Carrier Name</label>
              <Select value={carrierName} onValueChange={setCarrierName} disabled={loadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? "Loading carriers..." : "Select a carrier"} />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((carrier) => (
                    <SelectItem key={carrier.id} value={carrier.carrier_name}>
                      {carrier.carrier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State Name</label>
              <Select value={stateName} onValueChange={setStateName} disabled={loadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? "Loading states..." : "Select a state"} />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.state_name}>
                      {state.state_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={searchEligibleAgents} disabled={loading || loadingOptions} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search for Eligible Agents
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {eligibleAgents.length > 0
                ? `${eligibleAgents.length} agent(s) found for ${carrierName} in ${stateName}`
                : `No agents found for ${carrierName} in ${stateName}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eligibleAgents.length === 0 ? (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  No agents are currently licensed to sell <strong>{carrierName}</strong> in{' '}
                  <strong>{stateName}</strong>. Please check your spelling or try a different
                  carrier/state combination.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {eligibleAgents.map((agent) => (
                  <div
                    key={agent.agent_user_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{agent.agent_name || 'Unnamed Agent'}</p>
                        {agent.agent_code && (
                          <p className="text-sm text-muted-foreground">Code: {agent.agent_code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Carrier
                      </Badge>
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        State
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
