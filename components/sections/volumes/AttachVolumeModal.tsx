import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { Volume } from '../../../types';
import { HardDrive, X } from 'lucide-react';

interface AttachVolumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (volumeId: string) => Promise<void>; // Returns a promise to handle loading state
  availableVolumes: Volume[];
  instanceName: string;
  isLoading: boolean; // Added to disable UI during attachment
}

const AttachVolumeModal: React.FC<AttachVolumeModalProps> = ({
  isOpen,
  onClose,
  onAttach,
  availableVolumes,
  instanceName,
  isLoading,
}) => {
  const [selectedVolumeId, setSelectedVolumeId] = useState<string>('');

  useEffect(() => {
    // Reset selected volume when modal is opened or available volumes change
    setSelectedVolumeId('');
  }, [isOpen, availableVolumes]);

  const handleAttachClick = async () => {
    if (!selectedVolumeId) {
      // This should ideally be handled by disabling the button, but as a fallback:
      alert('Please select a volume to attach.');
      return;
    }
    await onAttach(selectedVolumeId);
    // onClose(); // Parent component will handle closing on successful attachment or error
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Attach Volume to ${instanceName}`}>
      <div className="space-y-4">
        {availableVolumes.length === 0 ? (
          <p className="text-slate-400 text-center py-4">
            No available volumes to attach. You can create a new volume in the 'Volumes' section.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
            <p className="text-sm text-slate-300">Select a volume to attach:</p>
            {availableVolumes.map((volume) => (
              <div
                key={volume.id}
                onClick={() => !isLoading && setSelectedVolumeId(volume.id)}
                className={`p-3 rounded-md border transition-colors cursor-pointer flex items-center justify-between
                  ${selectedVolumeId === volume.id ? 'bg-teal-600/30 border-teal-500' : 'bg-slate-700/50 border-slate-600 hover:border-teal-500/70'}
                  ${isLoading ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <div className="flex items-center">
                  <HardDrive size={18} className="mr-3 text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-100">{volume.name || volume.id}</p>
                    <p className="text-xs text-slate-400">
                      Size: {volume.size} GB | Type: {volume.type || 'N/A'}
                    </p>
                  </div>
                </div>
                {selectedVolumeId === volume.id && (
                  <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-slate-700">
        <Button onClick={onClose} variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleAttachClick}
          className="bg-teal-500 hover:bg-teal-600 text-white"
          disabled={!selectedVolumeId || isLoading || availableVolumes.length === 0}
          isLoading={isLoading}
        >
          {isLoading ? 'Attaching...' : 'Attach Selected Volume'}
        </Button>
      </div>
    </Modal>
  );
};

export default AttachVolumeModal;
