import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { AppFixBankingForm } from "./AppFixBankingForm";
import { AppFixCarrierForm } from "./AppFixCarrierForm";

interface AppFixTaskTypeSelectorProps {
  submissionId: string;
  customerName?: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    fixType?: string;
    bankAccountOwner?: string;
    bankInstitutionName?: string;
    routingNumber?: string;
    accountNumber?: string;
    accountType?: string;
    newDraftDate?: Date;
    policyStatus?: string;
  };
}

export const AppFixTaskTypeSelector = ({
  submissionId,
  customerName,
  onClose,
  onSuccess,
  initialData
}: AppFixTaskTypeSelectorProps) => {
  const [taskType, setTaskType] = useState<string>(initialData?.fixType || "");

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">App Fix - Select Task Type</CardTitle>
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
            <div className="bg-blue-100 border border-blue-200 rounded-md p-3">
              <p className="text-sm font-medium text-blue-900">
                Submission ID: {submissionId}
              </p>
              {customerName && (
                <p className="text-sm text-blue-700 mt-1">
                  Customer: {customerName}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="taskType" className="text-base font-semibold">
                Select Fix Type <span className="text-red-500">*</span>
              </Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose the type of fix needed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banking_info">Banking Info</SelectItem>
                  <SelectItem value="carrier_requirement">Carrier Requirement</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Select the appropriate fix type to continue
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditional Form Rendering */}
      {taskType === "banking_info" && (
        <AppFixBankingForm
          submissionId={submissionId}
          customerName={customerName}
          onClose={onClose}
          onSuccess={onSuccess}
          initialData={initialData}
        />
      )}

      {taskType === "carrier_requirement" && (
        <AppFixCarrierForm
          submissionId={submissionId}
          customerName={customerName}
          onClose={onClose}
          onSuccess={onSuccess}
          initialData={initialData}
        />
      )}
    </div>
  );
};
