import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface TabLoadingProps {
  message?: string;
}

export const TabLoading = ({ message = 'Loading data...' }: TabLoadingProps) => {
  return (
    <Card>
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">{message}</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we fetch the latest data from Monday.com
            </p>
          </div>
          <div className="flex space-x-1 mt-4">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
