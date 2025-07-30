'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
      return 'Maintenance';
    default:
      return status;
  }
}

function getOverallStatusIcon(status: string) {
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

export default function PublicStatusPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatusData();
  }, [slug]);

  const loadStatusData = async () => {
    try {
      setLoading(true);
      const data = await statusApi.getPublicStatus(slug);
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
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Status Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The status page you're looking for doesn't exist or is currently unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{statusData.organization.name}</h1>
            </div>
            {statusData.organization.description && (
              <p className="text-muted-foreground mb-6">
                {statusData.organization.description}
              </p>
            )}
            
            {/* Overall Status */}
            <div className="flex items-center justify-center space-x-3">
              {getOverallStatusIcon(statusData.overall_status)}
              <div>
                <h2 className="text-xl font-semibold">
                  {statusData.overall_status === 'operational' 
                    ? 'All Systems Operational' 
                    : 'Some Systems Experiencing Issues'}
                </h2>
                {statusData.uptime_percentage && (
                  <p className="text-sm text-muted-foreground">
                    {statusData.uptime_percentage}% uptime (last 30 days)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Active Incidents */}
        {statusData.active_incidents && statusData.active_incidents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Active Incidents</span>
              </CardTitle>
              <CardDescription>
                Issues currently being investigated or resolved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusData.active_incidents.map((incident: any) => (
                <div key={incident.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{incident.title}</h3>
                      <p className="text-muted-foreground">{incident.description}</p>
                    </div>
                    <Badge variant="destructive">
                      {incident.status}
                    </Badge>
                  </div>
                  
                  {incident.affected_services.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-2">Affected Services:</p>
                      <div className="flex flex-wrap gap-2">
                        {incident.affected_services.map((service: any) => (
                          <Badge key={service.id} variant="outline">
                            {service.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {incident.latest_update && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm font-medium mb-1">{incident.latest_update.title}</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {incident.latest_update.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(incident.latest_update.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Current Status</span>
            </CardTitle>
            <CardDescription>
              Real-time status of all services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusData.services.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No services are being monitored</p>
              </div>
            ) : (
              statusData.services.map((service: any) => (
                <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(service.status)}`} />
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      {service.description && (
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={service.status === 'operational' ? 'default' : 'destructive'}>
                      {getStatusText(service.status)}
                    </Badge>
                    {service.last_status_change && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated {formatDistanceToNow(new Date(service.last_status_change), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        {statusData.recent_incidents && statusData.recent_incidents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Incidents</CardTitle>
              <CardDescription>
                Incidents from the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusData.recent_incidents.map((incident: any) => (
                <div key={incident.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{incident.title}</h3>
                      <p className="text-sm text-muted-foreground">{incident.description}</p>
                    </div>
                    <Badge variant="default">
                      Resolved
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {incident.affected_services.length} service(s) affected
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(incident.resolved_at || incident.started_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>
            Last updated: {new Date().toLocaleString()}
          </p>
          {statusData.organization.website_url && (
            <p className="mt-2">
              <a 
                href={statusData.organization.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Visit our website
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 