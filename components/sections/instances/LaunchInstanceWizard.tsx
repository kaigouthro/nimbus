import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Select from '../../common/Select'; 
import { Flavor, Image as OpenStackImage, Network, SecurityGroup, KeyPair } from '../../../types';
import { ChevronLeft, ChevronRight, Rocket, ListChecks, Server, NetworkIcon as NetworkLucideIcon, ShieldCheck, KeyRound } from 'lucide-react';

interface LaunchInstanceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (params: any) => void;
  flavors: Flavor[];
  images: OpenStackImage[];
  networks: Network[];
  securityGroups: SecurityGroup[];
  keyPairs: KeyPair[];
  defaultImageId?: string; // New prop
}

const LaunchInstanceWizard: React.FC<LaunchInstanceWizardProps> = ({
  isOpen, onClose, onLaunch, flavors, images, networks, securityGroups, keyPairs, defaultImageId
}) => {
  const [step, setStep] = useState(1);
  const [instanceName, setInstanceName] = useState('');
  const [instanceCount, setInstanceCount] = useState(1);
  const [selectedImageId, setSelectedImageId] = useState<string>(defaultImageId || ''); // Use defaultImageId
  const [selectedFlavorId, setSelectedFlavorId] = useState<string>('');
  const [selectedNetworkIds, setSelectedNetworkIds] = useState<string[]>([]);
  const [selectedSecurityGroupIds, setSelectedSecurityGroupIds] = useState<string[]>([]);
  const [selectedKeyPairName, setSelectedKeyPairName] = useState<string>('');

  // Reset selectedImageId if defaultImageId changes and modal is open
  useEffect(() => {
    if (isOpen && defaultImageId) {
      setSelectedImageId(defaultImageId);
    } else if (!isOpen) { // Reset form on close
      setStep(1);
      setInstanceName('');
      setInstanceCount(1);
      setSelectedImageId('');
      setSelectedFlavorId('');
      setSelectedNetworkIds([]);
      setSelectedSecurityGroupIds([]);
      setSelectedKeyPairName('');
    }
  }, [isOpen, defaultImageId]);


  const totalSteps = 6;

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = () => {
    onLaunch({
      name: instanceName,
      count: instanceCount,
      imageId: selectedImageId,
      flavorId: selectedFlavorId,
      networkIds: selectedNetworkIds,
      securityGroupIds: selectedSecurityGroupIds,
      keyPairName: selectedKeyPairName,
    });
  };
  
  const renderStepContent = () => {
    switch (step) {
      case 1: // Basics
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-100 flex items-center"><ListChecks size={20} className="mr-2 text-teal-400" /> Basics</h3>
            <Input id="instanceName" label="Instance Name" value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder="my-awesome-vm" required />
            <Input id="instanceCount" label="Instance Count" type="number" value={instanceCount.toString()} onChange={e => setInstanceCount(Math.max(1, parseInt(e.target.value,10) || 1))} min="1" />
             <p className="text-xs text-slate-400">AI could provide naming convention suggestions.</p>
          </div>
        );
      case 2: // Source (Image)
        return (
          <div className="space-y-4">
             <h3 className="text-lg font-medium text-slate-100 flex items-center"><Server size={20} className="mr-2 text-teal-400" />Source (Image)</h3>
            <Select id="image" label="Select Image" value={selectedImageId} onChange={e => setSelectedImageId(e.target.value)} required>
              <option value="">-- Choose an Image --</option>
              {images.filter(img => img.status === 'active').map(img => <option key={img.id} value={img.id}>{img.name} ({img.minDisk}GB Disk, {img.minRam}MB RAM)</option>)}
            </Select>
            <p className="text-xs text-slate-400">AI could recommend images based on workload (e.g., "Ubuntu for web server").</p>
            {/* TODO: Boot from Volume option */}
          </div>
        );
      case 3: // Flavor
        return (
          <div className="space-y-4">
             <h3 className="text-lg font-medium text-slate-100 flex items-center"><Server size={20} className="mr-2 text-teal-400" />Flavor (Compute Resources)</h3>
            <Select id="flavor" label="Select Flavor" value={selectedFlavorId} onChange={e => setSelectedFlavorId(e.target.value)} required>
              <option value="">-- Choose a Flavor --</option>
              {flavors.filter(f => f.isPublic).map(fl => <option key={fl.id} value={fl.id}>{fl.name} ({fl.vcpus} VCPU, {fl.ram}MB RAM, {fl.disk}GB Disk)</option>)}
            </Select>
             <p className="text-xs text-slate-400">AI could recommend flavors (e.g., "m1.small for a test web server").</p>
          </div>
        );
      case 4: // Networks
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-100 flex items-center"><NetworkLucideIcon size={20} className="mr-2 text-teal-400" />Networks</h3>
            <p className="text-sm text-slate-300 mb-1">Select Network(s):</p>
            {/* Basic multi-select placeholder; a better component would be ideal */}
            {networks.map(net => (
              <label key={net.id} className="flex items-center space-x-2 p-2 bg-slate-700 rounded-md hover:bg-slate-600 cursor-pointer">
                <input type="checkbox" 
                  className="form-checkbox h-4 w-4 text-teal-500 bg-slate-600 border-slate-500 rounded focus:ring-teal-500"
                  checked={selectedNetworkIds.includes(net.id)} 
                  onChange={e => {
                    if (e.target.checked) setSelectedNetworkIds(prev => [...prev, net.id]);
                    else setSelectedNetworkIds(prev => prev.filter(id => id !== net.id));
                  }} 
                />
                <span>{net.name} ({net.subnet_ids.join(', ')})</span>
              </label>
            ))}
             {networks.length === 0 && <p className="text-slate-400">No networks available.</p>}
          </div>
        );
      case 5: // Security
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-100 flex items-center"><ShieldCheck size={20} className="mr-2 text-teal-400" />Security</h3>
            <p className="text-sm text-slate-300 mb-1">Select Security Group(s):</p>
            {securityGroups.map(sg => (
              <label key={sg.id} className="flex items-center space-x-2 p-2 bg-slate-700 rounded-md hover:bg-slate-600 cursor-pointer">
                 <input type="checkbox" 
                  className="form-checkbox h-4 w-4 text-teal-500 bg-slate-600 border-slate-500 rounded focus:ring-teal-500"
                  checked={selectedSecurityGroupIds.includes(sg.id)} 
                  onChange={e => {
                    if (e.target.checked) setSelectedSecurityGroupIds(prev => [...prev, sg.id]);
                    else setSelectedSecurityGroupIds(prev => prev.filter(id => id !== sg.id));
                  }} 
                />
                <span>{sg.name} <span className="text-xs text-slate-400">({sg.description})</span></span>
              </label>
            ))}
            {securityGroups.length === 0 && <p className="text-slate-400">No security groups available. 'default' is often applied if none selected.</p>}
            
            <div className="mt-4">
               <h3 className="text-lg font-medium text-slate-100 flex items-center"><KeyRound size={20} className="mr-2 text-teal-400" />Key Pair</h3>
              <Select id="keypair" label="Select Key Pair (Optional)" value={selectedKeyPairName} onChange={e => setSelectedKeyPairName(e.target.value)}>
                <option value="">-- No Key Pair --</option>
                {keyPairs.map(kp => <option key={kp.id} value={kp.name}>{kp.name}</option>)}
              </Select>
            </div>
            <p className="text-xs text-slate-400 mt-2">AI could suggest security groups based on image/workload (e.g., "web-sg for HTTP/HTTPS access").</p>
          </div>
        );
      case 6: // Review & Launch
        const image = images.find(i => i.id === selectedImageId);
        const flavor = flavors.find(f => f.id === selectedFlavorId);
        const nets = networks.filter(n => selectedNetworkIds.includes(n.id));
        const sgs = securityGroups.filter(s => selectedSecurityGroupIds.includes(s.id));
        return (
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-slate-100">Review & Launch</h3>
            <p><strong className="text-slate-300">Name:</strong> {instanceName} (x{instanceCount})</p>
            <p><strong className="text-slate-300">Image:</strong> {image?.name || 'N/A'}</p>
            <p><strong className="text-slate-300">Flavor:</strong> {flavor?.name || 'N/A'} ({flavor?.vcpus} VCPU, {flavor?.ram}MB RAM, {flavor?.disk}GB Disk)</p>
            <p><strong className="text-slate-300">Networks:</strong> {nets.map(n => n.name).join(', ') || 'None'}</p>
            <p><strong className="text-slate-300">Security Groups:</strong> {sgs.map(s => s.name).join(', ') || 'None (default likely)'}</p>
            <p><strong className="text-slate-300">Key Pair:</strong> {selectedKeyPairName || 'None'}</p>
          </div>
        );
      default: return null;
    }
  };

  const isStepValid = () => {
    // Basic validation, can be expanded
    if (step === 1 && (!instanceName || instanceCount < 1)) return false;
    if (step === 2 && !selectedImageId) return false;
    if (step === 3 && !selectedFlavorId) return false;
    // Networks and SGs can be optional (OpenStack might apply defaults)
    return true;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Launch New Instance" size="lg">
      <div className="mb-4">
        {/* Progress Bar Simple */}
        <div className="w-full bg-slate-700 rounded-full h-2.5">
          <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>
        <p className="text-sm text-slate-400 text-center mt-1">Step {step} of {totalSteps}</p>
      </div>
      
      <div className="min-h-[300px] max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
        {renderStepContent()}
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-700 mt-4">
        <Button onClick={prevStep} disabled={step === 1} variant="outline">
          <ChevronLeft size={18} className="mr-1" /> Previous
        </Button>
        {step < totalSteps ? (
          <Button onClick={nextStep} disabled={!isStepValid()} className="bg-teal-500 hover:bg-teal-600 text-white">
            Next <ChevronRight size={18} className="ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!isStepValid()} className="bg-green-500 hover:bg-green-600 text-white">
            <Rocket size={18} className="mr-2" /> Launch Instance(s)
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default LaunchInstanceWizard;