import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';

interface CarrierPerformanceData {
  name: string;
  totalPlacements: number;
  totalPremium: number;
  avgPremium: number;
}

interface CarriersPerformanceTabProps {
  carrierPerformance: CarrierPerformanceData[];
}

export const CarriersPerformanceTab = ({ carrierPerformance }: CarriersPerformanceTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Award className="h-5 w-5" />
          <span>Carrier Performance</span>
          <Badge variant="outline">{carrierPerformance.length} Carriers</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {carrierPerformance.map((carrier, index) => (
            <Card key={carrier.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{carrier.name}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{carrier.totalPlacements}</p>
                      <p className="text-xs text-muted-foreground">Placements</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        ${carrier.totalPremium.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Premium</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        ${Math.round(carrier.avgPremium).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Premium</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {carrierPerformance.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No carrier data available for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
