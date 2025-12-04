import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, Phone, Loader2, AlertCircle } from 'lucide-react';
import { NavigationHeader } from '@/components/NavigationHeader';

const LAReadyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [notificationData, setNotificationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentProfile, setAgentProfile] = useState<any>(null);

  const submissionId = searchParams.get('submissionId');
  const sessionId = searchParams.get('sessionId');
  const notificationId = searchParams.get('notificationId');

  useEffect(() => {
    if (!authLoading && !user) {
      // Store return URL for after login
      const returnUrl = window.location.pathname + window.location.search;
      navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (user) {
      fetchAgentProfile();
      fetchData();
    }
  }, [user, authLoading, submissionId, sessionId]);

  const fetchAgentProfile = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setAgentProfile(profile);
    }
  };

  const fetchData = async () => {
    if (!submissionId) {
      setError('Missing submission ID');
      return;
    }

    try {
      // Fetch verification session
      if (sessionId) {
        const { data: session, error: sessionError } = await supabase
          .from('verification_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          console.error('Error fetching session:', sessionError);
        } else {
          setSessionData(session);
        }
      }

      // Fetch lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('submission_id', submissionId)
        .single();

      if (leadError) {
        console.error('Error fetching lead:', leadError);
        setError('Failed to fetch lead data');
        return;
      }

      setLeadData(lead);

      // Fetch notification if ID provided
      if (notificationId) {
        const { data: notification } = await supabase
          .from('retention_call_notifications')
          .select('*')
          .eq('id', notificationId)
          .single();

        if (notification) {
          setNotificationData(notification);
        }
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError('Failed to load data');
    }
  };

  const handleConfirmReady = async () => {
    if (!user || !submissionId) return;

    setIsProcessing(true);

    try {
      const licensedAgentName = agentProfile?.display_name || 'Licensed Agent';

      // Call the edge function to notify the buffer agent
      const { data, error: fnError } = await supabase.functions.invoke('retention-call-notification', {
        body: {
          type: 'la_ready',
          submissionId,
          verificationSessionId: sessionId,
          bufferAgentId: sessionData?.buffer_agent_id || notificationData?.buffer_agent_id,
          bufferAgentName: notificationData?.buffer_agent_name || 'Buffer Agent',
          licensedAgentId: user.id,
          licensedAgentName,
          customerName: leadData?.customer_full_name || 'Customer',
          leadVendor: leadData?.lead_vendor,
          notificationId
        }
      });

      if (fnError) {
        console.error('Error sending notification:', fnError);
        toast({
          title: "Error",
          description: "Failed to send notification. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update verification session to indicate LA is ready
      if (sessionId) {
        await supabase
          .from('verification_sessions')
          .update({
            licensed_agent_id: user.id,
            status: 'ready_for_transfer',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      }

      setIsComplete(true);

      toast({
        title: "Success!",
        description: "The buffer agent has been notified that you're ready.",
      });

      // Redirect to the call result update page after a short delay
      setTimeout(() => {
        navigate(`/call-result-update?submissionId=${submissionId}`);
      }, 2000);

    } catch (err) {
      console.error('Error in handleConfirmReady:', err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader title="LA Ready" />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="LA Ready - Retention Call" />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {isComplete ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <Phone className="h-16 w-16 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isComplete ? 'Notification Sent!' : 'Retention Call Ready'}
            </CardTitle>
            <CardDescription>
              {isComplete 
                ? 'The buffer agent has been notified that you\'re ready to take the call.'
                : 'Confirm that you\'re ready to receive the transfer from the buffer agent.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Customer Info */}
            {leadData && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Customer</span>
                </div>
                <p className="font-semibold text-lg">{leadData.customer_full_name || 'N/A'}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                  <div>
                    <span className="text-xs text-muted-foreground">Lead Vendor</span>
                    <p className="text-sm font-medium">{leadData.lead_vendor || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">State</span>
                    <p className="text-sm font-medium">{leadData.state || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Carrier</span>
                    <p className="text-sm font-medium">{leadData.carrier || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Phone</span>
                    <p className="text-sm font-medium">{leadData.phone_number || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Buffer Agent Info */}
            {notificationData && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <span className="text-xs text-blue-600 font-medium">Buffer Agent on Call</span>
                <p className="font-semibold text-blue-900">{notificationData.buffer_agent_name || 'Buffer Agent'}</p>
              </div>
            )}

            {/* Action Buttons */}
            {!isComplete && (
              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleConfirmReady}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Notifying Buffer Agent...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      I'm Ready - Notify Buffer Agent
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/dashboard')}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            )}

            {isComplete && (
              <div className="text-center text-sm text-muted-foreground">
                Redirecting to call result page...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LAReadyPage;
