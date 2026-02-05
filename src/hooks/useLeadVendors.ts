import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeadVendor {
  id: string;
  name: string;
  did: string | null;
  is_active: boolean;
}

interface UseLeadVendorsReturn {
  vendors: LeadVendor[];
  vendorNames: string[];
  didMapping: Record<string, string>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLeadVendors(): UseLeadVendorsReturn {
  const [vendors, setVendors] = useState<LeadVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('lead_vendors' as any)
        .select('id, name, did, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (supabaseError) {
        throw supabaseError;
      }

      setVendors(((data as unknown) as LeadVendor[]) || []);
    } catch (err) {
      console.error('Error fetching lead vendors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Extract just the names for dropdown options
  const vendorNames = vendors.map(v => v.name);

  // Create DID mapping for GI - Currently DQ transfers
  const didMapping = vendors.reduce((acc, vendor) => {
    if (vendor.did) {
      acc[vendor.name] = vendor.did;
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    vendors,
    vendorNames,
    didMapping,
    loading,
    error,
    refetch: fetchVendors
  };
}
