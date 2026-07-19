import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toast.store';
import { sheetsClient } from '../lib/http-client';
import { spreadsheetService } from '../services/spreadsheet.service';
import { metadataRepository } from '../repositories';
import {
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  Download,
  LogOut,
  RefreshCw,
  ExternalLink,
  Info,
  Database,
} from 'lucide-react';

export function Settings() {
  const navigate = useNavigate();
  const spreadsheetId = useAuthStore(s => s.spreadsheetId);
  const setSpreadsheetId = useAuthStore(s => s.setSpreadsheetId);
  const profile = useAuthStore(s => s.profile);
  const logout = useAuthStore(s => s.logout);
  const addToast = useToastStore(s => s.addToast);

  const [reconnecting, setReconnecting] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [reconnectResult, setReconnectResult] = useState<{ success: boolean; message: string } | null>(null);

  const [workspaceMeta, setWorkspaceMeta] = useState<{
    ownerEmail: string;
    schemaVersion: string;
    workspaceVersion: string;
  } | null>(null);

  const loadMetadata = async () => {
    if (!spreadsheetId) return;
    try {
      const data = await metadataRepository.getAll();
      setWorkspaceMeta({
        ownerEmail: data.ownerEmail || profile?.email || 'N/A',
        schemaVersion: data.schemaVersion || '1.0.0',
        workspaceVersion: data.workspaceVersion || '1.0.0',
      });
    } catch (err) {
      console.error('Failed to fetch workspace metadata:', err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, [spreadsheetId]);

  const handleReconnect = async () => {
    setReconnecting(true);
    setReconnectResult(null);
    try {
      addToast('Connecting to your workspace...', 'info');
      const resolvedId = await spreadsheetService.resolveWorkspace();
      setSpreadsheetId(resolvedId);
      setReconnectResult({ success: true, message: `Connected to spreadsheet: ${resolvedId}` });
      addToast('Workspace reconnected!', 'success');
      await loadMetadata();
    } catch (err: any) {
      const message = err.message === 'REPAIR_FAILED'
        ? 'Workspace found but corrupted. Tab automatic repair failed. Try signing out and back in to create a new workspace.'
        : err.message || 'Reconnect failed.';
      setReconnectResult({ success: false, message });
      addToast('Reconnect failed', 'error');
    } finally {
      setReconnecting(false);
    }
  };

  const handleRepair = async () => {
    setRepairing(true);
    try {
      addToast('Repairing workspace sheets and headers...', 'info');
      await spreadsheetService.forceRepairWorkspace();
      addToast('Workspace repaired successfully!', 'success');
      await loadMetadata();
    } catch (err: any) {
      addToast(err.message || 'Repair failed.', 'error');
    } finally {
      setRepairing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExportJSON = async () => {
    if (!spreadsheetId) return;
    try {
      addToast('Exporting your data...', 'info');
      const trackers = await sheetsClient.getRows(spreadsheetId, 'Trackers!A:K');
      const entries = await sheetsClient.getRows(spreadsheetId, 'Entries!A:F');
      const categories = await sheetsClient.getRows(spreadsheetId, 'Categories!A:E');

      const backupData = {
        version: '3.0.0',
        exportedAt: new Date().toISOString(),
        spreadsheetId,
        categories,
        trackers,
        entries,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackwise_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Backup downloaded!', 'success');
    } catch (err: any) {
      addToast(`Export failed: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-pop-in text-zinc-100 font-sans bg-[#09090b]">
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
        <SettingsIcon className="w-6 h-6 text-zinc-400 stroke-[2]" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Settings Console</h2>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">Workspace configuration and account management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Workspace Status + Reconnect */}
        <div className="lg:col-span-2 space-y-6">

          <div className="brutalist-card p-6">
            <h3 className="font-semibold text-xs md:text-sm text-zinc-200 mb-4 pb-2 border-b border-zinc-900">
              Connected Workspace
            </h3>

            {/* Spreadsheet info — read-only */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded border border-zinc-800 bg-zinc-900/30">
                <Database className="w-5 h-5 shrink-0 text-zinc-400 mt-0.5" />
                <div className="min-w-0 space-y-1.5 font-mono text-[10px]">
                  <p className="font-semibold uppercase tracking-wider text-zinc-500">Track Wise Data — Google Sheets</p>
                  {spreadsheetId ? (
                    <>
                      <p className="break-all text-zinc-350">
                        <strong className="text-zinc-500 font-normal">ID:</strong> {spreadsheetId}
                      </p>
                      {workspaceMeta && (
                        <div className="space-y-1 pt-2 border-t border-zinc-800 text-zinc-400">
                          <p><span className="text-zinc-500">Owner Email:</span> {workspaceMeta.ownerEmail}</p>
                          <p><span className="text-zinc-500">Schema Version:</span> {workspaceMeta.schemaVersion}</p>
                          <p><span className="text-zinc-500">Workspace Version:</span> {workspaceMeta.workspaceVersion}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="font-bold text-red-400">No spreadsheet connected</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleReconnect}
                  disabled={reconnecting}
                  className="bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-450 border border-emerald-800 px-4 py-2 rounded text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {reconnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Searching Drive...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reconnect Workspace
                    </>
                  )}
                </button>

                <button
                  onClick={handleRepair}
                  disabled={repairing || !spreadsheetId}
                  className="bg-amber-950/20 hover:bg-amber-950/40 text-amber-450 border border-amber-800 px-4 py-2 rounded text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {repairing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Repairing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Repair Workspace
                    </>
                  )}
                </button>

                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-zinc-900 hover:bg-zinc-850 text-zinc-350 border border-zinc-800 px-4 py-2 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    Open in Google Sheets
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {reconnectResult && (
              <div className={`mt-4 p-4 rounded border text-xs font-mono flex items-start gap-2.5 ${
                reconnectResult.success
                  ? 'border-emerald-800 bg-emerald-950/15 text-emerald-400'
                  : 'border-red-950 bg-red-950/15 text-red-400'
              }`}>
                {reconnectResult.success
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                }
                <span>{reconnectResult.message}</span>
              </div>
            )}
          </div>

          {/* Google Account Profile */}
          {profile && (
            <div className="brutalist-card p-6">
              <h3 className="font-semibold text-xs md:text-sm text-zinc-200 mb-4 pb-2 border-b border-zinc-900">Google Account</h3>

              <div className="flex items-center gap-4">
                {profile.picture ? (
                  <img src={profile.picture} alt={profile.name} className="w-12 h-12 rounded-full border border-zinc-800" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-lg">
                    {profile.name[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm leading-tight text-zinc-200">{profile.name}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">{profile.email}</p>
                  <p className="text-[10px] text-zinc-650 font-semibold uppercase tracking-wider mt-1">OAuth Session Active</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-900">
                <button
                  onClick={handleLogout}
                  className="bg-red-950/20 hover:bg-red-950/40 text-red-450 border border-red-900 px-4 py-2 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Backup + Tips */}
        <div className="space-y-6">
          <div className="brutalist-card p-6">
            <h3 className="font-semibold text-xs md:text-sm text-zinc-200 mb-4 pb-2 border-b border-zinc-900">Backup Console</h3>

            <button
              onClick={handleExportJSON}
              disabled={!spreadsheetId}
              className="bg-blue-950/20 hover:bg-blue-950/40 text-blue-450 border border-blue-900 w-full p-3 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between disabled:opacity-40"
            >
              <span>Download JSON backup</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="brutalist-card p-6 border border-zinc-800 bg-zinc-900/10 text-xs leading-relaxed space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
              <Info className="w-4 h-4 text-zinc-400 shrink-0" />
              <h4 className="font-semibold text-zinc-250">Configuration Rules</h4>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 font-mono text-[10px] text-zinc-500">
              <li>Do not rename worksheet tabs (Categories, Trackers, Entries, Settings).</li>
              <li>Do not modify or rearrange headers in row 1.</li>
              <li>Spreadsheet lookup operates by name. Use Reconnect Workspace if renamed.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
