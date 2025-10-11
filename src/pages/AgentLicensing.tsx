import { NavigationHeader } from '@/components/NavigationHeader';
import EligibleAgentFinder from '@/components/EligibleAgentFinder';

export default function AgentLicensing() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Find Eligible Agents" />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Find Eligible Agents</h1>
          <p className="text-muted-foreground mt-2">
            Search for agents licensed to sell a specific carrier in a specific state
          </p>
        </div>

        <EligibleAgentFinder />
      </div>
    </div>
  );
}
