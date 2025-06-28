import { Instance, Volume, Network, Image, SecurityGroup, Flavor, Quota, FloatingIP, KeyPair, SecurityGroupRule, Subnet, Port, Router } from '../types';

const MOCK_DELAY = 500; // ms

const mockFlavorsList: Flavor[] = [ // Renamed to avoid conflict with Instance.flavor
    { id: 'f-1', name: 'm1.tiny', vcpus: 1, ram: 512, disk: 1, isPublic: true },
    { id: 'f-2', name: 'm1.small', vcpus: 1, ram: 2048, disk: 20, isPublic: true },
    { id: 'f-3', name: 'm1.medium', vcpus: 2, ram: 4096, disk: 40, isPublic: true },
    { id: 'f-4', name: 'm1.large', vcpus: 4, ram: 8192, disk: 80, isPublic: true },
];

const mockImagesList: Image[] = [ // Renamed to avoid conflict
    { id: 'img-1', name: 'Ubuntu 22.04 LTS', osType: 'Linux', size: 2 * 1024 * 1024 * 1024, visibility: 'public', minDisk: 10, minRam: 512, status: 'active', created: new Date(Date.now() - 86400000 * 30).toISOString(), properties: { os_distro: 'ubuntu', os_version: '22.04', architecture: 'x86_64' } },
    { id: 'img-2', name: 'CentOS Stream 9', osType: 'Linux', size: 1.5 * 1024 * 1024 * 1024, visibility: 'public', minDisk: 8, minRam: 512, status: 'active', created: new Date(Date.now() - 86400000 * 20).toISOString(), properties: { os_distro: 'centos', os_version: '9-stream', architecture: 'x86_64' } },
    { id: 'img-3', name: 'Windows Server 2022 (Custom)', osType: 'Windows', size: 12 * 1024 * 1024 * 1024, visibility: 'private', minDisk: 40, minRam: 2048, status: 'active', created: new Date(Date.now() - 86400000 * 5).toISOString(), properties: { os_distro: 'windows', os_version: '2022', architecture: 'x86_64' } },
    { id: 'img-4', name: 'Fedora 38 Cloud', osType: 'Linux', size: 800 * 1024 * 1024, visibility: 'public', minDisk: 5, minRam: 1024, status: 'active', created: new Date(Date.now() - 86400000 * 15).toISOString(), properties: { os_distro: 'fedora', os_version: '38', architecture: 'x86_64' } },
];


const mockInstances: Instance[] = [
  { 
    id: 'inst-1', name: 'web-server-01', status: 'ACTIVE', 
    flavor: { id: 'f-2', name: 'm1.small' }, 
    image: {id: 'img-1', name: 'Ubuntu 22.04 LTS' }, 
    ipAddress: '10.0.0.5, 192.168.1.101', powerState: 'Running', 
    created: new Date(Date.now() - 86400000 * 2).toISOString(), 
    keyPair: 'my-ssh-key', securityGroups: ['default', 'web-sg'],
    ['os-extended-volumes:volumes_attached']: [],
    userId: 'user-id-123', hostId: 'compute-host-A', ['OS-EXT-AZ:availability_zone']: 'nova'
  },
  { 
    id: 'inst-2', name: 'db-server-01', status: 'ACTIVE', 
    flavor: { id: 'f-3', name: 'm1.medium' }, 
    image: { id: 'img-2', name: 'CentOS Stream 9' }, 
    ipAddress: '10.0.0.6', powerState: 'Running', 
    created: new Date(Date.now() - 86400000 * 5).toISOString(), 
    keyPair: 'my-ssh-key', securityGroups: ['default', 'db-sg'],
    ['os-extended-volumes:volumes_attached']: [{id: 'vol-2'}],
    userId: 'user-id-456', hostId: 'compute-host-B', ['OS-EXT-AZ:availability_zone']: 'nova'
  },
  { 
    id: 'inst-3', name: 'dev-vm', status: 'SHUTOFF', 
    flavor: { id: 'f-2', name: 'm1.small' }, 
    image: {id: 'img-4', name: 'Fedora 38 Cloud'}, 
    ipAddress: '', powerState: 'Stopped', 
    created: new Date(Date.now() - 86400000 * 1).toISOString(),
    ['os-extended-volumes:volumes_attached']: [],
    userId: 'user-id-123', hostId: 'compute-host-A', ['OS-EXT-AZ:availability_zone']: 'zone1'
  },
  { 
    id: 'inst-4', name: 'build-worker-01', status: 'BUILD', 
    flavor: { id: 'f-4', name: 'm1.large' }, 
    image: {id: 'img-1', name: 'Ubuntu 22.04 LTS'}, 
    ipAddress: '', powerState: 'Building', 
    created: new Date().toISOString(),
    ['os-extended-volumes:volumes_attached']: [],
    userId: 'user-id-789', hostId: 'compute-host-C', ['OS-EXT-AZ:availability_zone']: 'nova'
  },
  { 
    id: 'inst-5', name: 'shelved-vm', status: 'SHELVED', 
    flavor: { id: 'f-1', name: 'm1.tiny' }, 
    image: {id: 'img-2', name: 'CentOS Stream 9'}, 
    ipAddress: '', powerState: 'Shutoff', 
    created: new Date(Date.now() - 86400000 * 7).toISOString(),
    ['os-extended-volumes:volumes_attached']: [],
    userId: 'user-id-123', hostId: 'compute-host-B', ['OS-EXT-AZ:availability_zone']: 'zone2'
  },
];

const mockVolumes: Volume[] = [
  { id: 'vol-1', name: 'data-disk-01', size: 50, status: 'Available', type: 'ssd', bootable: "false", created: new Date(Date.now() - 86400000 * 3).toISOString(), availabilityZone: 'nova' },
  { id: 'vol-2', name: 'os-disk-db', size: 20, status: 'In-use', attachedTo: 'inst-2', attachments: [{server_id: 'inst-2', device: '/dev/vdb', attachment_id: 'vol-2', volume_id: 'vol-2'}], type: 'ssd', bootable: "true", created: new Date(Date.now() - 86400000 * 5).toISOString(), availabilityZone: 'nova' },
  { id: 'vol-3', name: 'backup-archive', size: 100, status: 'Available', type: 'hdd', bootable: "false", created: new Date(Date.now() - 86400000 * 10).toISOString(), availabilityZone: 'cinder-az1' },
];

const mockSubnets: Subnet[] = [
    { id: 'sub-1', name: 'private-subnet-A', network_id: 'net-1', cidr: '10.0.0.0/24', ip_version: 4, gateway_ip: '10.0.0.1', enable_dhcp: true, allocation_pools: [{start: '10.0.0.2', end: '10.0.0.254'}]},
    { id: 'sub-2', name: 'public-subnet', network_id: 'net-2', cidr: '192.168.1.0/24', ip_version: 4, gateway_ip: '192.168.1.1', enable_dhcp: true, allocation_pools: [{start: '192.168.1.100', end: '192.168.1.200'}]},
    { id: 'sub-3', name: 'private-subnet-B', network_id: 'net-3', cidr: '10.0.1.0/24', ip_version: 4, gateway_ip: '10.0.1.1', enable_dhcp: true, allocation_pools: [{start: '10.0.1.2', end: '10.0.1.254'}]},
];


const mockNetworks: Network[] = [
    { id: 'net-1', name: 'private-network-A', subnet_ids: ['sub-1'], shared: false, status: 'ACTIVE', admin_state_up: true },
    { id: 'net-2', name: 'public-network', subnet_ids: ['sub-2'], shared: true, status: 'ACTIVE', admin_state_up: true, ['router:external']: true },
    { id: 'net-3', name: 'private-network-B', subnet_ids: ['sub-3'], shared: false, status: 'ACTIVE', admin_state_up: true },
];

const mockRouters: Router[] = [
    { id: 'router-1', name: 'main-router', status: 'ACTIVE', admin_state_up: true, external_gateway_info: { network_id: 'net-2', enable_snat: true }, ha: false },
    { id: 'router-2', name: 'internal-router', status: 'ACTIVE', admin_state_up: true, external_gateway_info: null, ha: false },
];

const mockPorts: Port[] = [
    // Router 1 interfaces
    { id: 'port-r1-privA', network_id: 'net-1', device_id: 'router-1', device_owner: 'network:router_interface', fixed_ips: [{ subnet_id: 'sub-1', ip_address: '10.0.0.1' }], status: 'ACTIVE' },
    { id: 'port-r1-pub', network_id: 'net-2', device_id: 'router-1', device_owner: 'network:router_gateway', fixed_ips: [{ subnet_id: 'sub-2', ip_address: '192.168.1.50' }], status: 'ACTIVE' }, // Gateway port
    // Router 2 interfaces
    { id: 'port-r2-privB', network_id: 'net-3', device_id: 'router-2', device_owner: 'network:router_interface', fixed_ips: [{ subnet_id: 'sub-3', ip_address: '10.0.1.1' }], status: 'ACTIVE' },
    // Instance ports
    { id: 'port-inst1-privA', network_id: 'net-1', device_id: 'inst-1', device_owner: 'compute:nova', fixed_ips: [{ subnet_id: 'sub-1', ip_address: '10.0.0.5'}], mac_address: 'fa:16:3e:11:22:33', status: 'ACTIVE'},
    { id: 'port-inst2-privA', network_id: 'net-1', device_id: 'inst-2', device_owner: 'compute:nova', fixed_ips: [{ subnet_id: 'sub-1', ip_address: '10.0.0.6'}], mac_address: 'fa:16:3e:44:55:66', status: 'ACTIVE'},

];


const mockDefaultRuleSSH: SecurityGroupRule = { id: 'rule-ssh', direction: 'ingress', protocol: 'tcp', portRangeMin: 22, portRangeMax: 22, remoteIpPrefix: '0.0.0.0/0', ethertype: 'IPv4' };
const mockDefaultRuleHTTP: SecurityGroupRule = { id: 'rule-http', direction: 'ingress', protocol: 'tcp', portRangeMin: 80, portRangeMax: 80, remoteIpPrefix: '0.0.0.0/0', ethertype: 'IPv4' };
const mockDefaultRuleHTTPS: SecurityGroupRule = { id: 'rule-https', direction: 'ingress', protocol: 'tcp', portRangeMin: 443, portRangeMax: 443, remoteIpPrefix: '0.0.0.0/0', ethertype: 'IPv4' };
const mockDefaultEgress: SecurityGroupRule = { id: 'rule-egress-any', direction: 'egress', ethertype: 'IPv4', remoteIpPrefix: '0.0.0.0/0' };


const mockSecurityGroups: SecurityGroup[] = [
    { id: 'sg-1', name: 'default', description: 'Default security group', rules: [mockDefaultEgress] },
    { id: 'sg-2', name: 'web-sg', description: 'Allows HTTP/HTTPS and SSH', rules: [mockDefaultRuleSSH, mockDefaultRuleHTTP, mockDefaultRuleHTTPS, mockDefaultEgress] },
    { id: 'sg-3', name: 'db-sg', description: 'Allows SSH and internal DB access', rules: [mockDefaultRuleSSH, {id: 'rule-db', direction: 'ingress', protocol: 'tcp', portRangeMin: 3306, portRangeMax: 3306, remoteGroupId: 'sg-2', ethertype: 'IPv4'}, mockDefaultEgress] }, // Example of remote group
];



const mockQuotas: Quota[] = [
    { resource: 'Instances', used: mockInstances.length, limit: 20 },
    { resource: 'vCPUs', used: mockInstances.reduce((sum, i) => sum + (mockFlavorsList.find(f => f.id === i.flavor.id)?.vcpus || 0), 0) , limit: 50 },
    { resource: 'RAM (MB)', used: mockInstances.reduce((sum, i) => sum + (mockFlavorsList.find(f => f.id === i.flavor.id)?.ram || 0), 0), limit: 102400 }, // 100GB
    { resource: 'Volumes', used: mockVolumes.length, limit: 30 },
    { resource: 'Volume Storage (GB)', used: mockVolumes.reduce((sum, v) => sum + v.size, 0), limit: 1000 },
    { resource: 'Floating IPs', used: 1, limit: 10 },
    { resource: 'Networks', used: mockNetworks.length, limit: 5},
    { resource: 'Subnets', used: mockSubnets.length, limit: 10},
    { resource: 'Routers', used: mockRouters.length, limit: 3},
    { resource: 'Ports', used: mockPorts.length, limit: 50},
    { resource: 'Security Groups', used: mockSecurityGroups.length, limit: 20 },
];

const mockFloatingIPs: FloatingIP[] = [
    { id: 'fip-1', name: 'FIP for web-server-01', ipAddress: '192.168.1.101', associatedInstance: 'inst-1', pool: 'net-2', status: 'ACTIVE', port_id: 'port-for-inst-1' },
    { id: 'fip-2', name: 'Available FIP 1', ipAddress: '192.168.1.102', pool: 'net-2', status: 'DOWN' },
];

const mockKeyPairs: KeyPair[] = [
    { id: 'kp-1', name: 'my-ssh-key', fingerprint: 'ab:cd:ef:12:34:56:78:90:...', publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD...' },
    { id: 'kp-2', name: 'dev-key', fingerprint: '11:22:33:44:55:66:77:88:...', publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQE...' },
];


export const OpenStackService = {
  getInstances: (): Promise<Instance[]> => new Promise(res => setTimeout(() => res([...mockInstances]), MOCK_DELAY)),
  fetchInstanceDetailsAPI: (id: string): Promise<Instance | undefined> => new Promise(res => { // Renamed for clarity
    const instance = mockInstances.find(i => i.id === id);
    // Enrich with flavor/image names if they exist, simulating a detailed API call
    if (instance) {
      const flavorDetail = mockFlavorsList.find(f => f.id === instance.flavor.id);
      const imageDetail = mockImagesList.find(img => img.id === instance.image.id);
      instance.flavor.name = flavorDetail?.name;
      instance.image.name = imageDetail?.name;
    }
    setTimeout(() => res(instance ? {...instance} : undefined), MOCK_DELAY);
  }),
  launchInstance: (params: Partial<Instance> & {flavorId: string, imageId: string}): Promise<Instance> => new Promise(res => setTimeout(() => {
    const flavorDetail = mockFlavorsList.find(f => f.id === params.flavorId);
    const imageDetail = mockImagesList.find(img => img.id === params.imageId);
    const newInstance: Instance = {
      id: `inst-${Date.now()}`,
      name: params.name || 'new-instance',
      status: 'BUILD',
      flavor: { id: flavorDetail?.id || 'f-unknown', name: flavorDetail?.name || 'unknown-flavor' },
      image: { id: imageDetail?.id || 'img-unknown', name: imageDetail?.name || 'unknown-image' },
      ipAddress: '',
      powerState: 'Building',
      created: new Date().toISOString(),
      userId: 'mock-user-id',
      hostId: `compute-host-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`, // A, B, or C
      ['os-extended-volumes:volumes_attached']: [],
      ['OS-EXT-AZ:availability_zone']: 'nova',
      ...params
    } as Instance; 
    mockInstances.push(newInstance);
    setTimeout(() => {
        const idx = mockInstances.findIndex(i => i.id === newInstance.id);
        if (idx !== -1) {
            mockInstances[idx].status = 'ACTIVE';
            mockInstances[idx].powerState = 'Running';
            mockInstances[idx].ipAddress = `10.0.0.${Math.floor(Math.random() * 250) + 10}`; 
        }
    }, 5000);
    res(newInstance);
  }, MOCK_DELAY + 1000)),
  terminateInstance: (id: string): Promise<void> => new Promise(res => setTimeout(() => {
    const idx = mockInstances.findIndex(i => i.id === id);
    if (idx !== -1) mockInstances.splice(idx, 1);
    res();
  }, MOCK_DELAY)),
   controlInstancePower: (id: string, action: 'start' | 'stop' | 'reboot'): Promise<void> => new Promise(res => setTimeout(() => {
    const instance = mockInstances.find(i => i.id === id);
    if (instance) {
        if (action === 'start' && instance.status !== 'SHELVED') {
          instance.powerState = 'Running';
          instance.status = 'ACTIVE';
        } else if (action === 'stop' && instance.status !== 'SHELVED') {
          instance.powerState = 'Stopped';
          instance.status = 'SHUTOFF';
        }
        else if (action === 'reboot' && instance.status !== 'SHELVED') {
            instance.powerState = 'Building'; 
            instance.status = 'REBOOT';
            setTimeout(() => {
              instance.powerState = 'Running';
              instance.status = 'ACTIVE';
            }, 3000);
        }
    }
    res();
  }, MOCK_DELAY)),
  getInstanceConsoleUrl: (instanceId: string, type: string = 'novnc'): Promise<{console: {type: string, url: string}}> => new Promise(res => setTimeout(() => {
    console.log(`Mock: Getting ${type} console for ${instanceId}`);
    res({ console: { type: type, url: `https://mock-console.example.com/${type}/?token=dummy-token-for-${instanceId}` } });
  }, MOCK_DELAY)),
  shelveInstance: (instanceId: string): Promise<void> => new Promise(res => setTimeout(() => {
    const instance = mockInstances.find(i => i.id === instanceId);
    if (instance) {
        instance.status = 'SHELVED';
        instance.powerState = 'Shutoff'; // Typically OpenStack sets power state to 0 (NOSTATE) or 4 (SHUTDOWN) for shelved
        console.log(`Mock: Instance ${instanceId} shelved.`);
    }
    res();
  }, MOCK_DELAY)),
  unshelveInstance: (instanceId: string): Promise<void> => new Promise(res => setTimeout(() => {
    const instance = mockInstances.find(i => i.id === instanceId);
    if (instance && instance.status.toLowerCase().includes('shelved')) {
        // Instance typically returns to ACTIVE and Running, or SHUTOFF if it was off before shelving.
        // For mock simplicity, let's assume it becomes ACTIVE/Running.
        instance.status = 'ACTIVE'; 
        instance.powerState = 'Running';
        console.log(`Mock: Instance ${instanceId} unshelved.`);
    }
    res();
  }, MOCK_DELAY)),


  getVolumes: (): Promise<Volume[]> => new Promise(res => setTimeout(() => res([...mockVolumes]), MOCK_DELAY)),
  createVolume: (params: { name: string; size: number; type?: string }): Promise<Volume> => new Promise(res => setTimeout(() => {
    const newVolume: Volume = {
        id: `vol-${Date.now()}`,
        name: params.name,
        size: params.size,
        status: 'Creating',
        type: params.type || 'ssd',
        bootable: "false",
        created: new Date().toISOString(),
        availabilityZone: 'nova',
    };
    mockVolumes.push(newVolume);
    setTimeout(() => {
        const idx = mockVolumes.findIndex(v => v.id === newVolume.id);
        if (idx !== -1) mockVolumes[idx].status = 'Available';
    }, 3000);
    res(newVolume);
  }, MOCK_DELAY)),
  deleteVolume: (id: string): Promise<void> => new Promise(res => setTimeout(() => {
    const idx = mockVolumes.findIndex(v => v.id === id);
    if (idx !== -1) mockVolumes.splice(idx, 1);
    res();
  }, MOCK_DELAY)),
  attachVolume: (volumeId: string, instanceId: string): Promise<void> => new Promise(res => setTimeout(() => {
    const volume = mockVolumes.find(v => v.id === volumeId);
    if (volume) {
        volume.status = 'Attaching';
        setTimeout(() => {
            volume.status = 'In-use';
            volume.attachedTo = instanceId;
            volume.attachments = [{ server_id: instanceId, device: '/dev/vdb', attachment_id: volumeId, volume_id: volumeId}];
        }, 2000);
    }
    res();
  }, MOCK_DELAY)),
  detachVolume: (volumeId: string): Promise<void> => new Promise(res => setTimeout(() => {
    const volume = mockVolumes.find(v => v.id === volumeId);
    if (volume) {
        volume.status = 'Detaching';
        setTimeout(() => {
            volume.status = 'Available';
            volume.attachedTo = undefined;
            volume.attachments = [];
        }, 2000);
    }
    res();
  }, MOCK_DELAY)),


  getNetworks: (): Promise<Network[]> => new Promise(res => setTimeout(() => res([...mockNetworks]), MOCK_DELAY)),
  fetchSubnetsAPI: (networkId?: string): Promise<Subnet[]> => new Promise(res => setTimeout(() => {
    if (networkId) {
        res([...mockSubnets.filter(s => s.network_id === networkId)]);
    } else {
        res([...mockSubnets]);
    }
  }, MOCK_DELAY)),
  fetchRoutersAPI: (): Promise<Router[]> => new Promise(res => setTimeout(() => res([...mockRouters]), MOCK_DELAY)),
  fetchPortsAPI: (queryParams?: Record<string, string>): Promise<Port[]> => new Promise(res => setTimeout(() => {
    let filteredPorts = [...mockPorts];
    if (queryParams) {
        if (queryParams.device_id) {
            filteredPorts = filteredPorts.filter(p => p.device_id === queryParams.device_id);
        }
        if (queryParams.network_id) {
            filteredPorts = filteredPorts.filter(p => p.network_id === queryParams.network_id);
        }
        if (queryParams.device_owner) {
            filteredPorts = filteredPorts.filter(p => p.device_owner === queryParams.device_owner);
        }
    }
    res(filteredPorts);
  }, MOCK_DELAY)),

  getImages: (): Promise<Image[]> => new Promise(res => setTimeout(() => res([...mockImagesList]), MOCK_DELAY)),
  getSecurityGroups: (): Promise<SecurityGroup[]> => new Promise(res => setTimeout(() => res([...mockSecurityGroups]), MOCK_DELAY)),
  createSecurityGroup: (name: string, description: string): Promise<SecurityGroup> => new Promise(res => setTimeout(() => {
    const newSg: SecurityGroup = { id: `sg-${Date.now()}`, name, description, rules: [mockDefaultEgress] };
    mockSecurityGroups.push(newSg);
    res(newSg);
  }, MOCK_DELAY)),
  deleteSecurityGroup: (id: string): Promise<void> => new Promise(res => setTimeout(() => {
    const idx = mockSecurityGroups.findIndex(sg => sg.id === id);
    if (idx !== -1) mockSecurityGroups.splice(idx, 1);
    res();
  }, MOCK_DELAY)),
  addSecurityGroupRule: (groupId: string, rule: Omit<SecurityGroupRule, 'id'>): Promise<SecurityGroupRule> => new Promise(res => setTimeout(() => {
    const sg = mockSecurityGroups.find(s => s.id === groupId);
    const newRule = { ...rule, id: `rule-${Date.now()}` } as SecurityGroupRule;
    if (sg) sg.rules.push(newRule);
    res(newRule);
  }, MOCK_DELAY)),
  deleteSecurityGroupRule: (groupId: string, ruleId: string): Promise<void> => new Promise(res => setTimeout(() => {
    const sg = mockSecurityGroups.find(s => s.id === groupId);
    if (sg) sg.rules = sg.rules.filter(r => r.id !== ruleId);
    res();
  }, MOCK_DELAY)),


  getFlavors: (): Promise<Flavor[]> => new Promise(res => setTimeout(() => res([...mockFlavorsList]), MOCK_DELAY)),
  getQuotas: (): Promise<Quota[]> => new Promise(res => setTimeout(() => res([...mockQuotas]), MOCK_DELAY)),
  getFloatingIPs: (): Promise<FloatingIP[]> => new Promise(res => setTimeout(() => res([...mockFloatingIPs]), MOCK_DELAY)),
  allocateFloatingIP: (pool: string): Promise<FloatingIP> => new Promise(res => setTimeout(() => {
    const newFip: FloatingIP = {
        id: `fip-${Date.now()}`,
        name: `Allocated FIP ${Date.now()}`,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 150) + 103}`, 
        pool: pool,
        status: 'DOWN'
    };
    mockFloatingIPs.push(newFip);
    res(newFip);
  }, MOCK_DELAY)),
  releaseFloatingIP: (id: string): Promise<void> => new Promise(res => setTimeout(() => {
    const idx = mockFloatingIPs.findIndex(fip => fip.id === id);
    if (idx !== -1) mockFloatingIPs.splice(idx, 1);
    res();
  }, MOCK_DELAY)),
  associateFloatingIP: (fipId: string, instanceId: string /* Should be portId */): Promise<void> => new Promise(res => setTimeout(() => {
    const fip = mockFloatingIPs.find(f => f.id === fipId);
    if (fip) {
        fip.associatedInstance = instanceId; // Storing instanceId for mock simplicity
        fip.port_id = `mock-port-for-${instanceId}`;
        fip.status = 'ACTIVE';
    }
    res();
  }, MOCK_DELAY)),
  disassociateFloatingIP: (fipId: string): Promise<void> => new Promise(res => setTimeout(() => {
    const fip = mockFloatingIPs.find(f => f.id === fipId);
    if (fip) {
        fip.associatedInstance = undefined;
        fip.port_id = null;
        fip.status = 'DOWN';
    }
    res();
  }, MOCK_DELAY)),
  getKeyPairs: (): Promise<KeyPair[]> => new Promise(res => setTimeout(() => res([...mockKeyPairs]), MOCK_DELAY)),
};
