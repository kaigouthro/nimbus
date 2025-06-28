import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { ServiceCatalogEntry, KeystoneProject, KeystoneUser, SessionExportData } from '../../types';
import { LogIn, X, AlertTriangle, FileJson } from 'lucide-react';

interface ManualSessionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManualSessionImportModal: React.FC<ManualSessionImportModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [authUrl, setAuthUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [catalogJson, setCatalogJson] = useState('');
  const [projectJson, setProjectJson] = useState('');
  const [userJson, setUserJson] = useState('');
  
  const [sessionJsonBlob, setSessionJsonBlob] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearIndividualFields = () => {
    setAuthUrl('');
    setAuthToken('');
    setCatalogJson('');
    setProjectJson('');
    setUserJson('');
  };

  const handleImport = () => {
    setError(null);
    setIsLoading(true);

    try {
      if (sessionJsonBlob.trim()) {
        // Prioritize combined JSON blob
        const parsedSessionBlob: SessionExportData = JSON.parse(sessionJsonBlob);
        
        if (!parsedSessionBlob.authUrl || !parsedSessionBlob.authToken || !parsedSessionBlob.serviceCatalog) {
          throw new Error('Combined JSON is missing required fields: authUrl, authToken, serviceCatalog.');
        }
        if (!Array.isArray(parsedSessionBlob.serviceCatalog)) {
          throw new Error("Service Catalog in combined JSON must be an array.");
        }
        if (parsedSessionBlob.serviceCatalog.length === 0 && !window.confirm("Warning: The Service Catalog in the combined JSON is empty. This might limit application functionality. Continue?")) {
           setIsLoading(false);
           return;
        }

        login(
          parsedSessionBlob.authUrl,
          parsedSessionBlob.authToken,
          parsedSessionBlob.serviceCatalog,
          parsedSessionBlob.project || undefined,
          parsedSessionBlob.user || undefined
        );
        localStorage.setItem('nimbus-lastAuthUrl', parsedSessionBlob.authUrl);
        clearIndividualFields(); // Clear other fields as blob was used
      } else {
        // Fallback to individual fields
        if (!authUrl || !authToken || !catalogJson) {
          throw new Error('Keystone Auth URL, X-Subject-Token, and Service Catalog JSON are required when not using combined JSON.');
        }
        const parsedCatalog: ServiceCatalogEntry[] = JSON.parse(catalogJson);
        if (!Array.isArray(parsedCatalog)) {
          throw new Error("Service Catalog JSON must be an array.");
        }
        if (parsedCatalog.length === 0 && !window.confirm("Warning: The Service Catalog JSON is empty. This might limit application functionality. Continue?")) {
           setIsLoading(false);
           return;
        }

        let parsedProject: KeystoneProject | undefined = undefined;
        if (projectJson.trim()) parsedProject = JSON.parse(projectJson);

        let parsedUser: KeystoneUser | undefined = undefined;
        if (userJson.trim()) parsedUser = JSON.parse(userJson);
        
        login(authUrl, authToken, parsedCatalog, parsedProject, parsedUser);
        localStorage.setItem('nimbus-lastAuthUrl', authUrl);
      }
      onClose();
    } catch (e) {
      console.error("Error importing session data:", e);
      setError(`Failed to parse JSON or import session: ${(e as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const exampleCombinedJson = `{
  "authUrl": "https://keystone.example.com:5000/v3",
  "authToken": "gAAAAAB...",
  "serviceCatalog": [
    { "type": "compute", "name": "nova", "endpoints": [...] }
  ],
  "project": { "id": "...", "name": "...", "domain": {...} },
  "user": { "id": "...", "name": "...", "domain": {...} }
}`;
  const exampleCatalog = `[{"type": "compute", ...}]`;
  const exampleProject = `{"id": "...", "name": "...", ...}`;
  const exampleUser = `{"id": "...", "name": "...", ...}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manually Import OpenStack Session" size="lg">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-md flex items-start">
            <AlertTriangle size={20} className="mr-2 mt-0.5 text-red-400 flex-shrink-0" />
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="manual-session-blob" className="block text-sm font-medium text-slate-300 mb-1 flex items-center">
            <FileJson size={16} className="mr-2 text-teal-400" /> Combined Session JSON (Recommended)
          </label>
          <textarea
            id="manual-session-blob"
            value={sessionJsonBlob}
            onChange={(e) => { setSessionJsonBlob(e.target.value); if(e.target.value) clearIndividualFields(); }}
            placeholder={exampleCombinedJson}
            rows={8}
            className="block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm font-mono text-xs"
          />
          <p className="text-xs text-slate-500 mt-1">Paste the entire JSON content from an exported session file here.</p>
        </div>

        <div className="text-center my-4">
          <span className="text-slate-500 text-sm">OR fill individual fields below if not using combined JSON:</span>
          <hr className="border-slate-600 mt-1"/>
        </div>
        
        <fieldset disabled={!!sessionJsonBlob.trim()} className={sessionJsonBlob.trim() ? "opacity-50" : ""}>
            <Input
            id="manual-auth-url"
            label="Keystone Auth URL"
            type="url"
            value={authUrl}
            onChange={(e) => setAuthUrl(e.target.value)}
            placeholder="e.g., https://keystone.example.com:5000/v3"
            required={!sessionJsonBlob.trim()}
            />
            <Input
            id="manual-auth-token"
            label="X-Subject-Token"
            type="text"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Paste your full OpenStack token here"
            required={!sessionJsonBlob.trim()}
            containerClassName="mt-4"
            />
            <div className="mt-4">
            <label htmlFor="manual-catalog-json" className="block text-sm font-medium text-slate-300 mb-1">
                Service Catalog JSON <span className={!sessionJsonBlob.trim() ? "text-red-400" : "text-slate-500"}>*</span>
            </label>
            <textarea
                id="manual-catalog-json"
                value={catalogJson}
                onChange={(e) => setCatalogJson(e.target.value)}
                placeholder={exampleCatalog}
                rows={4}
                className="block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm font-mono text-xs"
                required={!sessionJsonBlob.trim()}
            />
            </div>
            <div className="mt-4">
            <label htmlFor="manual-project-json" className="block text-sm font-medium text-slate-300 mb-1">
                Project JSON (Optional)
            </label>
            <textarea
                id="manual-project-json"
                value={projectJson}
                onChange={(e) => setProjectJson(e.target.value)}
                placeholder={exampleProject}
                rows={3}
                className="block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm font-mono text-xs"
            />
            </div>
            <div className="mt-4">
            <label htmlFor="manual-user-json" className="block text-sm font-medium text-slate-300 mb-1">
                User JSON (Optional)
            </label>
            <textarea
                id="manual-user-json"
                value={userJson}
                onChange={(e) => setUserJson(e.target.value)}
                placeholder={exampleUser}
                rows={3}
                className="block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm font-mono text-xs"
            />
            </div>
        </fieldset>
      </div>
      <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-slate-700">
        <Button onClick={onClose} variant="outline" disabled={isLoading}>
          <X size={18} className="mr-2" /> Cancel
        </Button>
        <Button 
            onClick={handleImport} 
            className="bg-teal-500 hover:bg-teal-600 text-white" 
            isLoading={isLoading} 
            disabled={isLoading || (!sessionJsonBlob.trim() && (!authUrl || !authToken || !catalogJson)) }
        >
          <LogIn size={18} className="mr-2" /> Import Session
        </Button>
      </div>
       <p className="text-xs text-slate-500 mt-3">
        This feature is for development or debugging. Data is stored in your browser's local storage.
      </p>
    </Modal>
  );
};

export default ManualSessionImportModal;