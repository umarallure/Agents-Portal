import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X } from "lucide-react";

interface AppFixCarrierFormProps {
  submissionId: string;
  customerName?: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // Placeholder for future use if needed
}

const licensedAgentOptions = [
  "Claudia",
  "Lydia",
  "Isaac",
  "Abdul",
  "Trinity",
  "Benjamin",
  "Tatumn",
  "Noah",
  "Zack"
];

const carrierOptions = [
  "Liberty",
  "SBLI",
  "Corebridge",
  "MOH",
  "Transamerica",
  "RNA",
  "AMAM",
  "GTL",
  "Aetna",
  "Americo",
  "CICA"
];

const requirementTypeOptions = [
  "Medical Records",
  "Lab Results",
  "APS (Attending Physician Statement)",
  "Phone Interview",
  "Additional Documentation",
  "Other"
];

export const AppFixCarrierForm = ({
  submissionId,
  customerName,
  onClose,
  onSuccess,
  initialData
}: AppFixCarrierFormProps) => {
  const [loading, setLoading] = useState(false);
  const [assignedTo, setAssignedTo] = useState("Lydia"); // Default to Lydia
  const [carrier, setCarrier] = useState("");
  const [requirementType, setRequirementType] = useState("");
  const [requirementDetails, setRequirementDetails] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const { toast } = useToast();

  const handleSubmit = async () => {
    // Validation
    if (!assignedTo || !carrier || !requirementType || !requirementDetails) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get user's display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const creatorName = profile?.display_name || 'Unknown';

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('app_fix_tasks')
        .insert({
          submission_id: submissionId,
          customer_name: customerName,
          fix_type: 'carrier_requirement',
          status: 'pending',
          created_by: user.id,
          created_by_name: creatorName,
          assigned_to_name: assignedTo,
          notes: `Carrier: ${carrier} | Requirement: ${requirementType} | Details: ${requirementDetails}${additionalNotes ? ` | Notes: ${additionalNotes}` : ''}`
        })
        .select()
        .single();

      if (taskError) {
        throw taskError;
      }

      // Create carrier requirement details in a separate table
      const { error: carrierError } = await supabase
        .from('app_fix_carrier_requirements')
        .insert({
          task_id: task.id,
          submission_id: submissionId,
          carrier: carrier,
          requirement_type: requirementType,
          requirement_details: requirementDetails,
          additional_notes: additionalNotes
        });

      if (carrierError) {
        throw carrierError;
      }

      toast({
        title: "Success",
        description: `Carrier requirement task created and assigned to ${assignedTo}`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error creating carrier requirement task:", error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Carrier Requirement Details</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-orange-100 border border-orange-200 rounded-md p-3">
            <p className="text-sm font-medium text-orange-900">
              Submission ID: {submissionId}
            </p>
            {customerName && (
              <p className="text-sm text-orange-700 mt-1">
                Customer: {customerName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Carrier */}
            <div>
              <Label htmlFor="carrier">
                Carrier <span className="text-red-500">*</span>
              </Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {carrierOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Requirement Type */}
            <div>
              <Label htmlFor="requirementType">
                Requirement Type <span className="text-red-500">*</span>
              </Label>
              <Select value={requirementType} onValueChange={setRequirementType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select requirement type" />
                </SelectTrigger>
                <SelectContent>
                  {requirementTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Requirement Details */}
            <div className="md:col-span-2">
              <Label htmlFor="requirementDetails">
                Requirement Details <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="requirementDetails"
                value={requirementDetails}
                onChange={(e) => setRequirementDetails(e.target.value)}
                placeholder="Describe what is needed to fulfill this carrier requirement..."
                rows={3}
              />
            </div>

            {/* Assigned To */}
            <div className="md:col-span-2">
              <Label htmlFor="assignedTo">
                Assign To (Licensed Agent) <span className="text-red-500">*</span>
              </Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select licensed agent" />
                </SelectTrigger>
                <SelectContent>
                  {licensedAgentOptions.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {agent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Additional Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Enter any additional notes or instructions..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Task...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
