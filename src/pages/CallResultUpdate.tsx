import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LeadInfoCard } from "@/components/LeadInfoCard";
import { DetailedLeadInfoCard } from "@/components/DetailedLeadInfoCard";
import { CallResultForm } from "@/components/CallResultForm";
import { StartVerificationModal } from "@/components/StartVerificationModal";
import { VerificationPanel } from "@/components/VerificationPanel";
import { Loader2, ArrowLeft } from "lucide-react";
import { TopVerificationProgress } from "@/components/TopVerificationProgress";
import { useAuth } from "@/hooks/useAuth";

interface Lead {
  id: string;
  submission_id: string;
  customer_full_name: string;
  phone_number: string;
  email: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  date_of_birth: string;
  age: number;
  birth_state?: string;
  social_security: string;
  driver_license?: string;
  existing_coverage?: string;
  previous_applications?: string;
  height?: string;
  weight?: string;
  doctors_name?: string;
  tobacco_use?: string;
  health_conditions: string;
  medications?: string;
  carrier: string;
  product_type: string;
  coverage_amount: number;
  monthly_premium: number;
  draft_date: string;
  future_draft_date?: string;
  beneficiary_information?: string;
  institution_name?: string;
  beneficiary_routing: string;
  beneficiary_account: string;
  account_type?: string;
  additional_notes: string;
  lead_vendor?: string;
}

// Global tracking to prevent duplicate notifications across re-renders
const laReadyInProgress = new Map<string, Promise<void>>();

const CallResultUpdate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const submissionId = searchParams.get("submissionId");
  const formId = searchParams.get("formId");
  const fromCallback = searchParams.get("fromCallback");
  const sessionIdFromUrl = searchParams.get("sessionId");
  const notificationIdFromUrl = searchParams.get("notificationId");
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const laReadyTriggeredRef = useRef(false);

  const { toast } = useToast();

  // Handle LA Ready flow - when LA clicks the button from Slack and lands here
  useEffect(() => {
    const triggerLAReadyNotification = async () => {
      console.log('[LA Ready FLOW] Effect triggered with:', {
        notificationIdFromUrl,
        hasUser: !!user,
        refTriggered: laReadyTriggeredRef.current,
        timestamp: new Date().toISOString()
      });

      // Only trigger if we have notificationId (coming from Slack LA-Ready button)
      // and haven't triggered yet
      if (!notificationIdFromUrl || !user) {
        console.log('[LA Ready FLOW] Exiting early:', {
          noNotificationId: !notificationIdFromUrl,
          noUser: !user
        });
        return;
      }

      // Create a unique key for this notification attempt
      const notificationKey = `${notificationIdFromUrl}-${user.id}`;

      // Check if this notification is already being processed
      if (laReadyInProgress.has(notificationKey)) {
        console.log('[LA Ready FLOW] Already in progress, waiting for existing promise...');
        await laReadyInProgress.get(notificationKey);
        return;
      }

      // Also check the ref guard
      if (laReadyTriggeredRef.current) {
        console.log('[LA Ready FLOW] Ref already triggered, skipping');
        return;
      }

      laReadyTriggeredRef.current = true;
      console.log('[LA Ready FLOW] Setting ref to true, proceeding with notification');

      // Create a promise for this notification and store it
      const notificationPromise = (async () => {
        try {
          // Get the LA's profile for their name
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();

          const licensedAgentName = profile?.display_name || 'Licensed Agent';
          console.log('[LA Ready FLOW] Got LA profile:', licensedAgentName);

          // Get the notification to find buffer agent info
          const { data: notification, error: notifError } = await supabase
            .from('retention_call_notifications')
            .select('*')
            .eq('id', notificationIdFromUrl)
            .single();

          if (notifError || !notification) {
            console.error('[LA Ready FLOW] Notification not found:', notifError);
            return;
          }

          console.log('[LA Ready FLOW] Found original notification:', {
            id: notification.id,
            bufferAgent: notification.buffer_agent_name,
            sessionId: notification.verification_session_id
          });

          const sessionId = sessionIdFromUrl || notification.verification_session_id;

          // Check if an la_ready notification already exists for this session, submission, and LA within the last 60 seconds
          const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
          console.log('[LA Ready FLOW] Checking for duplicates since:', sixtySecondsAgo);
          
          const { data: recentNotifications, error: checkError } = await supabase
            .from('retention_call_notifications')
            .select('id, created_at')
            .eq('verification_session_id', sessionId)
            .eq('submission_id', submissionId)
            .eq('licensed_agent_id', user.id)
            .eq('notification_type', 'la_ready')
            .gte('created_at', sixtySecondsAgo)
            .order('created_at', { ascending: false });

          console.log('[LA Ready FLOW] Duplicate check result:', {
            found: recentNotifications?.length || 0,
            notifications: recentNotifications
          });

          if (recentNotifications && recentNotifications.length > 0) {
            console.log('[LA Ready FLOW] DUPLICATE DETECTED - Skipping notification creation');
            toast({
              title: "Already Notified",
              description: "The buffer agent has already been notified.",
            });
            return;
          }

          console.log('[LA Ready FLOW] No duplicates found, calling edge function...');

          // Call the edge function to notify the buffer agent
          const { data: fnResult, error: fnError } = await supabase.functions.invoke('retention-call-notification', {
            body: {
              type: 'la_ready',
              submissionId,
              verificationSessionId: sessionId,
              bufferAgentId: notification.buffer_agent_id,
              bufferAgentName: notification.buffer_agent_name,
              licensedAgentId: user.id,
              licensedAgentName,
              customerName: notification.customer_name,
              leadVendor: notification.lead_vendor,
              notificationId: notificationIdFromUrl
            }
          });

          if (fnError) {
            console.error('[LA Ready FLOW] Edge function error:', fnError);
          } else {
            console.log('[LA Ready FLOW] Edge function success:', fnResult);
            toast({
              title: "Buffer Agent Notified",
              description: "The buffer agent has been notified that you're ready to take the call.",
            });
          }

          // Update verification session if we have one
          if (sessionIdFromUrl) {
            console.log('[LA Ready FLOW] Updating verification session status...');
            await supabase
              .from('verification_sessions')
              .update({
                licensed_agent_id: user.id,
                status: 'ready_for_transfer',
                updated_at: new Date().toISOString()
              })
              .eq('id', sessionIdFromUrl);
          }
        } catch (err) {
          console.error('[LA Ready FLOW] Exception:', err);
        } finally {
          // Clean up the promise from the map after completion
          laReadyInProgress.delete(notificationKey);
        }
      })();

      // Store the promise
      laReadyInProgress.set(notificationKey, notificationPromise);

      // Wait for it to complete
      await notificationPromise;
    };

    triggerLAReadyNotification();
  }, [notificationIdFromUrl, user, submissionId, sessionIdFromUrl, toast]);

  useEffect(() => {
    if (!submissionId) {
      toast({
        title: "Error",
        description: "No submission ID provided",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    fetchLead();
    
    // If sessionId is passed in URL (from LA Ready flow), use it directly
    if (sessionIdFromUrl) {
      setVerificationSessionId(sessionIdFromUrl);
      setShowVerificationPanel(true);
    } else {
      checkExistingVerificationSession();
    }
  }, [submissionId, sessionIdFromUrl]);

  const checkExistingVerificationSession = async () => {
    try {
      const { data: session, error } = await supabase
        .from('verification_sessions')
        .select('id, status')
        .eq('submission_id', submissionId)
        .in('status', ['pending', 'in_progress', 'ready_for_transfer', 'transferred', 'completed'])
        .single();

      if (session && !error) {
        setVerificationSessionId(session.id);
        setShowVerificationPanel(true);
      }
    } catch (error) {
      // No existing session found, which is fine
    }
  };

  const handleVerificationStarted = (sessionId: string) => {
    setVerificationSessionId(sessionId);
    setShowVerificationPanel(true);
  };

  const handleTransferReady = () => {
    toast({
      title: "Verification Complete",
      description: "Lead is now ready for Licensed Agent review",
    });
  };

  const processLeadFromJotForm = async () => {
    setProcessing(true);
    try {
      // Get center from the URL search params
      const center = searchParams.get("center");
      const response = await supabase.functions.invoke('process-lead', {
        body: { submissionId, formId, center }
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Success",
        description: "Lead data fetched from JotForm and saved to database",
      });

      return response.data;
    } catch (error) {
      console.error("Error processing lead from JotForm:", error);
      toast({
        title: "Error",
        description: "Failed to fetch lead data from JotForm",
        variant: "destructive",
      });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const fetchLead = async () => {
    try {
      // Trim the submission ID
      const trimmedSubmissionId = submissionId ? submissionId.trim() : "";
      
      if (!trimmedSubmissionId) {
        toast({
          title: "Error",
          description: "Invalid submission ID",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Direct query - fetch lead by submission ID only
      const { data: directLead, error: directError } = await supabase
        .from("leads")
        .select("*")
        .eq("submission_id", trimmedSubmissionId)
        .single();

      if (directError) {
        console.error("Error fetching lead:", directError);
        toast({
          title: "Lead Not Found",
          description: `Could not find lead with submission ID: ${trimmedSubmissionId}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (directLead) {
        setLead(directLead);
        setLoading(false);
        return;
      }

      // If no lead found
      toast({
        title: "Lead Not Found",
        description: `No lead found with submission ID: ${trimmedSubmissionId}`,
        variant: "destructive",
      });
      setLoading(false);

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading lead information...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Lead Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              The submission ID "{submissionId}" was not found in our records.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 w-full">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold whitespace-nowrap">
              {fromCallback ? "Update Callback Result" : "Update Call Result"}
            </h1>
            <p className="text-muted-foreground mt-1 truncate">
              {fromCallback 
                ? "Update the status and details for this callback" 
                : "Update the status and details for this lead"
              }
            </p>
          </div>
          {/* Top right: show StartVerificationModal if no session, else show progress bar */}
          {!showVerificationPanel || !verificationSessionId ? (
            <div className="flex-shrink-0">
              <StartVerificationModal 
                submissionId={submissionId!}
                onVerificationStarted={handleVerificationStarted}
              />
            </div>
          ) : (
            <div className="w-[420px] max-w-[50vw]">
              <TopVerificationProgress submissionId={submissionId!} verificationSessionId={verificationSessionId} />
            </div>
          )}
        </div>

        {showVerificationPanel && verificationSessionId ? (
          <>
            {/* Main Content - 50/50 Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Verification Panel - Left Half */}
              <div>
                <VerificationPanel 
                  sessionId={verificationSessionId}
                  onTransferReady={handleTransferReady}
                />
              </div>
              
              {/* Call Result Form - Right Half */}
              <div>
                <CallResultForm 
                  submissionId={submissionId!} 
                  customerName={lead.customer_full_name}
                  onSuccess={() => navigate(`/call-result-journey?submissionId=${submissionId}`)}
                />
              </div>
            </div>
            
            {/* Additional Notes - Bottom Collapsible */}
            <DetailedLeadInfoCard lead={lead} />
          </>
        ) : (
          /* Original layout when no verification panel */
          <>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Lead Details */}
              <div className="space-y-6">
                <DetailedLeadInfoCard lead={lead} />
              </div>
              
              {/* Call Result Form */}
              <div>
                <CallResultForm 
                  submissionId={submissionId!} 
                  customerName={lead.customer_full_name}
                  onSuccess={() => navigate(`/call-result-journey?submissionId=${submissionId}`)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CallResultUpdate;