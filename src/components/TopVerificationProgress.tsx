import { useEffect, useState } from "react";
import { VerificationProgressBar } from "@/components/VerificationProgressBar";
import { supabase } from "@/integrations/supabase/client";

interface TopVerificationProgressProps {
  submissionId: string;
  verificationSessionId: string;
}

export const TopVerificationProgress = ({ submissionId, verificationSessionId }: TopVerificationProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const fetchProgress = async () => {
      const { data: items, error } = await supabase
        .from("verification_items")
        .select("is_verified")
        .eq("session_id", verificationSessionId);
      if (items && Array.isArray(items)) {
        const total = items.length;
        const verified = items.filter((item: any) => item.is_verified).length;
        setTotalCount(total);
        setVerifiedCount(verified);
        setProgress(total > 0 ? Math.round((verified / total) * 100) : 0);
      }
    };
    if (verificationSessionId) {
      fetchProgress();
      intervalId = setInterval(fetchProgress, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [verificationSessionId]);

  return (
    <VerificationProgressBar progress={progress} verifiedCount={verifiedCount} totalCount={totalCount} />
  );
};
