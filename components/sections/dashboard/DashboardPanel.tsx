
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
    getServiceEndpoint, fetchInstances, fetchAllQuotas, fetchFlavors, 
    fetchVolumes, fetchNetworks // Added fetchVolumes and fetchNetworks
} from '../../../services/OpenStackAPIService';
import { Quota, Instance, ServiceCatalogEntry, Flavor, Volume, Network as OpenStackNetwork } from '../../../types'; // Added Volume and OpenStackNetwork
import QuickStatCard from './QuickStatCard';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import { Server, Database, Network as NetworkLucideIcon, Cpu, Zap, AlertTriangle } from 'lucide-react';
import QuotaBar from '../quotas/QuotaBar';
import Tooltip from '../../common/Tooltip';
import { useToast } from '../../../hooks/useToast';

const DashboardPanel: React.FC = () => {
  const { authToken, serviceCatalog, currentProject } = useAuth();
  const { addToast } = useToast();
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [flavors, setFlavors] = useState<Flavor[]>([]); // Keep flavors if used elsewhere, otherwise can be removed if only for counts
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!authToken || !serviceCatalog) {
        setError("Authentication token or service catalog is missing.");
        setLoading(false);
        return;
      }
      
      const projectId = currentProject?.id;

      try {
        setLoading(true);
        setError(null);

        const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
        const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2') || getServiceEndpoint(serviceCatalog, 'volume');
        const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
        
        const instancePromise = computeUrl 
            ? fetchInstances(authToken, computeUrl) 
            : Promise.resolve<Instance[]>([]);
        
        const flavorPromise = computeUrl
            ? fetchFlavors(authToken, computeUrl)
            : Promise.resolve<Flavor[]>([]);

        const volumePromise = volumeUrl
            ? fetchVolumes(authToken, volumeUrl)
            : Promise.resolve<Volume[]>([]);
        
        const networkPromise = networkUrl
            ? fetchNetworks(authToken, networkUrl)
            : Promise.resolve<OpenStackNetwork[]>([]);

        const quotaPromise = (projectId && serviceCatalog)
            ? fetchAllQuotas(authToken, serviceCatalog, projectId)
            : Promise.resolve<Quota[]>([]);
            
        if (!projectId && !quotaPromise) {
            console.warn("Dashboard: Project ID is missing, quota information will be limited or unavailable.");
        }

        const [instanceData, flavorData, quotaData, volumeData, networkData] = await Promise.all([
            instancePromise, 
            flavorPromise, 
            quotaPromise,
            volumePromise,
            networkPromise
        ]);

        setInstances(instanceData);
        setFlavors(flavorData);
        
        const updatedQuotaData = quotaData.map(q => {
            let used = q.used; 
            const resourceLower = q.resource.toLowerCase();

            if (resourceLower.includes('instances')) {
                used = instanceData.length;
            } else if (resourceLower.includes('vcpus')) {
                 const usedVCPUs = instanceData.reduce((acc, currInst) => {
                    const flavorDetail = flavorData.find(f => f.id === currInst.flavor?.id);
                    return acc + (flavorDetail?.vcpus || 0);
                 }, 0);
                 used = usedVCPUs;
            } else if (resourceLower.includes('ram')) {
                const usedRAM = instanceData.reduce((acc, currInst) => {
                    const flavorDetail = flavorData.find(f => f.id === currInst.flavor?.id);
                    return acc + (flavorDetail?.ram || 0);
                 }, 0);
                used = usedRAM;
            } else if (resourceLower.includes('volumes') && !resourceLower.includes('storage') && !resourceLower.includes('gigabytes')) {
                // Ensure we are counting volumes, not volume storage size
                used = volumeData.length;
            } else if (resourceLower.includes('networks')) {
                used = networkData.length;
            }
            return { ...q, used };
        });

        setQuotas(updatedQuotaData);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        const errorMsg = `Failed to load dashboard data: ${(err as Error).message}`;
        setError(errorMsg);
        addToast(errorMsg, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authToken, serviceCatalog, currentProject, addToast]);


  if (loading) return <div className="flex justify-center items-center h-full"><Spinner text="Loading dashboard..." size="lg" /></div>;
  if (error) return <div className="text-red-400 p-4 bg-red-900/30 rounded-md">{error}</div>;
  if (!authToken) return <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-md">Please login to view the dashboard.</div>;


  const getQuotaValue = (resourceName: string, type: 'used' | 'limit'): number | string => {
    const quota = quotas.find(q => q.resource.toLowerCase().includes(resourceName.toLowerCase()) && 
                                  // More specific matching for volumes count vs. volume storage
                                  !(resourceName.toLowerCase() === 'volumes' && (q.resource.toLowerCase().includes('storage') || q.resource.toLowerCase().includes('gigabytes')))
                           );
    if (!quota) return 'N/A';
    if (type === 'used' && quota.used === -1) return 'N/A'; 
    return quota[type];
  };
  
  const runningInstances = instances.filter(i => i.powerState === 'Running').length;

  const importantQuotas = [
    { name: "vCPUs", resourceKey: "vcpus", icon: <Cpu className="h-8 w-8 text-blue-400" /> },
    { name: "RAM (MB)", resourceKey: "ram", icon: <Zap className="h-8 w-8 text-yellow-400" /> },
    { name: "Instances", resourceKey: "instances", icon: <Server className="h-8 w-8 text-green-400" /> },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-slate-100">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStatCard title="Running Instances" value={runningInstances.toString()} total={instances.length} icon={<Server className="h-10 w-10 text-teal-400" />} unit="Instances" />
        <QuickStatCard title="Total Volumes" value={getQuotaValue('Volumes', 'used').toString()} total={getQuotaValue('Volumes', 'limit') as number} icon={<Database className="h-10 w-10 text-purple-400" />} unit="Volumes" />
        <QuickStatCard title="Total Networks" value={getQuotaValue('Networks', 'used').toString()} total={getQuotaValue('Networks', 'limit') as number} icon={<NetworkLucideIcon className="h-10 w-10 text-indigo-400" />} unit="Networks" />
        <QuickStatCard title="Floating IPs" value={getQuotaValue('Floating IPs', 'used').toString()} total={getQuotaValue('Floating IPs', 'limit') as number} icon={<Zap className="h-10 w-10 text-orange-400" />} unit="Floating IPs" />
      </div>

      <Card title="Key Quotas">
        {!currentProject?.id && quotas.length === 0 && (
            <p className="text-yellow-400 text-center py-4 bg-yellow-900/20 rounded-md">
              Quota information may be unavailable or incomplete without a project-scoped token. Please ensure you are logged in with project scope.
            </p>
        )}
        {quotas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
            {importantQuotas.map(q_meta => {
                const quotaData = quotas.find(q => q.resource.toLowerCase().includes(q_meta.resourceKey.toLowerCase()));
                if (!quotaData) return <div key={q_meta.name} className="p-4 bg-slate-700 rounded-lg shadow"><p>{q_meta.name}: Data N/A</p></div>;

                const used = typeof quotaData.used === 'string' ? 0 : quotaData.used; 
                const limit = typeof quotaData.limit === 'string' ? 0 : quotaData.limit;
                const percentage = limit > 0 && used !== -1 ? (used / limit) * 100 : 0;
                
                return (
                <div key={q_meta.name} className="p-4 bg-slate-700 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                        {q_meta.icon}
                        <span className="ml-3 text-lg font-medium text-slate-200">{q_meta.name}</span>
                    </div>
                    {percentage > 80 && (
                        <Tooltip text="Approaching quota limit">
                           <span className="inline-block"><AlertTriangle className="h-5 w-5 text-yellow-400" /></span>
                        </Tooltip>
                    )}
                    </div>
                    <QuotaBar used={used === -1 ? 0 : used} limit={limit} />
                    <p className="text-sm text-slate-400 mt-1 text-right">
                        {used === -1 ? 'N/A' : used} / {limit > 0 ? limit : 'Unlimited'}
                    </p>
                </div>
                );
            })}
            </div>
        ) : (
            !loading && <p className="text-slate-400 text-center py-4">Quota information is currently unavailable. This might be due to missing project scope.</p>
        )}
      </Card>

      <Card title="Recent Activity (Placeholder)">
        <p className="text-slate-400">
          Activity log feature coming soon. This section will display recent actions performed by the user or significant events in the project.
          Example AI Smart Alert: "Warning: You are approaching 80% of your vCPU quota."
          Example AI Cost Saving Suggestion: "You have 3 idle instances that could be stopped to save resources."
        </p>
      </Card>

    </div>
  );
};

export default DashboardPanel;
