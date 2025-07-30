'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { servicesApi, incidentsApi, type Service, type Incident } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Plus,
  ExternalLink
} from 'lucide-react';

function getStatusColor(status: string) {
  switch (status) {
    case 'operational':
      return 'bg-green-500';
    case 'degraded_performance':
      return 'bg-yellow-500';
    case 'partial_outage':
      return 'bg-orange-500';
    case 'major_outage':
      return 'bg-red-500';
    case 'maintenance':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'operational':
      return 'Operational';
    case 'degraded_performance':
      return 'Degraded Performance';
    case 'partial_outage':
      return 'Partial Outage';
    case 'major_outage':
      return 'Major Outage';
    case 'maintenance':
      return 'Maintenance';
    default:
      return status;
  }
}

function getIncidentStatusColor(status: string) {
  switch (status) {
    case 'investigating':
      return 'bg-yellow-500';
    case 'identified':
      return 'bg-orange-500';
    case 'monitoring':
      return 'bg-blue-500';
    case 'resolved':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

export default function DashboardPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const currentOrganization = user?.organizations?.[0];

  useEffect(() => {
    // Only load data if user is authenticated
    if (user) {
      loadDashboardData();
    }
  }, [user]); // Depend on user being loaded

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data for user:', user?.email);
      console.log('Token available:', !!localStorage.getItem('access_token'));
      
      const [servicesData, incidentsData] = await Promise.all([
        servicesApi.getAll(),
        incidentsApi.getAll()
      ]);
      
      console.log('Dashboard data loaded successfully:', { services: servicesData.length, incidents: incidentsData.length });
      setServices(servicesData);
      setIncidents(incidentsData);
      setError(''); // Clear any previous errors
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load dashboard data';
      setError(errorMessage);
      console.error('Dashboard error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        user: user?.email,
        tokenAvailable: !!localStorage.getItem('access_token')
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const operationalServices = services.filter(s => s.status === 'operational').length;
  const totalServices = services.length;
  const activeIncidents = incidents.filter(i => i.status !== 'resolved').length;
  const overallStatus = totalServices > 0 && operationalServices === totalServices ? 'All Systems Operational' : 'Some Issues Detected';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your services and manage incidents
          </p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link href="/dashboard/services">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link 
              href={currentOrganization ? `/status/${currentOrganization.slug}` : '/status'} 
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Status
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStatus}</div>
            <p className="text-xs text-muted-foreground">
              {operationalServices} of {totalServices} services operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground">
              Active services being monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeIncidents}</div>
            <p className="text-xs text-muted-foreground">
              Ongoing incidents requiring attention
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <Link href="/dashboard/metrics">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.9%</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days average • Click for details
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Services Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Services Status</span>
              <Link href="/dashboard/services">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              Current status of all your services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No services configured yet</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/services">Add Your First Service</Link>
                </Button>
              </div>
            ) : (
              services.slice(0, 5).map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`} />
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <Badge variant={service.status === 'operational' ? 'default' : 'destructive'}>
                    {getStatusText(service.status)}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Incidents</span>
              <Link href="/dashboard/incidents">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              Latest incidents and their status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No incidents reported</p>
                <p className="text-sm">All systems are running smoothly</p>
              </div>
            ) : (
              incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getIncidentStatusColor(incident.status)}`} />
                    <div>
                      <p className="font-medium">{incident.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {incident.affected_services.length} service(s) affected
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={incident.status === 'resolved' ? 'default' : 'destructive'}>
                      {incident.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(incident.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks to manage your status page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/services">
                <Server className="h-6 w-6 mb-2" />
                Manage Services
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link href="/dashboard/incidents">
                <AlertTriangle className="h-6 w-6 mb-2" />
                Report Incident
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link 
                href={currentOrganization ? `/status/${currentOrganization.slug}` : '/status'} 
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-6 w-6 mb-2" />
                View Public Status
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 