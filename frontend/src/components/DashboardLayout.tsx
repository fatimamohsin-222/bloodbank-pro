import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Droplets, Database, 
  FileText, HeartPulse, Settings, User as UserIcon, LogOut, Menu, X, Building, Activity
} from 'lucide-react';
import api from '../lib/api';
import type { Facility, UserProfile } from '../types';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

const navigationItems: SidebarItem[] = [
  { name: 'Dashboard', path: '/portal', icon: LayoutDashboard, roles: ['*'] },
  { name: 'Donors', path: '/donors', icon: Users, roles: ['SuperAdmin', 'FacilityAdmin', 'DonorCoordinator', 'LabTechnologist', 'MedicalDirector', 'Auditor'] },
  { name: 'Testing & Collection', path: '/testing', icon: Droplets, roles: ['SuperAdmin', 'FacilityAdmin', 'LabTechnologist', 'MedicalDirector', 'Auditor'] },
  { name: 'Lab Testing Queue', path: '/testing/lab', icon: Activity, roles: ['SuperAdmin', 'FacilityAdmin', 'LabTechnologist', 'MedicalDirector', 'Auditor'] },
  { name: 'Inventory', path: '/inventory', icon: Database, roles: ['SuperAdmin', 'FacilityAdmin', 'InventoryManager', 'LabTechnologist', 'MedicalDirector', 'Auditor'] },
  { name: 'Blood Requests', path: '/requests', icon: FileText, roles: ['SuperAdmin', 'FacilityAdmin', 'RequestingPhysician', 'Nurse', 'LabTechnologist', 'MedicalDirector', 'Auditor'] },
  { name: 'Transfusions', path: '/transfusions', icon: HeartPulse, roles: ['SuperAdmin', 'FacilityAdmin', 'RequestingPhysician', 'Nurse', 'MedicalDirector', 'Auditor'] },
  { name: 'User Management', path: '/users', icon: Settings, roles: ['SuperAdmin', 'FacilityAdmin', 'SystemAdmin'] }
];

export default function DashboardLayout() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      const parsedUser: UserProfile = JSON.parse(cachedUser);
      setUser(parsedUser);
      
      // If user has a specific facility, lock their scope to it
      if (parsedUser.facilityId) {
        setSelectedFacility(parsedUser.facilityId);
        localStorage.setItem('selectedFacilityId', parsedUser.facilityId);
      } else {
        // SuperAdmin / SystemAdmin - check if there's already a selected facility
        const storedFacility = localStorage.getItem('selectedFacilityId');
        if (storedFacility) {
          setSelectedFacility(storedFacility);
        }
      }
    }
  }, []);

  // Fetch facilities if the user is cross-facility (SuperAdmin/IT)
  useEffect(() => {
    if (user && !user.facilityId) {
      api.get<Facility[]>('/facilities')
        .then(res => {
          setFacilities(res.data);
          // Default to the first facility if nothing is selected yet
          if (!localStorage.getItem('selectedFacilityId') && res.data.length > 0) {
            setSelectedFacility(res.data[0].id);
            localStorage.setItem('selectedFacilityId', res.data[0].id);
          }
        })
        .catch(() => {
          // Fallback if endpoint doesn't exist yet (will resolve when DB seeded/scaffold runs)
          console.warn("Could not retrieve facilities list.");
        });
    }
  }, [user]);

  const handleFacilityChange = (facilityId: string) => {
    setSelectedFacility(facilityId);
    localStorage.setItem('selectedFacilityId', facilityId);
    // Reload page to refresh all active queries with new facility scope
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedFacilityId');
    navigate('/login');
  };

  // Determine active facility name
  const getActiveFacilityName = () => {
    if (user?.facilityId) {
      return "Local Facility"; // Will be fetched/mapped
    }
    const matched = facilities.find(f => f.id === selectedFacility);
    return matched ? matched.name : 'Select Facility';
  };

  const userRoles = user?.roles || [];
  const hasAccess = (item: SidebarItem) => {
    if (item.roles.includes('*')) return true;
    return item.roles.some(r => userRoles.includes(r));
  };

  const activeItems = navigationItems.filter(hasAccess);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              B
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold text-slate-900 dark:text-white leading-none block">BloodBank Pro</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Clinical Shell</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Facility Switcher/Display */}
          {user && (
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
              <Building className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              {user.facilityId ? (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {getActiveFacilityName()}
                </span>
              ) : (
                <select
                  value={selectedFacility}
                  onChange={(e) => handleFacilityChange(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer pr-1"
                >
                  {facilities.map(fac => (
                    <option key={fac.id} value={fac.id} className="bg-white dark:bg-slate-800">
                      {fac.name}
                    </option>
                  ))}
                  {facilities.length === 0 && (
                    <option value="">Global View</option>
                  )}
                </select>
              )}
            </div>
          )}

          {/* Profile Dropdown */}
          {user && (
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-expanded={isProfileOpen}
                aria-label="User profile options"
              >
                <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-700 dark:text-red-300 font-semibold text-sm">
                  {user.fullName.charAt(0)}
                </div>
                <span className="hidden md:block text-xs font-semibold text-slate-700 dark:text-slate-300 pr-1">
                  {user.fullName}
                </span>
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <UserIcon className="h-4 w-4 text-slate-400" />
                      <span>My Profile</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Wrapper */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Left) */}
        <aside className="hidden md:block w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0">
          <nav className="p-4 space-y-1.5">
            {activeItems.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                    isActive 
                      ? 'bg-red-600 text-white shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile/Tablet Drawer Sidebar */}
        {isSidebarOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs md:hidden" onClick={() => setIsSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 p-4 flex flex-col md:hidden animate-in slide-in-from-left duration-200 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold text-base">
                    B
                  </div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white">BloodBank Pro</span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1.5 overflow-y-auto">
                {activeItems.map(item => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                        isActive 
                          ? 'bg-red-600 text-white' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950 transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
