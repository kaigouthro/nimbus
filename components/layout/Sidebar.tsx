
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, Database, Network, ImageIcon, Shield, Bot, Activity, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavigationItemKey } from '../../types';

interface NavItem {
  key: NavigationItemKey;
  path: string;
  name: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { key: NavigationItemKey.Dashboard, path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { key: NavigationItemKey.Instances, path: '/instances', name: 'Instances', icon: Server },
  { key: NavigationItemKey.Volumes, path: '/volumes', name: 'Volumes', icon: Database },
  { key: NavigationItemKey.Networks, path: '/networks', name: 'Networks', icon: Network },
  { key: NavigationItemKey.Images, path: '/images', name: 'Images', icon: ImageIcon },
  { key: NavigationItemKey.SecurityGroups, path: '/security-groups', name: 'Security Groups', icon: Shield },
  { key: NavigationItemKey.AiAssistant, path: '/ai-assistant', name: 'AI Assistant', icon: Bot },
  { key: NavigationItemKey.UsageQuotas, path: '/quotas', name: 'Usage/Quotas', icon: Activity },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={`transition-all duration-300 ease-in-out bg-slate-800 text-slate-300 flex flex-col border-r border-slate-700 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex items-center justify-between p-4 border-b border-slate-700 ${isCollapsed ? 'justify-center' : ''}`}>
        {!isCollapsed && <span className="text-lg font-semibold text-slate-100">Navigation</span>}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded-md hover:bg-slate-700 text-slate-300">
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="flex-grow p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center py-2.5 px-4 rounded-md transition-colors duration-200 hover:bg-slate-700 hover:text-teal-400
              ${isActive ? 'bg-slate-700 text-teal-400 font-medium' : 'text-slate-300'}
              ${isCollapsed ? 'justify-center' : ''}`
            }
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
      <div className={`p-4 border-t border-slate-700 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button className={`flex items-center py-2.5 px-4 rounded-md w-full hover:bg-slate-700 hover:text-teal-400 ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? "Settings" : undefined}>
          <Settings className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
