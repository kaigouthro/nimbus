
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  getServiceEndpoint, fetchInstanceDetailsAPI,
  fetchVolumes, fetchFlavors, fetchImages, fetchSecurityGroups,
  getInstanceConsoleUrlAPI,
  // Import actions needed for the detail page
  controlInstancePowerAPI,
  shelveInstanceAPI,
  unshelveInstanceAPI,
  terminateInstanceAPI,
  createInstanceSnapshotAPI
} from '../../../services/OpenStackAPIService';
import { Instance, Volume, Flavor, Image as OpenStackImage, SecurityGroup } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Button from '../../common/Button';
import {
  ArrowLeft, Server, Settings, Network, Shield, HardDrive, Terminal, Layers, Users, CalendarDays,
  Tag, Cpu, Zap, Disc3, KeyRound, ExternalLink, PowerIcon, ListChecks, Clock, Lock, FileText, Hash, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import Tooltip from '../../common/Tooltip'; // Added Tooltip

const formatDate = (dateString?: string | null): string => { // Ensure return type is string
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString; // Fallback if parsing fails
  }
}

// Helper to format Bytes
const formatBytes = (bytes?: number, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};


const DetailItem: React.FC<{ label: string; value?: string | number | boolean | null; icon?: React.ReactNode; className?: string; children?: React.ReactNode }> =
  ({ label, value, icon, className = '', children }) => (
    <div className={`py-2 sm:grid sm:grid-cols-3 sm:gap-4 ${className}`}>
      <dt className="text-sm font-medium text-slate-400 flex items-center">
        {icon && <span className="mr-2 text-teal-400">{icon}</span>}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2 break-words"> {/* Changed break-all to break-words */}
        {children ? children : (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ?? 'N/A'))}
      </dd>
    </div>
  );


const InstanceDetailPage: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const { authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast();

  const [instance, setInstance] = useState<Instance | null>(null);
  const [allVolumes, setAllVolumes] = useState<Volume[]>([]);
  const [allFlavors, setAllFlavors] = useState<Flavor[]>([]);
  const [allImages, setAllImages] = useState<OpenStackImage[]>([]);
  const [allSecurityGroups, setAllSecurityGroups] = useState<SecurityGroup[]>([]);
  const [showFullHostId, setShowFullHostId] = useState(false); // State for Host ID visibility

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'console' | 'metadata'>('overview');
  const [isConsoleLoading, setIsConsoleLoading] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false); // For disabling buttons during actions

  const fetchData = useCallback(async (showToastOnRefresh = false) => {
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

  const handleInstanceAction = async (action: 'start' | 'stop' | 'reboot' | 'shelve' | 'unshelve' | 'terminate' | 'create-snapshot', snapshotName?: string) => {
    if (!instance || !authToken || !serviceCatalog) {
      addToast("Cannot perform action: Instance data or auth details missing.", 'error');
      return;
    }
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    if (!computeUrl) {
      addToast("Compute service endpoint not found.", 'error');
      return;
    }

    setIsPerformingAction(true);
    try {
      switch (action) {
        case 'start':
          await controlInstancePowerAPI(authToken, computeUrl, instance.id, 'os-start');
          addToast(`Instance ${instance.name} start initiated.`, 'success');
          break;
        case 'stop':
          await controlInstancePowerAPI(authToken, computeUrl, instance.id, 'os-stop');
          addToast(`Instance ${instance.name} stop initiated.`, 'success');
          break;
        case 'reboot':
          await controlInstancePowerAPI(authToken, computeUrl, instance.id, 'reboot');
          addToast(`Instance ${instance.name} reboot initiated.`, 'success');
          break;
        case 'shelve':
          await shelveInstanceAPI(authToken, computeUrl, instance.id);
          addToast(`Instance ${instance.name} shelve initiated.`, 'success');
          break;
        case 'unshelve':
          await unshelveInstanceAPI(authToken, computeUrl, instance.id);
          addToast(`Instance ${instance.name} unshelve initiated.`, 'success');
          break;
        case 'terminate':
          // Navigating away or disabling actions after termination is ideal
          await terminateInstanceAPI(authToken, computeUrl, instance.id);
          addToast(`Instance ${instance.name} termination initiated.`, 'success', 5000);
          // Consider redirecting: history.push('/instances');
          break;
        case 'create-snapshot':
          if (snapshotName) {
            await createInstanceSnapshotAPI(authToken, computeUrl, instance.id, snapshotName);
            addToast(`Snapshot '${snapshotName}' creation initiated for instance ${instance.name}.`, 'success', 7000);
          } else {
            addToast('Snapshot name was not provided.', 'warning');
            setIsPerformingAction(false);
            return;
          }
          break;
        default:
          addToast(`Unsupported action: ${action}`, 'warning');
          setIsPerformingAction(false);
          return;
      }
      // Refresh data after a short delay to allow OpenStack to process the action
      setTimeout(() => fetchData(true), action === 'create-snapshot' ? 5000 : 3000);
    } catch (err) {
      console.error(`Error performing action ${action} on instance ${instance.id}:`, err);
      addToast(`Failed to ${action} instance ${instance.name}: ${(err as Error).message}`, 'error');
    } finally {
      // setIsPerformingAction(false); // This might be too soon if fetchData is quick
      // Let fetchData reset loading states or manage a separate action loading state if needed
      // For now, rely on the fetchData call to update the overall loading state.
      // A more granular approach would be to set isPerformingAction(false) after fetchData completes.
      // For simplicity, we'll allow buttons to re-enable, and subsequent clicks will be handled.
      setTimeout(() => setIsPerformingAction(false), 3000); // Re-enable buttons after a delay
    }
  };


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
      <div className="flex justify-between items-center mb-4">
        <Link to="/instances" className="inline-flex items-center text-teal-400 hover:text-teal-300">
          <ArrowLeft size={18} className="mr-2" /> Back to Instances List
        </Link>
        {/* Action Buttons for Detail Page */}
        <div className="flex space-x-2">
          {instance.powerState !== 'Running' && instance.powerState !== 'Shelved' && instance.powerState !== 'Shelved_Offloaded' && !instance.task_state && instance.powerState !== 'Error' && (
            <Button onClick={() => handleInstanceAction('start')} size="sm" variant="outline" className="text-green-400 border-green-400 hover:bg-green-400/10" disabled={isPerformingAction}>Start</Button>
          )}
          {instance.powerState === 'Running' && !instance.task_state && (
            <>
              <Button onClick={() => handleInstanceAction('stop')} size="sm" variant="outline" className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/10" disabled={isPerformingAction}>Stop</Button>
              <Button onClick={() => handleInstanceAction('reboot')} size="sm" variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-400/10" disabled={isPerformingAction}>Reboot</Button>
            </>
          )}
          {(instance.powerState === 'Running' || instance.powerState === 'Shutoff') && !instance.task_state && (
            <Button onClick={() => handleInstanceAction('shelve')} size="sm" variant="outline" className="text-sky-400 border-sky-400 hover:bg-sky-400/10" disabled={isPerformingAction}>Shelve</Button>
          )}
          {(instance.powerState === 'Shelved' || instance.powerState === 'Shelved_Offloaded') && !instance.task_state && (
            <Button onClick={() => handleInstanceAction('unshelve')} size="sm" variant="outline" className="text-sky-400 border-sky-400 hover:bg-sky-400/10" disabled={isPerformingAction}>Unshelve</Button>
          )}
          <Button
            onClick={() => {
              const snapshotName = window.prompt(`Enter a name for the snapshot of instance "${instance.name}":`, `snapshot-${instance.name}-${new Date().toISOString().split('T')[0]}`);
              if (snapshotName) {
                handleInstanceAction('create-snapshot', snapshotName);
              }
            }}
            size="sm"
            variant="outline"
            className="text-purple-400 border-purple-400 hover:bg-purple-400/10"
            disabled={!!instance.task_state || instance.powerState === 'Shelved_Offloaded' || isPerformingAction}
          >
            Snapshot
          </Button>
          <Button
            onClick={() => {
              if (window.confirm(`Are you sure you want to terminate instance "${instance.name}"? This action cannot be undone.`)) {
                handleInstanceAction('terminate');
              }
            }}
            size="sm"
            variant="danger"
            disabled={!!instance.task_state || isPerformingAction}
          >
            Terminate
          </Button>
        </div>
      </div>

      <h2 className="text-3xl font-semibold text-slate-100 flex items-center">
        <Server size={30} className="mr-3 text-teal-400" /> {instance.name}
      </h2>

      <div className="border-b border-slate-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['overview', 'console', 'metadata'].map((tabName) => (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName as 'overview' | 'console' | 'metadata')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTab === tabName ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
            >
              {tabName}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Instance State & Details" icon={<Settings className="text-slate-300" />}>
              <dl>
                <DetailItem label="ID" value={instance.id} icon={<Hash />} />
                <DetailItem label="Status" value={instance.status} icon={<ListChecks />} />
                <DetailItem label="VM State" value={instance.vm_state} icon={<ListChecks />} />
                <DetailItem label="Power State" value={instance.powerState} icon={<PowerIcon />} />
                <DetailItem label="Task State" value={instance.task_state} icon={<Clock />} />
                <DetailItem label="Availability Zone" value={instance['OS-EXT-AZ:availability_zone']} icon={<Layers />} />
                <DetailItem label="Created" value={formatDate(instance.created)} icon={<CalendarDays />} />
                <DetailItem label="Launched At" value={formatDate(instance.launched_at)} icon={<CalendarDays />} />
                <DetailItem label="Terminated At" value={formatDate(instance.terminated_at)} icon={<CalendarDays />} />
                <DetailItem label="User ID" value={instance.userId} icon={<Users />} />
                <DetailItem label="Project ID" value={instance.project_id} icon={<HardDrive />} />
                <DetailItem label="Hostname" value={instance.hostname} icon={<Server />} />
                <DetailItem label="Locked" value={instance.locked} icon={<Lock />} />
                <DetailItem label="Host ID" icon={<Server />}>
                  {instance.hostId ? (
                    <div className="flex items-center">
                      <span className="mr-2">
                        {showFullHostId ? instance.hostId : `${instance.hostId.substring(0, 20)}...`}
                      </span>
                      <Tooltip text={showFullHostId ? "Hide full Host ID" : "Show full Host ID"}>
                        <Button variant="icon" size="xs" onClick={() => setShowFullHostId(!showFullHostId)} className="text-teal-400">
                          {showFullHostId ? <EyeOff size={14} /> : <Eye size={14} />}
                        </Button>
                      </Tooltip>
                    </div>
                  ) : 'N/A'}
                </DetailItem>
                {instance.description && <DetailItem label="Description" value={instance.description} icon={<FileText />} />}

              </dl>
            </Card>
            <Card title="Configuration" icon={<Settings className="text-slate-300" />}>
              <dl>
                <DetailItem
                  label="Flavor"
                  icon={<Cpu />}
                  value={`${instance.flavor.name || instance.flavor.id} (${allFlavors.find(f => f.id === instance.flavor.id)?.vcpus || 'N/A'} VCPUs, ${formatBytes((allFlavors.find(f => f.id === instance.flavor.id)?.ram || 0) * 1024 * 1024)}, ${allFlavors.find(f => f.id === instance.flavor.id)?.disk || 'N/A'} GB Disk)`}
                />
                <DetailItem
                  label="Image"
                  icon={<Disc3 />}
                  value={instance.image.name || instance.image.id}
                />
                <DetailItem label="Key Pair" value={instance.keyPair} icon={<KeyRound />} />
              </dl>
            </Card>
            <Card title="Networking" icon={<Network className="text-slate-300" />}>
              <dl>
                <DetailItem label="IP Addresses" value={instance.ipAddress} icon={<Network />} />
              </dl>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card title="Security Groups" icon={<Shield className="text-slate-300" />}>
              {instanceSecurityGroups.length > 0 ? (
                <ul className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar p-1">
                  {instanceSecurityGroups.map(sg => (
                    <li key={sg.id} className="text-sm text-slate-300 p-2 bg-slate-700/50 rounded flex justify-between items-center">
                      <span>{sg.name}</span>
                      <Link to={`/security-groups?edit=${sg.id}`} className="text-xs text-teal-400 hover:text-teal-300 hover:underline">
                        <ExternalLink size={12} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-400 p-2">No security groups associated.</p>}
            </Card>
            <Card title="Attached Volumes" icon={<HardDrive className="text-slate-300" />}>
              {attachedVolumesInfo.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                  {attachedVolumesInfo.map(vol => (
                    <li key={vol.id} className="p-2 bg-slate-700/50 rounded">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-slate-200">{vol.name || vol.id}</p>
                        <Link to={`/volumes?highlight=${vol.id}`} className="text-xs text-teal-400 hover:text-teal-300 hover:underline">
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                      <p className="text-xs text-slate-400">Size: {vol.size} GB | Device: {vol.attachments?.find(att => att.server_id === instance.id)?.device || 'N/A'}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-400 p-2">No volumes attached.</p>}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'console' && (
        <Card title="Instance Web Console" icon={<Terminal className="text-slate-300" />}>
          <div className="space-y-4 p-4"> {/* Added padding to card content */}
            <p className="text-sm text-slate-400">
              Click the button below to attempt to load the web console for this instance.
              The console will open in a new browser window or tab. Ensure pop-ups are allowed for this site.
            </p>
            <Button
              onClick={handleLoadConsole}
              isLoading={isConsoleLoading}
              disabled={!isConsoleActionable || isConsoleLoading}
              className="bg-teal-500 hover:bg-teal-600 text-white"
              leftIcon={<ExternalLink size={18} />}
            >
              {isConsoleLoading ? "Loading Console..." : "Open Web Console"}
            </Button>
            {!isConsoleActionable && (
              <p className="text-xs text-yellow-400 bg-yellow-900/30 p-2 rounded-md">
                Instance must be in ACTIVE status and Running power state to access the web console.
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

      {activeTab === 'metadata' && (
        <Card title="Raw Instance Data (JSON)" icon={<FileText className="text-slate-300" />}>
          <div className="p-4">
            <p className="text-sm text-slate-400 mb-2">
              This section displays the complete raw JSON data for the instance as returned by the OpenStack API. Useful for debugging and detailed inspection.
            </p>
            <pre className="mt-2 p-3 bg-slate-800/70 rounded-md text-xs text-slate-200 overflow-auto max-h-[600px] custom-scrollbar">
              {JSON.stringify(instance, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InstanceDetailPage;
