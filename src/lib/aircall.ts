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
  contact: unknown;
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
  phoneNumber: string,
  fromTimestamp?: number,
  toTimestamp?: number
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

    const from = fromTimestamp || (Math.floor(Date.now() / 1000) - (180 * 24 * 60 * 60));
    const to = toTimestamp || Math.floor(Date.now() / 1000);

    const response = await fetch(
      `https://api.aircall.io/v1/calls?phone_number=${cleanNumber}&from=${from}&to=${to}&order_by=desc`,
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
      return [];
    }

    const data: AircallSearchResponse = await response.json();
    
    if (data.calls && Array.isArray(data.calls)) {
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
