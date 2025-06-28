
import React, { useState, useRef, useEffect } from 'react';
import { Briefcase, Search, User, LogOut, Settings, UploadCloud, LogInIcon, DownloadCloud } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { OpenStackEndpointConfig, SessionExportData } from '../../types';
import EndpointConfigModal from '../auth/EndpointConfigModal';
import ManualSessionImportModal from '../auth/ManualSessionImportModal';
import { useToast } from '../../hooks/useToast'; // Import useToast

const MainHeader: React.FC = () => {
  const { isAuthenticated, logout, currentUser, currentProject, currentKeystoneEndpointUrl, authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast(); // Get addToast function
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const [isManualImportModalOpen, setIsManualImportModalOpen] = useState(false); 
  
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input


  const toggleUserDropdown = () => setUserDropdownOpen(!userDropdownOpen);
  const toggleProjectDropdown = () => setProjectDropdownOpen(!projectDropdownOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveEndpoints = (endpoints: OpenStackEndpointConfig[]) => {
    localStorage.setItem('nimbus-savedEndpointConfigs', JSON.stringify(endpoints));
  };
  
  const getInitialEndpoints = (): OpenStackEndpointConfig[] => {
    const saved = localStorage.getItem('nimbus-savedEndpointConfigs');
    return saved ? JSON.parse(saved) : [];
  }

  const handleExportSession = () => {
    if (!isAuthenticated || !currentKeystoneEndpointUrl || !authToken || !serviceCatalog) {
      addToast("No active session to export.", 'warning');
      return;
    }
    const sessionData: SessionExportData = {
      authUrl: currentKeystoneEndpointUrl,
      authToken: authToken,
      serviceCatalog: serviceCatalog,
      project: currentProject || undefined, 
      user: currentUser || undefined,       
    };

    const jsonString = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nimbus-easystack-session.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setUserDropdownOpen(false);
    addToast("Session data exported successfully.", 'success');
  };

  const parseRCFileContent = (content: string): Record<string, string> => {
    const ASTERISK_PASSWORD = "****************"; // Do not use the password
    const parsed: Record<string, string> = {};
    const lines = content.split('\n');
    const regex = /^\s*(?:export\s+|set\s+)?(OS_[A-Z_]+)=['"]?([^'"\s]+)['"]?/i;

    lines.forEach(line => {
      const match = line.match(regex);
      if (match) {
        const key = match[1];
        let value = match[2];
        if (key === "OS_PASSWORD" || key === "NOVA_API_KEY") {
            value = ASTERISK_PASSWORD;
        }
        parsed[key] = value;
      }
    });
    return parsed;
  };

  const handleRCFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const parsedEnv = parseRCFileContent(content);
        
        if (parsedEnv.OS_AUTH_URL) localStorage.setItem('nimbus-rcImport-authUrl', parsedEnv.OS_AUTH_URL);
        if (parsedEnv.OS_USERNAME) localStorage.setItem('nimbus-rcImport-username', parsedEnv.OS_USERNAME);
        
        // Domain handling: OS_USER_DOMAIN_NAME is preferred for the user's domain.
        // OS_DOMAIN_NAME can be a fallback if others aren't set.
        const userDomain = parsedEnv.OS_USER_DOMAIN_NAME || parsedEnv.OS_DOMAIN_NAME;
        if (userDomain) localStorage.setItem('nimbus-rcImport-domainName', userDomain);

        // Project handling
        const projectId = parsedEnv.OS_PROJECT_ID;
        const projectName = parsedEnv.OS_PROJECT_NAME;
        const projectDomain = parsedEnv.OS_PROJECT_DOMAIN_NAME || parsedEnv.OS_DOMAIN_NAME; // Domain for the project

        if (projectId) {
          localStorage.setItem('nimbus-rcImport-projectIdentifier', projectId);
          localStorage.setItem('nimbus-rcImport-scopeByProjectId', 'true');
           // If project ID is set, project domain is implicitly handled by OpenStack with ID scope
        } else if (projectName) {
          localStorage.setItem('nimbus-rcImport-projectIdentifier', projectName);
          localStorage.setItem('nimbus-rcImport-scopeByProjectId', 'false');
          if (projectDomain) {
             // This is to help AuthForm if project name scope needs specific domain
             localStorage.setItem('nimbus-rcImport-projectDomainName', projectDomain);
          }
        }
        
        addToast("RC file processed. Login form pre-filled. Please enter your password if required.", 'success', 6000);
        setUserDropdownOpen(false);
      } else {
        addToast("Could not read RC file content.", 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input value so the same file can be selected again
    if (event.target) event.target.value = ''; 
  };

  const triggerRCFileImport = () => {
    fileInputRef.current?.click();
    setUserDropdownOpen(false);
  };


  let keystoneHostname = 'unknown';
  if (currentKeystoneEndpointUrl) {
    try {
      const parsedUrl = new URL(currentKeystoneEndpointUrl);
      keystoneHostname = parsedUrl.hostname;
    } catch (e) {
      console.warn(`Invalid Keystone URL for display in MainHeader: ${currentKeystoneEndpointUrl}`);
    }
  }


  return (
    <header className="bg-slate-800 shadow-md p-4 flex items-center justify-between border-b border-slate-700">
      <div className="flex items-center">
        <Briefcase className="h-8 w-8 text-teal-400 mr-3" />
        <h1 className="text-xl font-semibold text-slate-100">NimbusEasyStack</h1>
      </div>

      <div className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="search"
            name="globalSearch"
            id="globalSearch"
            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-md leading-5 bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            placeholder="Search resources (e.g., instance name, volume ID)..."
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Project Display */}
        <div className="relative" ref={projectDropdownRef}>
          <button
            onClick={toggleProjectDropdown}
            className="flex items-center space-x-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            title={currentProject ? `Project: ${currentProject.name} (Domain: ${currentProject.domain.name})` : "No project scoped"}
          >
            <Briefcase className="h-5 w-5 text-teal-400" />
            <span className="text-sm text-slate-200 hidden md:inline truncate max-w-[150px]">
              {currentProject?.name || (currentUser?.domain.name + ' (Domain)') || 'No Project'}
            </span>
          </button>
           {projectDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-700 rounded-md shadow-lg py-1 z-50 border border-slate-600">
              <div className="px-4 py-2">
                <p className="text-xs text-slate-400">Current Scope:</p>
                {currentProject ? (
                  <>
                    <p className="text-sm font-medium text-slate-100 truncate">Project: {currentProject.name}</p>
                    <p className="text-xs text-slate-300 truncate">ID: {currentProject.id}</p>
                    <p className="text-xs text-slate-300 truncate">Domain: {currentProject.domain.name} (ID: {currentProject.domain.id})</p>
                  </>
                ) : currentUser?.domain ? (
                     <p className="text-sm font-medium text-slate-100 truncate">Domain: {currentUser.domain.name} (ID: {currentUser.domain.id})</p>
                ) : (
                  <p className="text-sm text-slate-300">Unscoped or unknown</p>
                )}
                 <p className="mt-2 text-xs text-slate-500">Project/domain switching is not yet implemented.</p>
              </div>
            </div>
          )}
        </div>

        {/* User Profile/Settings */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={toggleUserDropdown}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            title={currentUser ? `User: ${currentUser.name}` : "User Profile"}
          >
            <User className="h-5 w-5 text-teal-400" />
          </button>
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-700 rounded-md shadow-lg py-1 z-50 border border-slate-600">
              <div className="px-4 py-3">
                <p className="text-sm text-slate-200">Signed in as</p>
                <p className="text-sm font-medium text-slate-100 truncate">{currentUser?.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">
                  Domain: {currentUser?.domain.name || 'N/A'}
                </p>
                <p className="text-xs text-slate-400 truncate">Keystone: {keystoneHostname}</p>
              </div>
              <div className="border-t border-slate-600"></div>
              <button
                onClick={() => { setIsEndpointModalOpen(true); setUserDropdownOpen(false); }}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
              >
                <Settings className="mr-3 h-4 w-4" /> Manage API Endpoints
              </button>
              <button
                onClick={triggerRCFileImport} // Updated onClick handler
                className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
              >
                <UploadCloud className="mr-3 h-4 w-4" /> Import RC File
              </button>
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleRCFileImport}
                accept=".sh,.rc,.txt,application/octet-stream" // Common extensions for RC files
              />
               <button 
                onClick={() => { setIsManualImportModalOpen(true); setUserDropdownOpen(false); }}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600"
              >
                <LogInIcon className="mr-3 h-4 w-4" /> Import Session Data
              </button>
              <button
                onClick={handleExportSession}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isAuthenticated}
              >
                <DownloadCloud className="mr-3 h-4 w-4" /> Export Session Data
              </button>
              <div className="border-t border-slate-600"></div>
              <button
                onClick={logout}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-400 hover:bg-slate-600 hover:text-red-300"
              >
                <LogOut className="mr-3 h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
      {isEndpointModalOpen && (
        <EndpointConfigModal
          isOpen={isEndpointModalOpen}
          onClose={() => setIsEndpointModalOpen(false)}
          onSave={handleSaveEndpoints}
          initialEndpoints={getInitialEndpoints()} 
        />
      )}
      {isManualImportModalOpen && ( 
        <ManualSessionImportModal
          isOpen={isManualImportModalOpen}
          onClose={() => setIsManualImportModalOpen(false)}
        />
      )}
    </header>
  );
};

export default MainHeader;
