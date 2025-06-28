import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
    getServiceEndpoint, fetchSecurityGroups, createSecurityGroupAPI, 
    deleteSecurityGroupAPI, addSecurityGroupRuleAPI, deleteSecurityGroupRuleAPI 
} from '../../../services/OpenStackAPIService';
import { SecurityGroup, SecurityGroupRule } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Button from '../../common/Button';
import Input from '../../common/Input';
import Modal from '../../common/Modal';
import RuleEditor from './RuleEditor';
import { ShieldCheck, PlusCircle, Trash2, RefreshCw, ListPlus } from 'lucide-react';
import Select from '../../common/Select';
import { useToast } from '../../../hooks/useToast';

const SecurityGroupEditorPanel: React.FC = () => {
  const { authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast();
  const [securityGroups, setSecurityGroups] = useState<SecurityGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SecurityGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  const fetchData = useCallback(async (preserveSelected = false) => {
    if (!authToken || !serviceCatalog) {
      setError("Not authenticated or service catalog unavailable.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
    if (!networkUrl) {
        const errorMsg = "Network service endpoint not found.";
        setError(errorMsg);
        addToast(errorMsg, 'error');
        setIsLoading(false);
        return;
    }

    try {
      const sgData = await fetchSecurityGroups(authToken, networkUrl);
      setSecurityGroups(sgData);

      if (preserveSelected && selectedGroup) {
        const updatedSelectedGroup = sgData.find(sg => sg.id === selectedGroup.id);
        setSelectedGroup(updatedSelectedGroup || (sgData.length > 0 ? sgData[0] : null));
      } else if (sgData.length > 0 && !selectedGroup) {
        // setSelectedGroup(sgData[0]); 
      } else if (sgData.length === 0) {
        setSelectedGroup(null);
      }
    } catch (err) {
      console.error("Error fetching security group data:", err);
      const errorMsg = `Failed to load security group data: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, serviceCatalog, selectedGroup, addToast]); 

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, serviceCatalog]);

  const handleCreateGroup = async () => {
    if (!newGroupName || !authToken || !serviceCatalog) return;
    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
    if (!networkUrl) { 
      addToast("Network service endpoint not found.", 'error'); 
      return; 
    }

    setIsLoading(true);
    try {
      const newSg = await createSecurityGroupAPI(authToken, networkUrl, newGroupName, newGroupDescription);
      addToast(`Security group '${newSg.name}' created successfully.`, 'success');
      setNewGroupName('');
      setNewGroupDescription('');
      setIsCreateModalOpen(false);
      await fetchData(); 
      setSelectedGroup(newSg); 
    } catch (err) {
      const errorMsg = `Failed to create security group: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm("Are you sure you want to delete this security group? This action cannot be undone.") && authToken && serviceCatalog) {
      const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
      if (!networkUrl) { 
        addToast("Network service endpoint not found.", 'error'); 
        return; 
      }
      
      setIsLoading(true);
      try {
        await deleteSecurityGroupAPI(authToken, networkUrl, groupId);
        addToast(`Security group ${groupId} deleted successfully.`, 'success');
        if (selectedGroup?.id === groupId) setSelectedGroup(null);
        fetchData(); 
      } catch (err) {
        const errorMsg = `Failed to delete security group: ${(err as Error).message}`;
        setError(errorMsg);
        addToast(errorMsg, 'error');
        setIsLoading(false);
      }
    }
  };
  
  const handleAddRule = async (rule: Omit<SecurityGroupRule, 'id' | 'project_id' | 'security_group_id'>) => {
    if (!selectedGroup || !authToken || !serviceCatalog) return;
    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
    if (!networkUrl) { 
      addToast("Network service endpoint not found.", 'error'); 
      return; 
    }

    setIsLoading(true);
    try {
      const fullRulePayload = { ...rule, security_group_id: selectedGroup.id };
      await addSecurityGroupRuleAPI(authToken, networkUrl, fullRulePayload);
      addToast(`Rule added to group '${selectedGroup.name}'.`, 'success');
      fetchData(true); 
      setIsAddRuleModalOpen(false);
    } catch (err) {
      const errorMsg = `Failed to add rule: ${(err as Error).message}`;
      setError(errorMsg);
      addToast(errorMsg, 'error');
      setIsLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
     if (!selectedGroup || !authToken || !serviceCatalog) return;
     if (window.confirm("Are you sure you want to delete this rule?")) {
        const networkUrl = getServiceEndpoint(serviceCatalog, 'network');
        if (!networkUrl) { 
          addToast("Network service endpoint not found.", 'error'); 
          return; 
        }
        
        setIsLoading(true);
        try {
            await deleteSecurityGroupRuleAPI(authToken, networkUrl, ruleId);
            addToast(`Rule ${ruleId} deleted successfully.`, 'success');
            fetchData(true); 
        } catch (err) {
            const errorMsg = `Failed to delete rule: ${(err as Error).message}`;
            setError(errorMsg);
            addToast(errorMsg, 'error');
            setIsLoading(false);
        }
     }
  };

  if (!authToken) return <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-md">Please login to manage security groups.</div>;
  if (isLoading && securityGroups.length === 0 && !selectedGroup) return <div className="flex justify-center items-center h-full"><Spinner text="Loading security groups..." size="lg" /></div>;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-semibold text-slate-100">Security Group Management</h2>
        <div className="space-x-2">
          <Button onClick={() => fetchData()} variant="outline" isLoading={isLoading && securityGroups.length > 0} disabled={isLoading && securityGroups.length > 0}>
            <RefreshCw size={18} className={(isLoading && securityGroups.length > 0) ? "animate-spin" : ""} />
            <span className="ml-2">Refresh</span>
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white" disabled={isLoading}>
            <PlusCircle size={18} className="mr-2" /> Create Security Group
          </Button>
        </div>
      </div>
      {error && <p className="text-red-400 bg-red-900/20 p-3 rounded-md my-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit">
          <h3 className="text-lg font-medium text-slate-100 mb-3">Security Groups</h3>
          {isLoading && securityGroups.length === 0 ? <Spinner/> : securityGroups.length > 0 ? (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {securityGroups.map(sg => (
                <li key={sg.id} 
                    className={`p-3 rounded-md cursor-pointer transition-colors flex justify-between items-center
                               ${selectedGroup?.id === sg.id ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-700 hover:bg-slate-600'}`}
                    onClick={() => setSelectedGroup(sg)}>
                  <div>
                    <p className="font-semibold">{sg.name}</p>
                    <p className={`text-xs ${selectedGroup?.id === sg.id ? 'text-teal-100' : 'text-slate-400'}`}>{sg.description}</p>
                  </div>
                  {sg.name !== 'default' && ( 
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(sg.id);}} 
                            className={` ${selectedGroup?.id === sg.id ? 'text-teal-100 hover:text-white' : 'text-slate-400 hover:text-red-400'}`}
                            disabled={isLoading}>
                        <Trash2 size={16} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-slate-400">No security groups found.</p>}
        </Card>

        <div className="md:col-span-2">
          {selectedGroup ? (
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-teal-400 flex items-center">
                  <ShieldCheck size={24} className="mr-2" /> Rules for: {selectedGroup.name}
                </h3>
                <Button onClick={() => setIsAddRuleModalOpen(true)} variant="outline" className="text-teal-400 border-teal-400 hover:bg-teal-400 hover:text-slate-900" disabled={isLoading}>
                  <ListPlus size={18} className="mr-2" /> Add Rule
                </Button>
              </div>
              {isLoading && selectedGroup.rules.length === 0 ? <Spinner text="Loading rules..."/> : 
                <RuleEditor rules={selectedGroup.rules} onDeleteRule={handleDeleteRule} />
              }
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center h-full min-h-[300px]">
               {isLoading && !selectedGroup ? <Spinner /> : <>
                <ShieldCheck size={48} className="text-slate-600 mb-4" />
                <p className="text-slate-400 text-lg">Select a security group to view its rules.</p>
                <p className="text-slate-400 text-sm mt-1">Or, create a new one to get started.</p>
               </>}
            </Card>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Security Group">
          <div className="space-y-4">
            <Input id="sgName" label="Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required />
            <Input id="sgDesc" label="Description" value={newGroupDescription} onChange={e => setNewGroupDescription(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-2 pt-6 mt-4 border-t border-slate-700">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} className="bg-teal-500 hover:bg-teal-600 text-white" disabled={isLoading || !newGroupName}>Create</Button>
          </div>
        </Modal>
      )}
      
      {isAddRuleModalOpen && selectedGroup && (
        <Modal isOpen={isAddRuleModalOpen} onClose={() => setIsAddRuleModalOpen(false)} title={`Add Rule to ${selectedGroup.name}`}>
            <TempRuleForm onSubmit={handleAddRule} onCancel={() => setIsAddRuleModalOpen(false)} isLoading={isLoading} />
        </Modal>
      )}
       <p className="text-sm text-slate-500 mt-4">
        AI Integration Ideas: Rule recommendation based on application type. Security audit for common misconfigurations.
      </p>
    </div>
  );
};

const TempRuleForm: React.FC<{
    onSubmit: (rule: Omit<SecurityGroupRule, 'id' | 'project_id' | 'security_group_id'>) => void, 
    onCancel: () => void,
    isLoading?: boolean
}> = ({onSubmit, onCancel, isLoading}) => {
    const [direction, setDirection] = useState<'ingress' | 'egress'>('ingress');
    const [protocol, setProtocol] = useState<'tcp' | 'udp' | 'icmp' | 'any' | null>('tcp');
    const [portMin, setPortMin] = useState<string>('');
    const [portMax, setPortMax] = useState<string>('');
    const [remoteIp, setRemoteIp] = useState<string>('0.0.0.0/0');
    const [ethertype, setEthertype] = useState<'IPv4' | 'IPv6'>('IPv4');
    const [remoteGroupId, setRemoteGroupId] = useState<string>('');


    const handleSubmit = () => {
        const rule: Omit<SecurityGroupRule, 'id' | 'project_id' | 'security_group_id'> = {
            direction,
            protocol: protocol === 'any' ? null : protocol, 
            portRangeMin: protocol === 'icmp' || protocol === 'any' || !portMin ? null : parseInt(portMin),
            portRangeMax: protocol === 'icmp' || protocol === 'any' || !portMax ? (protocol !== 'icmp' && portMin ? parseInt(portMin) : null) : parseInt(portMax), 
            remoteIpPrefix: remoteGroupId ? null : (remoteIp || null), 
            remoteGroupId: remoteIp ? null : (remoteGroupId || null),
            ethertype,
        };
        onSubmit(rule);
    };
    return (
        <div className="space-y-3 mt-4">
            <Select id="rule-direction" label="Direction" value={direction} onChange={e=>setDirection(e.target.value as 'ingress' | 'egress')}>
                <option value="ingress">Ingress</option>
                <option value="egress">Egress</option>
            </Select>
            <Select id="rule-ethertype" label="Ethertype" value={ethertype} onChange={e=>setEthertype(e.target.value as 'IPv4' | 'IPv6')}>
                <option value="IPv4">IPv4</option>
                <option value="IPv6">IPv6</option>
            </Select>
            <Select id="rule-protocol" label="Protocol" value={protocol || ''} onChange={e=>setProtocol(e.target.value as any)}>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="icmp">ICMP</option>
                <option value="any">Any</option>
            </Select>
            {(protocol === 'tcp' || protocol === 'udp') && <>
                <Input id="rule-port-min" label="Port Min" type="number" value={portMin} onChange={e=>setPortMin(e.target.value)} placeholder="e.g., 80" />
                <Input id="rule-port-max" label="Port Max (optional, defaults to Min)" type="number" value={portMax} onChange={e=>setPortMax(e.target.value)} placeholder="e.g., 80 or 443"/>
            </>}
             {protocol === 'icmp' && <>
                <Input id="rule-icmp-type" label="ICMP Type (optional)" type="number" value={portMin} onChange={e=>setPortMin(e.target.value)} placeholder="e.g., 8 for Echo Request"/>
                <Input id="rule-icmp-code" label="ICMP Code (optional)" type="number" value={portMax} onChange={e=>setPortMax(e.target.value)} placeholder="e.g., 0 for Echo Request Type"/>
            </>}
            <Input id="rule-remote-ip" label="Remote IP Prefix (CIDR)" value={remoteIp} onChange={e=>{setRemoteIp(e.target.value); if(e.target.value) setRemoteGroupId('');}} placeholder="0.0.0.0/0 (any) or specific CIDR" disabled={!!remoteGroupId}/>
            <Input id="rule-remote-group" label="Remote Security Group ID" value={remoteGroupId} onChange={e=>{setRemoteGroupId(e.target.value); if(e.target.value) setRemoteIp('');}} placeholder="ID of another security group" disabled={!!remoteIp && remoteIp !== '0.0.0.0/0'}/>


            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-700">
                <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
                <Button onClick={handleSubmit} className="bg-teal-500 hover:bg-teal-600 text-white" disabled={isLoading}>Add Rule</Button>
            </div>
        </div>
    )
}

export default SecurityGroupEditorPanel;