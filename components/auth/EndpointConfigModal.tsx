
import React, { useState, ChangeEvent } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { OpenStackEndpointConfig } from '../../types'; // Updated type
import { PlusCircle, Save, Trash2, X } from 'lucide-react';

interface EndpointConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (endpoints: OpenStackEndpointConfig[]) => void; // Updated type
  initialEndpoints: OpenStackEndpointConfig[]; // Updated type
}

const EndpointConfigModal: React.FC<EndpointConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEndpoints,
}) => {
  const [endpoints, setEndpoints] = useState<OpenStackEndpointConfig[]>(initialEndpoints); // Updated type
  const [newEndpoint, setNewEndpoint] = useState<Partial<OpenStackEndpointConfig>>({ // Updated type
    name: '',
    authUrl: '',
  });

  const handleAddEndpoint = () => {
    if (newEndpoint.name && newEndpoint.authUrl) {
      // Basic validation for Auth URL format
      try {
        new URL(newEndpoint.authUrl); // Check if it's a valid URL
        if (!newEndpoint.authUrl.toLowerCase().includes('/v3')) {
            alert("Warning: Auth URL typically ends with /v3 for Keystone v3.");
        }
      } catch (e) {
        alert("Invalid Auth URL format.");
        return;
      }
      setEndpoints([...endpoints, { ...newEndpoint, id: `cfg-${Date.now().toString()}` } as OpenStackEndpointConfig]); // Updated type
      setNewEndpoint({ name: '', authUrl: '' });
    } else {
        alert("Friendly Name and Auth URL are required to add an endpoint configuration.");
    }
  };

  const handleRemoveEndpoint = (id: string) => {
    setEndpoints(endpoints.filter(ep => ep.id !== id));
  };

  const handleSave = () => {
    onSave(endpoints);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage API Endpoint Configurations">
      <div className="space-y-4">
        <div>
          <h4 className="text-md font-medium text-slate-200 mb-2">Add New Endpoint Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <Input
              id="new-endpoint-name"
              label="Friendly Name"
              value={newEndpoint.name || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
              placeholder="My Prod Cloud"
            />
            <Input
              id="new-endpoint-authUrl"
              label="Auth URL (Keystone v3)"
              type="url"
              value={newEndpoint.authUrl || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewEndpoint({ ...newEndpoint, authUrl: e.target.value })}
              placeholder="http://keystone.example.com:5000/v3"
            />
          </div>
          <Button onClick={handleAddEndpoint} variant="outline" className="mt-2 text-teal-400 border-teal-400 hover:bg-teal-400 hover:text-slate-900">
            <PlusCircle size={18} className="mr-2" /> Add Configuration
          </Button>
        </div>

        {endpoints.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-slate-200 mb-2 mt-4">Saved Configurations</h4>
            <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
              {endpoints.map((ep) => (
                <li key={ep.id} className="flex justify-between items-center p-3 bg-slate-700 rounded-md hover:bg-slate-600/70">
                  <div>
                    <p className="font-semibold text-slate-100">{ep.name}</p>
                    <p className="text-sm text-slate-400">{ep.authUrl}</p>
                  </div>
                  <Button onClick={() => handleRemoveEndpoint(ep.id)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
                    <Trash2 size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
         {endpoints.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No saved endpoint configurations yet.</p>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button onClick={onClose} variant="outline">
            <X size={18} className="mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave} className="bg-teal-500 hover:bg-teal-600 text-white">
            <Save size={18} className="mr-2" /> Save Changes
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        These configurations help you quickly fill the login form. They do not store passwords.
      </p>
    </Modal>
  );
};

export default EndpointConfigModal;
