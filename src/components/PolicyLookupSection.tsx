import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Phone, Calendar, DollarSign, FileText, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Monday.com column mapping for board 18027763264 (Deal Tracker New)
const MONDAY_COLUMN_MAP: Record<string, string> = {
  text_mkw44vx: "GHL Name",
  text_mkwjexhw: "GHL Stage",
  status: "Policy Status",
  date1: "Deal creation date",
  text_mkpx3j6w: "Policy Number",
  color_mknkq2qd: "Carrier",
  numbers: "Deal Value",
  numeric_mkw47t5d: "CC Value",
  text_mknk5m2r: "Notes",
  color_mkp5sj20: "Status",
  pulse_updated_mknkqf59: "Last updated",
  color_mkq0rkaw: "Sales Agent",
  text_mkwwrq3b: "Writing #",
  text_mkq196kp: "Commission Type",
  date_mkq1d86z: "Effective Date",
  dropdown_mkq2x0kx: "Call Center",
  text_mkq268v3: "Phone Number",
  date_mkw9tyc9: "CC PMT WS",
  date_mkw94jj0: "CC CB WS",
  text_mkw9mq04: "Carrier Status",
  text_mkxdrsg2: "Policy Type",
};

interface DealFlowResult {
  id: string;
  submission_id: string;
  insured_name: string | null;
  client_phone_number: string | null;
  lead_vendor: string | null;
  status: string | null;
  buffer_agent: string | null;
  agent: string | null;
  licensed_agent_account: string | null;
  carrier: string | null;
  product_type: string | null;
  monthly_premium: number | null;
  face_amount: number | null;
  draft_date: string | null;
  call_result: string | null;
  policy_number: string | null;
  notes: string | null;
  date: string | null;
}

interface MondayColumnValue {
  id: string;
  text: string;
  type: string;
}

interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

interface PolicyLookupSectionProps {
  submissionId?: string;
}

/**
 * PolicyLookupSection Component
 * 
 * Displays Daily Deal Flow and Monday.com policy information with search functionality.
 * Can be initialized with a submissionId for auto-search or used as standalone search.
 */
export function PolicyLookupSection({ submissionId }: PolicyLookupSectionProps) {
  const [searchMode, setSearchMode] = useState<'phone' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [dealFlowResults, setDealFlowResults] = useState<DealFlowResult[]>([]);
  const [mondayPolicyInfo, setMondayPolicyInfo] = useState<Record<string, MondayItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [mondayLoading, setMondayLoading] = useState<Record<string, boolean>>({});
  const [searchPerformed, setSearchPerformed] = useState(false);
  const { toast } = useToast();

  // Name normalization utilities
  const normalizeNameForSearch = (inputName: string): string[] => {
    const trimmed = inputName.trim();
    if (!trimmed) return [];

    const nameParts = trimmed.split(/\s+/);
    const variations: string[] = [];

    if (nameParts.length === 1) {
      variations.push(trimmed.toLowerCase());
    } else if (nameParts.length === 2) {
      const [first, last] = nameParts;
      variations.push(`${first} ${last}`.toLowerCase());
      variations.push(`${last}, ${first}`.toLowerCase());
      variations.push(`${last},${first}`.toLowerCase());
      variations.push(`${last} ${first}`.toLowerCase());
      variations.push(`${last.toUpperCase()}, ${first.toUpperCase()}`);
      variations.push(`${last.toUpperCase()},${first.toUpperCase()}`);
      const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      variations.push(`${capitalizeFirst(last)}, ${capitalizeFirst(first)}`);
    } else if (nameParts.length >= 3) {
      const first = nameParts[0];
      const middle = nameParts.slice(1, -1).join(' ');
      const last = nameParts[nameParts.length - 1];
      variations.push(`${first} ${middle} ${last}`.toLowerCase());
      variations.push(`${last}, ${first} ${middle}`.toLowerCase());
      variations.push(`${last}, ${first}`.toLowerCase());
      variations.push(`${first} ${last}`.toLowerCase());
      variations.push(`${last.toUpperCase()}, ${first.toUpperCase()}`);
    }

    variations.push(trimmed.toLowerCase());
    variations.push(trimmed.toUpperCase());
    variations.push(trimmed);

    return [...new Set(variations)];
  };

  const normalizePhoneNumber = (phoneNumber: string): string[] => {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    const formats = [];
    
    if (digitsOnly.length === 10) {
      formats.push(`(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`);
    }
    
    formats.push(digitsOnly);
    
    if (digitsOnly.length === 10) {
      formats.push(`1${digitsOnly}`);
    }
    
    formats.push(phoneNumber);
    
    return [...new Set(formats)];
  };

  // Main search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchMode === 'phone' && !phone) {
      toast({
        title: "Phone Required",
        description: "Please enter a phone number.",
        variant: "destructive",
      });
      return;
    }
    
    if (searchMode === 'name' && !name) {
      toast({
        title: "Name Required",
        description: "Please enter a name.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearchPerformed(true);
    setDealFlowResults([]);

    try {
      if (searchMode === 'phone') {
        const phoneFormats = normalizePhoneNumber(phone);
        const { data, error } = await supabase
          .from('daily_deal_flow')
          .select('*')
          .in('client_phone_number', phoneFormats)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDealFlowResults(data || []);
      } else {
        // Name search
        const { data: allRecords, error } = await supabase
          .from('daily_deal_flow')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const nameVariations = normalizeNameForSearch(name);
        const matchedRecords = (allRecords || []).filter(record => {
          if (!record.insured_name) return false;
          const recordNameLower = record.insured_name.toLowerCase();
          return nameVariations.some(variation => 
            recordNameLower.includes(variation.toLowerCase()) || 
            variation.toLowerCase().includes(recordNameLower)
          );
        });

        setDealFlowResults(matchedRecords);
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: "Search Error",
        description: "Failed to search records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Monday.com policy info
  const fetchMondayPolicyInfo = async (phoneNumber: string | null, resultId: string) => {
    if (!phoneNumber) {
      toast({
        title: "No Phone Number",
        description: "Cannot fetch Monday.com info without a phone number",
        variant: "destructive",
      });
      return;
    }

    // Normalize phone: remove all non-digits and prepend "1"
    const normalizedPhone = `1${phoneNumber.replace(/\D/g, '')}`;
    console.log(`[PolicyLookup] Normalized phone from "${phoneNumber}" to "${normalizedPhone}"`);

    setMondayLoading(prev => ({ ...prev, [resultId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("get-monday-policy-info", {
        body: { phone: normalizedPhone },
      });

      if (error) throw error;

      if (data?.items && data.items.length > 0) {
        setMondayPolicyInfo(prev => ({ ...prev, [resultId]: data.items }));
      } else {
        setMondayPolicyInfo(prev => ({ ...prev, [resultId]: [] }));
        toast({
          title: "No Monday.com Data",
          description: "No policy information found in Monday.com",
        });
      }
    } catch (error) {
      console.error("Error fetching Monday.com data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch Monday.com policy information",
        variant: "destructive",
      });
    } finally {
      setMondayLoading(prev => ({ ...prev, [resultId]: false }));
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <FileText className="h-5 w-5" />
          Policy Information Lookup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="search-section" className="border-0">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search by Phone or Name
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Search Mode Toggle */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Search By</Label>
                  <RadioGroup value={searchMode} onValueChange={(value: 'phone' | 'name') => setSearchMode(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="phone-search" />
                      <Label htmlFor="phone-search" className="cursor-pointer flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="name" id="name-search" />
                      <Label htmlFor="name-search" className="cursor-pointer flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Client Name
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Search Form */}
                <form onSubmit={handleSearch} className="space-y-4">
                  {searchMode === 'phone' ? (
                    <div className="space-y-2">
                      <Label htmlFor="phoneInput">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phoneInput"
                          type="tel"
                          placeholder="(555) 123-4567 or 5551234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Accepts any format: (555) 123-4567, 555-123-4567, or 5551234567
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="nameInput">Client Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nameInput"
                          type="text"
                          placeholder="Julia Jordan or JORDAN, JULIA"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Works with multiple formats: "First Last", "LAST, FIRST", or "Last First"
                      </p>
                    </div>
                  )}
                  
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search {searchMode === 'phone' ? 'by Phone' : 'by Name'}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Results */}
        {searchPerformed && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Searching records...</p>
              </div>
            ) : dealFlowResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Found {dealFlowResults.length} Record(s)</h3>
                </div>
                
                {dealFlowResults.map((result) => (
                  <Card key={result.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{result.insured_name || 'N/A'}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {result.date ? new Date(result.date).toLocaleDateString() : 'N/A'}
                        </span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Submission ID: {result.submission_id}
                      </p>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Two Column Layout: Deal Flow | Monday.com */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left: Deal Flow Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center gap-2 pb-2 border-b">
                            <Building2 className="h-4 w-4" />
                            Daily Deal Flow Information
                          </h4>
                          
                          {/* Compact Grid Layout */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Phone</p>
                              <p className="font-medium">{result.client_phone_number || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Lead Vendor</p>
                              <p className="font-medium">{result.lead_vendor || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium inline-block",
                                  result.status === "Pending Approval" && "bg-yellow-100 text-yellow-800",
                                  result.status === "Submitted" && "bg-green-100 text-green-800"
                                )}
                              >
                                {result.status || "N/A"}
                              </span>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Buffer Agent</p>
                              <p className="font-medium">{result.buffer_agent || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Agent</p>
                              <p className="font-medium">{result.agent || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Licensed Account</p>
                              <p className="font-medium">{result.licensed_agent_account || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Carrier</p>
                              <p className="font-medium">{result.carrier || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Product Type</p>
                              <p className="font-medium">{result.product_type || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Monthly Premium</p>
                              <p className="font-medium">
                                {result.monthly_premium ? `$${result.monthly_premium.toFixed(2)}` : "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Face Amount</p>
                              <p className="font-medium">
                                {result.face_amount ? `$${result.face_amount.toLocaleString()}` : "N/A"}
                              </p>
                            </div>
                            {result.draft_date && (
                              <div>
                                <p className="text-muted-foreground">Draft Date</p>
                                <p className="font-medium">
                                  {new Date(result.draft_date).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            {result.policy_number && (
                              <div>
                                <p className="text-muted-foreground">Policy Number</p>
                                <p className="font-medium">{result.policy_number}</p>
                              </div>
                            )}
                          </div>

                          {/* Notes - Full Width Below */}
                          {result.notes && (
                            <div className="pt-2 border-t">
                              <p className="text-xs font-medium mb-1">Notes:</p>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted p-2 rounded">
                                {result.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Right: Monday.com Policy Info */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Monday.com Policy Info
                            </h4>
                            {!mondayPolicyInfo[result.id] && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchMondayPolicyInfo(result.client_phone_number, result.id)}
                                disabled={mondayLoading[result.id]}
                              >
                                {mondayLoading[result.id] ? "Loading..." : "Load"}
                              </Button>
                            )}
                          </div>

                          {mondayLoading[result.id] ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                              <p className="ml-3 text-sm">Loading policy info...</p>
                            </div>
                          ) : mondayPolicyInfo[result.id] && mondayPolicyInfo[result.id].length > 0 ? (
                            <div className="space-y-3">
                              {mondayPolicyInfo[result.id].map((item, idx) => (
                                <div key={item.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                                  <h5 className="font-semibold text-xs mb-2 pb-2 border-b">
                                    Policy {idx + 1}: {item.name}
                                  </h5>
                                  <div className="space-y-2 text-xs">
                                    {item.column_values
                                      .filter((col) => MONDAY_COLUMN_MAP[col.id] && col.text)
                                      .map((col) => (
                                        <div key={col.id} className="flex justify-between gap-2">
                                          <span className="text-muted-foreground">
                                            {MONDAY_COLUMN_MAP[col.id]}:
                                          </span>
                                          <span className="font-medium text-right">{col.text}</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : mondayPolicyInfo[result.id] !== undefined ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No Monday.com policy information found.
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              Click "Load" to fetch Monday.com policy information.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <Search className="h-16 w-16 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium">No Results Found</h3>
                      <p className="text-muted-foreground mt-1">
                        No records found for your search.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Try searching with different formats or check your spelling.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
