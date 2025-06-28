import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { 
    getServiceEndpoint, fetchImages, fetchFlavors, 
    fetchNetworks, fetchSecurityGroups, fetchKeyPairs,
    launchInstanceAPI 
} from '../../../services/OpenStackAPIService';
import { Image as OpenStackImage, Flavor, Network, SecurityGroup, KeyPair } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Input from '../../common/Input';
import Button from '../../common/Button';
import LaunchInstanceWizard from '../instances/LaunchInstanceWizard';
import { ImageIcon as ImageIconLucide, Search, HardDrive, DatabaseZap, Rocket } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';

const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const ImageSelectorPanel: React.FC = () => {
  const { authToken, serviceCatalog } = useAuth();
  const { addToast } = useToast();

  const [images, setImages] = useState<OpenStackImage[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [securityGroups, setSecurityGroups] = useState<SecurityGroup[]>([]);
  const [keyPairs, setKeyPairs] = useState<KeyPair[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardDataLoading, setIsWizardDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private' | 'shared' | 'community'>('all');

  const [isLaunchWizardOpen, setIsLaunchWizardOpen] = useState(false);
  const [selectedImageForLaunch, setSelectedImageForLaunch] = useState<OpenStackImage | null>(null);


  const fetchData = useCallback(async (isInitialLoad = true) => {
    if (!authToken || !serviceCatalog) {
      setError("Not authenticated or service catalog unavailable.");
      if(isInitialLoad) setIsLoading(false);
      return;
    }
    if(isInitialLoad) setIsLoading(true);
    setError(null);

    const imageUrl = getServiceEndpoint(serviceCatalog, 'image');
    if (!imageUrl) {
        setError("Image service endpoint not found in catalog.");
        if(isInitialLoad) setIsLoading(false);
        return;
    }

    try {
      const imageData = await fetchImages(authToken, imageUrl);
      setImages(imageData);
    } catch (err) {
      console.error("Error fetching image data:", err);
      setError(`Failed to load image data: ${(err as Error).message}`);
      addToast(`Failed to load image data: ${(err as Error).message}`, 'error');
    } finally {
      if(isInitialLoad) setIsLoading(false);
    }
  }, [authToken, serviceCatalog, addToast]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const fetchWizardPrerequisites = async () => {
    if (!authToken || !serviceCatalog) {
        addToast("Authentication details missing for launching instance.", 'error');
        return false;
    }
    setIsWizardDataLoading(true);
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    const networkUrl = getServiceEndpoint(serviceCatalog, 'network');

    if (!computeUrl || !networkUrl) {
        addToast("Compute or Network service endpoint not found.", 'error');
        setIsWizardDataLoading(false);
        return false;
    }

    try {
        const [flavorData, networkData, sgData, kpData] = await Promise.all([
            fetchFlavors(authToken, computeUrl),
            fetchNetworks(authToken, networkUrl),
            fetchSecurityGroups(authToken, networkUrl),
            fetchKeyPairs(authToken, computeUrl)
        ]);
        setFlavors(flavorData);
        setNetworks(networkData);
        setSecurityGroups(sgData);
        setKeyPairs(kpData);
        setIsWizardDataLoading(false);
        return true;
    } catch (err) {
        console.error("Error fetching prerequisites for launch wizard:", err);
        addToast(`Failed to load data for launch wizard: ${(err as Error).message}`, 'error');
        setIsWizardDataLoading(false);
        return false;
    }
  };

  const handleOpenLaunchWizard = async (image: OpenStackImage) => {
    setSelectedImageForLaunch(image);
    const success = await fetchWizardPrerequisites();
    if (success) {
        setIsLaunchWizardOpen(true);
    }
  };

  const handleLaunchInstance = async (params: {
    name: string; count: number; imageId: string; flavorId: string; 
    networkIds: string[]; securityGroupIds: string[]; keyPairName: string;
  }) => {
    if (!authToken || !serviceCatalog) { 
      addToast("Cannot launch: Not authenticated.", 'error');
      return; 
    }
    const computeUrl = getServiceEndpoint(serviceCatalog, 'compute');
    if (!computeUrl) { 
      addToast("Cannot launch: Compute service endpoint not found.", 'error'); 
      return; 
    }

    setIsLoading(true); // Indicate loading for the launch operation
    try {
      for (let i = 0; i < params.count; i++) {
        const instanceName = params.count > 1 ? `${params.name}-${i + 1}` : params.name;
        const launchParams = {
            name: instanceName,
            imageId: params.imageId,
            flavorId: params.flavorId,
            networkIds: params.networkIds,
            securityGroupIds: params.securityGroupIds,
            keyPairName: params.keyPairName,
        };
        await launchInstanceAPI(authToken, computeUrl, launchParams);
      }
      addToast(`Instance(s) '${params.name}' launched successfully!`, 'success');
      setIsLaunchWizardOpen(false);
      setSelectedImageForLaunch(null);
      // Consider navigating to instances page or just refreshing current view
    } catch (err) {
      console.error("Error launching instance:", err);
      addToast(`Failed to launch instance: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false); // General loading indicator for page, or wizard specific
    }
  };


  const filteredImages = images
    .filter(img => img.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(img => {
      if (filterVisibility === 'all') return true;
      return img.visibility === filterVisibility;
    })
    .filter(img => img.status === 'active');

  if (!authToken) return <div className="text-yellow-400 p-4 bg-yellow-900/30 rounded-md">Please login to view images.</div>;
  
  if (isLoading) return <div className="flex justify-center items-center h-full"><Spinner text="Loading images..." size="lg" /></div>;
  
  if (error && images.length === 0) return <div className="text-red-400 p-4 bg-red-900/30 rounded-md my-4">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-slate-100">Image Catalog</h2>
      
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 p-1">
          <div className="relative flex-grow w-full md:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <Input
              id="imageSearch"
              type="search"
              placeholder="Search images by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex space-x-2 flex-wrap gap-1">
            {['all', 'public', 'private', 'shared', 'community'].map(vis => (
              <button
                key={vis}
                onClick={() => setFilterVisibility(vis as 'all' | 'public' | 'private' | 'shared' | 'community')}
                className={`px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-md font-medium transition-colors
                  ${filterVisibility === vis 
                    ? 'bg-teal-500 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {vis.charAt(0).toUpperCase() + vis.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-red-400 p-4 bg-red-900/30 rounded-md my-4">{error}</div>}

        {filteredImages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map(img => (
              <Card key={img.id} className="flex flex-col justify-between hover:shadow-teal-500/20 hover:border-teal-500/50 transition-all duration-200">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-teal-400 flex items-center break-all">
                      <ImageIconLucide size={20} className="mr-2 flex-shrink-0" /> {img.name || 'Unnamed Image'}
                    </h3>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium capitalize flex-shrink-0
                      ${img.visibility === 'public' ? 'bg-blue-500 text-blue-100' : 
                       img.visibility === 'private' ? 'bg-purple-500 text-purple-100' :
                       img.visibility === 'shared' ? 'bg-green-500 text-green-100' :
                       img.visibility === 'community' ? 'bg-yellow-500 text-yellow-100' :
                       'bg-slate-600 text-slate-200'}`}>
                      {img.visibility}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">OS: {img.properties?.os_distro || img.os_distro || 'N/A'} {img.properties?.os_version || ''}</p>
                  <p className="text-sm text-slate-400 mb-1">Arch: {img.properties?.architecture || 'N/A'}</p>
                  <p className="text-sm text-slate-400 mb-1">Size: {formatBytes(img.size)}</p>
                  <div className="grid grid-cols-2 gap-x-2 text-sm text-slate-400 mt-2">
                    <p className="flex items-center"><HardDrive size={14} className="mr-1.5 text-slate-500" /> Min Disk: {img.minDisk} GB</p>
                    <p className="flex items-center"><DatabaseZap size={14} className="mr-1.5 text-slate-500" /> Min RAM: {img.minRam} MB</p>
                  </div>
                   <p className="text-xs text-slate-500 mt-1">Owner (Project ID): {img.owner || 'N/A'}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700 flex flex-col space-y-2">
                  <p className="text-xs text-slate-500">Created: {new Date(img.created).toLocaleDateString()}</p>
                  <Button
                    onClick={() => handleOpenLaunchWizard(img)}
                    variant="outline"
                    size="sm"
                    className="w-full text-teal-400 border-teal-400 hover:bg-teal-400 hover:text-slate-900"
                    isLoading={isWizardDataLoading && selectedImageForLaunch?.id === img.id}
                  >
                    <Rocket size={16} className="mr-2"/> Launch from Image
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400 py-8">No images match your criteria.</p>
        )}
      </Card>
      <p className="text-sm text-slate-500 mt-4">
        AI Integration Ideas: Provide descriptions or common use cases for public images. Suggest images based on intended use described by user.
      </p>

      {isLaunchWizardOpen && selectedImageForLaunch && (
        <LaunchInstanceWizard
          isOpen={isLaunchWizardOpen}
          onClose={() => { setIsLaunchWizardOpen(false); setSelectedImageForLaunch(null); }}
          onLaunch={handleLaunchInstance}
          defaultImageId={selectedImageForLaunch.id}
          images={images.filter(img => img.status === 'active')} // Pass all active images for selection
          flavors={flavors.filter(f => f.isPublic !== false)} 
          networks={networks}
          securityGroups={securityGroups}
          keyPairs={keyPairs}
        />
      )}
    </div>
  );
};

export default ImageSelectorPanel;