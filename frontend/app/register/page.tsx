'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Loader2, Building2, UserPlus, Users, Shield, Eye } from 'lucide-react';

interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string;
  website_url: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    organization_id: '',
    requested_role: 'member',
    organization_name: '', // For creating new organization
  });
  
  const [registrationType, setRegistrationType] = useState<'join' | 'create'>('join');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  
  const { register } = useAuth();
  const router = useRouter();

  // Load available organizations
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const response = await api.get('/auth/organizations');
        setOrganizations(response.data);
      } catch (error) {
        console.error('Failed to load organizations:', error);
        setError('Failed to load organizations');
      } finally {
        setLoadingOrgs(false);
      }
    };

    loadOrganizations();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (registrationType === 'join' && !formData.organization_id) {
      setError('Please select an organization');
      setLoading(false);
      return;
    }

    if (registrationType === 'create' && !formData.organization_name.trim()) {
      setError('Please enter an organization name');
      setLoading(false);
      return;
    }

    try {
      const registrationData = {
        email: formData.email,
        username: formData.username,
        full_name: formData.full_name,
        password: formData.password,
        requested_role: formData.requested_role,
        ...(registrationType === 'join' 
          ? { organization_id: parseInt(formData.organization_id) }
          : { organization_name: formData.organization_name.trim() }
        )
      };

      const response = await api.post('/auth/register', registrationData);
      setSuccess(response.data);

      if (response.data.can_login) {
        // Auto-approved (new organization admin)
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin': return 'Full access to manage organization, services, and members';
      case 'member': return 'Can manage services and incidents';
      case 'viewer': return 'Read-only access to view status and incidents';
      default: return '';
    }
  };

  if (success) {
    return (
      <div className="container mx-auto max-w-md py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {success.can_login ? '🎉 Welcome!' : '📋 Registration Submitted'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-center">
                {success.message}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 text-sm">
              <div><strong>User:</strong> {success.user.full_name} ({success.user.email})</div>
              <div><strong>Organization:</strong> {success.organization?.name}</div>
              <div><strong>Status:</strong> 
                <Badge variant={success.membership_status === 'approved' ? 'default' : 'secondary'} className="ml-2">
                  {success.membership_status}
                </Badge>
              </div>
              {success.requested_role && (
                <div><strong>Requested Role:</strong> 
                  <Badge variant="outline" className="ml-2">
                    {getRoleIcon(success.requested_role)} {success.requested_role}
                  </Badge>
                </div>
              )}
            </div>

            {!success.can_login && (
              <div className="pt-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  You will receive access once an admin approves your request.
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            )}

            {success.can_login && (
              <div className="pt-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Redirecting to dashboard...
                </p>
                <Button asChild className="w-full">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join an existing organization or create your own
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="johndoe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Organization Selection */}
            <div className="space-y-4">
              <h3 className="font-medium">Organization</h3>
              
              <RadioGroup 
                value={registrationType} 
                onValueChange={(value) => setRegistrationType(value as 'join' | 'create')}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="join" id="join" />
                  <Label htmlFor="join" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Join Existing
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Create New
                  </Label>
                </div>
              </RadioGroup>

              {registrationType === 'join' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="organization">Select Organization</Label>
                    {loadingOrgs ? (
                      <div className="flex items-center gap-2 p-3 border rounded">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading organizations...
                      </div>
                    ) : (
                      <Select 
                        value={formData.organization_id} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, organization_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an organization to join" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              <div>
                                <div className="font-medium">{org.name}</div>
                                <div className="text-sm text-gray-500">{org.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div>
                    <Label>Requested Role</Label>
                    <RadioGroup 
                      value={formData.requested_role}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, requested_role: value }))}
                      className="mt-2 space-y-3"
                    >
                      {['admin', 'member', 'viewer'].map((role) => (
                        <div key={role} className="flex items-start space-x-3 border rounded-lg p-3">
                          <RadioGroupItem value={role} id={role} className="mt-1" />
                          <div className="grid gap-1.5 leading-none">
                            <Label 
                              htmlFor={role} 
                              className="flex items-center gap-2 font-medium capitalize cursor-pointer"
                            >
                              {getRoleIcon(role)}
                              {role}
                            </Label>
                            <p className="text-xs text-gray-500">
                              {getRoleDescription(role)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                    <p className="text-xs text-gray-500 mt-2">
                      * Admin approval required. You'll get access once approved.
                    </p>
                  </div>
                </div>
              )}

              {registrationType === 'create' && (
                <div>
                  <Label htmlFor="organization_name">Organization Name</Label>
                  <Input
                    id="organization_name"
                    name="organization_name"
                    type="text"
                    required={registrationType === 'create'}
                    value={formData.organization_name}
                    onChange={handleInputChange}
                    placeholder="My Company"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    * You'll be the admin of your new organization with immediate access.
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading || loadingOrgs}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 