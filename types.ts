export interface User {
  id: string;
  name: string;
  // Add other user properties as needed
}

export interface OpenStackResource {
  id: string;
  name: string;
}

export interface Instance extends OpenStackResource {
  status: string;
  flavor: {
    id: string;
    name?: string; // Name of the flavor, often included in detailed server view
    [key: string]: any; // Allow other potential properties from API
  };
  image: {
    id: string;
    name?: string; // Name of the image, often included in detailed server view
    [key: string]: any; // Allow other potential properties from API
  };
  ipAddress: string; // Often "accessIPv4" or from attached interfaces
  powerState:
    | "Running"
    | "Stopped"
    | "Paused"
    | "Error"
    | "Building"
    | "Shutoff"; // Added Shutoff
  keyPair?: string; // key_name
  securityGroups?: string[]; // names or IDs (can be objects from API)
  ["os-extended-volumes:volumes_attached"]?: { id: string }[]; // Corrected structure
  created: string; // ISO date string
  ["OS-EXT-AZ:availability_zone"]?: string;
  userId?: string; // user_id from server details
  hostId?: string; // OS-EXT-SRV-ATTR:host from server details
  flavorRef?: string; // Kept for compatibility or alternative API paths
  imageRef?: string; // Kept for compatibility or alternative API paths
}

export interface Volume extends OpenStackResource {
  size: number; // GB
  status: string;
  type?: string; // volume_type
  attachedTo?: string; // Instance ID (derived from attachments array)
  attachments?: {
    server_id: string;
    device: string;
    attachment_id: string;
    volume_id: string;
  }[];
  availabilityZone?: string; // availability_zone
  bootable: "true" | "false";
  created: string; // created_at ISO date string
  ["os-vol-tenant-attr:tenant_id"]?: string;
  volume_type?: string; // Alternative field for type
}

// --- Network Related Types ---
export interface AllocationPool {
  start: string;
  end: string;
}

export interface Subnet {
  id: string;
  name?: string;
  cidr: string;
  gateway_ip?: string | null;
  ip_version: 4 | 6;
  network_id: string;
  enable_dhcp?: boolean;
  allocation_pools?: AllocationPool[];
  dns_nameservers?: string[];
  project_id?: string;
  tenant_id?: string; // Alias for project_id in some OpenStack versions
}

export interface PortFixedIp {
  subnet_id: string;
  ip_address: string;
}

export interface Port {
  id: string;
  name?: string;
  network_id: string;
  device_id?: string; // e.g., instance ID, router ID
  device_owner?: string; // e.g., compute:nova, network:router_interface, network:router_gateway
  fixed_ips?: PortFixedIp[];
  mac_address?: string;
  status?: string;
  admin_state_up?: boolean;
  security_groups?: string[]; // IDs of security groups
  project_id?: string;
  tenant_id?: string;
}

export interface RouterExternalFixedIp {
  subnet_id: string;
  ip_address: string;
}

export interface RouterExternalGatewayInfo {
  network_id: string;
  enable_snat?: boolean;
  external_fixed_ips?: RouterExternalFixedIp[];
}

export interface RouterRoute {
  destination: string; // CIDR
  nexthop: string; // IP Address
}

export interface Router {
  id: string;
  name: string;
  status: string; // e.g. ACTIVE, DOWN
  admin_state_up?: boolean;
  external_gateway_info?: RouterExternalGatewayInfo | null;
  routes?: RouterRoute[];
  ha?: boolean; // High Availability
  project_id?: string;
  tenant_id?: string;
}

export interface Network extends OpenStackResource {
  subnet_ids: string[]; // array of subnet IDs from initial network fetch
  subnet_details?: Subnet[]; // Populated after fetching subnet details
  router_details?: {
    id: string;
    name: string;
    external_gateway_info?: RouterExternalGatewayInfo | null;
  }[]; // Populated after analyzing routers and ports
  shared: boolean;
  status: string;
  admin_state_up: boolean; // admin_state_up
  project_id?: string;
  ["router:external"]?: boolean; // For identifying external networks
  provider_physical_network?: string; // provider:physical_network
  provider_network_type?: string; // provider:network_type
  mtu?: number;
}
// --- End Network Related Types ---

export interface FloatingIP extends OpenStackResource {
  ipAddress: string; // floating_ip_address
  associatedInstance?: string; // port_id might map to an instance's port
  pool: string; // floating_network_id (ID of the network)
  status: "ACTIVE" | "DOWN" | "ERROR";
  project_id?: string;
  fixed_ip_address?: string;
  port_id?: string | null; // Can be null if not associated
}

export interface Image extends OpenStackResource {
  osType?: string; // Often in properties or direct attribute like 'os_distro'
  size: number; // Bytes
  visibility: "public" | "private" | "shared" | "community";
  minDisk: number; // GB (min_disk)
  minRam: number; // MB (min_ram)
  status:
    | "active"
    | "queued"
    | "saving"
    | "error"
    | "deleted"
    | "pending_delete"
    | "deactivated";
  created: string; // created_at ISO date string
  owner?: string; // Project ID
  checksum?: string;
  container_format?: string;
  disk_format?: string;
  os_distro?: string; // Common metadata field for OS type
  properties?: Record<string, any>; // For arbitrary metadata
}

export interface SecurityGroup extends OpenStackResource {
  description: string;
  rules: SecurityGroupRule[];
  project_id?: string;
  security_group_rules?: SecurityGroupRule[]; // Alternative naming in some API responses
}

export interface SecurityGroupRule {
  id: string;
  direction: "ingress" | "egress";
  protocol?: "tcp" | "udp" | "icmp" | "any" | null;
  portRangeMin?: number | null; // port_range_min
  portRangeMax?: number | null; // port_range_max
  remoteIpPrefix?: string | null; // remote_ip_prefix
  remoteGroupId?: string | null; // remote_group_id
  ethertype: "IPv4" | "IPv6";
  project_id?: string;
  security_group_id?: string;
}

export interface Flavor extends OpenStackResource {
  vcpus: number;
  ram: number; // MB
  disk: number; // GB (root disk)
  isPublic: boolean; // os-flavor-access:is_public
  ["OS-FLV-EXT-DATA:ephemeral"]?: number; // Ephemeral disk
  swap?: number | string; // Swap disk in MB or empty string
}

export interface Quota {
  resource: string;
  used: number;
  limit: number;
}

export interface KeyPair extends OpenStackResource {
  fingerprint: string;
  publicKey: string; // public_key
  type?: "ssh" | "x509";
  user_id?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  metadata?: Record<string, any>; // For things like grounding sources
}

export interface OpenStackEndpointConfig {
  id: string;
  name: string;
  authUrl: string;
  username?: string;
  domainName?: string;
  projectName?: string;
}

// Enum for navigation items
export enum NavigationItemKey {
  Dashboard = "dashboard",
  Instances = "instances",
  Volumes = "volumes",
  Networks = "networks",
  Images = "images",
  SecurityGroups = "security-groups",
  AiAssistant = "ai-assistant",
  UsageQuotas = "quotas",
}

// --- Types for OpenStack API Service Catalog and Auth ---
export interface ServiceCatalogEndpoint {
  id: string;
  interface: "public" | "internal" | "admin";
  region: string;
  region_id: string;
  url: string;
}

export interface ServiceCatalogEntry {
  endpoints: ServiceCatalogEndpoint[];
  id: string;
  name: string;
  type: string; // e.g., 'compute', 'volumev3', 'network', 'image', 'identity'
}

export interface KeystoneProject {
  id: string;
  name: string;
  domain: { id: string; name: string };
}

export interface KeystoneUser {
  id: string;
  name: string;
  domain: { id: string; name: string };
}

export interface KeystoneTokenResponse {
  token: {
    catalog?: ServiceCatalogEntry[];
    expires_at: string;
    issued_at: string;
    project?: KeystoneProject;
    user?: KeystoneUser;
    // ... other token properties
  };
}

// --- Type for Combined Session Export/Import ---
export interface SessionExportData {
  authUrl: string;
  authToken: string;
  serviceCatalog: ServiceCatalogEntry[];
  project?: KeystoneProject | null;
  user?: KeystoneUser | null;
}

// --- Toast Notification Types ---
export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Mapped types from OpenStack API responses
// Ensure these raw API response types match what OpenStack actually sends

// This is the type for a single address entry within the 'addresses' record of NovaRawServer
export interface NovaRawServerAddressEntry {
  addr: string;
  version: number;
  "OS-EXT-IPS-MAC:mac_addr"?: string;
  "OS-EXT-IPS:type"?: string;
}

export interface NovaRawServer {
  id: string;
  name: string;
  status: string;
  flavor: { id: string; links: { href: string; rel: string }[] }; // API returns flavor as an object with id
  image: { id: string; links: { href: string; rel: string }[] }; // API returns image as an object with id
  addresses: Record<string, NovaRawServerAddressEntry[]>;
  power_state: number; // 0:NOSTATE, 1:RUNNING, 3:PAUSED, 4:SHUTDOWN, 6:CRASHED, 7:SUSPENDED
  key_name: string | null;
  security_groups: { name: string }[];
  "os-extended-volumes:volumes_attached": { id: string }[];
  created: string;
  "OS-EXT-AZ:availability_zone": string;
  user_id: string;
  "OS-EXT-SRV-ATTR:host": string;
  // other fields...
}

export interface NovaServerRsp {
  server: NovaRawServer;
}
export interface NovaServersRsp {
  servers: NovaRawServer[];
}
export interface CinderVolumeRsp {
  volume: Volume;
}
export interface CinderVolumesRsp {
  volumes: Volume[];
}

// Neutron Types for API responses
export interface NeutronNetwork {
  id: string;
  name: string;
  subnets: string[]; // Array of subnet IDs
  shared: boolean;
  status: string;
  admin_state_up: boolean;
  project_id?: string;
  tenant_id?: string; // Alias for project_id
  ["router:external"]?: boolean;
  provider_physical_network?: string;
  provider_network_type?: string;
  mtu?: number;
}
export interface NeutronNetworkRsp {
  network: NeutronNetwork;
}
export interface NeutronNetworksRsp {
  networks: NeutronNetwork[];
}

export interface NeutronSubnet extends Subnet {
  // NeutronSubnet is essentially our Subnet type, but API might have minor differences
  // If Neutron response has fields not in our Subnet type, add them here or ensure mapping
}
export interface NeutronSubnetRsp {
  subnet: NeutronSubnet;
}
export interface NeutronSubnetsRsp {
  subnets: NeutronSubnet[];
}

export interface NeutronPort extends Port {
  // NeutronPort is essentially our Port type
}
export interface NeutronPortRsp {
  port: NeutronPort;
}
export interface NeutronPortsRsp {
  ports: NeutronPort[];
}

export interface NeutronRouter extends Router {
  // NeutronRouter is essentially our Router type
}
export interface NeutronRouterRsp {
  router: NeutronRouter;
}
export interface NeutronRoutersRsp {
  routers: NeutronRouter[];
}

export interface NeutronFloatingIPRsp {
  floatingip: FloatingIP;
}
export interface NeutronFloatingIPsRsp {
  floatingips: FloatingIP[];
}
export interface GlanceImageRsp {
  image: Image;
} // Assuming Image type matches Glance response
export interface GlanceImagesRsp {
  images: Image[];
} // Assuming Image type matches Glance response
export interface NeutronSecurityGroupRsp {
  security_group: SecurityGroup;
}
export interface NeutronSecurityGroupsRsp {
  security_groups: SecurityGroup[];
}
export interface NeutronSecurityGroupRuleRsp {
  security_group_rule: SecurityGroupRule;
}
export interface NeutronSecurityGroupRulesRsp {
  security_group_rules: SecurityGroupRule[];
}
export interface NovaFlavorRsp {
  flavor: Flavor;
}
export interface NovaFlavorsRsp {
  flavors: Flavor[];
}
export interface NovaKeyPairRsp {
  keypair: KeyPair;
}
export interface NovaKeyPairsRsp {
  keypairs: { keypair: KeyPair }[];
}
export interface NovaQuotaSet {
  instances: number;
  cores: number; // vCPUs
  ram: number; // MB
  // ... other nova quotas
}
export interface CinderQuotaSet {
  volumes: number;
  gigabytes: number; // Total storage
  // ... other cinder quotas
}
export interface NeutronQuota {
  floatingip: number;
  network: number;
  security_group: number;
  // ... other neutron quotas
  subnet?: number;
  port?: number;
  router?: number;
}
export interface QuotaSetRsp {
  quota_set: Record<string, number>;
}
