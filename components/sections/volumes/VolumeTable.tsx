import React, { useState } from 'react';
import { Volume, Instance } from '../../../types';
import Button from '../../common/Button';
import Select from '../../common/Select';
import { MoreVertical, Trash2, LinkIcon, UnlinkIcon, HardDrive } from 'lucide-react'; 

const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

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
  onAction: (volumeId: string, action: 'delete' | 'attach' | 'detach', instanceId?: string) => void;
}

const VolumeTable: React.FC<VolumeTableProps> = ({ volumes, instances, onAction }) => {
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [selectedInstanceToAttach, setSelectedInstanceToAttach] = useState<string>('');

  const toggleDropdown = (volumeId: string) => {
    setDropdownOpen(dropdownOpen === volumeId ? null : volumeId);
    setSelectedInstanceToAttach(''); 
  };

  const handleActionClick = (volumeId: string, action: 'delete' | 'attach' | 'detach') => {
    if (action === 'attach' && !selectedInstanceToAttach) {
        alert("Please select an instance to attach the volume to.");
        return;
    }
    onAction(volumeId, action, selectedInstanceToAttach);
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
    <div className="overflow-x-auto bg-slate-800 rounded-lg">
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
            // If volume.status is string (as per type), toLowerCase() is safe.
            const safeStatus = volume.status.toLowerCase();
            const isVolumeInUse = safeStatus === 'in-use';
            
            return (
            <tr key={volume.id} className="hover:bg-slate-700/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100 flex items-center">
                <HardDrive size={16} className="mr-2 text-slate-400"/> {volume.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{volume.size}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <VolumeStatusBadge status={volume.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{volume.type || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{getAttachedInstanceName(volume)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                {volume.bootable === "true" ? 'Yes' : 'No'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{formatDate(volume.created)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                <Button variant="ghost" size="sm" onClick={() => toggleDropdown(volume.id)} className="text-slate-400 hover:text-teal-400">
                  <MoreVertical size={18} />
                </Button>
                {dropdownOpen === volume.id && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-700 rounded-md shadow-lg z-10 border border-slate-600 p-2 space-y-2">
                    {safeStatus === 'available' && (
                      <div>
                        <Select 
                          id={`attach-instance-${volume.id}`} 
                          value={selectedInstanceToAttach} 
                          onChange={e => setSelectedInstanceToAttach(e.target.value)}
                          containerClassName="mb-2"
                          aria-label="Select instance to attach"
                        >
                          <option value="">-- Select Instance --</option>
                          {instances.filter(i => i.powerState === 'Running' || i.powerState === 'Stopped' || i.powerState === 'Shutoff').map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name} ({inst.status})</option>
                          ))}
                        </Select>
                        <Button onClick={() => handleActionClick(volume.id, 'attach')} className="w-full text-sm" size="sm" disabled={!selectedInstanceToAttach}>
                          <LinkIcon size={16} className="mr-2 text-green-400" /> Attach to Instance
                        </Button>
                      </div>
                    )}
                    {isVolumeInUse && (
                      <Button onClick={() => handleActionClick(volume.id, 'detach')} className="w-full text-sm" size="sm">
                        <UnlinkIcon size={16} className="mr-2 text-yellow-400" /> Detach from Instance
                      </Button>
                    )}
                    <Button onClick={() => alert('Extend Volume: Feature placeholder')} className="w-full text-sm" size="sm" variant="outline" disabled={safeStatus !== 'available'}>Extend Size</Button>
                    <Button onClick={() => alert('Create Snapshot: Feature placeholder')} className="w-full text-sm" size="sm" variant="outline">Create Snapshot</Button>
                    
                    <div className="border-t border-slate-600 my-1"></div>
                    <Button onClick={() => {
                        if(window.confirm(`Are you sure you want to delete volume "${volume.name}"? This action cannot be undone.`)) {
                           handleActionClick(volume.id, 'delete');
                        } else {
                           setDropdownOpen(null);
                        }
                      }} 
                      className="w-full text-sm text-red-400 hover:bg-slate-600 hover:text-red-300" 
                      variant="ghost"
                      size="sm"
                      disabled={isVolumeInUse}
                    >
                      <Trash2 size={16} className="mr-2" /> Delete Volume
                    </Button>
                    {isVolumeInUse && <p className="text-xs text-slate-500 mt-1">Detach volume before deleting.</p>}
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