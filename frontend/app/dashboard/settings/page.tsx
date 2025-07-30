'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Building2, Palette, Bell, Globe, Shield, Key, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

interface OrganizationSettings {
  name: string;
  description: string;
  website_url: string;
  logo_url: string;
  slug: string;
  timezone: string;
  theme_color: string;
  email_notifications: boolean;
  webhook_url: string;
  maintenance_message: string;
  custom_domain: string;
  seo_title: string;
  seo_description: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OrganizationSettings>({
    name: 'Acme Corp',
    description: 'A sample company status page',
    website_url: 'https://acme-corp.com',
    logo_url: '',
    slug: 'acme-corp',
    timezone: 'UTC',
    theme_color: '#2563eb',
    email_notifications: true,
    webhook_url: '',
    maintenance_message: 'We are performing scheduled maintenance.',
    custom_domain: '',
    seo_title: 'Acme Corp Status',
    seo_description: 'Real-time status and updates for Acme Corp services'
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const canManageSettings = user?.organizations?.[0]?.role === 'admin';

  const handleSaveSettings = async () => {
    if (!canManageSettings) {
      toast.error('Only administrators can modify settings');
      return;
    }

    try {
      setLoading(true);
      // Mock API call - in real app this would save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to save settings';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof OrganizationSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles', 
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'domain', label: 'Domain & SEO', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization's configuration and preferences
          </p>
        </div>
        {canManageSettings && (
          <Button onClick={handleSaveSettings} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {!canManageSettings && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                You need administrator permissions to modify organization settings.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!canManageSettings}
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      /status/
                    </span>
                    <Input
                      id="slug"
                      value={settings.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      className="rounded-l-none"
                      disabled={!canManageSettings}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of your organization"
                  disabled={!canManageSettings}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={settings.website_url}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
                    placeholder="https://example.com"
                    disabled={!canManageSettings}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={settings.timezone} 
                    onValueChange={(value) => handleInputChange('timezone', value)}
                    disabled={!canManageSettings}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branding Settings */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visual Branding</CardTitle>
              <CardDescription>
                Customize the appearance of your status page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={settings.logo_url}
                  onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  disabled={!canManageSettings}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended size: 200x50px or similar aspect ratio
                </p>
              </div>
              
              <div>
                <Label htmlFor="theme_color">Theme Color</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="theme_color"
                    type="color"
                    value={settings.theme_color}
                    onChange={(e) => handleInputChange('theme_color', e.target.value)}
                    className="w-20 h-10"
                    disabled={!canManageSettings}
                  />
                  <Input
                    value={settings.theme_color}
                    onChange={(e) => handleInputChange('theme_color', e.target.value)}
                    placeholder="#2563eb"
                    className="font-mono"
                    disabled={!canManageSettings}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="maintenance_message">Maintenance Message</Label>
                <Textarea
                  id="maintenance_message"
                  value={settings.maintenance_message}
                  onChange={(e) => handleInputChange('maintenance_message', e.target.value)}
                  placeholder="Message to display during maintenance periods"
                  disabled={!canManageSettings}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when notifications are sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for incidents and updates
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                                     onCheckedChange={(checked: boolean) => handleInputChange('email_notifications', checked)}
                  disabled={!canManageSettings}
                />
              </div>
              
              <Separator />
              
              <div>
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <Input
                  id="webhook_url"
                  type="url"
                  value={settings.webhook_url}
                  onChange={(e) => handleInputChange('webhook_url', e.target.value)}
                  placeholder="https://your-app.com/webhooks/status"
                  disabled={!canManageSettings}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Send incident and status updates to this webhook endpoint
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Domain & SEO Settings */}
      {activeTab === 'domain' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domain</CardTitle>
              <CardDescription>
                Use your own domain for the status page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="custom_domain">Custom Domain</Label>
                <Input
                  id="custom_domain"
                  value={settings.custom_domain}
                  onChange={(e) => handleInputChange('custom_domain', e.target.value)}
                  placeholder="status.yourcompany.com"
                  disabled={!canManageSettings}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Point your domain's CNAME record to: status.example.com
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Optimize your status page for search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo_title">Page Title</Label>
                <Input
                  id="seo_title"
                  value={settings.seo_title}
                  onChange={(e) => handleInputChange('seo_title', e.target.value)}
                  placeholder="Your Company Status"
                  disabled={!canManageSettings}
                />
              </div>
              
              <div>
                <Label htmlFor="seo_description">Meta Description</Label>
                <Textarea
                  id="seo_description"
                  value={settings.seo_description}
                  onChange={(e) => handleInputChange('seo_description', e.target.value)}
                  placeholder="Real-time status and updates for our services"
                  maxLength={160}
                  disabled={!canManageSettings}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {settings.seo_description.length}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>
                Manage API keys and access tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Use this key to access the API programmatically
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              
              {canManageSettings && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Generate New Key
                  </Button>
                  <Button variant="outline" size="sm">
                    Copy Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canManageSettings && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Organization</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this organization and all its data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 