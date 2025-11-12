import { NavigationHeader } from '@/components/NavigationHeader';
import EligibleAgentFinder from '@/components/EligibleAgentFinder';
import AetnaStateAvailabilityManager from '@/components/AetnaStateAvailabilityManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MapPin } from 'lucide-react';

export default function AgentLicensing() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Agent Licensing & Eligibility" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Agent Licensing & Eligibility</h1>
          <p className="text-muted-foreground mt-2">
            Manage agent licenses and search for eligible agents by carrier and state
          </p>
        </div>

        <Tabs defaultValue="find-agents" className="space-y-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="find-agents" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Find Eligible Agents
            </TabsTrigger>
            <TabsTrigger value="aetna-states" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Aetna States
            </TabsTrigger>
          </TabsList>

          <TabsContent value="find-agents">
            <EligibleAgentFinder />
          </TabsContent>

          <TabsContent value="aetna-states">
            <AetnaStateAvailabilityManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
