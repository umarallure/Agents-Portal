import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColoredProgress } from "@/components/ui/colored-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock, User, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useRealtimeVerification, VerificationItem } from "@/hooks/useRealtimeVerification";

interface VerificationPanelProps {
  sessionId: string;
  onTransferReady?: () => void;
}

export const VerificationPanel = ({ sessionId, onTransferReady }: VerificationPanelProps) => {
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [notes, setNotes] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  
  const {
    session,
    verificationItems,
    loading,
    error,
    toggleVerification,
    updateVerifiedValue,
    updateVerificationNotes,
    updateSessionStatus,
    refetch,
  } = useRealtimeVerification(sessionId);

  useEffect(() => {
    // Update elapsed time every second
    const interval = setInterval(() => {
      if (session?.started_at) {
        const start = new Date(session.started_at);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.started_at]);

  // Initialize input values when verification items change
  useEffect(() => {
    if (verificationItems) {
      const newInputValues: Record<string, string> = {};
      verificationItems.forEach(item => {
        if (!inputValues[item.id]) {
          newInputValues[item.id] = item.verified_value || item.original_value || '';
        }
      });
      setInputValues(prev => ({ ...prev, ...newInputValues }));
    }
  }, [verificationItems]);

  // Add early returns for loading and error states AFTER all hooks
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading verification data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-red-500">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-gray-500">
            No verification session found
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleFieldValueChange = (itemId: string, newValue: string) => {
    // Update local state immediately for smooth UI
    setInputValues(prev => ({
      ...prev,
      [itemId]: newValue
    }));
    
    // Debounce the database update
    setTimeout(() => {
      updateVerifiedValue(itemId, newValue);
    }, 500);
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    toggleVerification(itemId, checked);
  };

  const handleTransferToLA = async () => {
    await updateSessionStatus('transferred');
    onTransferReady?.();
  };

  // Calculate real-time progress percentage
  const calculateProgress = () => {
    if (!verificationItems || verificationItems.length === 0) return 0;
    const verifiedCount = verificationItems.filter(item => item.is_verified).length;
    return Math.round((verifiedCount / verificationItems.length) * 100);
  };

  const currentProgress = calculateProgress();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'ready_for_transfer': return 'bg-green-500';
      case 'completed': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const getFieldIcon = (item: VerificationItem) => {
    if (!item.is_verified) return <XCircle className="h-4 w-4 text-gray-400" />;
    if (item.is_modified) return <CheckCircle className="h-4 w-4 text-blue-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const groupedItems = (verificationItems || []).reduce((acc, item) => {
    const category = item.field_category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, VerificationItem[]>);

  const formatFieldName = (fieldName: string) => {
    return fieldName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading verification panel...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Verification session not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Verification Panel</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              onClick={refetch} 
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              Refresh
            </Button>
            <Badge className={getStatusBadgeColor(session.status)}>
              {session.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
        
        {/* Session Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Agent: {session.buffer_agent_id || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Time: {elapsedTime}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className={`font-semibold ${
              currentProgress >= 76 ? 'text-green-600' :
              currentProgress >= 51 ? 'text-yellow-600' :
              currentProgress >= 26 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {currentProgress}%
            </span>
          </div>
          <div className="relative">
            <ColoredProgress 
              value={currentProgress} 
              className="h-3 transition-all duration-500"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {verificationItems.filter(item => item.is_verified).length} of {verificationItems.length} fields verified
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              currentProgress >= 76 ? 'bg-green-100 text-green-800' :
              currentProgress >= 51 ? 'bg-yellow-100 text-yellow-800' :
              currentProgress >= 26 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
            }`}>
              {currentProgress >= 76 ? 'Ready for Transfer' :
               currentProgress >= 51 ? 'Nearly Complete' :
               currentProgress >= 26 ? 'In Progress' : 'Just Started'}
            </span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '500px' }}>
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category}>
            <h4 className="font-semibold text-sm mb-2 capitalize">
              {category.replace('_', ' ')} Information
            </h4>
            <div className="space-y-3">
              {categoryItems.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getFieldIcon(item)}
                    <Label className="text-xs font-medium">
                      {formatFieldName(item.field_name)}
                    </Label>
                    <Checkbox
                      checked={item.is_verified}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange(item.id, checked as boolean)
                      }
                      className="ml-auto"
                    />
                  </div>
                  <Input
                    value={inputValues[item.id] || ''}
                    onChange={(e) => handleFieldValueChange(item.id, e.target.value)}
                    placeholder={`Enter ${formatFieldName(item.field_name).toLowerCase()}`}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
            <Separator className="mt-4" />
          </div>
        ))}

        {/* Notes Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes about the verification..."
            className="text-xs"
            rows={3}
          />
        </div>
      </CardContent>

      {/* Footer */}
      <div className="p-4 border-t flex-shrink-0">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {session.verified_fields} of {session.total_fields} fields verified ({session.progress_percentage}%)
          </p>
          {session.status === 'transferred' ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {session.licensed_agent_id ? 'Claimed by LA' : 'Transferred to LA'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {session.licensed_agent_id ? 'LA is working on verification' : 'LA can claim this transfer'}
              </span>
            </div>
          ) : session.licensed_agent_id ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Claimed by LA
              </Badge>
              <span className="text-sm text-muted-foreground">
                LA is working on verification
              </span>
            </div>
          ) : session.status === 'completed' ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                Verification Complete
              </Badge>
              <span className="text-sm text-muted-foreground">
                Call result has been saved
              </span>
            </div>
          ) : (
            <Button 
              onClick={handleTransferToLA} 
              className="flex items-center gap-2"
              variant={session.progress_percentage === 100 ? "default" : "outline"}
            >
              <ArrowRight className="h-4 w-4" />
              Transfer to LA
              {session.progress_percentage < 100 && (
                <span className="text-xs ml-1">({session.progress_percentage}% verified)</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
