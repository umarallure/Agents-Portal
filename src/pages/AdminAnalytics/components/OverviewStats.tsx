import { Card, CardContent } from '@/components/ui/card';
import { Activity, DollarSign, TrendingUp, Award, Shield, ShieldCheck } from 'lucide-react';

interface OverviewStatsProps {
  totalPlacements: number;
  totalPremium: number;
  avgPremium: number;
  totalGiDeals: number;
  totalNonGiDeals: number;
  giPercentage: number;
  avgPlacementPerWeek: number;
}

export const OverviewStats = ({
  totalPlacements,
  totalPremium,
  avgPremium,
  totalGiDeals,
  totalNonGiDeals,
  giPercentage,
  avgPlacementPerWeek
}: OverviewStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Row 1: Total Placements, Total GI, Total Non-GI, GI vs Non-GI Percentage */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Placements</p>
              <p className="text-3xl font-bold text-blue-600">{totalPlacements}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total GI</p>
              <p className="text-3xl font-bold text-blue-600">{totalGiDeals}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Non-GI</p>
              <p className="text-3xl font-bold text-orange-600">{totalNonGiDeals}</p>
            </div>
            <Shield className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">GI vs Non-GI Percentage</p>
              <p className="text-3xl font-bold text-blue-600">
                {(() => {
                  const totalClassified = totalGiDeals + totalNonGiDeals;
                  if (totalClassified === 0) return '0% / 0%';
                  const giPercentage = Math.round((totalGiDeals / totalClassified) * 100);
                  const nonGiPercentage = Math.round((totalNonGiDeals / totalClassified) * 100);
                  return `${giPercentage}% / ${nonGiPercentage}%`;
                })()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                of {totalGiDeals + totalNonGiDeals} classified deals
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Total Premium, Avg Premium, Avg Placement per Week */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Premium</p>
              <p className="text-3xl font-bold text-blue-600">
                ${totalPremium.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Premium</p>
              <p className="text-3xl font-bold text-orange-600">
                ${Math.round(avgPremium).toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Placement per Week</p>
              <p className="text-3xl font-bold text-orange-600">
                {avgPlacementPerWeek.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                placements per week
              </p>
            </div>
            <Award className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
