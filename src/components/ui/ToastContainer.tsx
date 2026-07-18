import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../../stores/toast.store';
import { useSettingsStore } from '../../stores/settings.store';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const { theme } = useSettingsStore();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl animate-pop-in ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          } glass`}
        >
          {icons[t.type]}
          
          <div className="flex-1 text-sm font-medium">
            {t.message}
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="p-0.5 rounded-lg border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4 opacity-55 hover:opacity-100" />
          </button>
        </div>
      ))}
    </div>
  );
}
