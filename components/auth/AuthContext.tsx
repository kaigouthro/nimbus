
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { ServiceCatalogEntry, KeystoneProject, KeystoneUser } from '../../types';

interface AuthContextType {
  isAuthenticated: boolean;
  authToken: string | null;
  serviceCatalog: ServiceCatalogEntry[] | null;
  currentProject: KeystoneProject | null;
  currentUser: KeystoneUser | null;
  currentKeystoneEndpointUrl: string | null; // The actual URL used for auth
  login: (
    rawAuthUrl: string, 
    token: string, 
    catalog: ServiceCatalogEntry[], 
    project?: KeystoneProject, 
    user?: KeystoneUser
  ) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NIMBUS_AUTH_TOKEN_KEY = 'nimbus-authToken';
const NIMBUS_SERVICE_CATALOG_KEY = 'nimbus-serviceCatalog';
const NIMBUS_CURRENT_PROJECT_KEY = 'nimbus-currentProject';
const NIMBUS_CURRENT_USER_KEY = 'nimbus-currentUser';
const NIMBUS_KEYSTONE_URL_KEY = 'nimbus-keystoneUrl';


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogEntry[] | null>(null);
  const [currentProject, setCurrentProject] = useState<KeystoneProject | null>(null);
  const [currentUser, setCurrentUser] = useState<KeystoneUser | null>(null);
  const [currentKeystoneEndpointUrl, setCurrentKeystoneEndpointUrl] = useState<string | null>(null);


  useEffect(() => {
    const storedToken = localStorage.getItem(NIMBUS_AUTH_TOKEN_KEY);
    const storedServiceCatalog = localStorage.getItem(NIMBUS_SERVICE_CATALOG_KEY);
    const storedProject = localStorage.getItem(NIMBUS_CURRENT_PROJECT_KEY);
    const storedUser = localStorage.getItem(NIMBUS_CURRENT_USER_KEY);
    const storedKeystoneUrl = localStorage.getItem(NIMBUS_KEYSTONE_URL_KEY);

    if (storedToken && storedServiceCatalog && storedKeystoneUrl) {
      try {
        const parsedServiceCatalog = JSON.parse(storedServiceCatalog) as ServiceCatalogEntry[];
        const parsedProject = storedProject ? JSON.parse(storedProject) as KeystoneProject : null;
        const parsedUser = storedUser ? JSON.parse(storedUser) as KeystoneUser : null;
        
        // Basic validation
        if (parsedServiceCatalog) { // Project can be null for domain-scoped tokens
            setAuthToken(storedToken);
            setServiceCatalog(parsedServiceCatalog);
            setCurrentProject(parsedProject);
            setCurrentUser(parsedUser);
            setCurrentKeystoneEndpointUrl(storedKeystoneUrl);
            setIsAuthenticated(true);
        } else {
            throw new Error("Invalid stored auth data");
        }
      } catch (error) {
        console.error("Failed to parse stored auth session:", error);
        // Clear all related auth items if any part is corrupted
        localStorage.removeItem(NIMBUS_AUTH_TOKEN_KEY);
        localStorage.removeItem(NIMBUS_SERVICE_CATALOG_KEY);
        localStorage.removeItem(NIMBUS_CURRENT_PROJECT_KEY);
        localStorage.removeItem(NIMBUS_CURRENT_USER_KEY);
        localStorage.removeItem(NIMBUS_KEYSTONE_URL_KEY);
      }
    }
  }, []);

  const login = (
    rawAuthUrl: string,
    token: string, 
    catalog: ServiceCatalogEntry[], 
    project?: KeystoneProject, 
    user?: KeystoneUser
  ) => {
    setAuthToken(token);
    setServiceCatalog(catalog);
    setCurrentProject(project || null); // project can be undefined for domain-scoped tokens
    setCurrentUser(user || null);
    setCurrentKeystoneEndpointUrl(rawAuthUrl);
    setIsAuthenticated(true);
    
    localStorage.setItem(NIMBUS_AUTH_TOKEN_KEY, token);
    localStorage.setItem(NIMBUS_SERVICE_CATALOG_KEY, JSON.stringify(catalog));
    if (project) localStorage.setItem(NIMBUS_CURRENT_PROJECT_KEY, JSON.stringify(project));
    else localStorage.removeItem(NIMBUS_CURRENT_PROJECT_KEY);
    if (user) localStorage.setItem(NIMBUS_CURRENT_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(NIMBUS_CURRENT_USER_KEY);
    localStorage.setItem(NIMBUS_KEYSTONE_URL_KEY, rawAuthUrl);

    console.log("AuthContext: Logged in. User:", user?.name, "Project:", project?.name, "Auth URL:", rawAuthUrl);
  };

  const logout = () => {
    setAuthToken(null);
    setServiceCatalog(null);
    setCurrentProject(null);
    setCurrentUser(null);
    setCurrentKeystoneEndpointUrl(null);
    setIsAuthenticated(false);

    localStorage.removeItem(NIMBUS_AUTH_TOKEN_KEY);
    localStorage.removeItem(NIMBUS_SERVICE_CATALOG_KEY);
    localStorage.removeItem(NIMBUS_CURRENT_PROJECT_KEY);
    localStorage.removeItem(NIMBUS_CURRENT_USER_KEY);
    localStorage.removeItem(NIMBUS_KEYSTONE_URL_KEY);
    console.log("AuthContext: Logged out.");
  };

  return (
    <AuthContext.Provider value={{ 
        isAuthenticated, authToken, serviceCatalog, 
        currentProject, currentUser, currentKeystoneEndpointUrl, 
        login, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
