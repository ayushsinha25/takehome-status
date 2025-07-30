'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Users, Shield, Eye, Clock, CheckCircle, XCircle, UserPlus, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface PendingRequest {
  id: number;
  user: {
    id: number;
    email: string;
    username: string;
    full_name: string;
  };
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  requested_role: string;
  joined_at: string;
}

interface TeamMember {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  status: string;
  joined_at: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const currentUserRole = user?.organizations?.[0]?.role;
  const isAdmin = currentUserRole === 'admin';

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      if (isAdmin) {
        // Load pending membership requests for admins
        const pending = await authApi.getPendingMemberships();
        setPendingRequests(pending);
      }

      // Mock current team members - replace with actual API call
      const mockMembers: TeamMember[] = [
        {
          id: 1,
          email: user?.email || '',
          username: user?.username || '',
          full_name: user?.full_name || '',
          role: currentUserRole || 'member',
          status: 'approved',
          joined_at: new Date().toISOString()
        }
      ];
      setTeamMembers(mockMembers);
      
    } catch (error) {
      console.error('Failed to load team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleMembershipAction = async (
    requestId: number, 
    action: 'approve' | 'deny', 
    role?: string
  ) => {
    try {
      setActionLoading(requestId);
      
      const response = await authApi.approveMembership(requestId, action, role);
      
      toast.success(response.message);
      
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Refresh team data
      loadTeamData();
      
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${action} membership`);
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'member': return <Users className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'member': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'secondary';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Management</h1>
        <p className="text-gray-600">Manage your organization's team members and permissions</p>
      </div>

      {/* Pending Membership Requests - Admin Only */}
      {isAdmin && pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Membership Requests
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </CardTitle>
            <CardDescription>
              Review and approve new member requests for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{getInitials(request.user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{request.user.full_name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {request.user.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        Requested: {format(new Date(request.joined_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">Requested Role:</div>
                      <Badge variant="outline" className="gap-1">
                        {getRoleIcon(request.requested_role)}
                        {request.requested_role}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Approve with role selection */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            className="gap-1"
                            disabled={actionLoading === request.id}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Membership</AlertDialogTitle>
                            <AlertDialogDescription>
                              Approve {request.user.full_name} to join your organization.
                              You can assign a different role if needed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          
                          <div className="my-4">
                            <label className="text-sm font-medium">Assign Role:</label>
                            <Select defaultValue={request.requested_role}>
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Admin - Full access
                                  </div>
                                </SelectItem>
                                <SelectItem value="member">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Member - Manage services
                                  </div>
                                </SelectItem>
                                <SelectItem value="viewer">
                                  <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Viewer - Read only
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleMembershipAction(request.id, 'approve', request.requested_role)}
                            >
                              Approve Membership
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Deny */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1"
                            disabled={actionLoading === request.id}
                          >
                            <XCircle className="h-4 w-4" />
                            Deny
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deny Membership</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to deny {request.user.full_name}'s membership request?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                         <AlertDialogAction
                               onClick={() => handleMembershipAction(request.id, 'deny')}
                               className="bg-red-600 hover:bg-red-700"
                             >
                              Deny Request
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
            <Badge variant="secondary">{teamMembers.length}</Badge>
          </CardTitle>
          <CardDescription>
            Current members of your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.full_name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      @{member.username}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                    {getRoleIcon(member.role)}
                    {member.role}
                  </Badge>
                  
                  {member.id === user?.id && (
                    <Badge variant="outline">You</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding different role permissions in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Admin</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Manage all services and incidents</li>
                <li>• Approve/deny membership requests</li>
                <li>• Manage team roles and permissions</li>
                <li>• Access organization settings</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">Member</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Create and manage services</li>
                <li>• Report and update incidents</li>
                <li>• Schedule maintenance windows</li>
                <li>• View team and analytics</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5" />
                <span className="font-medium">Viewer</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• View service status</li>
                <li>• View incident history</li>
                <li>• Access status pages</li>
                <li>• Read-only dashboard access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No pending requests message for admins */}
      {isAdmin && pendingRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <UserPlus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Requests</h3>
            <p className="text-gray-500 mb-4">
              There are no membership requests waiting for approval.
            </p>
            <p className="text-sm text-gray-400">
              New requests will appear here when users try to join your organization.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 