import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { Instance } from '../../../types';
import Button from '../../common/Button';
import { MoreVertical, Play, StopCircle, RefreshCw, Trash2, Terminal, Disc3, Archive, ArchiveRestore } from 'lucide-react';
import Tooltip from '../../common/Tooltip'; 

// Helper to format date
const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

// Instance status badge
const StatusBadge: React.FC<{ status: string, powerState: string }> = ({ status, powerState }) => {
  let colorClasses = 'bg-slate-500 text-slate-100'; // Default
  const lowerStatus = (status || '').toLowerCase();
  const lowerPowerState = (powerState || '').toLowerCase();

  if (lowerPowerState === 'running' && (lowerStatus === 'active' || lowerStatus === 'ok')) colorClasses = 'bg-green-500 text-green-100';
  else if (lowerPowerState === 'stopped' || lowerPowerState === 'shutoff' || lowerStatus === 'shutoff' || lowerStatus === 'stopped') colorClasses = 'bg-red-500 text-red-100';
  else if (lowerStatus.includes('shelved')) colorClasses = 'bg-sky-500 text-sky-100';
  else if (lowerPowerState === 'building' || lowerStatus.includes('build') || lowerStatus.includes('migrat') || lowerStatus.includes('rebuild') || lowerStatus.includes('resiz') || lowerStatus.includes('verify')) colorClasses = 'bg-yellow-500 text-yellow-100 animate-pulse';
  else if (lowerPowerState === 'error' || lowerStatus.includes('error')) colorClasses = 'bg-orange-600 text-orange-100';
  else if (lowerPowerState === 'paused' || lowerStatus === 'paused') colorClasses = 'bg-indigo-500 text-indigo-100';

  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses}`}>{status || 'N/A'} ({powerState || 'N/A'})</span>;
};


interface InstanceTableProps {
  instances: Instance[];
  onAction: (instanceId: string, action: 'start' | 'stop' | 'reboot' | 'terminate' | 'get-console' | 'shelve' | 'unshelve' | 'attachVolume' | 'detachVolume') => void;
}

const InstanceTable: React.FC<InstanceTableProps> = ({ instances, onAction }) => {
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null); // Instance ID
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number, left: number } | null>(null);
  const [currentActionInstance, setCurrentActionInstance] = useState<Instance | null>(null);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const handleActionMenuToggle = useCallback((instance: Instance, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); 
    if (activeActionMenu === instance.id) {
      setActiveActionMenu(null);
      setCurrentActionInstance(null);
    } else {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      const tableContainerRect = tableContainerRef.current?.getBoundingClientRect();

      if (tableContainerRect) {
        const top = buttonRect.top - tableContainerRect.top + buttonRect.height;
        let left = buttonRect.left - tableContainerRect.left;
        
        // Adjust if menu would overflow right
        if (left + 224 > tableContainerRect.width) { // Assuming menu width w-56 (224px)
            left = buttonRect.right - tableContainerRect.left - 224;
        }
        // Ensure menu doesn't go off-screen left
        if (left < 0) left = 0;


        // Adjust if menu would overflow bottom (simple check, might need more sophisticated logic for viewport)
        const menuHeightEstimate = 300; // Approximate height of the dropdown
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        let adjustedTop = top;
        if (spaceBelow < menuHeightEstimate && buttonRect.top > menuHeightEstimate) { // If not enough space below and enough space above
            adjustedTop = buttonRect.top - tableContainerRect.top - menuHeightEstimate;
        }
        if (adjustedTop < 0) adjustedTop = 0;


        setActionMenuPosition({ top: adjustedTop, left });
        setCurrentActionInstance(instance);
        setActiveActionMenu(instance.id);
      }
    }
  }, [activeActionMenu]);
  
  const handleActionClick = (action: 'start' | 'stop' | 'reboot' | 'terminate' | 'get-console' | 'shelve' | 'unshelve' | 'attachVolume' | 'detachVolume') => {
    if (currentActionInstance) {
      onAction(currentActionInstance.id, action);
    }
    setActiveActionMenu(null);
    setCurrentActionInstance(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        const targetIsActionButton = (event.target as HTMLElement).closest('button[data-action-button="true"]');
        if (!targetIsActionButton) {
            setActiveActionMenu(null);
            setCurrentActionInstance(null);
        }
      }
    };

    if (activeActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeActionMenu]);


  return (
    <div className="flex-1 flex flex-col relative" ref={tableContainerRef}>
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-700/50">
            <tr>
              {['Name', 'Status', 'Flavor', 'Image', 'IP Addresses', 'Created', 'Actions'].map(header => (
                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {instances.map((instance) => (
              <tr key={instance.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                   <Link to={`/instances/${instance.id}`} className="hover:text-teal-400 hover:underline">
                    {instance.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <StatusBadge status={(instance.status || '')} powerState={(instance.powerState || '')} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{instance.flavor?.name || instance.flavor?.id || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{instance.image?.name || instance.image?.id || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{instance.ipAddress || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{formatDate(instance.created)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => handleActionMenuToggle(instance, e)} 
                    className="text-slate-400 hover:text-teal-400"
                    data-action-button="true"
                  >
                    <MoreVertical size={18} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {instances.length === 0 && (
             <div className="flex-1 flex justify-center items-center p-10">
                <p className="text-slate-400">No instances to display.</p>
            </div>
        )}
      </div>

      {activeActionMenu && currentActionInstance && actionMenuPosition && (
        <div
          ref={actionMenuRef}
          className="absolute w-56 bg-slate-700 rounded-md shadow-xl z-20 border border-slate-600"
          style={{ top: `${actionMenuPosition.top}px`, left: `${actionMenuPosition.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <p className="px-4 pt-2 pb-1 text-xs text-slate-400 border-b border-slate-600 mb-1">
              Actions for: <span className="font-semibold text-slate-200 truncate block max-w-full">{currentActionInstance.name}</span>
            </p>
            
            {/* Power Actions */}
            {(currentActionInstance.powerState || '').toLowerCase() !== 'running' && 
             (currentActionInstance.status || '').toLowerCase() !== 'shelved' && 
             (currentActionInstance.status || '').toLowerCase() !== 'shelved_offloaded' && 
             (currentActionInstance.status || '').toLowerCase() !== 'build' &&
             (currentActionInstance.status || '').toLowerCase() !== 'error' &&
             (
              <button onClick={() => handleActionClick('start')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                <Play size={16} className="mr-2 text-green-400" /> Start
              </button>
            )}
            {(currentActionInstance.powerState || '').toLowerCase() === 'running' && (currentActionInstance.status || '').toLowerCase() === 'active' && (
              <>
                <button onClick={() => handleActionClick('stop')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                  <StopCircle size={16} className="mr-2 text-yellow-400" /> Stop
                </button>
                <button onClick={() => handleActionClick('reboot')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                  <RefreshCw size={16} className="mr-2 text-blue-400" /> Reboot
                </button>
              </>
            )}

            {/* Shelve/Unshelve Actions */}
            {((currentActionInstance.status || '').toLowerCase() === 'active' || (currentActionInstance.status || '').toLowerCase() === 'shutoff') && (
              <button onClick={() => handleActionClick('shelve')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                <Archive size={16} className="mr-2 text-sky-400" /> Shelve
              </button>
            )}
            {((currentActionInstance.status || '').toLowerCase() === 'shelved' || (currentActionInstance.status || '').toLowerCase() === 'shelved_offloaded') && (
              <button onClick={() => handleActionClick('unshelve')} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                <ArchiveRestore size={16} className="mr-2 text-sky-400" /> Unshelve
              </button>
            )}

            {/* Other Actions */}
             <Tooltip 
                text={!((currentActionInstance.status || '').toLowerCase() === 'active' && (currentActionInstance.powerState || '').toLowerCase() === 'running') ? "Console available for Active/Running instances" : "Open instance console"}
                position="left"
            >
                <button 
                    onClick={() => handleActionClick('get-console')} 
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!((currentActionInstance.status || '').toLowerCase() === 'active' && (currentActionInstance.powerState || '').toLowerCase() === 'running')}
                >
                    <Terminal size={16} className="mr-2" /> Get Console
                </button>
            </Tooltip>
            <button onClick={() => alert(`Manage volumes for ${currentActionInstance.name}`)} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
              <Disc3 size={16} className="mr-2" /> Manage Volumes
            </button>
            
            {/* Destructive Actions */}
            <div className="border-t border-slate-600 my-1"></div>
            <button onClick={() => {
              if (window.confirm(`Are you sure you want to terminate instance "${currentActionInstance.name}"? This action cannot be undone.`)) {
                handleActionClick('terminate');
              } else {
                setActiveActionMenu(null); 
                setCurrentActionInstance(null);
              }
            }} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-400 hover:bg-slate-600 hover:text-red-300">
              <Trash2 size={16} className="mr-2" /> Terminate
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstanceTable;