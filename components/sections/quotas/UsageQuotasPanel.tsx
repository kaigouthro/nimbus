import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { getServiceEndpoint, fetchAllQuotas, fetchInstances, fetchVolumes, fetchFloatingIPs, fetchSecurityGroups } from '../../../services/OpenStackAPIService';
import { Quota, Instance, Volume, FloatingIP, SecurityGroup } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import QuotaBar from './QuotaBar';
import { Activity, Cpu, Zap, Server, Database, Globe, Shield } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';

const QuotaIcon: React.FC<{ resourceName: string }> = ({ resourceName }) => {
  const name = resourceName.toLowerCase();
  if (name.includes('cpu')) return <Cpu className="h-5 w-5 text-blue-400" />;
  if (name.includes('ram') || name.includes('memory')) return <Zap className="h-5 w-5 text-yellow-400" />;
  if (name.includes('instance')) return <Server className="h-5 w-5 text-green-400" />;
  if (name.includes('volume') && !name.includes('storage')) return <Database className="h-5 w-5 text-purple-400" />;
  if (name.includes('storage') || name.includes('gigabytes')) return <Database className="h-5 w-5 text-purple-400" />;
  if (name.includes('security group')) return <Shield className="h-5 w-5 text-indigo-400" />;
  if (name.includes('floating ip')) return <Globe className="h-5 w-5 text-orange-400" />;
  return <Activity className="h-5 w-5 text-slate-400" />;
};


const UsageQuotasPanel: React.FC = () => {
  const { authToken, serviceCatalog, currentProject } = useAuth();
  const { addToast } = useToast();
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!authToken || !serviceCatalog) {
      setError("Not authenticated or service catalog unavailable.");
      setIsLoading(false);
      return;
    }
    
    const projectId = currentProject?.id;

    if (!projectId) {
        const errorMsg = "Project ID could not be determined. Quotas require a project-scoped token.";
        setError(errorMsg);
        addToast(errorMsg, 'warning');
        setIsLoading(false);
        setQuotas([]); 
        console.warn("UsageQuotasPanel: Project ID is missing. Quotas will not be fetched.");
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const quotaData = await fetchAllQuotas(authToken, serviceCatalog, projectId);
      
      const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
      const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2') || getServiceEndpoint(serviceCatalog, 'volume');
      const networkUrl = getServiceEndpoint(serviceCatalog, 'network');

      let instances: Instance[] = [];
      if (computeUrl) instances = await fetchInstances(authToken, computeUrl);
      
      let volumes: Volume[] = [];
      if (volumeUrl) volumes = await fetchVolumes(authToken, volumeUrl);

      let floatingIPsList: FloatingIP[] = [];
      if (networkUrl) floatingIPsList = await fetchFloatingIPs(authToken, networkUrl);
      
      let securityGroupsList: SecurityGroup[] = [];
      if (networkUrl) securityGroupsList = await fetchSecurityGroups(authToken, networkUrl);


      const updatedQuotas = quotaData.map(q => {
        const resourceLower = q.resource.toLowerCase();
        let used = q.used; 

        if (resourceLower.includes('instances')) used = instances.length;
        else if (resourceLower.includes('volumes') && !resourceLower.includes('storage') && !resourceLower.includes('gigabytes')) used = volumes.length;
        else if (resourceLower.includes('volume storage (gb)') || resourceLower.includes('gigabytes')) used = volumes.reduce((sum, v) => sum + v.size, 0);
        else if (resourceLower.includes('floating ip')) used = floatingIPsList.length;
        else if (resourceLower.includes('security group')) used = securityGroupsList.length;
        
        return { ...q, used };
      });

      setQuotas(updatedQuotas);
    } catch (err) {
      console.error("Error fetching quota data:", err);
      const errorMsg = `Failed to load quota data: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, serviceCatalog, currentProject, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!authToken) return <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-md">Please login to view quotas.</div>;
  if (isLoading) return <div className="flex justify-center items-center h-full"><Spinner text="Loading quotas..." size="lg" /></div>;
  

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-slate-100">Usage & Quotas</h2>
      {error && <div className="text-red-400 p-4 bg-red-900/30 rounded-md my-4">{error}</div>}
      
      {!currentProject?.id && !isLoading && (
         <Card>
            <p className="text-center text-yellow-500 py-8 bg-yellow-900/20 rounded-md">
                No project is currently scoped in your session. Full quota information requires a project-scoped token.
            </p>
        </Card>
      )}

      {quotas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotas.map(quota => (
            <Card key={quota.resource} className="shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-semibold text-slate-100 flex items-center">
                  <QuotaIcon resourceName={quota.resource} />
                  <span className="ml-2">{quota.resource}</span>
                </h3>
                <span className="text-sm text-slate-400">
                  {quota.used === -1 ? 'N/A' : quota.used} / {quota.limit > 0 || quota.limit === -1 ? (quota.limit === -1 ? 'Unlimited' : quota.limit) : (quota.limit === 0 ? '0' : 'Unlimited')}
                </span>
              </div>
              <QuotaBar used={quota.used === -1 ? 0 : quota.used} limit={quota.limit} />
            </Card>
          ))}
        </div>
      ) : (
        !isLoading && currentProject?.id && <Card><p className="text-center text-slate-400 py-8">No quota information available for the current project.</p></Card>
      )}
      <p className="text-sm text-slate-500 mt-4">
        Note: 'Used' values for some resources like vCPUs and RAM are derived from fetched resource lists if not directly provided by the quota API. 'N/A' indicates unavailable data.
        A limit of -1 typically means unlimited.
      </p>
    </div>
  );
};

export default UsageQuotasPanel;