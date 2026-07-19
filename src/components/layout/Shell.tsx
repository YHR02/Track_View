import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Settings,
  Cloud,
  RefreshCw,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { syncService } from '../../services/sync.service';
import { Logo } from '../ui/Logo';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const location = useLocation();
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
    { label: 'Calendar', path: '/calendar', icon: CalendarIcon },
    { label: 'Analytics', path: '/analytics', icon: TrendingUp },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#09090b] text-zinc-100 font-sans">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-zinc-950 border-r border-zinc-800 shrink-0">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <div>
              <h1 className="font-semibold text-sm text-zinc-100 tracking-tight leading-none">Track Wise</h1>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Personal OS</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive 
                    ? 'bg-zinc-900 border border-zinc-800 text-zinc-100' 
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom User info, sync and logout */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          {/* Sync tag indicator */}
          <div className="flex items-center justify-between p-2 rounded border border-zinc-800/80 bg-zinc-900/30 text-[10px] text-zinc-400">
            <div className="flex items-center gap-1.5 font-medium">
              <Cloud className="w-3.5 h-3.5 text-blue-500" />
              <span>Sheets API</span>
            </div>

            <div className="flex items-center gap-1.5">
              {syncStatus === 'syncing' && (
                <>
                  <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                  <span className="text-blue-400 font-semibold">Syncing</span>
                </>
              )}
              {syncStatus === 'synced' && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-400 font-semibold">Synced</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-red-400 font-semibold">Error</span>
                </>
              )}
            </div>
          </div>

          {/* User profile */}
          {profile && (
            <div className="flex items-center gap-2.5 p-2 rounded border border-zinc-800/80 bg-zinc-900/30">
              {profile.picture ? (
                <img src={profile.picture} alt={profile.name} className="w-7 h-7 rounded-full border border-zinc-800 shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                  {profile.name[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-zinc-200 truncate leading-none">{profile.name}</div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">Google Sync</div>
              </div>
              <button 
                onClick={logout} 
                className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <h1 className="font-semibold text-sm text-zinc-100 tracking-tight">Track Wise</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 rounded border border-zinc-800 bg-zinc-900/50">
            {syncStatus === 'syncing' && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
            {syncStatus === 'synced' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mx-1" />}
            {syncStatus === 'error' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mx-1" />}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded bg-zinc-900 border border-zinc-800 transition text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs">
          <div className="flex flex-col w-full max-w-xs h-full p-5 bg-zinc-950 border-r border-zinc-800 shadow-xl relative animate-pop-in">
            <div className="flex items-center justify-between mb-6 pb-3.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Logo size={20} />
                <h1 className="font-semibold text-sm text-zinc-100">Track Wise</h1>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-colors ${
                      isActive 
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-100' 
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-4 border-t border-zinc-800">
              {profile && (
                <div className="flex items-center justify-between p-2.5 border border-zinc-800 bg-zinc-900/40 rounded">
                  <div className="flex items-center gap-2 min-w-0">
                    {profile.picture && <img src={profile.picture} alt={profile.name} className="w-6.5 h-6.5 rounded-full" />}
                    <span className="font-semibold text-xs text-zinc-200 truncate">{profile.name}</span>
                  </div>
                  <button onClick={logout} className="text-zinc-400 hover:text-red-400 p-1 border border-zinc-800 bg-zinc-900 rounded">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-5 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
