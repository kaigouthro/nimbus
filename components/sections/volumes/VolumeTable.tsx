import React, { useState, useCallback } from 'react';
import { Volume, Instance } from '../../../types';
import Button from '../../common/Button';
import Select from '../../common/Select';
import { MoreVertical, Trash2, LinkIcon, UnlinkIcon, HardDrive, ExternalLinkIcon, Edit3, Copy } from 'lucide-react'; // Added more icons
import { askNewSize, askSnapshotName } from './volumeActionPrompts';

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'Invalid Date';
  }
};

const VolumeStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let colorClasses = 'bg-slate-500 text-slate-100'; // Default
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === 'available') colorClasses = 'bg-green-500 text-green-100';
  else if (lowerStatus === 'in-use') colorClasses = 'bg-blue-500 text-blue-100';
  else if (lowerStatus.includes('creat') || lowerStatus.includes('attach') || lowerStatus.includes('detach') || lowerStatus.includes('downloading') || lowerStatus.includes('uploading')) colorClasses = 'bg-yellow-500 text-yellow-100 animate-pulse';
  else if (lowerStatus.includes('error')) colorClasses = 'bg-red-600 text-red-100';

  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses}`}>{status}</span>;
};

interface VolumeTableProps {
  volumes: Volume[];
  instances: Instance[];
  onAction: (volumeId: string, action: 'delete' | 'attach' | 'detach' | 'extend' | 'create-snapshot', details?: string | { newSize?: number; snapshotName?: string }) => void;
}

const VolumeTable: React.FC<VolumeTableProps> = ({ volumes, instances, onAction }) => {
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [selectedInstanceToAttach, setSelectedInstanceToAttach] = useState<string>('');

  const toggleDropdown = (volumeId: string) => {
    setDropdownOpen(dropdownOpen === volumeId ? null : volumeId);
    setSelectedInstanceToAttach('');
  };

  // Action Handlers - refactored from the large AGENTS.md comment
  const handleAttachAction = (volumeId: string) => {
    if (!selectedInstanceToAttach) {
      alert("Please select an instance to attach the volume to.");
      return; // Important to return here
    }
    onAction(volumeId, 'attach', { instanceId: selectedInstanceToAttach });
    setDropdownOpen(null);
  };

  const handleDetachAction = (volumeId: string) => {
    onAction(volumeId, 'detach');
    setDropdownOpen(null);
  };

  const handleDeleteAction = (volumeId: string, volumeName: string) => {
    if (window.confirm(`Are you sure you want to delete volume "${volumeName || volumeId}"? This action cannot be undone.`)) {
      onAction(volumeId, 'delete');
    }
    setDropdownOpen(null);
  };

  const handleExtendAction = (volumeId: string, volumeName: string, currentSize: number) => {
    const newSize = askNewSize(volumeName || volumeId, currentSize);
    if (newSize !== null) {
      onAction(volumeId, 'extend', { newSize });
    }
    setDropdownOpen(null);
  };

  const handleCreateSnapshotAction = (volumeId: string, volumeName: string) => {
    const snapshotName = askSnapshotName(volumeName || volumeId);
    if (snapshotName !== null) {
      onAction(volumeId, 'create-snapshot', { snapshotName });
    }
    setDropdownOpen(null);
  };


  const getAttachedInstanceName = (volume: Volume) => {
    if (volume.attachments && volume.attachments.length > 0) {
      const instanceId = volume.attachments[0].server_id;
      const instance = instances.find(i => i.id === instanceId);
      return instance ? `${instance.name} (on ${volume.attachments[0].device})` : instanceId;
    }
    return 'N/A';
  };

  return (
    <div className="bg-slate-800 rounded-lg">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700/50">
          <tr>
            {['Name', 'Size (GB)', 'Status', 'Type', 'Attached To', 'Bootable', 'Created', 'Actions'].map(header => (
              <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {volumes.map((volume) => {
            const safeStatus = volume.status.toLowerCase();
            const isVolumeInUse = safeStatus === 'in-use';

            return (
            <tr key={volume.id} className="hover:bg-slate-700/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                <div className="flex items-center">
                    <HardDrive size={16} className="mr-2 text-slate-400 flex-shrink-0"/>
                    <span className="truncate" title={volume.name || volume.id}>{volume.name || volume.id}</span>
                </div>
                <div className="text-xs text-slate-500" title={volume.id}>ID: {volume.id}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-center">{volume.size}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                <VolumeStatusBadge status={volume.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-center">{volume.type || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 truncate" title={getAttachedInstanceName(volume)}>
                {getAttachedInstanceName(volume)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 text-center">
                {volume.bootable === "true" ? 'Yes' : 'No'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{formatDate(volume.created)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative text-center">
                <Button variant="ghost" size="sm" onClick={() => toggleDropdown(volume.id)} className="text-slate-400 hover:text-teal-400">
                  <MoreVertical size={18} />
                </Button>
                {dropdownOpen === volume.id && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-700 rounded-md shadow-lg z-20 border border-slate-600 p-2 space-y-1.5">
                    {safeStatus === 'available' && (
                      <div className="space-y-1.5">
                        <Select 
                          id={`attach-instance-${volume.id}`} 
                          value={selectedInstanceToAttach} 
                          onChange={e => setSelectedInstanceToAttach(e.target.value)}
                          containerClassName="w-full"
                          className="w-full text-sm"
                          aria-label="Select instance to attach"
                          size="sm"
                        >
                          <option value="">-- Select Instance --</option>
                          {instances
                            .filter(i => ['active', 'shutoff', 'stopped', 'paused', 'shelved'].includes(i.status.toLowerCase()) && (i.powerState?.toLowerCase() === 'running' || i.powerState?.toLowerCase() === 'shutdown' || i.powerState?.toLowerCase() === 'stopped' || i.powerState?.toLowerCase() === 'paused' || i.powerState === null || i.powerState === undefined )) // More permissive instance states for attachment
                            .map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name} ({inst.status})</option>
                          ))}
                        </Select>
                        <Button onClick={() => handleAttachAction(volume.id)} className="w-full text-sm justify-start" size="sm" variant="ghost" disabled={!selectedInstanceToAttach}>
                          <LinkIcon size={15} className="mr-2 text-green-400" /> Attach to Instance
                        </Button>
                      </div>
                    )}
                    {isVolumeInUse && (
                      <Button onClick={() => handleDetachAction(volume.id)} className="w-full text-sm justify-start" size="sm" variant="ghost">
                        <UnlinkIcon size={15} className="mr-2 text-yellow-400" /> Detach from Instance
                      </Button>
                    )}
                     <Button
                      onClick={() => handleExtendAction(volume.id, volume.name, volume.size)}
                      className="w-full text-sm justify-start"
                      size="sm"
                      variant="ghost"
                      disabled={safeStatus !== 'available' || isVolumeInUse} // Often can't extend in-use, though API might allow. Safer to disable.
                    >
                      <ExternalLinkIcon size={15} className="mr-2 text-blue-400" /> Extend Size
                    </Button>
                    <Button
                      onClick={() => handleCreateSnapshotAction(volume.id, volume.name)}
                      className="w-full text-sm justify-start"
                      size="sm"
                      variant="ghost"
                      // Snapshots can often be created from in-use volumes, but check OpenStack capabilities if issues arise.
                    >
                      <Copy size={15} className="mr-2 text-purple-400" /> Create Snapshot
                    </Button>
                    
                    <div className="!my-2 border-t border-slate-600"></div>

                    <Button
                      onClick={() => handleDeleteAction(volume.id, volume.name)}
                      className="w-full text-sm justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      variant="ghost"
                      size="sm"
                      disabled={isVolumeInUse} // Must be detached first
                    >
                      <Trash2 size={15} className="mr-2" /> Delete Volume
                    </Button>
                    {isVolumeInUse && <p className="text-xs text-slate-500 px-2 pt-1">Detach volume before deleting or extending.</p>}
                    {!isVolumeInUse && safeStatus !== 'available' && <p className="text-xs text-slate-500 px-2 pt-1">Volume must be 'available' to extend.</p>}
                  </div>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VolumeTable;