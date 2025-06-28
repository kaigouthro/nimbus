import React, { useState, useEffect } from 'react'; // Added useEffect
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Input from '../common/Input';
import { KeystoneTokenResponse, ServiceCatalogEntry, KeystoneProject, KeystoneUser } from '../../types'; 
import { Briefcase, ShieldAlert, LogIn } from 'lucide-react';

// Define keys for RC import values in localStorage
const RC_IMPORT_AUTH_URL_KEY = 'nimbus-rcImport-authUrl';
const RC_IMPORT_USERNAME_KEY = 'nimbus-rcImport-username';
const RC_IMPORT_DOMAIN_NAME_KEY = 'nimbus-rcImport-domainName';
const RC_IMPORT_PROJECT_IDENTIFIER_KEY = 'nimbus-rcImport-projectIdentifier';
const RC_IMPORT_SCOPE_BY_PROJECT_ID_KEY = 'nimbus-rcImport-scopeByProjectId';
const RC_IMPORT_PROJECT_DOMAIN_NAME_KEY = 'nimbus-rcImport-projectDomainName';

// Interface for Keystone Authentication Payload
interface KeystoneAuthPayload {
  auth: {
    identity: {
      methods: string[];
      password: {
        user: {
          name: string;
          domain: { name: string };
          password: string;
        };
      };
    };
    scope?: {
      project?: {
        id?: string;
        name?: string;
        domain?: { name: string };
      };
      domain?: { name: string };
    };
  };
}


const AuthForm: React.FC = () => {
  const { login } = useAuth();
  
  // Initialize state trying RC import values first, then last used, then defaults
  const [authUrl, setAuthUrl] = useState(
    localStorage.getItem(RC_IMPORT_AUTH_URL_KEY) || localStorage.getItem('nimbus-lastAuthUrl') || ''
  );
  const [username, setUsername] = useState(
    localStorage.getItem(RC_IMPORT_USERNAME_KEY) || localStorage.getItem('nimbus-lastUsername') || ''
  );
  const [password, setPassword] = useState('');
  const [domainName, setDomainName] = useState(
    localStorage.getItem(RC_IMPORT_DOMAIN_NAME_KEY) || localStorage.getItem('nimbus-lastDomain') || 'Default'
  );
  const [projectIdentifier, setProjectIdentifier] = useState(
    localStorage.getItem(RC_IMPORT_PROJECT_IDENTIFIER_KEY) || localStorage.getItem('nimbus-lastProjectIdentifier') || ''
  );
  const [scopeByProjectId, setScopeByProjectId] = useState(
    (localStorage.getItem(RC_IMPORT_SCOPE_BY_PROJECT_ID_KEY) || localStorage.getItem('nimbus-lastScopeByProjectId')) === 'true'
  );
  // For project name scoping with specific domain
  const [projectDomainName, setProjectDomainName] = useState(
    localStorage.getItem(RC_IMPORT_PROJECT_DOMAIN_NAME_KEY) || localStorage.getItem('nimbus-lastProjectDomainName') || ''
  );


  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State for manual token login
  const [manualToken, setManualToken] = useState('');
  const [manualServiceCatalogJson, setManualServiceCatalogJson] = useState('');
  const [manualProjectJson, setManualProjectJson] = useState('');
  const [manualUserJson, setManualUserJson] = useState('');
  const [manualLoginError, setManualLoginError] = useState<string | null>(null);
  const [isManualLoading, setIsManualLoading] = useState(false);

  // Clear RC import values from localStorage after they've been used for pre-filling
  useEffect(() => {
    const rcImportKeys = [
      RC_IMPORT_AUTH_URL_KEY,
      RC_IMPORT_USERNAME_KEY,
      RC_IMPORT_DOMAIN_NAME_KEY,
      RC_IMPORT_PROJECT_IDENTIFIER_KEY,
      RC_IMPORT_SCOPE_BY_PROJECT_ID_KEY,
      RC_IMPORT_PROJECT_DOMAIN_NAME_KEY,
    ];
    rcImportKeys.forEach(key => localStorage.removeItem(key));
  }, []); // Empty dependency array to run only once after initial render


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setManualLoginError(null);
    setIsLoading(true);

    if (!authUrl || !username || !password) {
        setError("Auth URL, Username, and Password are required.");
        setIsLoading(false);
        return;
    }
    if (!domainName) { 
        setError("User's Domain Name is required.");
        setIsLoading(false);
        return;
    }

    const authPayload: KeystoneAuthPayload = { // Use defined interface
      auth: {
        identity: {
          methods: ['password'],
          password: {
            user: {
              name: username,
              domain: { name: domainName }, 
              password: password,
            },
          },
        },
      },
    };

    if (projectIdentifier) {
      if (scopeByProjectId) { // Scope by Project ID
        authPayload.auth.scope = {
          project: {
            id: projectIdentifier,
            // Domain of the project ID is usually not needed as ID is unique
          },
        };
      } else { // Scope by Project Name
        authPayload.auth.scope = {
          project: {
            name: projectIdentifier,
            // Project domain is required if scoping by project name and project is not in user's domain
            domain: { name: projectDomainName || domainName }, // Use specific project domain if provided, else user's domain
          },
        };
      }
    } else { // Scope by User's Domain Name
         authPayload.auth.scope = {
            domain: { name: domainName }
        };
    }

    try {
      let cleanAuthUrl = authUrl.replace(/\/+$/, ''); 
      if (!cleanAuthUrl.endsWith('/v3')) {
        if (cleanAuthUrl.includes('/identity')) { 
            cleanAuthUrl = cleanAuthUrl.replace(/\/identity.*$/, '/identity/v3');
        } else { 
            cleanAuthUrl += '/v3';
        }
      }
      
      const response = await fetch(`${cleanAuthUrl}/auth/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(authPayload),
      });

      console.log("AuthForm: Headers accessible to client-side script from response:");
      response.headers.forEach((value, name) => {
        console.log(`  ${name}: ${value}`);
      });

      const token = response.headers.get('X-Subject-Token');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error during authentication.' } }));
        console.error("Keystone auth error response:", errorData);
        const detail = errorData?.error?.message || `Authentication failed with status: ${response.status}`;
        setError(`Login failed: ${detail}. Ensure credentials, domain, project identifier, and Auth URL are correct. Check console for details.`);
        setIsLoading(false);
        return;
      }

      if (!token) {
        console.error(`Keystone auth HTTP request successful (status ${response.status}), but X-Subject-Token not accessible in client-side script. This is often due to missing 'Access-Control-Expose-Headers' in the server's CORS policy, which should include 'X-Subject-Token'. Check the console log above for list of actually exposed headers.`);
        setError(`Authentication HTTP request succeeded (status ${response.status}), but the auth token (X-Subject-Token) could not be retrieved by the application. This is typically a server-side CORS configuration issue. The server needs to send the 'Access-Control-Expose-Headers: X-Subject-Token' header. Please contact your OpenStack administrator. Check console for list of exposed headers.`);
        setIsLoading(false);
        return;
      }

      const responseData: KeystoneTokenResponse = await response.json();
      const serviceCatalog = responseData.token.catalog || [];
      const projectDetails = responseData.token.project;
      const userDetails = responseData.token.user;
      
      localStorage.setItem('nimbus-lastAuthUrl', authUrl); 
      localStorage.setItem('nimbus-lastUsername', username);
      localStorage.setItem('nimbus-lastDomain', domainName);
      localStorage.setItem('nimbus-lastProjectIdentifier', projectIdentifier);
      localStorage.setItem('nimbus-lastScopeByProjectId', JSON.stringify(scopeByProjectId));
      if (projectDomainName) {
        localStorage.setItem('nimbus-lastProjectDomainName', projectDomainName);
      } else {
        localStorage.removeItem('nimbus-lastProjectDomainName');
      }

      login(cleanAuthUrl, token, serviceCatalog, projectDetails, userDetails);
    } catch (err) {
      console.error("Error during authentication:", err);
      if ((err as Error).message.toLowerCase().includes('failed to fetch')) {
         setError(`Connection error: ${(err as Error).message}. This could be due to CORS, network issues, or an incorrect Keystone URL. Ensure the URL is accessible and check browser console for details.`);
      } else {
        setError(`Error: ${(err as Error).message || 'Could not connect to Keystone.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleScopeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScopeByProjectId(e.target.checked);
    localStorage.setItem('nimbus-lastScopeByProjectId', JSON.stringify(e.target.checked));
  };

  const handleBypassLogin = () => {
    setIsLoading(true);
    setError(null);
    setManualLoginError(null);
    login(
      "dev-bypass-url",
      "dev-bypass-token",
      [],
      undefined,
      undefined
    );
  };

  const handleManualLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoginError(null);
    setError(null);
    setIsManualLoading(true);

    if (!authUrl || !manualToken || !manualServiceCatalogJson) {
      setManualLoginError("Keystone URL, X-Subject-Token, and Service Catalog JSON are required for manual login.");
      setIsManualLoading(false);
      return;
    }

    try {
      const parsedCatalog: ServiceCatalogEntry[] = JSON.parse(manualServiceCatalogJson);
      if (!Array.isArray(parsedCatalog)) {
        throw new Error("Service Catalog JSON must be an array.");
      }
      if (parsedCatalog.length === 0 && !window.confirm("Warning: The Service Catalog JSON is empty. This might limit application functionality. Continue?")) {
        setIsManualLoading(false);
        return;
      }

      let parsedProject: KeystoneProject | undefined = undefined;
      if (manualProjectJson.trim()) parsedProject = JSON.parse(manualProjectJson);

      let parsedUser: KeystoneUser | undefined = undefined;
      if (manualUserJson.trim()) parsedUser = JSON.parse(manualUserJson);
      
      let cleanAuthUrl = authUrl.replace(/\/+$/, '');
       // No need to add /v3 here as the user provides the full URL they used to get the token

      login(cleanAuthUrl, manualToken, parsedCatalog, parsedProject, parsedUser);
      localStorage.setItem('nimbus-lastAuthUrl', authUrl); 
      // Potentially save other manual fields to local storage if desired

    } catch (err) {
      console.error("Error during manual login:", err);
      setManualLoginError(`Manual Login Error: ${(err as Error).message || 'Could not parse JSON or connect.'}`);
    } finally {
      setIsManualLoading(false);
    }
  };

  const exampleCatalog = `[{"type": "compute", "name": "nova", "endpoints": [...]}]`;
  const exampleProject = `{"id": "...", "name": "...", "domain": {"id":"...", "name":"..."}}`;
  const exampleUser = `{"id": "...", "name": "...", "domain": {"id":"...", "name":"..."}}`;


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 shadow-xl rounded-lg p-8 space-y-6 border border-slate-700">
        <div className="text-center">
          <Briefcase className="mx-auto h-12 w-12 text-teal-400" />
          <h2 className="mt-4 text-3xl font-extrabold text-slate-100">
            NimbusEasyStack Login
          </h2>
        </div>
        
        <Input
            id="authUrl"
            label="Keystone API Endpoint URL"
            type="url"
            value={authUrl}
            onChange={(e) => setAuthUrl(e.target.value)}
            placeholder="e.g., http://host:5000 or http://host/identity/v3"
            required
            autoComplete="on"
            containerClassName="mb-4"
        />
        
        {error && (
          <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-md">
            <p className="whitespace-pre-wrap">{error}</p>
          </div>
        )}
        {manualLoginError && (
          <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-md">
            <p className="whitespace-pre-wrap">{manualLoginError}</p>
          </div>
        )}

        {/* Standard Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">Password-Based Login</h3>
          <Input
            id="username"
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Input
            id="domainName"
            label="User's Domain Name"
            type="text"
            value={domainName}
            onChange={(e) => setDomainName(e.target.value)}
            placeholder="e.g., Default or your_domain_name"
            required
          />
          <div className="flex items-center space-x-2 mt-2 mb-1">
            <input
              type="checkbox"
              id="scopeByProjectId"
              checked={scopeByProjectId}
              onChange={handleScopeToggle}
              className="h-4 w-4 text-teal-500 border-slate-600 rounded bg-slate-700 focus:ring-teal-500 focus:ring-offset-slate-800"
              aria-describedby="scopeHelpText"
            />
            <label htmlFor="scopeByProjectId" className="text-sm text-slate-300">
              Authenticate with Project ID
            </label>
          </div>
          <Input
            id="projectIdentifier"
            label={scopeByProjectId ? "Project ID (optional for domain-scoped token)" : "Project Name (optional for domain-scoped token)"}
            type="text"
            value={projectIdentifier}
            onChange={(e) => setProjectIdentifier(e.target.value)}
            placeholder={scopeByProjectId ? "Enter Project ID (e.g., 7be4...)" : "Enter Project Name (e.g., admin)"}
          />
           {!scopeByProjectId && projectIdentifier && ( // Show Project Domain Name field only if scoping by Project Name
            <Input
              id="projectDomainName"
              label="Project's Domain Name (if different from User's Domain)"
              type="text"
              value={projectDomainName}
              onChange={(e) => setProjectDomainName(e.target.value)}
              placeholder="e.g., Default or project_domain"
            />
          )}
           <p id="scopeHelpText" className="text-xs text-slate-500 -mt-2">
            If no Project Name/ID is provided, a domain-scoped token will be requested for the User's Domain.
          </p>
          <Button type="submit" fullWidth isLoading={isLoading} className="bg-teal-500 hover:bg-teal-600 text-white !mt-6">
            {isLoading ? 'Connecting...' : 'Connect to OpenStack'}
          </Button>
        </form>

        {/* Manual Token Login Form */}
        <div className="mt-8 pt-6 border-t border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2 mb-4">Manual Token Login (Dev/Debug)</h3>
          <form onSubmit={handleManualLoginSubmit} className="space-y-4">
            <Input
              id="manualToken"
              label="X-Subject-Token"
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste X-Subject-Token here"
              required
            />
            <div>
              <label htmlFor="manualServiceCatalogJson" className="block text-sm font-medium text-slate-300 mb-1">
                Service Catalog JSON <span className="text-red-400">*</span>
              </label>
              <textarea
                id="manualServiceCatalogJson"
                value={manualServiceCatalogJson}
                onChange={(e) => setManualServiceCatalogJson(e.target.value)}
                placeholder={exampleCatalog}
                rows={4}
                className="block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm font-mono text-xs"
                required
              />
            </div>
             <div>
              <label htmlFor="manualProjectJson" className="block text-sm font-medium text-slate-300 mb-1">
                Project JSON (Optional)
              </label>
              <textarea
                id="manualProjectJson"
                value={manualProjectJson}
                onChange={(e) => setManualProjectJson(e.target.value)}
                placeholder={exampleProject}
                rows={3}
                className="block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm font-mono text-xs"
              />
            </div>
            <div>
              <label htmlFor="manualUserJson" className="block text-sm font-medium text-slate-300 mb-1">
                User JSON (Optional)
              </label>
              <textarea
                id="manualUserJson"
                value={manualUserJson}
                onChange={(e) => setManualUserJson(e.target.value)}
                placeholder={exampleUser}
                rows={3}
                className="block w-full px-3 py-2 border border-slate-700 rounded-md shadow-sm bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm font-mono text-xs"
              />
            </div>
            <Button type="submit" fullWidth isLoading={isManualLoading} className="bg-sky-500 hover:bg-sky-600 text-white !mt-6">
              <LogIn size={16} className="mr-2" /> {isManualLoading ? 'Logging in...' : 'Login with Manual Data'}
            </Button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700">
            <Button 
              onClick={handleBypassLogin} 
              fullWidth 
              variant="outline" 
              className="border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-slate-900"
              leftIcon={<ShieldAlert size={16} />}
            >
              Bypass Login (Quick Dev Access)
            </Button>
            <p className="text-xs text-slate-500 text-center mt-2">
              Use this to access the app for manual session file import if Keystone is unavailable and you don't have token details.
            </p>
        </div>
        
        <p className="text-xs text-slate-500 text-center pt-4 border-t border-slate-600">
            For password-based login, Keystone URL will be automatically suffixed with /v3 if needed.
            Credentials are sent directly to your Keystone endpoint.
        </p>
      </div>
    </div>
  );
};

export default AuthForm;