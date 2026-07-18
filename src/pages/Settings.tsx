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

  /** Re-run Drive search + validation — useful after manually deleting/recreating a spreadsheet */
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

  /** Trigger automatic repair manually */
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
    <div className="space-y-8 animate-pop-in text-black">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-black stroke-[2.5]" />
        <div>
          <h2 className="text-3xl font-display font-black text-black">Settings</h2>
          <p className="text-sm opacity-65 font-bold">Workspace configuration and account management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Workspace Status + Reconnect */}
        <div className="lg:col-span-2 space-y-6">

          <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000]">
            <h3 className="text-xl font-display font-black mb-4 pb-2 border-b-2 border-dashed border-slate-300">
              Connected Workspace
            </h3>

            {/* Spreadsheet info — read-only */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border-3 border-black bg-[#FFF4D0] shadow-[3px_3px_0px_#000000]">
                <Database className="w-5 h-5 shrink-0 stroke-[2.5] mt-0.5" />
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-black uppercase opacity-60">Track Wise Data — Google Sheets</p>
                  {spreadsheetId ? (
                    <>
                      <p className="text-xs font-mono break-all opacity-80">
                        <strong className="opacity-60">ID:</strong> {spreadsheetId}
                      </p>
                      {workspaceMeta && (
                        <div className="text-xs space-y-1 pt-1 border-t border-dashed border-black/10 font-bold opacity-80">
                          <p><span className="opacity-60 font-semibold">Owner Email:</span> {workspaceMeta.ownerEmail}</p>
                          <p><span className="opacity-60 font-semibold">Schema Version:</span> {workspaceMeta.schemaVersion}</p>
                          <p><span className="opacity-60 font-semibold">Workspace Version:</span> {workspaceMeta.workspaceVersion}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs font-bold text-red-600">No spreadsheet connected</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={handleReconnect}
                  disabled={reconnecting}
                  className="neo-btn bg-[#90EE90] border-3 border-black text-black px-5 py-2.5 text-xs shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {reconnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Searching Drive...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                      Reconnect Workspace
                    </>
                  )}
                </button>

                <button
                  onClick={handleRepair}
                  disabled={repairing || !spreadsheetId}
                  className="neo-btn bg-[#FFD27F] border-3 border-black text-black px-5 py-2.5 text-xs shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {repairing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Repairing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                      Repair Workspace
                    </>
                  )}
                </button>

                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="neo-btn bg-white border-3 border-black text-black px-5 py-2.5 text-xs shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center gap-1.5"
                  >
                    Open in Google Sheets
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                )}
              </div>
            </div>

            {reconnectResult && (
              <div className={`mt-4 p-4 rounded-xl border-3 border-black text-xs font-black leading-relaxed flex items-start gap-2.5 ${
                reconnectResult.success
                  ? 'bg-[#90EE90] shadow-[2px_2px_0px_#000000]'
                  : 'bg-[#FF6B6B] shadow-[2px_2px_0px_#000000]'
              }`}>
                {reconnectResult.success
                  ? <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[2.5]" />
                  : <XCircle className="w-5 h-5 shrink-0 stroke-[2.5]" />
                }
                <span>{reconnectResult.message}</span>
              </div>
            )}
          </div>

          {/* Google Account Profile */}
          {profile && (
            <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000]">
              <h3 className="text-xl font-display font-black mb-4 pb-2 border-b-2 border-dashed border-slate-300">Google Account</h3>

              <div className="flex items-center gap-4">
                {profile.picture ? (
                  <img src={profile.picture} alt={profile.name} className="w-16 h-16 rounded-full border-3 border-black shadow-[3px_3px_0px_#000000]" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#FFB2EF] border-3 border-black flex items-center justify-center font-black text-2xl shadow-[3px_3px_0px_#000000]">
                    {profile.name[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-display font-black text-lg leading-tight">{profile.name}</h4>
                  <p className="text-xs font-bold opacity-60 mt-0.5">{profile.email}</p>
                  <p className="text-xs font-bold opacity-40 mt-1">OAuth Session Active</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300">
                <button
                  onClick={handleLogout}
                  className="neo-btn bg-[#FF6B6B] border-3 border-black text-black px-5 py-2.5 text-xs shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 stroke-[2.5]" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Backup + Tips */}
        <div className="space-y-6">
          <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000]">
            <h3 className="text-xl font-display font-black mb-4 pb-2 border-b-2 border-dashed border-slate-300">Backup</h3>

            <button
              onClick={handleExportJSON}
              disabled={!spreadsheetId}
              className="neo-btn bg-[#FFB2EF] border-3 border-black text-black w-full p-4 text-sm shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center justify-between disabled:opacity-40"
            >
              <span>Download JSON backup</span>
              <Download className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="p-6 rounded-[18px] border-4 border-black bg-[#FFF4D0] shadow-[6px_6px_0px_#000000] text-xs font-bold leading-relaxed">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 stroke-[2.5] shrink-0" />
              <h4 className="font-display font-black text-sm">Important Notes</h4>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 font-medium">
              <li>Do not rename tabs like <code>Categories</code>, <code>Trackers</code>, or <code>Entries</code> in Google Sheets.</li>
              <li>Do not delete or change headers in row 1.</li>
              <li>If you rename the file, use <strong>Reconnect Workspace</strong> — it searches by name.</li>
              <li>Use File → Download → CSV in Google Sheets to export individual tabs.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
