
import React, { useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Select from '../../common/Select'; // Assuming Select component exists

interface CreateVolumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: { name: string; size: number; type?: string; availabilityZone?: string }) => void;
}

const CreateVolumeModal: React.FC<CreateVolumeModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [size, setSize] = useState(10); // Default size in GB
  const [type, setType] = useState('ssd'); // Example volume types
  const [availabilityZone, setAvailabilityZone] = useState(''); // Optional

  const handleSubmit = () => {
    if (name && size > 0) {
      onCreate({ name, size, type, availabilityZone: availabilityZone || undefined });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Volume">
      <div className="space-y-4">
        <Input
          id="volumeName"
          label="Volume Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-data-disk"
          required
        />
        <Input
          id="volumeSize"
          label="Size (GB)"
          type="number"
          value={size.toString()}
          onChange={(e) => setSize(parseInt(e.target.value, 10) || 1)}
          min="1"
          required
        />
        <Select 
          id="volumeType" 
          label="Volume Type (Optional)" 
          value={type} 
          onChange={(e) => setType(e.target.value)}
        >
          <option value="ssd">SSD</option>
          <option value="hdd">HDD</option>
          <option value="high-iops-ssd">High IOPS SSD</option>
          {/* Add more types as needed from OpenStack config */}
        </Select>
        <Input
          id="availabilityZone"
          label="Availability Zone (Optional)"
          value={availabilityZone}
          onChange={(e) => setAvailabilityZone(e.target.value)}
          placeholder="e.g., nova, cinder-az1"
        />
         <p className="text-xs text-slate-400">AI could advise on appropriate volume types or sizes based on intended use.</p>
      </div>
      <div className="flex justify-end space-x-3 pt-6 mt-4 border-t border-slate-700">
        <Button onClick={onClose} variant="outline">Cancel</Button>
        <Button onClick={handleSubmit} className="bg-teal-500 hover:bg-teal-600 text-white" disabled={!name || size <=0}>
          Create Volume
        </Button>
      </div>
    </Modal>
  );
};

export default CreateVolumeModal;
