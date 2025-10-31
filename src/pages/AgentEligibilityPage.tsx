import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavigationHeader } from '@/components/NavigationHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, MapPin, Building2, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Carrier = Database['public']['Tables']['carriers']['Row'];
type State = Database['public']['Tables']['states']['Row'];
type AgentCarrierLicense = Database['public']['Tables']['agent_carrier_licenses']['Row'];
type AgentStateLicense = Database['public']['Tables']['agent_state_licenses']['Row'];

interface AgentProfile {
  id: string;
  email: string;
  display_name: string | null;
  agent_code: string | null;
}

export function AgentEligibilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Agent selection
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);

  // Carriers data
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [agentCarrierLicenses, setAgentCarrierLicenses] = useState<AgentCarrierLicense[]>([]);
  const [carrierChanges, setCarrierChanges] = useState<Map<string, boolean>>(new Map());

  // States data
  const [states, setStates] = useState<State[]>([]);
  const [agentStateLicenses, setAgentStateLicenses] = useState<AgentStateLicense[]>([]);
  const [stateChanges, setStateChanges] = useState<Map<string, boolean>>(new Map());

  // Loading states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(true);

  // Fetch all licensed agents
  useEffect(() => {
    fetchAgents();
  }, []);

  // Fetch agent-specific data when agent is selected
  useEffect(() => {
    if (selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId);
      setSelectedAgent(agent || null);
      fetchAgentEligibility(selectedAgentId);
    } else {
      setSelectedAgent(null);
      setAgentCarrierLicenses([]);
      setAgentStateLicenses([]);
      setCarrierChanges(new Map());
      setStateChanges(new Map());
    }
  }, [selectedAgentId, agents]);

  // Fetch carriers and states on component mount
  useEffect(() => {
    fetchCarriersAndStates();
  }, []);

  const fetchAgents = async () => {
    setAgentsLoading(true);
    try {
      // Fetch agents who have license records (either carrier or state licenses)
      const { data: carrierLicenses, error: carrierError } = await supabase
        .from('agent_carrier_licenses')
        .select('agent_user_id');

      if (carrierError) throw carrierError;

      const { data: stateLicenses, error: stateError } = await supabase
        .from('agent_state_licenses')
        .select('agent_user_id');

      if (stateError) throw stateError;

      // Get unique user IDs from both license tables
      const allUserIds = new Set<string>();
      carrierLicenses?.forEach(l => l.agent_user_id && allUserIds.add(l.agent_user_id));
      stateLicenses?.forEach(l => l.agent_user_id && allUserIds.add(l.agent_user_id));

      // Also include the specific user ID you mentioned
      allUserIds.add('d68d18e4-9deb-4282-b4d0-1e6e6a0789e9');

      const userIds = Array.from(allUserIds);

      console.log('User IDs with licenses:', userIds);

      if (userIds.length === 0) {
        console.warn('No licensed agents found');
        setAgents([]);
        setAgentsLoading(false);
        return;
      }

      // Fetch profiles for these agents
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, agent_code')
        .in('user_id', userIds)
        .order('display_name');

      if (profilesError) throw profilesError;

      console.log('Profiles fetched:', profiles);

      // Create agent profiles
      const agentProfiles: AgentProfile[] = (profiles || []).map(profile => ({
        id: profile.user_id!,
        email: profile.user_id!, // Using user_id as fallback since email is not available in profiles
        display_name: profile.display_name,
        agent_code: profile.agent_code
      }));

      console.log('Agent profiles created:', agentProfiles);

      setAgents(agentProfiles);
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: `Failed to fetch agents: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setAgentsLoading(false);
    }
  };

  const fetchCarriersAndStates = async () => {
    try {
      // Fetch carriers
      const { data: carriersData, error: carriersError } = await supabase
        .from('carriers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('carrier_name', { ascending: true });

      if (carriersError) throw carriersError;
      setCarriers(carriersData || []);

      // Fetch states
      const { data: statesData, error: statesError } = await supabase
        .from('states')
        .select('*')
        .eq('is_active', true)
        .order('state_name', { ascending: true });

      if (statesError) throw statesError;
      setStates(statesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch carriers and states: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const fetchAgentEligibility = async (agentUserId: string) => {
    setLoading(true);
    try {
      // Fetch carrier licenses
      const { data: carrierLicenses, error: carrierError } = await supabase
        .from('agent_carrier_licenses')
        .select('*')
        .eq('agent_user_id', agentUserId);

      if (carrierError) throw carrierError;
      setAgentCarrierLicenses(carrierLicenses || []);

      // Fetch state licenses
      const { data: stateLicenses, error: stateError } = await supabase
        .from('agent_state_licenses')
        .select('*')
        .eq('agent_user_id', agentUserId);

      if (stateError) throw stateError;
      setAgentStateLicenses(stateLicenses || []);

      // Reset changes
      setCarrierChanges(new Map());
      setStateChanges(new Map());
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch agent eligibility: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isCarrierLicensed = (carrierId: string): boolean => {
    // Check if there's a pending change
    if (carrierChanges.has(carrierId)) {
      return carrierChanges.get(carrierId)!;
    }
    // Check existing license
    const license = agentCarrierLicenses.find(l => l.carrier_id === carrierId);
    return license?.is_licensed ?? false;
  };

  const isStateLicensed = (stateId: string): boolean => {
    // Check if there's a pending change
    if (stateChanges.has(stateId)) {
      return stateChanges.get(stateId)!;
    }
    // Check existing license
    const license = agentStateLicenses.find(l => l.state_id === stateId);
    return license?.is_licensed ?? false;
  };

  const handleCarrierToggle = (carrierId: string, checked: boolean) => {
    const newChanges = new Map(carrierChanges);
    newChanges.set(carrierId, checked);
    setCarrierChanges(newChanges);
  };

  const handleStateToggle = (stateId: string, checked: boolean) => {
    const newChanges = new Map(stateChanges);
    newChanges.set(stateId, checked);
    setStateChanges(newChanges);
  };

  const saveCarrierChanges = async () => {
    if (!selectedAgentId || carrierChanges.size === 0) return;

    setSaving(true);
    try {
      const updates = Array.from(carrierChanges.entries()).map(async ([carrierId, isLicensed]) => {
        const existingLicense = agentCarrierLicenses.find(l => l.carrier_id === carrierId);

        if (existingLicense) {
          // Update existing record
          return supabase
            .from('agent_carrier_licenses')
            .update({ is_licensed: isLicensed, updated_at: new Date().toISOString() })
            .eq('id', existingLicense.id);
        } else {
          // Insert new record
          return supabase
            .from('agent_carrier_licenses')
            .insert({
              agent_user_id: selectedAgentId,
              carrier_id: carrierId,
              is_licensed: isLicensed
            });
        }
      });

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Failed to save ${errors.length} carrier license(s)`);
      }

      toast({
        title: "Success",
        description: `Updated ${carrierChanges.size} carrier license(s)`,
      });

      // Refresh data
      await fetchAgentEligibility(selectedAgentId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save carrier licenses: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveStateChanges = async () => {
    if (!selectedAgentId || stateChanges.size === 0) return;

    setSaving(true);
    try {
      const updates = Array.from(stateChanges.entries()).map(async ([stateId, isLicensed]) => {
        const existingLicense = agentStateLicenses.find(l => l.state_id === stateId);

        if (existingLicense) {
          // Update existing record
          return supabase
            .from('agent_state_licenses')
            .update({ is_licensed: isLicensed, updated_at: new Date().toISOString() })
            .eq('id', existingLicense.id);
        } else {
          // Insert new record
          return supabase
            .from('agent_state_licenses')
            .insert({
              agent_user_id: selectedAgentId,
              state_id: stateId,
              is_licensed: isLicensed
            });
        }
      });

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Failed to save ${errors.length} state license(s)`);
      }

      toast({
        title: "Success",
        description: `Updated ${stateChanges.size} state license(s)`,
      });

      // Refresh data
      await fetchAgentEligibility(selectedAgentId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save state licenses: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCarrierStats = () => {
    const licensed = agentCarrierLicenses.filter(l => l.is_licensed).length;
    return { licensed, total: carriers.length };
  };

  const getStateStats = () => {
    const licensed = agentStateLicenses.filter(l => l.is_licensed).length;
    return { licensed, total: states.length };
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Agent Eligibility Management" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Agent Eligibility Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage carrier and state licensing eligibility for licensed agents
            </p>
          </div>

          {/* Agent Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Select Licensed Agent
              </CardTitle>
              <CardDescription>
                Choose an agent to manage their carrier and state eligibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  value={selectedAgentId}
                  onValueChange={setSelectedAgentId}
                  disabled={agentsLoading}
                >
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Select an agent..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.display_name || 'Unknown'} {agent.agent_code ? `(${agent.agent_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedAgent && (
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">{selectedAgent.display_name || 'Unknown Agent'}</p>
                      <p className="text-sm text-muted-foreground">Agent Code: {selectedAgent.agent_code || 'N/A'}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchAgentEligibility(selectedAgentId)}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Eligibility Management */}
          {selectedAgentId && !loading && (
            <Tabs defaultValue="carriers" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="carriers" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Carriers ({getCarrierStats().licensed}/{getCarrierStats().total})
                </TabsTrigger>
                <TabsTrigger value="states" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  States ({getStateStats().licensed}/{getStateStats().total})
                </TabsTrigger>
              </TabsList>

              {/* Carriers Tab */}
              <TabsContent value="carriers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Carrier Eligibility
                        </CardTitle>
                        <CardDescription>
                          Select which carriers this agent is licensed to sell
                        </CardDescription>
                      </div>
                      <Button
                        onClick={saveCarrierChanges}
                        disabled={carrierChanges.size === 0 || saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes {carrierChanges.size > 0 && `(${carrierChanges.size})`}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {carriers.map(carrier => {
                        const isLicensed = isCarrierLicensed(carrier.id);
                        const hasChange = carrierChanges.has(carrier.id);
                        
                        return (
                          <div
                            key={carrier.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border ${
                              hasChange ? 'bg-blue-50 border-blue-200' : 'bg-background'
                            } hover:bg-accent transition-colors`}
                          >
                            <Checkbox
                              id={`carrier-${carrier.id}`}
                              checked={isLicensed}
                              onCheckedChange={(checked) => 
                                handleCarrierToggle(carrier.id, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={`carrier-${carrier.id}`}
                              className="flex-1 text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {carrier.carrier_name}
                              {hasChange && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Modified
                                </Badge>
                              )}
                            </label>
                            {isLicensed && !hasChange && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* States Tab */}
              <TabsContent value="states" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          State Eligibility
                        </CardTitle>
                        <CardDescription>
                          Select which states this agent is licensed to operate in
                        </CardDescription>
                      </div>
                      <Button
                        onClick={saveStateChanges}
                        disabled={stateChanges.size === 0 || saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes {stateChanges.size > 0 && `(${stateChanges.size})`}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {states.map(state => {
                        const isLicensed = isStateLicensed(state.id);
                        const hasChange = stateChanges.has(state.id);
                        
                        return (
                          <div
                            key={state.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border ${
                              hasChange ? 'bg-blue-50 border-blue-200' : 'bg-background'
                            } hover:bg-accent transition-colors`}
                          >
                            <Checkbox
                              id={`state-${state.id}`}
                              checked={isLicensed}
                              onCheckedChange={(checked) => 
                                handleStateToggle(state.id, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={`state-${state.id}`}
                              className="flex-1 text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {state.state_name}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({state.state_code})
                              </span>
                              {hasChange && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Modified
                                </Badge>
                              )}
                            </label>
                            {isLicensed && !hasChange && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Loading State */}
          {selectedAgentId && loading && (
            <Card>
              <CardContent className="p-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading agent eligibility...</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!selectedAgentId && !agentsLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Agent Selected</h3>
                <p className="text-muted-foreground">
                  Select a licensed agent above to manage their carrier and state eligibility
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
