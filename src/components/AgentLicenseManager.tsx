import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, UserCircle, Building2, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Agent {
  user_id: string;
  display_name: string;
  agent_code: string | null;
  email: string;
}

interface Carrier {
  id: string;
  carrier_name: string;
  is_active: boolean;
}

interface State {
  id: string;
  state_name: string;
  state_code: string;
  is_active: boolean;
}

interface CarrierLicense {
  id: string;
  carrier_id: string;
  is_licensed: boolean;
}

interface StateLicense {
  id: string;
  state_id: string;
  is_licensed: boolean;
}

export default function AgentLicenseManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [agents, setAgents] = useState<Agent[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  
  // License states
  const [carrierLicenses, setCarrierLicenses] = useState<Map<string, boolean>>(new Map());
  const [stateLicenses, setStateLicenses] = useState<Map<string, boolean>>(new Map());
  
  // Track changes
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentLicenses(selectedAgentId);
    }
  }, [selectedAgentId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch all agents
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, agent_code')
        .order('display_name');

      if (profilesError) throw profilesError;

      // Get emails from auth.users
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) throw usersError;

      const agentsWithEmail = profilesData?.map(profile => {
        const user = users?.find(u => u.id === profile.user_id);
        return {
          ...profile,
          email: user?.email || 'N/A'
        };
      }) || [];

      setAgents(agentsWithEmail);

      // Fetch carriers
      const { data: carriersData, error: carriersError } = await supabase
        .from('carriers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (carriersError) throw carriersError;
      setCarriers(carriersData || []);

      // Fetch states
      const { data: statesData, error: statesError } = await supabase
        .from('states')
        .select('*')
        .eq('is_active', true)
        .order('state_name');

      if (statesError) throw statesError;
      setStates(statesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data. Please refresh the page.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentLicenses = async (agentUserId: string) => {
    try {
      // Fetch carrier licenses
      const { data: carrierLicensesData, error: carrierError } = await supabase
        .from('agent_carrier_licenses')
        .select('*')
        .eq('agent_user_id', agentUserId);

      if (carrierError) throw carrierError;

      const carrierMap = new Map<string, boolean>();
      carrierLicensesData?.forEach(license => {
        carrierMap.set(license.carrier_id, license.is_licensed);
      });
      setCarrierLicenses(carrierMap);

      // Fetch state licenses
      const { data: stateLicensesData, error: stateError } = await supabase
        .from('agent_state_licenses')
        .select('*')
        .eq('agent_user_id', agentUserId);

      if (stateError) throw stateError;

      const stateMap = new Map<string, boolean>();
      stateLicensesData?.forEach(license => {
        stateMap.set(license.state_id, license.is_licensed);
      });
      setStateLicenses(stateMap);

      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching licenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agent licenses.',
        variant: 'destructive'
      });
    }
  };

  const toggleCarrierLicense = (carrierId: string) => {
    const newMap = new Map(carrierLicenses);
    const currentValue = newMap.get(carrierId) || false;
    newMap.set(carrierId, !currentValue);
    setCarrierLicenses(newMap);
    setHasChanges(true);
  };

  const toggleStateLicense = (stateId: string) => {
    const newMap = new Map(stateLicenses);
    const currentValue = newMap.get(stateId) || false;
    newMap.set(stateId, !currentValue);
    setStateLicenses(newMap);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    if (!selectedAgentId) {
      toast({
        title: 'Error',
        description: 'Please select an agent first.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Save carrier licenses
      for (const [carrierId, isLicensed] of carrierLicenses.entries()) {
        const { error } = await supabase
          .from('agent_carrier_licenses')
          .upsert({
            agent_user_id: selectedAgentId,
            carrier_id: carrierId,
            is_licensed: isLicensed
          }, {
            onConflict: 'agent_user_id,carrier_id'
          });

        if (error) throw error;
      }

      // Save state licenses
      for (const [stateId, isLicensed] of stateLicenses.entries()) {
        const { error } = await supabase
          .from('agent_state_licenses')
          .upsert({
            agent_user_id: selectedAgentId,
            state_id: stateId,
            is_licensed: isLicensed
          }, {
            onConflict: 'agent_user_id,state_id'
          });

        if (error) throw error;
      }

      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Agent licenses updated successfully.',
      });
    } catch (error) {
      console.error('Error saving licenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const selectAllCarriers = (value: boolean) => {
    const newMap = new Map<string, boolean>();
    carriers.forEach(carrier => {
      newMap.set(carrier.id, value);
    });
    setCarrierLicenses(newMap);
    setHasChanges(true);
  };

  const selectAllStates = (value: boolean) => {
    const newMap = new Map<string, boolean>();
    states.forEach(state => {
      newMap.set(state.id, value);
    });
    setStateLicenses(newMap);
    setHasChanges(true);
  };

  const getSelectedAgent = () => {
    return agents.find(a => a.user_id === selectedAgentId);
  };

  const getLicensedCount = () => {
    const carrierCount = Array.from(carrierLicenses.values()).filter(v => v).length;
    const stateCount = Array.from(stateLicenses.values()).filter(v => v).length;
    return { carriers: carrierCount, states: stateCount };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const selectedAgent = getSelectedAgent();
  const counts = getLicensedCount();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Agent License Manager
          </CardTitle>
          <CardDescription>
            Manage carrier and state licenses for each agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agent Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Agent</label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.user_id} value={agent.user_id}>
                    {agent.display_name || 'Unnamed Agent'} ({agent.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Info */}
          {selectedAgent && (
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{selectedAgent.display_name}</p>
                <p className="text-sm text-muted-foreground">{selectedAgent.email}</p>
                {selectedAgent.agent_code && (
                  <p className="text-xs text-muted-foreground">Code: {selectedAgent.agent_code}</p>
                )}
              </div>
              <div className="flex gap-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {counts.carriers} / {carriers.length} Carriers
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {counts.states} / {states.length} States
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Management */}
      {selectedAgentId && (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="carriers">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="carriers">
                  <Building2 className="h-4 w-4 mr-2" />
                  Carrier Licenses
                </TabsTrigger>
                <TabsTrigger value="states">
                  <MapPin className="h-4 w-4 mr-2" />
                  State Licenses
                </TabsTrigger>
              </TabsList>

              {/* Carriers Tab */}
              <TabsContent value="carriers" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Select carriers this agent can sell
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => selectAllCarriers(true)}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => selectAllCarriers(false)}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {carriers.map((carrier) => (
                      <div
                        key={carrier.id}
                        className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleCarrierLicense(carrier.id)}
                      >
                        <Checkbox
                          checked={carrierLicenses.get(carrier.id) || false}
                          onCheckedChange={() => toggleCarrierLicense(carrier.id)}
                        />
                        <label className="flex-1 cursor-pointer">
                          {carrier.carrier_name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* States Tab */}
              <TabsContent value="states" className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Select states where this agent is licensed
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => selectAllStates(true)}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => selectAllStates(false)}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {states.map((state) => (
                      <div
                        key={state.id}
                        className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleStateLicense(state.id)}
                      >
                        <Checkbox
                          checked={stateLicenses.get(state.id) || false}
                          onCheckedChange={() => toggleStateLicense(state.id)}
                        />
                        <label className="flex-1 cursor-pointer text-sm">
                          {state.state_code} - {state.state_name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                onClick={saveChanges}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
