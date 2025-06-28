import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
    getServiceEndpoint, fetchVolumes, fetchInstances,
    createVolumeAPI, deleteVolumeAPI, attachVolumeAPI, detachVolumeAPI
} from '../../../services/OpenStackAPIService';
import { Volume, Instance } from '../../../types';
import Button from '../../common/Button';
import CreateVolumeModal from './CreateVolumeModal';
import VolumeTable from './VolumeTable';
import Spinner from '../../common/Spinner';
import { PlusCircle, RefreshCw } from 'lucide-react';
import Card from '../../common/Card';
import { useToast } from '../../../hooks/useToast';

const VolumeManagerPanel: React.FC = () => {
  const { authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast();
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!authToken || !serviceCatalog) {
      setError("Not authenticated or service catalog unavailable.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');

    if (!volumeUrl || !computeUrl) {
        const errorMsg = "Volume or Compute service endpoint not found in catalog.";
        setError(errorMsg);
        addToast(errorMsg, 'error');
        setIsLoading(false);
        return;
    }

    try {
      const [volumeData, instanceData] = await Promise.all([
        fetchVolumes(authToken, volumeUrl),
        fetchInstances(authToken, computeUrl)
      ]);
      setVolumes(volumeData.map(v => ({...v, type: v.type || v['volume_type'] }))); 
      setInstances(instanceData);
    } catch (err) {
      console.error("Error fetching volume data:", err);
      const errorMsg = `Failed to load volume data: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, serviceCatalog, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateVolume = async (params: { name: string; size: number; type?: string, availabilityZone?: string }) => {
    if (!authToken || !serviceCatalog) { 
      addToast("Cannot create: Not authenticated.", 'error'); 
      return; 
    }
    const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');
    if (!volumeUrl) { 
      addToast("Cannot create: Volume service endpoint not found.", 'error'); 
      return; 
    }
    
    setIsLoading(true);
    try {
      await createVolumeAPI(authToken, volumeUrl, {
        name: params.name, 
        size: params.size, 
        type: params.type,
        availability_zone: params.availabilityZone
      });
      addToast(`Volume '${params.name}' creation initiated.`, 'success');
      setIsCreateModalOpen(false);
      setTimeout(fetchData, 2000); 
    } catch (err) {
      console.error("Error creating volume:", err);
      const errorMsg = `Failed to create volume: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
      setIsLoading(false); 
    }
  };

  const handleVolumeAction = async (volumeId: string, action: 'delete' | 'attach' | 'detach', instanceId?: string) => {
    if (!authToken || !serviceCatalog) { 
      addToast("Cannot perform action: Not authenticated.", 'error'); 
      return; 
    }
    const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');

    if (!volumeUrl || !computeUrl) { 
      addToast("Service endpoint not found.", 'error'); 
      return; 
    }

    try {
      if (action === 'delete') {
        await deleteVolumeAPI(authToken, volumeUrl, volumeId);
        addToast(`Volume ${volumeId} deletion initiated.`, 'success');
      } else if (action === 'attach' && instanceId) {
        await attachVolumeAPI(authToken, computeUrl, instanceId, volumeId);
        addToast(`Attaching volume ${volumeId} to instance ${instanceId}.`, 'success');
      } else if (action === 'detach') {
        const volume = volumes.find(v => v.id === volumeId);
        const currentAttachment = volume?.attachments?.find(att => att.volume_id === volumeId);
        if (volume && currentAttachment?.server_id) {
          await detachVolumeAPI(authToken, computeUrl, currentAttachment.server_id, volumeId); 
          addToast(`Detaching volume ${volumeId}.`, 'success');
        } else {
          throw new Error("Volume not attached or attachment details missing.");
        }
      }
      setTimeout(fetchData, 3000); 
    } catch (err) {
       console.error(`Error performing ${action} on volume ${volumeId}:`, err);
       const errorMsg = `Failed to ${action} volume: ${(err as Error).message}`;
       setError(errorMsg);
       addToast(errorMsg, 'error');
    }
  };

  if (!authToken) return <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-md">Please login to manage volumes.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-100">Volume Management</h2>
        <div className="space-x-2">
          <Button onClick={() => fetchData()} variant="outline" isLoading={isLoading && volumes.length > 0} disabled={isLoading && volumes.length > 0}>
            <RefreshCw size={18} className={(isLoading && volumes.length > 0) ? "animate-spin" : ""} />
            <span className="ml-2">Refresh</span>
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white" disabled={isLoading}>
            <PlusCircle size={18} className="mr-2" /> Create Volume
          </Button>
        </div>
      </div>

      {error && <div className="text-red-400 p-4 bg-red-900/30 rounded-md my-4">{error}</div>}
      
      <Card>
        {isLoading && volumes.length === 0 ? (
          <div className="flex justify-center items-center h-64"><Spinner text="Loading volumes..." size="lg" /></div>
        ) : volumes.length > 0 ? (
          <VolumeTable volumes={volumes} instances={instances} onAction={handleVolumeAction} />
        ) : (
           !isLoading && <p className="text-center text-slate-400 py-8">No volumes found. Create one to get started!</p>
        )}
      </Card>

      {isCreateModalOpen && (
        <CreateVolumeModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateVolume}
        />
      )}
      <p className="text-sm text-slate-500 mt-4">
        AI Integration Ideas: Advice on volume types or sizes based on use case (e.g., "high-performance database").
      </p>
    </div>
  );
};

export default VolumeManagerPanel;