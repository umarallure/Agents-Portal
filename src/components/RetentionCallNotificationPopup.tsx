import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Phone, User, X } from 'lucide-react';

interface RetentionNotification {
  id: string;
  verification_session_id: string;
  submission_id: string;
  buffer_agent_id: string;
  buffer_agent_name: string;
  licensed_agent_id: string;
  licensed_agent_name: string;
  customer_name: string;
  lead_vendor: string;
  notification_type: 'buffer_connected' | 'la_ready' | 'transfer_initiated';
  status: 'pending' | 'seen' | 'acknowledged' | 'expired';
  la_ready_at: string | null;
  created_at: string;
}

const RetentionCallNotificationPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<RetentionNotification | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchPendingNotifications = useCallback(async () => {
    if (!user) return;

    // Fetch pending la_ready notifications for the current user (as buffer agent)
    // Only show notifications that haven't been acknowledged yet
    const { data, error } = await supabase
      .from('retention_call_notifications')
      .select('*')
      .eq('buffer_agent_id', user.id)
      .eq('notification_type', 'la_ready')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    if (data && data.length > 0) {
      setNotification(data[0] as RetentionNotification);
      setIsOpen(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchPendingNotifications();

    // Subscribe to real-time updates for new notifications
    const channel = supabase
      .channel('retention-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'retention_call_notifications',
          filter: `buffer_agent_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New retention notification:', payload);
          const newNotification = payload.new as RetentionNotification;
          
          // Only show popup for la_ready notifications with pending status
          if (newNotification.notification_type === 'la_ready' && newNotification.status === 'pending') {
            setNotification(newNotification);
            setIsOpen(true);

            // Play notification sound
            try {
              const audio = new Audio('/notification-sound.mp3');
              audio.play().catch(() => {
                // Ignore audio play errors (user may not have interacted with page yet)
              });
            } catch (e) {
              // Audio not available
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPendingNotifications]);

  const handleAcknowledge = async () => {
    if (!notification) return;

    // Mark as acknowledged (dismissed) so it never shows again
    await supabase
      .from('retention_call_notifications')
      .update({ 
        status: 'acknowledged', 
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    setIsOpen(false);
    setNotification(null);
  };

  const handleGoToCall = async () => {
    if (!notification) return;

    // Mark as acknowledged before navigating
    await supabase
      .from('retention_call_notifications')
      .update({ 
        status: 'acknowledged', 
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    setIsOpen(false);
    setNotification(null);
    navigate(`/call-result-update?submissionId=${notification.submission_id}`);
  };

  const handleDismiss = async () => {
    await handleAcknowledge();
  };

  if (!notification) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleDismiss();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Licensed Agent is Ready!
          </DialogTitle>
          <DialogDescription className="text-center">
            A licensed agent is ready to take the call from you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* LA Info */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <User className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Licensed Agent</span>
            </div>
            <p className="text-lg font-bold text-green-900">
              {notification.licensed_agent_name || 'Licensed Agent'}
            </p>
          </div>

          {/* Customer Info */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Customer</span>
            </div>
            <p className="text-center font-semibold">
              {notification.customer_name || 'Customer'}
            </p>
            {notification.lead_vendor && (
              <p className="text-center text-sm text-muted-foreground mt-1">
                {notification.lead_vendor}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleGoToCall}
            >
              <Phone className="h-4 w-4 mr-2" />
              Go to Call Details
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RetentionCallNotificationPopup;
