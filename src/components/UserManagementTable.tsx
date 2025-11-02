import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Ban, UserCheck } from 'lucide-react';

// Extended User type for admin API that includes banned_until
interface AdminUser {
  id: string;
  email?: string;
  banned_until: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  // Add other properties as needed
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  agent_code: string | null;
  banned_until: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  roles: string[];
}

export default function UserManagementTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [banFilter, setBanFilter] = useState<'all' | 'banned' | 'active'>('all');
  const [banningUser, setBanningUser] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Call the user management edge function
      const { data, error } = await supabase.functions.invoke('user-management', {
        method: 'GET',
      });

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
          variant: 'destructive',
        });
        return;
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBanToggle = async (userId: string, currentlyBanned: boolean) => {
    setBanningUser(userId);

    try {
      // Call the user management edge function
      const { data, error } = await supabase.functions.invoke('user-management', {
        method: 'POST',
        body: {
          userId,
          ban: !currentlyBanned,
        },
      });

      if (error) {
        console.error('Error updating user ban status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update user ban status',
          variant: 'destructive',
        });
        return;
      }

      if (currentlyBanned) {
        toast({
          title: 'User Unbanned',
          description: 'User can now log in again',
        });
      } else {
        toast({
          title: 'User Banned',
          description: 'User has been banned and cannot log in',
          variant: 'destructive',
        });
      }

      // Refresh the user list
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user ban status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user ban status',
        variant: 'destructive',
      });
    } finally {
      setBanningUser(null);
    }
  };

  const isUserBanned = (banned_until: string | null) => {
    if (!banned_until) return false;
    return new Date(banned_until) > new Date();
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.display_name && user.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.roles.some(role => role.toLowerCase().includes(searchTerm.toLowerCase()));

    // Ban status filter
    const isBanned = isUserBanned(user.banned_until);
    const matchesBanFilter = banFilter === 'all' ||
      (banFilter === 'banned' && isBanned) ||
      (banFilter === 'active' && !isBanned);

    return matchesSearch && matchesBanFilter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className='flex items-center justify-center py-12'>
          <div className='flex items-center gap-2'>
            <Loader2 className='h-6 w-6 animate-spin' />
            <span className='text-lg'>Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search by email, name, or role...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <div className='w-48'>
              <Select value={banFilter} onValueChange={(value: 'all' | 'banned' | 'active') => setBanFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="banned">Banned Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>Users ({filteredUsers.length})</span>
            <Button onClick={fetchUsers} variant='outline' size='sm'>
              <Loader2 className='h-4 w-4 mr-2' />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='border rounded-lg overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Agent Code</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const banned = isUserBanned(user.banned_until);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className='font-medium'>{user.email}</TableCell>
                      <TableCell>{user.display_name || 'N/A'}</TableCell>
                      <TableCell>{user.agent_code || 'N/A'}</TableCell>
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {user.roles.map((role) => (
                            <Badge key={role} variant='secondary' className='text-xs'>
                              {role}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && (
                            <span className='text-muted-foreground text-sm'>No roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={banned ? 'destructive' : 'default'}>
                          {banned ? 'Banned' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={banned ? 'default' : 'destructive'}
                          size='sm'
                          onClick={() => handleBanToggle(user.id, banned)}
                          disabled={banningUser === user.id}
                          className='flex items-center gap-2'
                        >
                          {banningUser === user.id ? (
                            <Loader2 className='h-3 w-3 animate-spin' />
                          ) : banned ? (
                            <UserCheck className='h-3 w-3' />
                          ) : (
                            <Ban className='h-3 w-3' />
                          )}
                          {banned ? 'Unban' : 'Ban'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className='text-center py-12'>
              <p className='text-muted-foreground'>No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}