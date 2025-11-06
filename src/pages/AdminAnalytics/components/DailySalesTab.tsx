import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';

export const DailySalesTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Daily Sales Statistics</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold">Daily Sales Stats</p>
          <p className="text-sm">Coming soon - detailed daily breakdown</p>
        </div>
      </CardContent>
    </Card>
  );
};
