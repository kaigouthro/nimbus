import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
    getServiceEndpoint, fetchInstances, fetchFlavors, fetchImages, 
    fetchNetworks, fetchSecurityGroups, fetchKeyPairs,
    launchInstanceAPI, terminateInstanceAPI, controlInstancePowerAPI,
    getInstanceConsoleUrlAPI, shelveInstanceAPI, unshelveInstanceAPI, createInstanceSnapshotAPI,
    attachVolumeAPI, detachVolumeAPI // Added attach/detach
} from '../../../services/OpenStackAPIService';
import { Instance, Flavor, Image as OpenStackImage, Network, SecurityGroup, KeyPair } from '../../../types';
import Button from '../../common/Button';
import InstanceTable from './InstanceTable';
import LaunchInstanceWizard from './LaunchInstanceWizard';
import Spinner from '../../common/Spinner';
import { PlusCircle, RefreshCw } from 'lucide-react';
import Card from '../../common/Card';
import { useToast } from '../../../hooks/useToast';

type InstanceAction = 'start' | 'stop' | 'reboot' | 'terminate' | 'get-console' | 'shelve' | 'unshelve' | 'attachVolume' | 'detachVolume' | 'create-snapshot';


const InstanceManagerPanel: React.FC = () => {
  const { authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [images, setImages] = useState<OpenStackImage[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [securityGroups, setSecurityGroups] = useState<SecurityGroup[]>([]);
  const [keyPairs, setKeyPairs] = useState<KeyPair[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!authToken || !serviceCatalog) {
      setError("Not authenticated or service catalog unavailable.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    const imageUrl = getServiceEndpoint(serviceCatalog, 'image');
    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');

    if (!computeUrl) {
        setError("Compute service endpoint not found in catalog.");
        addToast("Compute service endpoint not found in catalog.", 'error');
        setIsLoading(false);
        return;
    }

    try {
      const promises = [
        fetchInstances(authToken, computeUrl),
        fetchFlavors(authToken, computeUrl),
        imageUrl ? fetchImages(authToken, imageUrl) : Promise.resolve([]),
        networkUrl ? fetchNetworks(authToken, networkUrl) : Promise.resolve([]),
        networkUrl ? fetchSecurityGroups(authToken, networkUrl) : Promise.resolve([]),
        fetchKeyPairs(authToken, computeUrl),
      ];

      const [
        instanceData, 
        flavorData, 
        imageData, 
        networkData, 
        sgData, 
        keyPairData
      ] = await Promise.all(promises as [
        Promise<Instance[]>, Promise<Flavor[]>, Promise<OpenStackImage[]>, 
        Promise<Network[]>, Promise<SecurityGroup[]>, Promise<KeyPair[]>
      ]);
      
      setInstances(instanceData);
      setFlavors(flavorData);
      setImages(imageData);
      setNetworks(networkData);
      setSecurityGroups(sgData);
      setKeyPairs(keyPairData);

    } catch (err) {
      console.error("Error fetching instance data:", err);
      const errorMsg = `Failed to load instance data: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, serviceCatalog, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLaunchInstance = async (params: {
    name: string; count: number; imageId: string; flavorId: string; 
    networkIds: string[]; securityGroupIds: string[]; keyPairName: string;
  }) => {
    if (!authToken || !serviceCatalog) { 
      addToast("Cannot launch: Not authenticated.", 'error'); 
      return; 
    }
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    if (!computeUrl) { 
      addToast("Cannot launch: Compute service endpoint not found.", 'error'); 
      return; 
    }

    setIsLoading(true); // Indicate loading for the launch operation
    try {
      for (let i = 0; i < params.count; i++) {
        const instanceName = params.count > 1 ? `${params.name}-${i + 1}` : params.name;
        const launchParams = {
            name: instanceName,
            imageId: params.imageId,
            flavorId: params.flavorId,
            networkIds: params.networkIds,
            securityGroupIds: params.securityGroupIds,
            keyPairName: params.keyPairName,
        };
        await launchInstanceAPI(authToken, computeUrl, launchParams);
      }
      addToast(`Instance(s) '${params.name}' launched successfully!`, 'success');
      setIsWizardOpen(false);
      setTimeout(fetchData, 3000); 
    } catch (err) {
      console.error("Error launching instance:", err);
      const errorMsg = `Failed to launch instance: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
      setIsLoading(false); 
    }
  };
  
  const handleAction = async (instanceId: string, action: InstanceAction) => {
    if (!authToken || !serviceCatalog) { 
      addToast("Cannot perform action: Not authenticated.", 'error'); 
      return; 
    }
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    if (!computeUrl) { 
      addToast("Cannot perform action: Compute service endpoint not found.", 'error'); 
      return; 
    }
    
    let actionInProgress = true; // To control fetchData delay for non-console actions

    try {
      switch (action) {
        case 'terminate':
          await terminateInstanceAPI(authToken, computeUrl, instanceId);
          addToast(`Instance ${instanceId} termination initiated.`, 'success');
          break;
        case 'start':
          await controlInstancePowerAPI(authToken, computeUrl, instanceId, 'os-start');
          addToast(`Instance ${instanceId} start initiated.`, 'success');
          break;
        case 'stop':
          await controlInstancePowerAPI(authToken, computeUrl, instanceId, 'os-stop');
          addToast(`Instance ${instanceId} stop initiated.`, 'success');
          break;
        case 'reboot':
          await controlInstancePowerAPI(authToken, computeUrl, instanceId, 'reboot');
          addToast(`Instance ${instanceId} reboot initiated.`, 'success');
          break;
        case 'get-console':
          const consoleData = await getInstanceConsoleUrlAPI(authToken, computeUrl, instanceId);
          if (consoleData.console && consoleData.console.url) {
            window.open(consoleData.console.url, '_blank', 'noopener,noreferrer');
            addToast(`Console URL for instance ${instanceId} opened.`, 'info');
          } else {
            throw new Error("Console URL not found in response.");
          }
          actionInProgress = false; // No need to refetch for console
          break;
        case 'shelve':
          await shelveInstanceAPI(authToken, computeUrl, instanceId);
          addToast(`Instance ${instanceId} shelve initiated.`, 'success');
          break;
        case 'unshelve':
          await unshelveInstanceAPI(authToken, computeUrl, instanceId);
          addToast(`Instance ${instanceId} unshelve initiated.`, 'success');
          break;
        case 'create-snapshot':
          // eslint-disable-next-line no-case-declarations
          const currentInstanceForSnapshot = instances.find(inst => inst.id === instanceId);
          // eslint-disable-next-line no-case-declarations
          const snapshotNameSuggestion = `snapshot-${currentInstanceForSnapshot?.name || instanceId}-${new Date().toISOString().split('T')[0]}`;
          // eslint-disable-next-line no-case-declarations
          const snapshotName = window.prompt(`Enter a name for the snapshot of instance "${currentInstanceForSnapshot?.name || instanceId}":`, snapshotNameSuggestion);
          if (snapshotName) {
            await createInstanceSnapshotAPI(authToken, computeUrl, instanceId, snapshotName);
            addToast(`Snapshot '${snapshotName}' creation initiated for instance ${instanceId}. This may take a few moments. You can check the Images section for progress.`, 'success', 7000); // Longer toast
          } else {
            addToast('Snapshot creation cancelled.', 'info');
            actionInProgress = false; // No API call was made
          }
          // Snapshots don't immediately update instance state. A refresh of the images list (on the Images page) would be needed.
          // A delayed fetchData here might catch some very quick instance status changes if any (e.g. 'SNAPSHOTTING'), but not guaranteed.
          break;
        case 'attachVolume':
          // eslint-disable-next-line no-case-declarations
          const instanceToAttachTo = instances.find(inst => inst.id === instanceId);
          // eslint-disable-next-line no-case-declarations
          const volumeIdToAttach = window.prompt(`Enter the ID of the AVAILABLE volume to attach to instance "${instanceToAttachTo?.name || instanceId}":`);
          if (volumeIdToAttach) {
            // TODO: Ideally, fetch available volumes and present a select list
            await attachVolumeAPI(authToken, computeUrl, instanceId, volumeIdToAttach);
            addToast(`Attaching volume ${volumeIdToAttach} to instance ${instanceId}. This may take a moment.`, 'success', 5000);
          } else {
            addToast('Volume attach cancelled.', 'info');
            actionInProgress = false;
          }
          break;
        case 'detachVolume':
          // eslint-disable-next-line no-case-declarations
          const instanceToDetachFrom = instances.find(inst => inst.id === instanceId);
          // eslint-disable-next-line no-case-declarations
          const volumesAttached = instanceToDetachFrom?.['os-extended-volumes:volumes_attached'];
          if (volumesAttached && volumesAttached.length > 0) {
            // For simplicity, detaching the first volume. A real UI would let the user choose.
            const volumeToDetach = volumesAttached[0];
            if (window.confirm(`Are you sure you want to detach volume "${volumeToDetach.id}" from instance "${instanceToDetachFrom?.name || instanceId}"?`)) {
              await detachVolumeAPI(authToken, computeUrl, instanceId, volumeToDetach.id); // API uses volumeId as attachmentId here
              addToast(`Detaching volume ${volumeToDetach.id} from instance ${instanceId}. This may take a moment.`, 'success', 5000);
            } else {
              addToast('Volume detach cancelled.', 'info');
              actionInProgress = false;
            }
          } else {
            addToast('No volumes found attached to this instance to detach.', 'warning');
            actionInProgress = false;
          }
          break;
        default:
          // Ensure exhaustive check if new actions are added to InstanceAction type
          const _exhaustiveCheck: never = action; // This will cause a type error if a case is missed
          console.warn(`Unsupported instance action: ${action}`); // Use action directly in console.warn for clarity
          addToast(`Unsupported instance action: ${action}`, 'warning'); // Use action for toast message
          actionInProgress = false;
          return; 
      }
      if (actionInProgress) {
        // Slightly longer delay for snapshot to allow OpenStack to potentially start showing task state
        // though the primary feedback is the toast and users should check Images page.
        setTimeout(fetchData, action === 'create-snapshot' ? 4000 : 2000);
      }
    } catch (err) {
      console.error(`Error performing action ${action} on instance ${instanceId}:`, err);
      const errorMsg = `Failed to ${action} instance: ${(err as Error).message}.`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    }
  };

  if (!authToken) return <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-md">Please login to manage instances.</div>;

  return (
    <div className="space-y-6 flex flex-col flex-1">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-100">Instance Management</h2>
        <div className="space-x-2">
          <Button onClick={() => fetchData()} variant="outline" isLoading={isLoading && instances.length > 0} disabled={isLoading && instances.length > 0}>
            <RefreshCw size={18} className={(isLoading && instances.length > 0) ? "animate-spin" : ""} />
            <span className="ml-2">Refresh</span>
          </Button>
          <Button onClick={() => setIsWizardOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white" disabled={isLoading}>
            <PlusCircle size={18} className="mr-2" /> Launch Instance
          </Button>
        </div>
      </div>

      {error && <div className="text-red-400 p-4 bg-red-900/30 rounded-md my-4">{error}</div>}
      
      <Card className="flex-1 flex flex-col" contentClassName="flex-1 flex flex-col">
        {isLoading && instances.length === 0 ? (
           <div className="flex-1 flex justify-center items-center h-64"><Spinner text="Loading instances..." size="lg" /></div>
        ) : instances.length > 0 ? (
          <InstanceTable instances={instances} onAction={handleAction} />
        ) : (
          !isLoading && <div className="flex-1 flex justify-center items-center"><p className="text-center text-slate-400 py-8">No instances found. Launch one to get started!</p></div>
        )}
      </Card>

      {isWizardOpen && (
        <LaunchInstanceWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onLaunch={handleLaunchInstance}
          flavors={flavors.filter(f => f.isPublic !== false)} 
          images={images.filter(img => img.status === 'active')}
          networks={networks}
          securityGroups={securityGroups}
          keyPairs={keyPairs}
        />
      )}
       <p className="text-sm text-slate-500 mt-4">
        AI Integration Ideas: Flavor recommendation based on workload description (e.g., "small web server"). Image suggestion. Troubleshooting for failed launches.
      </p>
    </div>
  );
};

export default InstanceManagerPanel;