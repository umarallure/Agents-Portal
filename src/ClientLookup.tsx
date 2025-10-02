import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/dashboard/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useQuery } from '@tanstack/react-query';
import { leadService } from '@/services/api';
import { ClientLookupResult } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GhlNote {
  id: string;
  body: string;
  dateAdded: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface MondayColumnValue {
  id: string;
  text: string | null;
  value: string | null;
}

interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

const MONDAY_COLUMN_MAP: Record<string, string> = {
  "status": "Stage",
  "date1": "Deal creation date",
  "text_mkpx3j6w": "Policy Number",
  "color_mknkq2qd": "Carrier",
  "numbers": "Deal Value",
  "text_mknk5m2r": "Notes",
  "color_mkp5sj20": "Status",
  "pulse_updated_mknkqf59": "Last updated",
  "color_mkq0rkaw": "Sales Agent",
  "text_mkq196kp": "Policy Type",
  "date_mkq1d86z": "Effective Date",
  "dropdown_mkq2x0kx": "Call Center",
  "long_text_mksd6zg1": "Deal Summary",
};

export default function ClientLookupPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [center, setCenter] = useState('');
  const [results, setResults] = useState<ClientLookupResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  const [notes, setNotes] = useState<Record<string, GhlNote[]>>({});
  const [notesLoading, setNotesLoading] = useState<Record<string, boolean>>({});

  const [policyInfo, setPolicyInfo] = useState<Record<string, MondayItem[]>>({});
  const [policyInfoLoading, setPolicyInfoLoading] = useState<Record<string, boolean>>({});

  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: ['uniqueCenters'],
    queryFn: leadService.getUniqueCenters,
  });

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !center) {
      toast.error('Please enter a phone number and select a center.');
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);
    setResults([]);
    setNotes({});
    setNotesLoading({});
    setPolicyInfo({});
    setPolicyInfoLoading({});

    try {
      const data = await leadService.lookupClient(phone, center);
      setResults(data);
    } catch (error) {
      toast.error('An error occurred while searching.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchNotes = async (policyNumber: string | null, searchCenter: string) => {
    if (!policyNumber || notes[policyNumber]) return;
    const contactId = policyNumber.split('-')[0];

    setNotesLoading(prev => ({ ...prev, [policyNumber]: true }));
    try {
      const data = await leadService.getGhlNotes(contactId, searchCenter);
      setNotes(prev => ({ ...prev, [policyNumber]: data.notes || [] }));
    } catch (error: any) {
      toast.error(`Failed to fetch notes: ${error.message}`);
    } finally {
      setNotesLoading(prev => ({ ...prev, [policyNumber]: false }));
    }
  };

  const handleFetchPolicyInfo = async (clientPhone: string, resultIdentifier: string) => {
    if (!clientPhone || policyInfo[resultIdentifier]) return;

    setPolicyInfoLoading(prev => ({ ...prev, [resultIdentifier]: true }));
    try {
      const data = await leadService.getMondayPolicyInfo(clientPhone);
      setPolicyInfo(prev => ({ ...prev, [resultIdentifier]: data.items || [] }));
    } catch (error: any) {
      toast.error(`Failed to fetch policy info: ${error.message}`);
    } finally {
      setPolicyInfoLoading(prev => ({ ...prev, [resultIdentifier]: false }));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Client Details Lookup</h1>
            <p className="text-muted-foreground mt-2">
              Instantly retrieve client policy details from the database.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search Client</CardTitle>
              <CardDescription>Enter a phone number and select a call center to find client information.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="grid sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="center">Call Center</Label>
                  <Select value={center} onValueChange={setCenter}>
                    <SelectTrigger id="center">
                      <SelectValue placeholder="Select a center" />
                    </SelectTrigger>
                    <SelectContent>
                      {centersLoading ? (
                        <SelectItem value="loading" disabled>Loading centers...</SelectItem>
                      ) : (
                        centers.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {searchPerformed && (
            <div className="mt-8">
              {isLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle>{result.clientName}</CardTitle>
                        <CardDescription>Policy Number: {result.policyNumber || 'N/A'}</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Carrier</p>
                          <p className="font-medium">{result.carrier || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Monthly Premium</p>
                          <p className="font-medium">{result.monthlyPremium ? `$${result.monthlyPremium.toFixed(2)}` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Coverage Amount</p>
                          <p className="font-medium">{result.coverageAmount ? `$${result.coverageAmount.toLocaleString()}` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Draft Date</p>
                          <p className="font-medium">{result.draftDate ? new Date(result.draftDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col sm:flex-row gap-2">
                        {result.policyNumber && (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value={`notes-${result.policyNumber}`}>
                              <AccordionTrigger
                                className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')}
                                onClick={() => handleFetchNotes(result.policyNumber, center)}
                              >
                                <span>{notesLoading[result.policyNumber] ? 'Fetching...' : 'View GHL Notes'}</span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4">
                                {notesLoading[result.policyNumber] ? <p>Loading notes...</p> :
                                  notes[result.policyNumber] ? (
                                    notes[result.policyNumber].length > 0 ? (
                                      <ul className="list-disc space-y-2 pl-5 text-sm">
                                        {notes[result.policyNumber].map(note => (
                                          <li key={note.id}>
                                            <p className="font-medium">{note.body}</p>
                                            <p className="text-xs text-muted-foreground">
                                              by {note.user ? `${note.user.firstName} ${note.user.lastName}` : 'System'} on {new Date(note.dateAdded).toLocaleString()}
                                            </p>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : <p className="text-sm text-muted-foreground">No notes found.</p>
                                  ) : <p className="text-sm text-muted-foreground">Click to load notes.</p>
                                }
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value={`policy-info-${index}`}>
                            <AccordionTrigger
                              className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')}
                              onClick={() => handleFetchPolicyInfo(phone, index.toString())}
                            >
                              <span>{policyInfoLoading[index.toString()] ? 'Fetching...' : 'Policy Info'}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                              {policyInfoLoading[index.toString()] ? <p>Loading policy info...</p> :
                                policyInfo[index.toString()] ? (
                                  policyInfo[index.toString()].length > 0 ? (
                                    policyInfo[index.toString()].map(item => (
                                      <div key={item.id} className="space-y-2 text-sm">
                                        {item.column_values
                                          .filter(col => MONDAY_COLUMN_MAP[col.id] && col.text)
                                          .map(col => (
                                            <div key={col.id} className="grid grid-cols-2">
                                              <span className="font-medium text-muted-foreground">{MONDAY_COLUMN_MAP[col.id]}:</span>
                                              <span>{col.text}</span>
                                            </div>
                                          ))}
                                      </div>
                                    ))
                                  ) : <p className="text-sm text-muted-foreground">No policy info found.</p>
                                ) : <p className="text-sm text-muted-foreground">Click to load policy info.</p>
                              }
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <h3 className="text-lg font-medium">No Results Found</h3>
                    <p className="text-muted-foreground mt-1">
                      No client details found for the provided phone number and center.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}