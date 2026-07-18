import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { gsheetClient } from '../lib/gsheet';
import { useToastStore } from '../stores/toast.store';
import { 
  Database, 
  Link as LinkIcon, 
  PlusCircle, 
  RefreshCw, 
  AlertCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function Setup() {
  const navigate = useNavigate();
  const setSpreadsheetId = useAuthStore((s) => s.setSpreadsheetId);
  const addToast = useToastStore((s) => s.addToast);

  const [inputId, setInputId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnectSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId) return;

    setConnecting(true);
    setErrorMsg('');

    // Extract sheet ID if full URL is pasted
    let targetId = inputId.trim();
    if (targetId.includes('docs.google.com/spreadsheets')) {
      const match = targetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        targetId = match[1];
      }
    }

    try {
      const isValid = await gsheetClient.validateSpreadsheet(targetId);
      if (isValid) {
        setSpreadsheetId(targetId);
        addToast('Connected to Google Sheet database!', 'success');
        navigate('/');
      } else {
        setErrorMsg('The spreadsheet is missing required sheets. Please create a new spreadsheet or check tabs.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect spreadsheet. Check permissions and ID.');
    } finally {
      setConnecting(false);
    }
  };

  const handleCreateSpreadsheet = async () => {
    setCreating(true);
    setErrorMsg('');
    try {
      addToast('Creating new Google Spreadsheet...', 'info');
      const newId = await gsheetClient.createSpreadsheet('Track Wise Data');
      
      setSpreadsheetId(newId);
      addToast('New Spreadsheet database created and synced!', 'success');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create spreadsheet on Google Drive. Check connection.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 animate-pop-in bg-[#FFF4D0] text-black">
      <div className="w-full max-w-2xl p-8 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] space-y-8">
        
        {/* Header */}
        <div className="text-center pb-4 border-b-3 border-black">
          <span className="text-xs font-black text-[#9723C9] uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1.5">
            <Database className="w-4 h-4 stroke-[2.5]" /> Database Setup
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight leading-tight">Connect Your Data Store</h2>
          <p className="text-sm font-bold opacity-65 mt-2 max-w-md mx-auto">
            Choose whether to link an existing tracking spreadsheet or build a brand-new database automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          
          {/* Card 1: Connect Existing */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-display font-black text-base text-black">
                <LinkIcon className="w-5 h-5 stroke-[2.5] text-[#87CEEB]" />
                <h3>Connect Existing</h3>
              </div>
              <p className="text-xs font-semibold opacity-60 leading-relaxed">
                Connect a sheet you used previously. Paste the spreadsheet URL or ID to sync records immediately.
              </p>
            </div>

            <form onSubmit={handleConnectSpreadsheet} className="space-y-3">
              <input
                type="text"
                placeholder="Google Sheet ID or URL"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                required
                className="neo-input w-full px-4 py-3 text-xs bg-white"
              />
              <button
                type="submit"
                disabled={connecting || creating}
                className="neo-btn bg-[#90EE90] border-3 border-black text-black w-full py-3 shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] text-xs font-black cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Sheet
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card 2: Create New */}
          <div className="space-y-4 flex flex-col justify-between border-t-4 md:border-t-0 md:border-l-4 border-black pt-6 md:pt-0 md:pl-8 border-dashed">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-display font-black text-base text-black">
                <PlusCircle className="w-5 h-5 stroke-[2.5] text-[#FFB2EF]" />
                <h3>Create New database</h3>
              </div>
              <p className="text-xs font-semibold opacity-60 leading-relaxed">
                Zero configuration setup. Programmatically builds a sheet named "Track Wise Data" with the required columns and tabs.
              </p>
            </div>

            <button
              onClick={handleCreateSpreadsheet}
              disabled={connecting || creating}
              className="neo-btn bg-[#FFB2EF] border-3 border-black text-black w-full py-3.5 shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] text-xs font-black cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Creating File...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                  Create New Sheet
                </>
              )}
            </button>
          </div>

        </div>

        {/* Error Info */}
        {errorMsg && (
          <div className="p-4 rounded-xl border-3 border-black bg-[#FF6B6B] text-black text-xs font-black shadow-[3px_3px_0px_#000000] flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-5 h-5 shrink-0 stroke-[2.5]" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
