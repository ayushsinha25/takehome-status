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
import { Plus, MoreHorizontal, Server, AlertCircle, CheckCircle, Clock, Settings as SettingsIcon, Trash2, Edit, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { servicesApi, Service } from '@/lib/api';

const statusColors = {
  operational: 'bg-green-500',
  degraded_performance: 'bg-yellow-500', 
  partial_outage: 'bg-orange-500',
  major_outage: 'bg-red-500',
  maintenance: 'bg-blue-500'
};

const statusIcons = {
  operational: CheckCircle,
  degraded_performance: AlertCircle,
  partial_outage: AlertCircle,
  major_outage: AlertCircle,
  maintenance: Clock
};

const statusLabels = {
  operational: 'Operational',
  degraded_performance: 'Degraded Performance',
  partial_outage: 'Partial Outage', 
  major_outage: 'Major Outage',
  maintenance: 'Maintenance'
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monitoring_url: '',
    monitoring_enabled: false
  });
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    reason: ''
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await servicesApi.getAll();
      setServices(data);
    } catch (error) {
      toast.error('Failed to load services');
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async () => {
    try {
      await servicesApi.create(formData);
      toast.success('Service created successfully!');
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', monitoring_url: '', monitoring_enabled: false });
      loadServices();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to create service';
      toast.error(message);
    }
  };

  const handleUpdateService = async () => {
    if (!selectedService) return;
    
    try {
      await servicesApi.update(selectedService.id, formData);
      toast.success('Service updated successfully!');
      setShowEditDialog(false);
      setSelectedService(null);
      setFormData({ name: '', description: '', monitoring_url: '', monitoring_enabled: false });
      loadServices();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update service';
      toast.error(message);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedService) return;
    
    try {
      await servicesApi.updateStatus(selectedService.id, statusUpdate.status, statusUpdate.reason);
      toast.success('Service status updated successfully!');
      setShowStatusDialog(false);
      setSelectedService(null);
      setStatusUpdate({ status: '', reason: '' });
      loadServices();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to update status';
      toast.error(message);
    }
  };

  const handleDeleteService = async (service: Service) => {
    try {
      await servicesApi.delete(service.id);
      toast.success('Service deleted successfully!');
      loadServices();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to delete service';
      toast.error(message);
    }
  };

  const openEditDialog = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description,
      monitoring_url: service.monitoring_url || '',
      monitoring_enabled: service.monitoring_enabled
    });
    setShowEditDialog(true);
  };

  const openStatusDialog = (service: Service) => {
    setSelectedService(service);
    setStatusUpdate({ status: service.status, reason: '' });
    setShowStatusDialog(true);
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
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground">
            Monitor and manage your service status
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Service</DialogTitle>
              <DialogDescription>
                Add a new service to monitor and display on your status page.
              </DialogDescription>
            </DialogHeader>
              
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Website, API, Database"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the service"
                />
              </div>
              
              <div>
                <Label htmlFor="monitoring_url">Monitoring URL (Optional)</Label>
                <Input
                  id="monitoring_url"
                  type="url"
                  value={formData.monitoring_url}
                  onChange={(e) => setFormData({ ...formData, monitoring_url: e.target.value })}
                  placeholder="https://example.com/health"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="monitoring_enabled"
                  checked={formData.monitoring_enabled}
                  onChange={(e) => setFormData({ ...formData, monitoring_enabled: e.target.checked })}
                />
                <Label htmlFor="monitoring_enabled">Enable automatic monitoring</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateService} disabled={!formData.name}>
                Create Service
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const StatusIcon = statusIcons[service.status as keyof typeof statusIcons];
          const statusColor = statusColors[service.status as keyof typeof statusColors];
          
          return (
            <Card key={service.id} className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{service.name}</CardTitle>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => openStatusDialog(service)}>
                      <Activity className="mr-2 h-4 w-4" />
                      Update Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(service)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Service
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Service
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{service.name}" and remove it from your status page.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteService(service)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <CardDescription>{service.description}</CardDescription>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <StatusIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {statusLabels[service.status as keyof typeof statusLabels]}
                    </span>
                  </div>
                  
                  {service.monitoring_enabled && (
                    <Badge variant="secondary" className="text-xs">
                      <SettingsIcon className="h-3 w-3 mr-1" />
                      Auto-monitored
                    </Badge>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(service.last_status_change).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {services.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by adding your first service to monitor.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Service Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update the service information and configuration.
            </DialogDescription>
          </DialogHeader>
            
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Service Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Website, API, Database"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the service"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-monitoring_url">Monitoring URL (Optional)</Label>
              <Input
                id="edit-monitoring_url"
                type="url"
                value={formData.monitoring_url}
                onChange={(e) => setFormData({ ...formData, monitoring_url: e.target.value })}
                placeholder="https://example.com/health"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-monitoring_enabled"
                checked={formData.monitoring_enabled}
                onChange={(e) => setFormData({ ...formData, monitoring_enabled: e.target.checked })}
              />
              <Label htmlFor="edit-monitoring_enabled">Enable automatic monitoring</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateService} disabled={!formData.name}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Service Status</DialogTitle>
            <DialogDescription>
              Change the current status of {selectedService?.name}.
            </DialogDescription>
          </DialogHeader>
            
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select value={statusUpdate.status} onValueChange={(value) => setStatusUpdate({ ...statusUpdate, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">✅ Operational</SelectItem>
                  <SelectItem value="degraded_performance">⚠️ Degraded Performance</SelectItem>
                  <SelectItem value="partial_outage">🟠 Partial Outage</SelectItem>
                  <SelectItem value="major_outage">🔴 Major Outage</SelectItem>
                  <SelectItem value="maintenance">🔵 Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={statusUpdate.reason}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, reason: e.target.value })}
                placeholder="Brief explanation of the status change"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={!statusUpdate.status}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 