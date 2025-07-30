'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { statusApi } from '@/lib/api';
import { Server, CheckCircle, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
      return 'Under Maintenance';
    default:
      return 'Unknown';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'operational':
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    case 'partial_outage':
    case 'degraded_performance':
      return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    case 'major_outage':
      return <AlertTriangle className="h-6 w-6 text-red-500" />;
    case 'maintenance':
      return <Clock className="h-6 w-6 text-blue-500" />;
    default:
      return <Server className="h-6 w-6 text-gray-500" />;
  }
}

function StatusPageContent() {
  const searchParams = useSearchParams();
  // Get organization from URL parameter or use default
  const org = searchParams?.get('org') || 'acme-corp';
  
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatusData();
  }, [org]);

  const loadStatusData = async () => {
    try {
      setLoading(true);
      const data = await statusApi.getPublicStatus(org);
      setStatusData(data);
    } catch (err: any) {
      setError('Status page not found or unavailable');
      console.error('Status page error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading status...</p>
        </div>
      </div>
    );
  }

  if (error || !statusData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Status Page Not Found</h1>
          <p className="text-gray-600 mb-6">
            The status page you're looking for doesn't exist or is currently unavailable.
          </p>
          <div className="text-sm text-gray-500">
            <p>Organization: <code className="bg-gray-100 px-2 py-1 rounded">{org}</code></p>
            <p className="mt-2">Try: <code className="bg-gray-100 px-2 py-1 rounded">/status?org=your-org-name</code></p>
          </div>
        </div>
      </div>
    );
  }

  const { organization, services, incidents, overall_status, uptime_percentage } = statusData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organization?.name || 'Organization'} Status</h1>
              <p className="text-gray-600">Current system status and uptime information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Overall Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(overall_status)}
              <span>System Status</span>
            </CardTitle>
            <CardDescription>
              Overall system operational status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(overall_status)}`}></div>
                <span className="text-lg font-medium">{getStatusText(overall_status)}</span>
              </div>
              {uptime_percentage && (
                <Badge variant="secondary">
                  {uptime_percentage.toFixed(2)}% uptime (30 days)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Services</h2>
          {services && services.length > 0 ? (
            <div className="space-y-3">
              {services.map((service: any) => (
                <Card key={service.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(service.status)}
                        <div>
                          <h3 className="font-medium text-gray-900">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-600">{service.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={service.status === 'operational' ? 'default' : 'destructive'}
                          className="mb-1"
                        >
                          {getStatusText(service.status)}
                        </Badge>
                        {service.last_status_change && (
                          <p className="text-xs text-gray-500">
                            Updated {formatDistanceToNow(new Date(service.last_status_change), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Server className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No services to display</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Incidents */}
        {incidents && incidents.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Incidents</h2>
            <div className="space-y-3">
              {incidents.slice(0, 5).map((incident: any) => (
                <Card key={incident.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{incident.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge 
                        variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}
                      >
                        {incident.severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <p className="text-sm text-gray-500">
            Status page powered by Status Monitor • 
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PublicStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading status...</p>
        </div>
      </div>
    }>
      <StatusPageContent />
    </Suspense>
  );
}