import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, UserCircle, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Agent {
  user_id: string;
  display_name: string;
  agent_code: string | null;
  email: string;
}

interface AflacStateAvailability {
  state_name: string;
  state_code: string;
  is_available: boolean;
}

const ALL_STATES = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'District of Columbia', code: 'DC' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Guam', code: 'GU' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Puerto Rico', code: 'PR' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virgin Islands', code: 'VI' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' }
];

export default function AflacStateAvailabilityManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingLicense, setCheckingLicense] = useState(false);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [hasAflacLicense, setHasAflacLicense] = useState(false);
  const [stateAvailability, setStateAvailability] = useState<Map<string, boolean>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      checkAflacLicense(selectedAgentId);
      fetchAflacStateAvailability(selectedAgentId);
    }
  }, [selectedAgentId]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      // Fetch only licensed agents from agent_status
      const { data: licensedAgents, error: statusError } = await supabase
        .from('agent_status')
        .select('user_id')
        .eq('agent_type', 'licensed');

      if (statusError) throw statusError;

      const licensedUserIds = licensedAgents?.map(a => a.user_id) || [];

      if (licensedUserIds.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for licensed agents only
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, agent_code')
        .in('user_id', licensedUserIds)
        .order('display_name');

      if (profilesError) throw profilesError;

      // Map profiles to agent format (using display_name as email fallback for UI)
      const agentsWithEmail = profilesData?.map(profile => ({
        ...profile,
        email: profile.display_name || 'N/A'
      })) || [];

      setAgents(agentsWithEmail);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agents.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkAflacLicense = async (agentUserId: string) => {
    setCheckingLicense(true);
    try {
      const { data, error } = await supabase
        .from('agent_carrier_licenses')
        .select('is_licensed, carriers!inner(carrier_name)')
        .eq('agent_user_id', agentUserId)
        .eq('carriers.carrier_name', 'Aflac')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setHasAflacLicense(data?.is_licensed || false);
    } catch (error) {
      console.error('Error checking Aflac license:', error);
      setHasAflacLicense(false);
    } finally {
      setCheckingLicense(false);
    }
  };

  const fetchAflacStateAvailability = async (agentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('aflac_agent_state_availability' as any)
        .select('state_name, state_code, is_available')
        .eq('agent_user_id', agentUserId);

      if (error) throw error;

      const availabilityMap = new Map<string, boolean>();
      data?.forEach((item: any) => {
        availabilityMap.set(item.state_name, item.is_available);
      });
      setStateAvailability(availabilityMap);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching Aflac state availability:', error);
      setStateAvailability(new Map());
    }
  };

  const toggleStateAvailability = (stateName: string) => {
    const newMap = new Map(stateAvailability);
    const currentValue = newMap.get(stateName) || false;
    newMap.set(stateName, !currentValue);
    setStateAvailability(newMap);
    setHasChanges(true);
  };

  const selectAllStates = (value: boolean) => {
    const newMap = new Map<string, boolean>();
    ALL_STATES.forEach(state => {
      newMap.set(state.name, value);
    });
    setStateAvailability(newMap);
    setHasChanges(true);
  };

  const enableAflacLicense = async () => {
    if (!selectedAgentId) return;
    
    setSaving(true);
    try {
      // Get Aflac carrier ID
      const { data: carrierData, error: carrierError } = await supabase
        .from('carriers')
        .select('id')
        .eq('carrier_name', 'Aflac')
        .single();

      if (carrierError) throw carrierError;

      // Insert or update Aflac carrier license
      const { error } = await supabase
        .from('agent_carrier_licenses')
        .upsert({
          agent_user_id: selectedAgentId,
          carrier_id: carrierData.id,
          is_licensed: true
        }, {
          onConflict: 'agent_user_id,carrier_id'
        });

      if (error) throw error;

      setHasAflacLicense(true);
      toast({
        title: 'Success',
        description: 'Aflac carrier license enabled.',
      });
    } catch (error) {
      console.error('Error enabling Aflac license:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable Aflac license.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = async () => {
    if (!selectedAgentId || !hasAflacLicense) {
      toast({
        title: 'Error',
        description: 'Agent must have Aflac carrier license first.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      // Prepare all state availability records
      const records = ALL_STATES.map(state => ({
        agent_user_id: selectedAgentId,
        state_name: state.name,
        state_code: state.code,
        is_available: stateAvailability.get(state.name) || false,
        requires_upline_license: true,
        notes: `Updated via UI on ${new Date().toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })}`,
        effective_date: new Date().toISOString().split('T')[0]
      }));

      // Batch upsert all records
      const { error } = await supabase
        .from('aflac_agent_state_availability' as any)
        .upsert(records, {
          onConflict: 'agent_user_id,state_name'
        });

      if (error) throw error;

      setHasChanges(false);
      toast({
        title: 'Success',
        description: `Aflac state availability updated for all ${ALL_STATES.length} states.`,
      });

      // Refresh data
      await fetchAflacStateAvailability(selectedAgentId);
    } catch (error) {
      console.error('Error saving state availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getAvailableCount = () => {
    return Array.from(stateAvailability.values()).filter(v => v).length;
  };

  const getSelectedAgent = () => {
    return agents.find(a => a.user_id === selectedAgentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const selectedAgent = getSelectedAgent();
  const availableCount = getAvailableCount();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            Aflac State Availability Manager
          </CardTitle>
          <CardDescription>
            Manage agent-specific state availability for Aflac carrier (requires upline licensing for all 52 states)
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
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{selectedAgent.display_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAgent.email}</p>
                  {selectedAgent.agent_code && (
                    <p className="text-xs text-muted-foreground">Code: {selectedAgent.agent_code}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  {checkingLicense ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking...
                    </Badge>
                  ) : hasAflacLicense ? (
                    <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Aflac Licensed
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      No Aflac License
                    </Badge>
                  )}
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {availableCount} / {ALL_STATES.length} Available
                  </Badge>
                </div>
              </div>

              {/* License Warning */}
              {!hasAflacLicense && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <div className="flex items-center justify-between">
                      <span>This agent needs an Aflac carrier license before state availability can be configured.</span>
                      <Button 
                        size="sm" 
                        onClick={enableAflacLicense}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Enabling...
                          </>
                        ) : (
                          'Enable Aflac License'
                        )}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Aflac Info Alert */}
              <Alert className="bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  <strong>Important:</strong> Aflac uses a separate state availability system. All states require upline license verification. Each agent can have custom YES/NO settings per state.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* State Management */}
      {selectedAgentId && hasAflacLicense && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>State Availability</CardTitle>
                <CardDescription>
                  Select states where {selectedAgent?.display_name} can receive Aflac leads
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAllStates(true)}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAllStates(false)}>
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ALL_STATES.map((state) => (
                  <div
                    key={state.code}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleStateAvailability(state.name)}
                  >
                    <Checkbox
                      checked={stateAvailability.get(state.name) || false}
                      onCheckedChange={() => toggleStateAvailability(state.name)}
                    />
                    <label className="flex-1 cursor-pointer text-sm">
                      {state.code} - {state.name}
                    </label>
                    {stateAvailability.get(state.name) && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

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
                    Save Aflac State Availability
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
