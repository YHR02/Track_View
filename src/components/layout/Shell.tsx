import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  TrendingUp, 
  Settings,
  Cloud,
  Wifi,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settings.store';
import { useAuthStore } from '../../stores/authStore';
import { syncService } from '../../services/sync.service';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const location = useLocation();
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Trackers', path: '/trackers', icon: CheckSquare },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    { label: 'Analytics', path: '/analytics', icon: TrendingUp },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FFF4D0] text-black selection:bg-[#FFB2EF]">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r-4 border-black shrink-0">
        <div className="p-6 border-b-4 border-black bg-[#E3DFF2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFDB58] border-3 border-black flex items-center justify-center shadow-[3px_3px_0px_#000000]">
              <CheckSquare className="w-5 h-5 text-black stroke-[3]" />
            </div>
            <div>
              <h1 className="font-display font-black text-xl leading-none tracking-tight">Track Wise</h1>
              <span className="text-[10px] font-black opacity-60 tracking-widest uppercase">Habit Log</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-3 transition-all duration-150 font-bold ${
                  isActive 
                    ? 'bg-[#A388EE] border-black shadow-[3px_3px_0px_#000000] text-black translate-x-[2px]' 
                    : 'border-transparent text-black hover:border-black hover:bg-slate-100 hover:shadow-[3px_3px_0px_#000000] hover:translate-y-[-1px]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0 stroke-[2.5]" />
                <span className="font-display">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-4 border-t-4 border-black flex flex-col gap-4 bg-[#FFF4D0]/40">
          {/* Sync Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl border-3 border-black bg-white shadow-[3px_3px_0px_#000000] text-xs font-bold">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-500 stroke-[2.5]" />
              <span>GSheet API</span>
            </div>

            <div className="flex items-center gap-1.5">
              {syncStatus === 'syncing' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#9723C9] animate-spin stroke-[2.5]" />
                  <span className="text-[#9723C9] font-black">Syncing</span>
                </>
              )}
              {syncStatus === 'synced' && (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#7FBC8C] stroke-[2.5]" />
                  <span className="text-[#7FBC8C] font-black">Synced</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-danger stroke-[2.5]" />
                  <span className="text-danger font-black">Error</span>
                </>
              )}
            </div>
          </div>

          {/* User Profile Card */}
          {profile && (
            <div className="flex items-center gap-3 p-3 rounded-xl border-3 border-black bg-white shadow-[3px_3px_0px_#000000]">
              {profile.picture ? (
                <img src={profile.picture} alt={profile.name} className="w-8 h-8 rounded-full border-2 border-black shrink-0 shadow-[1px_1px_0px_#000000]" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#FFB2EF] border-2 border-black text-black flex items-center justify-center font-black text-xs shrink-0 shadow-[1px_1px_0px_#000000]">
                  {profile.name[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-xs truncate leading-tight">{profile.name}</div>
                <div className="text-[9px] font-bold opacity-50 truncate">Google User</div>
              </div>
              <button 
                onClick={logout} 
                className="p-1 rounded-lg border-2 border-black bg-white hover:bg-rose-50 text-rose-600 transition cursor-pointer active:scale-90"
                title="Log Out"
              >
                <LogOut className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full p-3 rounded-xl border-3 border-black bg-white shadow-[3px_3px_0px_#000000] text-sm font-bold transition hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer"
          >
            <span className="font-display">Dark Theme</span>
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FFA07A] stroke-[2.5]" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 stroke-[2.5]" />
            )}
          </button>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b-4 border-black shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFDB58] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000000]">
            <CheckSquare className="w-4.5 h-4.5 text-black stroke-[3]" />
          </div>
          <h1 className="font-display font-black text-lg leading-none tracking-tight">Track Wise</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg border-2 border-black bg-white">
            {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-[#9723C9] animate-spin stroke-[2.5]" />}
            {syncStatus === 'synced' && <Wifi className="w-4 h-4 text-[#7FBC8C] stroke-[2.5]" />}
            {syncStatus === 'error' && <WifiOff className="w-4 h-4 text-danger stroke-[2.5]" />}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-white border-2 border-black shadow-[2px_2px_0px_#000000] transition active:scale-95 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-black/50 animate-pop-in">
          <div className="flex flex-col w-full max-w-xs h-full p-6 bg-white border-r-4 border-black shadow-[6px_0_0_#000000] relative">
            <div className="flex items-center justify-between mb-8 pb-4 border-b-4 border-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFDB58] border-2 border-black flex items-center justify-center">
                  <CheckSquare className="w-4.5 h-4.5 text-black stroke-[3]" />
                </div>
                <h1 className="font-display font-black text-base">Track Wise</h1>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg border-2 border-black bg-white"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <nav className="flex-1 space-y-3">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-3 transition-all font-bold ${
                      isActive 
                        ? 'bg-[#A388EE] border-black shadow-[3px_3px_0px_#000000]' 
                        : 'border-transparent hover:border-black hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                    <span className="font-display">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-4 pt-6 border-t-4 border-black bg-[#FFF4D0]/10">
              {profile && (
                <div className="flex items-center justify-between p-2 border-3 border-black bg-white rounded-xl shadow-[2px_2px_0px_#000000]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {profile.picture && <img src={profile.picture} alt={profile.name} className="w-7.5 h-7.5 rounded-full border border-black" />}
                    <span className="font-bold text-xs truncate">{profile.name}</span>
                  </div>
                  <button onClick={logout} className="text-rose-600 p-1.5 border border-black bg-white rounded-lg">
                    <LogOut className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              )}
              
              <button
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-between w-full p-3 rounded-xl border-3 border-black bg-white shadow-[3px_3px_0px_#000000] text-sm font-bold cursor-pointer"
              >
                <span>Dark Theme</span>
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#FFA07A]" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
