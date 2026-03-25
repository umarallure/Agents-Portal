interface AircallContact {
  id: number;
  first_name: string;
  last_name: string;
  phone_numbers: Array<{
    label: string;
    number: string;
  }>;
}

interface AircallCall {
  id: number;
  sid: string;
  direct_link: string;
  direction: string;
  status: string;
  started_at: number;
  answered_at: number | null;
  ended_at: number | null;
  duration: number;
  voicemail: string | null;
  recording: string | null;
  raw_digits: string;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
  contact: AircallContact | null;
  number: {
    id: number;
    name: string;
    digits: string;
  } | null;
  comments: Array<{
    id: number;
    content: string;
    posted_at: number;
  }>;
  tags: Array<{
    id: number;
    name: string;
  }>;
}

interface AircallSearchResponse {
  meta: {
    total: number;
    before: number;
    after: number;
  };
  paginated: boolean;
  calls: AircallCall[];
}

export const searchAircallCalls = async (
  phoneNumber: string
): Promise<AircallCall[]> => {
  try {
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (!cleanNumber.startsWith('1') && cleanNumber.length === 10) {
      cleanNumber = '1' + cleanNumber;
    }

    const apiKey = '6ba10f9861ff284f065dfbcbf09b18d6';
    const aircallApiId = '27c0a5d77ece59448d9dbb33072bf07c';

    if (!apiKey || !aircallApiId) {
      console.error('Aircall API credentials not configured');
      return [];
    }

    // Debug logging
    console.log('[Aircall] Searching for phone:', cleanNumber);

    // Use /v1/calls/search endpoint with phone_number and fetch_contact
    const url = `https://api.aircall.io/v1/calls/search?phone_number=${cleanNumber}&order=desc&fetch_contact=true`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${aircallApiId}:${apiKey}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Aircall API error:', response.status, response.statusText);
      return [];
    }

    const data: AircallSearchResponse = await response.json();
    
    console.log('[Aircall] Total calls returned from API:', data.calls?.length || 0);
    
    if (data.calls && Array.isArray(data.calls)) {
      // Return all calls from API since it's already filtered by phone_number
      return data.calls;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Aircall calls:', error);
    return [];
  }
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const fetchCallRecording = async (callId: number): Promise<string | null> => {
  try {
    const apiKey = '6ba10f9861ff284f065dfbcbf09b18d6';
    const aircallApiId = '27c0a5d77ece59448d9dbb33072bf07c';

    if (!apiKey || !aircallApiId) {
      console.error('Aircall API credentials not configured');
      return null;
    }

    const response = await fetch(
      `https://api.aircall.io/v1/calls/${callId}/recordings`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${aircallApiId}:${apiKey}`)}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Aircall API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.recording && data.recording.url) {
      return data.recording.url;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching call recording:', error);
    return null;
  }
};
