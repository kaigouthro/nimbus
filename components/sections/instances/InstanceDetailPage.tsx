
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { 
    getServiceEndpoint, fetchInstanceDetailsAPI, 
    fetchVolumes, fetchFlavors, fetchImages, fetchSecurityGroups,
    getInstanceConsoleUrlAPI // Import the console API function
} from '../../../services/OpenStackAPIService';
import { Instance, Volume, Flavor, Image as OpenStackImage, SecurityGroup } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Button from '../../common/Button';
import { ArrowLeft, Server, Settings, Network, Shield, HardDrive, Terminal, Layers, Users, CalendarDays, Tag, Cpu, Zap, Disc3, KeyRound, ExternalLink } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';

const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleString() : 'N/A';

const DetailItem: React.FC<{ label: string; value?: string | number | null; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium text-slate-400 flex items-center">
      {icon && <span className="mr-2 text-teal-400">{icon}</span>}
      {label}
    </dt>
    <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2 break-all">{value ?? 'N/A'}</dd>
  </div>
);

const InstanceDetailPage: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const { authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast();

  const [instance, setInstance] = useState<Instance | null>(null);
  const [allVolumes, setAllVolumes] = useState<Volume[]>([]);
  const [allFlavors, setAllFlavors] = useState<Flavor[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [allImages, setAllImages] = useState<OpenStackImage[]>([]); // Kept for future use if needed
  const [allSecurityGroups, setAllSecurityGroups] = useState<SecurityGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'console'>('overview');
  const [isConsoleLoading, setIsConsoleLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!authToken || !serviceCatalog || !instanceId) {
      setError("Authentication details or instance ID missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
      const volumeUrl = getServiceEndpoint(serviceCatalog, 'volumev3') || getServiceEndpoint(serviceCatalog, 'volumev2');
      const imageUrl = getServiceEndpoint(serviceCatalog, 'image');
      const networkUrl = getServiceEndpoint(serviceCatalog, 'network');

      if (!computeUrl) throw new Error("Compute service endpoint not found.");

      const instanceDetailsPromise = fetchInstanceDetailsAPI(authToken, computeUrl, instanceId);
      const volumesPromise = volumeUrl ? fetchVolumes(authToken, volumeUrl) : Promise.resolve([]);
      const flavorsPromise = fetchFlavors(authToken, computeUrl); 
      const imagesPromise = imageUrl ? fetchImages(authToken, imageUrl) : Promise.resolve([]); 
      const sgsPromise = networkUrl ? fetchSecurityGroups(authToken, networkUrl) : Promise.resolve([]);


      const [instanceData, volumeData, flavorData, imageData, sgData] = await Promise.all([
        instanceDetailsPromise,
        volumesPromise,
        flavorsPromise,
        imagesPromise,
        sgsPromise
      ]);
      
      const flavor = flavorData.find(f => f.id === instanceData.flavor.id);
      if (flavor) instanceData.flavor.name = flavor.name;
      
      const image = imageData.find(img => img.id === instanceData.image.id);
      if (image) instanceData.image.name = image.name;

      setInstance(instanceData);
      setAllVolumes(volumeData);
      setAllFlavors(flavorData); 
      setAllImages(imageData);   
      setAllSecurityGroups(sgData);

    } catch (err) {
      console.error("Error fetching instance details:", err);
      const errorMsg = `Failed to load instance details: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [authToken, serviceCatalog, instanceId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLoadConsole = async () => {
    if (!instance || !authToken || !serviceCatalog) {
        addToast("Cannot get console: Instance data or auth details missing.", 'error');
        return;
    }
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    if (!computeUrl) {
        addToast("Compute service endpoint not found for console.", 'error');
        return;
    }

    setIsConsoleLoading(true);
    try {
        const consoleData = await getInstanceConsoleUrlAPI(authToken, computeUrl, instance.id);
        if (consoleData.console && consoleData.console.url) {
            window.open(consoleData.console.url, '_blank', 'noopener,noreferrer');
            addToast(`Console URL for instance ${instance.name} opened in a new window.`, 'info');
        } else {
            throw new Error("Console URL not found in the server response.");
        }
    } catch (err) {
        console.error("Error fetching console URL:", err);
        const errorMsg = `Failed to load console: ${(err as Error).message}`;
        addToast(errorMsg, 'error');
    } finally {
        setIsConsoleLoading(false);
    }
  };


  const attachedVolumesInfo = instance 
    ? (instance['os-extended-volumes:volumes_attached'] || [])
        .map(attached => allVolumes.find(v => v.id === attached.id))
        .filter(Boolean) as Volume[]
    : [];

  const instanceSecurityGroups = instance?.securityGroups
    ? allSecurityGroups.filter(sg => instance.securityGroups?.includes(sg.name)) 
    : [];

  const isConsoleActionable = instance?.status.toLowerCase() === 'active' && instance?.powerState.toLowerCase() === 'running';

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner text="Loading instance details..." size="lg" /></div>;
  if (error) return <div className="text-red-400 p-4 bg-red-900/30 rounded-md">{error}</div>;
  if (!instance) return <div className="text-center text-slate-400 py-8">Instance not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/instances" className="inline-flex items-center text-teal-400 hover:text-teal-300 mb-4">
        <ArrowLeft size={18} className="mr-2" /> Back to Instances List
      </Link>
      <h2 className="text-3xl font-semibold text-slate-100 flex items-center">
        <Server size={30} className="mr-3 text-teal-400" /> {instance.name}
      </h2>

      <div className="border-b border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'overview' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'console' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
          >
            Console
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Instance Details">
              <dl>
                <DetailItem label="ID" value={instance.id} icon={<Tag />} />
                <DetailItem label="Status" value={instance.status} icon={<Server />} />
                <DetailItem label="Power State" value={instance.powerState} icon={<Zap />} />
                <DetailItem label="Availability Zone" value={instance['OS-EXT-AZ:availability_zone']} icon={<Layers />} />
                <DetailItem label="Created" value={formatDate(instance.created)} icon={<CalendarDays />} />
                <DetailItem label="User ID" value={instance.userId} icon={<Users />} />
                <DetailItem label="Host ID" value={instance.hostId} icon={<Server />} />
              </dl>
            </Card>
            <Card title="Configuration">
              <dl>
                <DetailItem label="Flavor" value={`${instance.flavor.name || instance.flavor.id} (${allFlavors.find(f=>f.id === instance.flavor.id)?.vcpus || 'N/A'} VCPUs, ${allFlavors.find(f=>f.id === instance.flavor.id)?.ram || 'N/A'} MB RAM, ${allFlavors.find(f=>f.id === instance.flavor.id)?.disk || 'N/A'} GB Disk)`} icon={<Cpu />}/>
                <DetailItem label="Image" value={instance.image.name || instance.image.id} icon={<Disc3 />} />
                <DetailItem label="Key Pair" value={instance.keyPair} icon={<KeyRound />} />
              </dl>
            </Card>
             <Card title="Networking">
              <dl>
                <DetailItem label="IP Addresses" value={instance.ipAddress} icon={<Network />} />
              </dl>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card title="Security Groups">
                {instanceSecurityGroups.length > 0 ? (
                    <ul className="space-y-1">
                    {instanceSecurityGroups.map(sg => (
                        <li key={sg.id} className="text-sm text-slate-300 p-1 bg-slate-700/50 rounded text-center">{sg.name}</li>
                    ))}
                    </ul>
                ) : <p className="text-sm text-slate-400">No security groups associated.</p>}
            </Card>
            <Card title="Attached Volumes">
                {attachedVolumesInfo.length > 0 ? (
                    <ul className="space-y-2">
                    {attachedVolumesInfo.map(vol => (
                        <li key={vol.id} className="p-2 bg-slate-700/50 rounded">
                           <p className="text-sm font-medium text-slate-200">{vol.name}</p>
                           <p className="text-xs text-slate-400">Size: {vol.size} GB | Device: {vol.attachments?.find(att => att.volume_id === vol.id)?.device || 'N/A'}</p>
                        </li>
                    ))}
                    </ul>
                ) : <p className="text-sm text-slate-400">No volumes attached.</p>}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'console' && (
        <Card title="Instance Web Console">
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Click the button below to attempt to load the web console for this instance.
              The console will open in a new browser window or tab.
            </p>
            <Button 
              onClick={handleLoadConsole} 
              isLoading={isConsoleLoading}
              disabled={!isConsoleActionable || isConsoleLoading}
              className="bg-teal-500 hover:bg-teal-600 text-white"
              leftIcon={<ExternalLink size={18}/>}
            >
              {isConsoleLoading ? "Loading Console..." : "Open Web Console"}
            </Button>
            {!isConsoleActionable && (
              <p className="text-xs text-yellow-400 bg-yellow-900/30 p-2 rounded-md">
                Instance must be in ACTIVE state and Running power state to access the web console. 
                Current status: {instance.status}, Power state: {instance.powerState}.
              </p>
            )}
             <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded min-h-[200px] flex flex-col items-center justify-center">
              <Terminal size={48} className="text-slate-600 mb-3" />
              <p className="text-slate-500 text-center">
                This panel is for initiating console access. The console itself will open in a separate window provided by OpenStack.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InstanceDetailPage;
