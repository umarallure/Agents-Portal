import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

interface VendorPerformanceData {
  name: string;
  totalPlacements: number;
  totalPremium: number;
  avgPremium: number;
}

interface VendorsPerformanceTabProps {
  vendorPerformance: VendorPerformanceData[];
}

export const VendorsPerformanceTab = ({ vendorPerformance }: VendorsPerformanceTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Lead Vendor Performance</span>
          <Badge variant="outline">{vendorPerformance.length} Vendors</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {vendorPerformance.map((vendor, index) => (
            <Card key={vendor.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{vendor.name}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{vendor.totalPlacements}</p>
                      <p className="text-xs text-muted-foreground">Placements</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        ${vendor.totalPremium.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Premium</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        ${Math.round(vendor.avgPremium).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Premium</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {vendorPerformance.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No vendor data available for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
