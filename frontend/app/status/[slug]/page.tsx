import { notFound } from 'next/navigation';

// Generate static parameters for common organization slugs
export async function generateStaticParams() {
  return [
    { slug: 'acme-corp' },
    { slug: 'tech-corp' },
    { slug: 'demo-org' },
    { slug: 'my-company' },
    { slug: 'startup-inc' },
  ];
}

interface Params {
  slug: string;
}

interface StatusPageProps {
  params: Promise<Params>;
}

// This is a server component that will be statically generated
export default async function OrganizationStatusPage({ params }: StatusPageProps) {
  const { slug } = await params;

  // For static export, we'll render a client component that handles the API calls
  return (
    <html>
      <head>
        <title>{slug} Status Page</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/_next/static/css/104226aaee078494.css" />
      </head>
      <body>
        <div id="__next">
          <div className="min-h-screen bg-gray-50">
            {/* Static status page that will be hydrated */}
            <div className="bg-white border-b">
              <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-blue-600 rounded"></div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{slug} Status</h1>
                    <p className="text-gray-600">Current system status and uptime information</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading {slug} status...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Client-side script to load the actual status */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const slug = '${slug}';
              const API_BASE_URL = window.location.origin;
              
              async function loadStatus() {
                try {
                  const response = await fetch(API_BASE_URL + '/api/v1/status/public/' + slug);
                  const data = await response.json();
                  
                  if (response.ok) {
                    // Replace the loading content with actual status
                    document.querySelector('#__next').innerHTML = renderStatusPage(data, slug);
                  } else {
                    document.querySelector('#__next').innerHTML = renderErrorPage(slug);
                  }
                } catch (error) {
                  console.error('Failed to load status:', error);
                  document.querySelector('#__next').innerHTML = renderErrorPage(slug);
                }
              }
              
              function renderStatusPage(data, slug) {
                const { organization, services, overall_status, uptime_percentage } = data;
                
                return \`
                  <div class="min-h-screen bg-gray-50">
                    <div class="bg-white border-b">
                      <div class="max-w-4xl mx-auto px-4 py-6">
                        <div class="flex items-center space-x-3">
                          <div class="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
                            <svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z"/>
                            </svg>
                          </div>
                          <div>
                            <h1 class="text-2xl font-bold text-gray-900">\${organization?.name || slug} Status</h1>
                            <p class="text-gray-600">Current system status and uptime information</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
                      <!-- Overall Status -->
                      <div class="bg-white rounded-lg shadow">
                        <div class="p-6">
                          <h2 class="text-lg font-semibold mb-4 flex items-center">
                            <div class="w-3 h-3 rounded-full \${getStatusColor(overall_status)} mr-2"></div>
                            System Status
                          </h2>
                          <div class="flex items-center justify-between">
                            <span class="text-lg font-medium">\${getStatusText(overall_status)}</span>
                            \${uptime_percentage ? \`<span class="text-sm bg-gray-100 px-2 py-1 rounded">\${uptime_percentage.toFixed(2)}% uptime (30 days)</span>\` : ''}
                          </div>
                        </div>
                      </div>
                      
                      <!-- Services -->
                      <div class="space-y-4">
                        <h2 class="text-xl font-semibold text-gray-900">Services</h2>
                        \${services && services.length > 0 ? services.map(service => \`
                          <div class="bg-white rounded-lg shadow p-4">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center space-x-3">
                                <div class="w-3 h-3 rounded-full \${getStatusColor(service.status)}"></div>
                                <div>
                                  <h3 class="font-medium text-gray-900">\${service.name}</h3>
                                  \${service.description ? \`<p class="text-sm text-gray-600">\${service.description}</p>\` : ''}
                                </div>
                              </div>
                              <div class="text-right">
                                <span class="inline-block px-2 py-1 text-xs font-medium rounded \${service.status === 'operational' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                  \${getStatusText(service.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                        \`).join('') : '<div class="bg-white rounded-lg shadow p-6 text-center text-gray-600">No services to display</div>'}
                      </div>
                      
                      <!-- Footer -->
                      <div class="text-center pt-8 pb-4">
                        <p class="text-sm text-gray-500">
                          Status page powered by Status Monitor • Last updated: \${new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                \`;
              }
              
              function renderErrorPage(slug) {
                return \`
                  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div class="text-center max-w-md mx-auto p-6">
                      <div class="h-16 w-16 bg-gray-400 rounded mx-auto mb-4 flex items-center justify-center">
                        <svg class="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z"/>
                        </svg>
                      </div>
                      <h1 class="text-2xl font-bold text-gray-900 mb-2">Status Page Not Found</h1>
                      <p class="text-gray-600 mb-6">
                        The status page for "\${slug}" doesn't exist or is currently unavailable.
                      </p>
                      <div class="text-sm text-gray-500">
                        <p>Organization: <code class="bg-gray-100 px-2 py-1 rounded">\${slug}</code></p>
                      </div>
                    </div>
                  </div>
                \`;
              }
              
              function getStatusColor(status) {
                switch (status) {
                  case 'operational': return 'bg-green-500';
                  case 'degraded_performance': return 'bg-yellow-500';
                  case 'partial_outage': return 'bg-orange-500';
                  case 'major_outage': return 'bg-red-500';
                  case 'maintenance': return 'bg-blue-500';
                  default: return 'bg-gray-500';
                }
              }
              
              function getStatusText(status) {
                switch (status) {
                  case 'operational': return 'Operational';
                  case 'degraded_performance': return 'Degraded Performance';
                  case 'partial_outage': return 'Partial Outage';
                  case 'major_outage': return 'Major Outage';
                  case 'maintenance': return 'Under Maintenance';
                  default: return 'Unknown';
                }
              }
              
              // Load status when page loads
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', loadStatus);
              } else {
                loadStatus();
              }
            })();
          `
        }} />
      </body>
    </html>
  );
}