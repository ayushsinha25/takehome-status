'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, MoreHorizontal, AlertTriangle, CheckCircle, Clock, Eye, MessageSquare, Trash2, Edit, Activity, Server } from 'lucide-react';
import { toast } from 'sonner';
import { incidentsApi, servicesApi, Incident, Service } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const severityColors = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
};

const statusColors = {
  investigating: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  identified: 'bg-orange-100 text-orange-800 border-orange-200',
  monitoring: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200'
};

const statusIcons = {
  investigating: AlertTriangle,
  identified: Eye,
  monitoring: Activity,
  resolved: CheckCircle
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: '',
    affected_services: [] as number[]
  });
  const [updateData, setUpdateData] = useState({
    title: '',
    message: '',
    status: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [incidentsData, servicesData] = await Promise.all([
        incidentsApi.getAll(),
        servicesApi.getAll()
      ]);
      setIncidents(incidentsData);
      setServices(servicesData);
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async () => {
    try {
      await incidentsApi.create({
        ...formData,
        affected_service_ids: formData.affected_services
      });
      toast.success('Incident reported successfully!');
      setShowCreateDialog(false);
      setFormData({ title: '', description: '', severity: '', affected_services: [] });
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to create incident';
      toast.error(message);
    }
  };

  const handleAddUpdate = async () => {
    if (!selectedIncident) return;

    try {
      await incidentsApi.addUpdate(selectedIncident.id, updateData);
      toast.success('Incident update added successfully!');
      setShowUpdateDialog(false);
      setSelectedIncident(null);
      setUpdateData({ title: '', message: '', status: '' });
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to add update';
      toast.error(message);
    }
  };

  const handleDeleteIncident = async (incident: Incident) => {
    try {
      await incidentsApi.delete(incident.id);
      toast.success('Incident deleted successfully!');
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to delete incident';
      toast.error(message);
    }
  };

  const openUpdateDialog = (incident: Incident) => {
    setSelectedIncident(incident);
    setUpdateData({ title: '', message: '', status: incident.status });
    setShowUpdateDialog(true);
  };

  const toggleAffectedService = (serviceId: number) => {
    setFormData(prev => ({
      ...prev,
      affected_services: prev.affected_services.includes(serviceId)
        ? prev.affected_services.filter(id => id !== serviceId)
        : [...prev.affected_services, serviceId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">
            Report and manage service incidents
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Report Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report New Incident</DialogTitle>
              <DialogDescription>
                Report a new incident and notify users about service disruptions.
              </DialogDescription>
            </DialogHeader>
              
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Incident Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Database Performance Issues"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the incident and its impact"
                />
              </div>
              
              <div>
                <Label htmlFor="severity">Severity Level</Label>
                <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🔵 Low - Minor issues with minimal impact</SelectItem>
                    <SelectItem value="medium">🟡 Medium - Some users affected</SelectItem>
                    <SelectItem value="high">🟠 High - Significant impact on users</SelectItem>
                    <SelectItem value="critical">🔴 Critical - Major outage or security issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Affected Services</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={formData.affected_services.includes(service.id)}
                        onChange={() => toggleAffectedService(service.id)}
                      />
                      <Label htmlFor={`service-${service.id}`} className="text-sm">
                        {service.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIncident} disabled={!formData.title || !formData.severity}>
                Report Incident
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.map((incident) => {
          const StatusIcon = statusIcons[incident.status as keyof typeof statusIcons];
          const severityClass = severityColors[incident.severity as keyof typeof severityColors];
          const statusClass = statusColors[incident.status as keyof typeof statusColors];
          
          return (
            <Card key={incident.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{incident.title}</CardTitle>
                      <Badge className={severityClass}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge className={statusClass}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <CardDescription>{incident.description}</CardDescription>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Started: {formatDistanceToNow(new Date(incident.started_at))} ago</span>
                      {incident.resolved_at && (
                        <span>Resolved: {formatDistanceToNow(new Date(incident.resolved_at))} ago</span>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openUpdateDialog(incident)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Add Update
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Incident
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{incident.title}".
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteIncident(incident)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Affected Services */}
                {incident.affected_services && incident.affected_services.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Affected Services:</h4>
                    <div className="flex flex-wrap gap-2">
                      {incident.affected_services.map((service) => (
                        <Badge key={service.id} variant="outline">
                          <Server className="h-3 w-3 mr-1" />
                          {service.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Updates Timeline */}
                {incident.updates && incident.updates.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Updates:</h4>
                    <div className="space-y-3">
                      {incident.updates.map((update, index) => (
                        <div key={update.id} className="relative">
                          {index !== incident.updates.length - 1 && (
                            <div className="absolute left-2 top-6 w-px h-full bg-border" />
                          )}
                          <div className="flex items-start space-x-3">
                            <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h5 className="text-sm font-medium">{update.title}</h5>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(update.created_at))} ago
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{update.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {incidents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Incidents Reported</h3>
            <p className="text-muted-foreground text-center mb-4">
              Good news! There are currently no active incidents.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Report Incident
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Incident Update</DialogTitle>
            <DialogDescription>
              Provide an update on the progress of "{selectedIncident?.title}".
            </DialogDescription>
          </DialogHeader>
            
          <div className="space-y-4">
            <div>
              <Label htmlFor="update-title">Update Title</Label>
              <Input
                id="update-title"
                value={updateData.title}
                onChange={(e) => setUpdateData({ ...updateData, title: e.target.value })}
                placeholder="e.g., Issue Identified, Fix Deployed, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="update-message">Message</Label>
              <Textarea
                id="update-message"
                value={updateData.message}
                onChange={(e) => setUpdateData({ ...updateData, message: e.target.value })}
                placeholder="Detailed update on the incident status and resolution progress"
              />
            </div>
            
            <div>
              <Label htmlFor="update-status">Status</Label>
              <Select value={updateData.status} onValueChange={(value) => setUpdateData({ ...updateData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investigating">🔍 Investigating</SelectItem>
                  <SelectItem value="identified">👁️ Identified</SelectItem>
                  <SelectItem value="monitoring">📊 Monitoring</SelectItem>
                  <SelectItem value="resolved">✅ Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUpdate} disabled={!updateData.title || !updateData.message}>
              Add Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 