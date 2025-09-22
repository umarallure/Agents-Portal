import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, User, Menu, ChevronDown, Grid3X3, Eye, CheckCircle, BarChart3, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { canAccessNavigation } from '@/lib/userPermissions';

interface NavigationHeaderProps {
  title: string;
  showBackButton?: boolean;
  backTo?: string;
}

export const NavigationHeader = ({ title, showBackButton = false, backTo }: NavigationHeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const isBen = user?.id === '424f4ea8-1b8c-4c0f-bc13-3ea699900c79';
  const isAuthorizedUser = user?.id === '424f4ea8-1b8c-4c0f-bc13-3ea699900c79' || user?.id === '9c004d97-b5fb-4ed6-805e-e2c383fe8b6f' || user?.id === 'c2f07638-d3d2-4fe9-9a65-f57395745695' || user?.id === '30b23a3f-df6b-40af-85d1-84d3e6f0b8b4';
  const hasNavigationAccess = canAccessNavigation(user?.id);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => backTo ? navigate(backTo) : navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <Badge variant="outline" className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>{user?.email}</span>
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {/* Main Navigation Menu - Only show for users with navigation access */}
          {isAuthorizedUser && hasNavigationAccess && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  Menu
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Lead Management</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/daily-deal-flow')}>
                  <Grid3X3 className="mr-2 h-4 w-4" />
                  Daily Deal Flow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/transfer-portal')}>
                  <Eye className="mr-2 h-4 w-4" />
                  Transfer Portal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/submission-portal')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submission Portal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Reports & Analytics</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/reports')}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Agent Reports & Logs
                </DropdownMenuItem>
                {isBen && (
                  <DropdownMenuItem onClick={() => navigate('/analytics')}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Tools</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/bulk-lookup')}>
                  <Search className="mr-2 h-4 w-4" />
                  Bulk Lookup
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Sign Out Button */}
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};