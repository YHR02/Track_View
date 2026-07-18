/// <reference types="vite/client" />
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toast.store';
import { googleAuthService } from '../services/google-auth.service';
import { spreadsheetService } from '../services/spreadsheet.service';
import { CheckSquare, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

// ── Provisioning step labels shown in the button while loading ────────────────

type ProvisioningStep =
  | ''
  | 'Signing in with Google...'
  | 'Loading your profile...'
  | 'Resolving workspace...'
  | 'Creating new workspace...'
  | 'Almost ready...';

// ── Component ─────────────────────────────────────────────────────────────────

export function Login() {
  const navigate = useNavigate();
  const { setToken, setProfile, setSpreadsheetId } = useAuthStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ProvisioningStep>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showOfferCreateNew, setShowOfferCreateNew] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    setShowOfferCreateNew(false);
    setStep('Signing in with Google...');

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your-google-oauth-client-id.apps.googleusercontent.com') {
      const msg = 'OAuth Client ID is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.';
      setErrorMsg(msg);
      addToast(msg, 'error');
      setLoading(false);
      setStep('');
      return;
    }

    try {
      // ── Step 1: Load GIS script ────────────────────────────────────────────
      await googleAuthService.loadScript();

      // ── Step 2: OAuth token ────────────────────────────────────────────────
      const { accessToken, expiresAt } = await googleAuthService.requestToken(clientId);
      setToken(accessToken, expiresAt);

      // ── Step 3: User profile ───────────────────────────────────────────────
      setStep('Loading your profile...');
      const profile = await googleAuthService.fetchProfile(accessToken);
      setProfile(profile);

      // ── Step 4: Resolve Workspace ──────────────────────────────────────────
      setStep('Resolving workspace...');
      try {
        const spreadsheetId = await spreadsheetService.resolveWorkspace();
        setStep('Almost ready...');
        setSpreadsheetId(spreadsheetId);
        addToast('Workspace connected successfully!', 'success');
        navigate('/');
      } catch (err: any) {
        if (err.message === 'REPAIR_FAILED') {
          setShowOfferCreateNew(true);
          setErrorMsg('Workspace tab validation failed and automatic repair was unsuccessful.');
        } else {
          throw err;
        }
      }

    } catch (err: any) {
      console.error('[Login] Sign-in failed:', err);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      addToast(err.message || 'Sign-in failed', 'error');
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  const handleCreateNewWorkspace = async () => {
    setLoading(true);
    setErrorMsg('');
    setStep('Creating new workspace...');
    try {
      const newId = await spreadsheetService.createNewWorkspace();
      setSpreadsheetId(newId);
      addToast('New workspace created and connected successfully!', 'success');
      setShowOfferCreateNew(false);
      navigate('/');
    } catch (err: any) {
      console.error('[Login] Workspace creation failed:', err);
      setErrorMsg(err.message || 'Failed to create new workspace.');
      addToast('Failed to create workspace', 'error');
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-[#FFF4D0] text-black">
      <div className="w-full max-w-md p-8 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] text-center space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFDB58] border-3 border-black flex items-center justify-center shadow-[3px_3px_0px_#000000] mb-4">
            <CheckSquare className="w-8 h-8 text-black stroke-[3]" />
          </div>
          <span className="text-xs font-black text-[#9723C9] uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" /> Welcome to
          </span>
          <h1 className="text-3xl font-display font-black tracking-tight mt-1 leading-none">Track Wise</h1>
          <p className="text-sm font-bold opacity-65 max-w-xs mt-2.5">
            Your personal tracking dashboard — powered entirely by your own Google Sheets.
          </p>
        </div>

        {/* Sign In Button */}
        <div className="pt-4">
          <button
            id="google-sign-in-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="neo-btn border-3 border-black bg-white text-black w-full py-4 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[4px] active:shadow-[1px_1px_0px_#000000] text-sm font-black cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                <span>{step || 'Connecting...'}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>

        {/* Step progress (visible while loading) */}
        {loading && step && (
          <div className="text-xs font-black opacity-50 uppercase tracking-wider animate-pulse">
            {step}
          </div>
        )}

        {/* Offer Create New Workspace Modal/Section */}
        {showOfferCreateNew && (
          <div className="p-5 rounded-xl border-3 border-black bg-[#FFF4D0] text-black text-xs font-black shadow-[3px_3px_0px_#000000] text-left space-y-3">
            <h4 className="font-display font-black text-sm text-red-600">Workspace Corrupted</h4>
            <p className="leading-relaxed opacity-80">
              We found a Track Wise spreadsheet in your Google Drive, but it is corrupted and automatic repair failed.
              Would you like to create a new workspace?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCreateNewWorkspace}
                className="neo-btn bg-[#90EE90] border-2 border-black text-black px-4 py-2 text-xs font-black cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-y-[1px] active:shadow-none hover:translate-y-[-1px]"
              >
                Create New Workspace
              </button>
              <button
                onClick={() => setShowOfferCreateNew(false)}
                className="neo-btn bg-white border-2 border-black text-black px-4 py-2 text-xs font-black cursor-pointer shadow-[2px_2px_0px_#000000] active:translate-y-[1px] active:shadow-none hover:translate-y-[-1px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && !loading && !showOfferCreateNew && (
          <div className="p-4 rounded-xl border-3 border-black bg-[#FF6B6B] text-black text-xs font-black shadow-[3px_3px_0px_#000000] flex items-start gap-2.5 text-left leading-relaxed">
            <AlertCircle className="w-5 h-5 shrink-0 stroke-[2.5] mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="pt-2 text-[10px] opacity-40 font-black uppercase tracking-wider">
          Secure · Zero backend · Your data stays in your Google Drive
        </div>
      </div>
    </div>
  );
}
