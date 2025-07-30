'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { metricsApi, type UptimeMetricsResponse, type ServiceUptimeData } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
];

function getStatusColor(uptime: number) {
  if (uptime >= 99.5) return 'text-green-600';
  if (uptime >= 95) return 'text-yellow-600';
  return 'text-red-600';
}

function getStatusBadge(uptime: number) {
  if (uptime >= 99.5) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
  if (uptime >= 95) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
  return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
}

export default function MetricsPage() {
  const [metricsData, setMetricsData] = useState<UptimeMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodType, setPeriodType] = useState<'daily' | 'hourly'>('daily');
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadMetricsData();
    }
  }, [user, periodType]);

  const loadMetricsData = async () => {
    try {
      setLoading(true);
      console.log('Loading metrics data for period:', periodType);
      
      const data = await metricsApi.getUptimeMetrics(periodType);
      setMetricsData(data);
      setError('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load metrics data';
      setError(errorMessage);
      console.error('Metrics error:', err);
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

  // Transform data for the chart
  const chartData = metricsData?.services[0]?.data_points.map((point, index) => {
    const dataPoint: any = {
      label: point.label,
      timestamp: point.timestamp,
    };
    
    // Add each service's uptime data
    metricsData.services.forEach((service, serviceIndex) => {
      dataPoint[service.service_name] = service.data_points[index]?.uptime_percentage || 0;
    });
    
    return dataPoint;
  }) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Uptime Metrics</h1>
            <p className="text-muted-foreground mt-1">
              Monitor service uptime performance over time
            </p>
          </div>
        </div>
        
        {/* Period Toggle */}
        <div className="flex space-x-2">
          <Button
            variant={periodType === 'daily' ? 'default' : 'outline'}
            onClick={() => setPeriodType('daily')}
            className="flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>30 Days</span>
          </Button>
          <Button
            variant={periodType === 'hourly' ? 'default' : 'outline'}
            onClick={() => setPeriodType('hourly')}
            className="flex items-center space-x-2"
          >
            <Clock className="h-4 w-4" />
            <span>24 Hours</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {metricsData && (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Uptime</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(metricsData.overall_uptime)}`}>
                  {metricsData.overall_uptime}%
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {getStatusBadge(metricsData.overall_uptime)}
                  <p className="text-xs text-muted-foreground">
                    {metricsData.period_label}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services Monitored</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricsData.services.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active services
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{chartData.length}</div>
                <p className="text-xs text-muted-foreground">
                  {periodType === 'daily' ? 'Days tracked' : 'Hours tracked'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Uptime Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Service Uptime Over Time</CardTitle>
              <CardDescription>
                {metricsData.period_label} - {periodType === 'daily' ? 'Daily' : 'Hourly'} view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 12 }}
                      angle={periodType === 'hourly' ? -45 : 0}
                      textAnchor={periodType === 'hourly' ? 'end' : 'middle'}
                      height={periodType === 'hourly' ? 60 : 30}
                    />
                    <YAxis 
                      domain={[90, 100]} 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Uptime %', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Legend />
                    {metricsData.services.map((service, index) => (
                      <Line
                        key={service.service_id}
                        type="monotone"
                        dataKey={service.service_name}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metricsData.services.map((service) => (
              <Card key={service.service_id}>
                <CardHeader>
                  <CardTitle className="text-lg">{service.service_name}</CardTitle>
                  <CardDescription>Individual service performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Average Uptime:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${getStatusColor(service.overall_uptime)}`}>
                          {service.overall_uptime}%
                        </span>
                        {getStatusBadge(service.overall_uptime)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Recent Performance:</span>
                      <div className="flex space-x-1 h-2">
                        {service.data_points.slice(-14).map((point, index) => (
                          <div
                            key={index}
                            className={`flex-1 rounded-sm ${
                              point.uptime_percentage >= 99.5 
                                ? 'bg-green-500' 
                                : point.uptime_percentage >= 95 
                                ? 'bg-yellow-500' 
                                : 'bg-red-500'
                            }`}
                            title={`${point.label}: ${point.uptime_percentage}%`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last {Math.min(14, service.data_points.length)} {periodType === 'daily' ? 'days' : 'hours'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!metricsData && !loading && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No metrics data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 