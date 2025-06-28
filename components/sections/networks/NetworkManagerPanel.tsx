import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
    getServiceEndpoint, fetchNetworks, fetchFloatingIPs, fetchInstances,
    allocateFloatingIPAPI, releaseFloatingIPAPI, associateFloatingIPAPI, disassociateFloatingIPAPI,
    fetchSubnetsAPI, fetchRoutersAPI, fetchPortsAPI // New imports
} from '../../../services/OpenStackAPIService';
import { Network, FloatingIP, Instance, Subnet, Router as OpenStackRouter, Port } from '../../../types'; // Added Subnet, Router, Port
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Button from '../../common/Button';
import { 
    NetworkIcon as NetworkLucideIcon, RefreshCw, PlusCircle, GlobeIcon, 
    Link as LinkIconLucide, Unlink, Trash2, Route, Wifi, ShieldAlert, Server, Users 
} from 'lucide-react';
import Select from '../../common/Select';
import { useToast } from '../../../hooks/useToast';

const NetworkManagerPanel: React.FC = () => {
  const { authToken, serviceCatalog, currentProject } = useAuth(); // Added currentProject
  const { addToast } = useToast();
  
  const [networks, setNetworks] = useState<Network[]>([]);
  const [floatingIPs, setFloatingIPs] = useState<FloatingIP[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(''); // For granular loading messages
  const [error, setError] = useState<string | null>(null);

  const [selectedFipToAssociate, setSelectedFipToAssociate] = useState<string>(''); 
  const [selectedInstanceIdForFip, setSelectedInstanceIdForFip] = useState<string>('');

  const fetchData = useCallback(async () => {
    if (!authToken || !serviceCatalog) {
        setError("Not authenticated or service catalog unavailable.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setLoadingStep('Loading networks...');
    setError(null);

    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');

    if (!networkUrl) {
        const errorMsg = "Network service endpoint not found in catalog.";
        setError(errorMsg);
        addToast(errorMsg, 'error');
        setIsLoading(false);
        return;
    }

    try {
      let fetchedNetworks = await fetchNetworks(authToken, networkUrl);
      setLoadingStep('Loading subnets...');
      const subnetPromises = fetchedNetworks.map(net => fetchSubnetsAPI(authToken, networkUrl, net.id));
      const subnetResults = await Promise.allSettled(subnetPromises);
      
      fetchedNetworks = fetchedNetworks.map((net, index) => {
        const result = subnetResults[index];
        if (result.status === 'fulfilled') {
          net.subnet_details = result.value;
        } else {
          console.warn(`Failed to fetch subnets for network ${net.id}:`, result.reason);
          net.subnet_details = [];
        }
        return net;
      });

      setLoadingStep('Loading routers...');
      const routers = await fetchRoutersAPI(authToken, networkUrl);
      
      setLoadingStep('Loading ports...');
      // Fetch router interface ports to determine network-router connections
      const routerInterfacePortsPromises = routers.map(router => 
        fetchPortsAPI(authToken, networkUrl, { device_id: router.id, device_owner: 'network:router_interface' })
      );
      const routerInterfacePortResults = await Promise.allSettled(routerInterfacePortsPromises);

      fetchedNetworks = fetchedNetworks.map(net => {
        net.router_details = [];
        routerInterfacePortResults.forEach((portResult, routerIndex) => {
          if (portResult.status === 'fulfilled') {
            const routerPorts: Port[] = portResult.value;
            routerPorts.forEach(port => {
              if (port.network_id === net.id) {
                const router = routers[routerIndex];
                if (!net.router_details?.find(r => r.id === router.id)) {
                   net.router_details?.push({ 
                     id: router.id, 
                     name: router.name,
                     external_gateway_info: router.external_gateway_info 
                    });
                }
              }
            });
          }
        });
        // Check if network is directly connected to an external router (gateway port on this network)
        // This logic might need refinement based on how external networks are represented.
        // For now, relying on router:external flag on network or router's external_gateway_info
        return net;
      });

      setNetworks(fetchedNetworks);

      setLoadingStep('Loading floating IPs...');
      const fipData = await fetchFloatingIPs(authToken, networkUrl);
      setFloatingIPs(fipData);

      if (computeUrl) {
        setLoadingStep('Loading instances...');
        const instanceData = await fetchInstances(authToken, computeUrl);
        setInstances(instanceData);
      } else {
        setInstances([]);
      }
      
    } catch (err) {
      console.error("Error fetching network data:", err);
      const errorMsg = `Failed to load network data: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  }, [authToken, serviceCatalog, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAllocateFloatingIP = async () => {
    if (!authToken || !serviceCatalog) { 
      addToast("Not authenticated.", 'error'); 
      return; 
    }
    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
    if (!networkUrl) { 
      addToast("Network service endpoint not found.", 'error'); 
      return; 
    }

    const publicNetwork = networks.find(n => n['router:external'] === true || n.name.toLowerCase().includes('public') || n.name.toLowerCase().includes('ext'));
    if (!publicNetwork) {
        const errorMsg = "Could not find a suitable public network to allocate Floating IP from.";
        setError(errorMsg);
        addToast(errorMsg, 'error');
        return;
    }
    
    setLoadingStep('Allocating Floating IP...');
    try {
      await allocateFloatingIPAPI(authToken, networkUrl, publicNetwork.id);
      addToast("Floating IP allocation initiated.", 'success');
      setTimeout(fetchData, 1500); 
    } catch (err) {
      const errorMsg = `Failed to allocate Floating IP: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoadingStep('');
    }
  };

  const handleFipAction = async (fipId: string, action: 'associate' | 'disassociate' | 'release') => {
    if (!authToken || !serviceCatalog) { 
      addToast("Not authenticated.", 'error'); 
      return; 
    }
    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
    if (!networkUrl) { 
      addToast("Network service endpoint not found.", 'error'); 
      return; 
    }

    try {
      if (action === 'associate') {
        if (!selectedInstanceIdForFip) {
            addToast("Please select an instance to associate the Floating IP with.", 'warning');
            return;
        }
        // This is still a placeholder using Instance ID.
        // A proper implementation would need to find/create a port on the instance's network and use that Port ID.
        addToast(`Association with instance ID ${selectedInstanceIdForFip} is a placeholder. OpenStack requires a Port ID.`, 'info', 10000);
        // For now, we'll just pretend:
        // await associateFloatingIPAPI(authToken, networkUrl, fipId, selectedInstanceIdForFip /* This should be PORT ID */);
        // addToast(`Floating IP ${fipId} association initiated.`, 'success');

      } else if (action === 'disassociate') {
        await disassociateFloatingIPAPI(authToken, networkUrl, fipId);
        addToast(`Floating IP ${fipId} disassociation initiated.`, 'success');
      } else if (action === 'release') {
        if (window.confirm("Are you sure you want to release this Floating IP?")) {
            await releaseFloatingIPAPI(authToken, networkUrl, fipId);
            addToast(`Floating IP ${fipId} release initiated.`, 'success');
        } else { return; }
      }
      setTimeout(fetchData, 1500);
      setSelectedFipToAssociate('');
      setSelectedInstanceIdForFip('');
    } catch (err) {
      const errorMsg = `Failed to ${action} Floating IP: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    }
  };

  if (!authToken) return <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-md">Please login to manage networks.</div>;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-100">Network Management</h2>
        <Button onClick={() => fetchData()} variant="outline" isLoading={isLoading} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          <span className="ml-2">Refresh</span>
        </Button>
      </div>
       {error && <div className="text-red-400 p-4 bg-red-900/30 rounded-md my-4">{error}</div>}
       {isLoading && <div className="flex justify-center items-center p-4"><Spinner text={loadingStep || "Loading network resources..."} size="md" /></div>}

      {!isLoading && networks.length === 0 && !error && (
         <Card><p className="text-slate-400 text-center py-4">No networks found.</p></Card>
      )}

      {!isLoading && networks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {networks.map(net => (
            <Card key={net.id} title={net.name} className="flex flex-col">
                <div className="text-xs text-slate-500 mb-2">ID: {net.id}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                    <div className="flex items-center"><Users size={14} className="mr-1.5 text-slate-400"/> Shared: <span className={`ml-1 font-medium ${net.shared ? 'text-green-400' : 'text-slate-300'}`}>{net.shared ? 'Yes' : 'No'}</span></div>
                    <div className="flex items-center"><Wifi size={14} className="mr-1.5 text-slate-400"/> Status: <span className={`ml-1 font-medium ${net.status === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}`}>{net.status}</span></div>
                    <div className="flex items-center"><Server size={14} className="mr-1.5 text-slate-400"/> Admin State: <span className={`ml-1 font-medium ${net.admin_state_up ? 'text-green-400' : 'text-red-400'}`}>{net.admin_state_up ? 'Up' : 'Down'}</span></div>
                    {net['router:external'] && <div className="flex items-center text-blue-400 font-medium"><GlobeIcon size={14} className="mr-1.5"/> External Network</div>}
                </div>
                
                <div className="mb-3">
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">Subnets:</h4>
                    {net.subnet_details && net.subnet_details.length > 0 ? (
                        <ul className="list-disc list-inside pl-1 space-y-0.5 text-xs">
                        {net.subnet_details.map(sub => (
                            <li key={sub.id} className="text-slate-300">
                                {sub.name && <span className="font-medium">{sub.name}: </span>}
                                {sub.cidr} (Gateway: {sub.gateway_ip || 'N/A'}, DHCP: {sub.enable_dhcp ? 'Enabled' : 'Disabled'})
                            </li>
                        ))}
                        </ul>
                    ) : <p className="text-xs text-slate-400">No subnets configured for this network.</p>}
                </div>

                <div className="mt-auto pt-2 border-t border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">Connected Routers:</h4>
                    {net.router_details && net.router_details.length > 0 ? (
                        <ul className="space-y-1 text-xs">
                        {net.router_details.map(router => (
                            <li key={router.id} className="text-slate-300 flex items-center">
                                <Route size={14} className="mr-1.5 text-slate-400"/> {router.name}
                                {router.external_gateway_info && router.external_gateway_info.network_id && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-600 text-blue-100 rounded-full flex items-center">
                                        <GlobeIcon size={12} className="mr-1"/> External Gateway
                                    </span>
                                )}
                            </li>
                        ))}
                        </ul>
                    ) : <p className="text-xs text-slate-400">No routers directly connected via interfaces on this network.</p>}
                </div>
            </Card>
          ))}
        </div>
      )}


      {!isLoading && (
        <Card title="Floating IP Management">
            <div className="mb-4">
            <Button onClick={handleAllocateFloatingIP} className="bg-teal-500 hover:bg-teal-600 text-white" disabled={isLoading || loadingStep !== ''}>
                <PlusCircle size={18} className="mr-2" /> Allocate New Floating IP
            </Button>
            </div>
            {floatingIPs.length > 0 ? (
            <ul className="divide-y divide-slate-700">
                {floatingIPs.map(fip => (
                <li key={fip.id} className="py-3 px-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                        <p className="text-md font-semibold text-slate-100 flex items-center">
                        <GlobeIcon size={18} className="mr-2 text-blue-400" /> {fip.ipAddress} ({fip.name || fip.id})
                        </p>
                        <p className="text-sm text-slate-400">Pool (Network ID): {fip.pool}</p>
                        <p className="text-sm text-slate-400">
                        Status: <span className={fip.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}>{fip.status}</span>
                        </p>
                    </div>
                    <div className="text-sm text-slate-300">
                        Associated Instance Port: {fip.port_id || 'None'} <br/>
                        Fixed IP: {fip.fixed_ip_address || 'N/A'}
                    </div>
                    <div className="flex space-x-2 justify-end items-center">
                        {!fip.port_id ? ( 
                        <>
                            <Select 
                                id={`associate-instance-${fip.id}`} 
                                value={selectedFipToAssociate === fip.id ? selectedInstanceIdForFip : ''}
                                onChange={e => { setSelectedFipToAssociate(fip.id); setSelectedInstanceIdForFip(e.target.value); }}
                                containerClassName="min-w-[150px] text-sm"
                                aria-label="Select instance to associate"
                                size={1} 
                            >
                                <option value="">-- Select Instance --</option>
                                {instances.filter(i => i.powerState === 'Running').map(inst => ( 
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </Select>
                            <Button 
                                onClick={() => handleFipAction(fip.id, 'associate')} 
                                variant="outline" size="sm" 
                                disabled={selectedFipToAssociate !== fip.id || !selectedInstanceIdForFip || isLoading || loadingStep !== ''}
                                className="text-green-400 border-green-400 hover:bg-green-400 hover:text-slate-900"
                                title="Associate FIP"
                            >
                                <LinkIconLucide size={14} />
                            </Button>
                        </>
                        ) : (
                        <Button onClick={() => handleFipAction(fip.id, 'disassociate')} variant="outline" size="sm" 
                            className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-slate-900"
                            disabled={isLoading || loadingStep !== ''} title="Disassociate FIP"
                        >
                            <Unlink size={14} />
                        </Button>
                        )}
                        <Button onClick={() => handleFipAction(fip.id, 'release')} variant="ghost" size="sm" 
                        className="text-red-400 hover:text-red-300"
                        disabled={isLoading || loadingStep !== '' || fip.port_id !== null} 
                        title={fip.port_id !== null ? "Disassociate first to release" : "Release FIP"}
                        >
                        <Trash2 size={14} />
                        </Button>
                    </div>
                    </div>
                </li>
                ))}
            </ul>
            ) : <p className="text-slate-400 text-center py-4">No Floating IPs allocated.</p>}
        </Card>
      )}
      <p className="text-sm text-slate-500 mt-4">
        AI Integration Ideas: Explain network concepts, suggest appropriate networks for new instances. Diagramming coming soon!
      </p>
    </div>
  );
};

export default NetworkManagerPanel;
