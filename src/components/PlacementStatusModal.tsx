import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const placementStatusOptions = [
  "Good Standing",
  "Not Placed",
  "Pending Failed Payment Fix",
  "FDPF Pending Reason",
  "FDPF Insufficient Funds",
  "FDPF Incorrect Banking Info",
  "FDPF Unauthorized Draft"
];

interface PlacementStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string | null;
  leadName: string;
  onSave: (newStatus: string) => Promise<void>;
}

export const PlacementStatusModal = ({
  open,
  onOpenChange,
  currentStatus,
  leadName,
  onSave,
}: PlacementStatusModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedStatus) return;

    setIsLoading(true);
    try {
      await onSave(selectedStatus);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving placement status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Placement Status</DialogTitle>
          <DialogDescription>
            Update the placement status for <span className="font-semibold">{leadName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="placement-status">Placement Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="placement-status">
                <SelectValue placeholder="Select placement status" />
              </SelectTrigger>
              <SelectContent>
                {placementStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedStatus || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
