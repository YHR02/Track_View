import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toast.store';
import { gsheetClient } from '../lib/gsheet';
import { 
  Settings as SettingsIcon, 
  CheckCircle2, 
  XCircle, 
  Download, 
  LogOut, 
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';

export function Settings() {
  const spreadsheetId = useAuthStore((s) => s.spreadsheetId);
  const setSpreadsheetId = useAuthStore((s) => s.setSpreadsheetId);
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const addToast = useToastStore((s) => s.addToast);

  const [inputId, setInputId] = useState(spreadsheetId);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleUpdateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId) {
      addToast('Spreadsheet ID is required', 'error');
      return;
    }

    let targetId = inputId.trim();
    if (targetId.includes('docs.google.com/spreadsheets')) {
      const match = targetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        targetId = match[1];
        setInputId(targetId);
      }
    }

    setTesting(true);
    setTestResult(null);

    try {
      const isValid = await gsheetClient.validateSpreadsheet(targetId);
      if (isValid) {
        setSpreadsheetId(targetId);
        setTestResult({
          success: true,
          message: 'Connection successful! Verified tabs matching Categories, Trackers, Entries, and Metadata.'
        });
        addToast('Spreadsheet ID updated!', 'success');
      } else {
        setTestResult({
          success: false,
          message: 'The spreadsheet lacks the required database tabs. Please check sheet configuration.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection failed. Check Spreadsheet ID and Google Drive permissions.'
      });
      addToast('Failed to connect to sheet', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleExportJSON = async () => {
    if (!spreadsheetId) return;
    try {
      addToast('Loading full sheet dump...', 'info');
      // Download all rows from tabs
      const trackers = await gsheetClient.getRows(spreadsheetId, 'Trackers!A:K');
      const entries = await gsheetClient.getRows(spreadsheetId, 'Entries!A:F');
      const categories = await gsheetClient.getRows(spreadsheetId, 'Categories!A:E');
      
      const backupData = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        categories,
        trackers,
        entries
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackwise_sheets_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('JSON backup downloaded successfully', 'success');
    } catch (err: any) {
      addToast(`Backup failed: ${err.message || 'Error fetching data'}`, 'error');
    }
  };

  return (
    <div className="space-y-8 animate-pop-in text-black">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-black stroke-[2.5]" />
        <div>
          <h2 className="text-3xl font-display font-black text-black">Settings</h2>
          <p className="text-sm opacity-65 font-bold">Configure database connection and linked accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Connection Setup */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000]">
            <h3 className="text-xl font-display font-black mb-4 pb-2 border-b-2 border-dashed border-slate-300">Google Sheet Connection</h3>
            
            <form onSubmit={handleUpdateConnection} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase opacity-75 mb-1.5">Connected Spreadsheet ID</label>
                <input
                  type="text"
                  placeholder="1a2b3c4d5e6f7g8h9i0j..."
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  required
                  className="neo-input w-full px-4 py-3 font-mono text-xs bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={testing}
                  className="neo-btn bg-[#90EE90] border-3 border-black text-black px-5 py-2.5 text-xs shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    'Update Connection'
                  )}
                </button>

                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="neo-btn bg-white border-3 border-black text-black px-5 py-2.5 text-xs shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center gap-1.5"
                  >
                    Open Spreadsheet
                    <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                  </a>
                )}
              </div>
            </form>

            {testResult && (
              <div className={`mt-4 p-4 rounded-xl border-3 border-black text-xs font-black leading-relaxed flex items-start gap-2.5 ${
                testResult.success 
                  ? 'bg-[#90EE90] text-black shadow-[2px_2px_0px_#000000]' 
                  : 'bg-[#FF6B6B] text-black shadow-[2px_2px_0px_#000000]'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[2.5]" /> : <XCircle className="w-5 h-5 shrink-0 stroke-[2.5]" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Connected Profile Details */}
          {profile && (
            <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000]">
              <h3 className="text-xl font-display font-black mb-4 pb-2 border-b-2 border-dashed border-slate-300">Google Account Profile</h3>
              
              <div className="flex items-center gap-4">
                {profile.picture ? (
                  <img src={profile.picture} alt={profile.name} className="w-16 h-16 rounded-full border-3 border-black shadow-[3px_3px_0px_#000000]" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#FFB2EF] border-3 border-black text-black flex items-center justify-center font-black text-2xl shadow-[3px_3px_0px_#000000]">
                    {profile.name[0]}
                  </div>
                )}
                
                <div>
                  <h4 className="font-display font-black text-lg leading-tight text-black">{profile.name}</h4>
                  <p className="text-xs font-bold opacity-60 mt-1">Google OAuth Session Active</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300">
                <button
                  onClick={logout}
                  className="neo-btn bg-[#FF6B6B] border-3 border-black text-black px-5 py-2.5 text-xs shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4 stroke-[2.5]" />
                  Disconnect Account
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Backup details */}
        <div className="space-y-6">
          <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000]">
            <h3 className="text-xl font-display font-black mb-4 pb-2 border-b-2 border-dashed border-slate-300">Backup Dump</h3>
            
            <button
              onClick={handleExportJSON}
              className="neo-btn bg-[#FFB2EF] border-3 border-black text-black w-full p-4 text-sm shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] cursor-pointer flex items-center justify-between"
            >
              <span>Download full sheet JSON</span>
              <Download className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="p-6 rounded-[18px] border-4 border-black bg-[#FFF4D0] shadow-[6px_6px_0px_#000000] text-xs font-bold leading-relaxed text-black">
            <div className="flex items-center gap-2 mb-3 text-black">
              <Info className="w-4 h-4 stroke-[2.5] text-black shrink-0" />
              <h4 className="font-display font-black text-sm">Google Sheet DB Tips</h4>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 font-medium">
              <li>Do not manually rename tabs like <code>Categories</code>, <code>Trackers</code>, or <code>Entries</code> in Google Sheets.</li>
              <li>Do not delete or change headers in row 1.</li>
              <li>To copy/paste data to other systems, use Google Spreadsheet's built-in File &gt; Download &gt; CSV option.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
