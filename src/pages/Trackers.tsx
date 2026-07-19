import { useState, useMemo } from 'react';
import { 
  useTrackers, 
  useCreateTracker, 
  useUpdateTracker, 
  useArchiveTracker, 
  useReorderTrackers 
} from '../hooks/use-trackers';
import { useCategories } from '../hooks/use-categories';
import { Modal } from '../components/ui/Modal';
import { Tracker, TrackerType, TrackerFrequency } from '../types/tracker';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  Move, 
  FolderHeart,
  CalendarDays,
  Target
} from 'lucide-react';

const PRESET_ICONS = [
  '🏃', '📚', '⏱️', '💧', '🥗', '🧘', '💻', '💰', '😴', '🧠', '☀️', '🚭',
  '🚶', '🚴', '🏊', '🦷', '✍️', '🎸', '🎨', '🥬', '🍵', '💊', '📞', '🧹'
];

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#a1a1aa', // Zinc
  '#14b8a6', // Teal
];

export function Trackers() {
  const { data: trackers = [], isLoading } = useTrackers();
  const { data: categories = [] } = useCategories();
  
  const createTrackerMut = useCreateTracker();
  const updateTrackerMut = useUpdateTracker();
  const archiveTrackerMut = useArchiveTracker();
  const reorderTrackersMut = useReorderTrackers();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTracker, setEditingTracker] = useState<Tracker | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<TrackerType>('boolean');
  const [frequency, setFrequency] = useState<TrackerFrequency>('daily');
  const [icon, setIcon] = useState(PRESET_ICONS[0]);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [target, setTarget] = useState<number | ''>('');
  const [unit, setUnit] = useState('');

  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.categoryId, c]));
  }, [categories]);

  const openCreateModal = () => {
    setEditingTracker(null);
    setName('');
    setCategoryId(categories[0]?.categoryId || '1');
    setType('boolean');
    setFrequency('daily');
    setIcon(PRESET_ICONS[0]);
    setColor(PRESET_COLORS[0]);
    setTarget('');
    setUnit('');
    setFormOpen(true);
  };

  const openEditModal = (t: Tracker) => {
    setEditingTracker(t);
    setName(t.name);
    setCategoryId(t.categoryId);
    setType(t.type);
    setFrequency(t.frequency);
    setIcon(t.icon);
    setColor(t.color);
    setTarget(t.target !== null && t.target !== undefined ? t.target : '');
    setUnit(t.unit || '');
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      categoryId,
      type,
      frequency,
      icon,
      color,
      target: target === '' ? null : Number(target),
      unit: unit || null
    };

    if (editingTracker) {
      updateTrackerMut.mutate({ trackerId: editingTracker.trackerId, data: payload });
    } else {
      createTrackerMut.mutate(payload);
    }
    setFormOpen(false);
  };

  const handleDelete = (trackerId: string) => {
    if (confirm('Are you sure you want to archive this tracker? Historical logs will not be deleted.')) {
      archiveTrackerMut.mutate(trackerId);
      setFormOpen(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const nextTrackers = [...trackers];
    const [draggedItem] = nextTrackers.splice(draggedIndex, 1);
    nextTrackers.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex === null) return;
    setDraggedIndex(null);
    const orderedIds = trackers.map((t) => t.trackerId);
    reorderTrackersMut.mutate(orderedIds);
  };

  return (
    <div className="space-y-8 animate-pop-in text-zinc-100 font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Trackers</h2>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">Manage and organize your habits & metrics</p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 px-4 py-2 rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          Add Tracker
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div 
              key={n} 
              className="h-36 rounded border border-zinc-800 bg-zinc-900/30 animate-pulse"
            />
          ))}
        </div>
      ) : trackers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-800 bg-zinc-900/10 rounded-lg max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-850 flex items-center justify-center">
            <FolderHeart className="w-6 h-6 text-zinc-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200">No trackers yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
            Create a tracker for your daily runs, books read, or focus sessions to begin logging.
          </p>
          <button
            onClick={openCreateModal}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-750 px-4 py-2 rounded text-xs font-semibold cursor-pointer transition-colors"
          >
            Create Your First Tracker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trackers.map((t, idx) => {
            const cat = categoryMap.get(t.categoryId);
            return (
              <div
                key={t.trackerId}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="brutalist-card p-5 select-none cursor-grab active:cursor-grabbing hover:border-zinc-700 flex flex-col justify-between relative group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded flex items-center justify-center text-xl shrink-0 border border-zinc-800 bg-zinc-900"
                      style={{ borderLeft: `3px solid ${t.color}` }}
                    >
                      {t.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs md:text-sm text-zinc-200 leading-none">{t.name}</h3>
                      <div className="flex items-center gap-1.5 mt-2">
                        {cat && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 uppercase">
                            {cat.icon} {cat.name}
                          </span>
                        )}
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-zinc-450 uppercase">
                          {t.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1 cursor-grab text-zinc-600 hover:text-zinc-400">
                      <Move className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Goal metrics detail */}
                <div className="mt-5 pt-3.5 border-t border-zinc-900 flex items-center justify-between text-[10px] font-semibold text-zinc-500 font-mono">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 stroke-[2]" />
                    <span className="uppercase">{t.frequency}</span>
                  </div>
                  {t.target && (
                    <div className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 stroke-[2]" />
                      <span>
                        TARGET: {t.target} {t.unit || ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingTracker ? 'Edit Tracker' : 'Create Tracker'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Name</label>
            <input
              type="text"
              placeholder="e.g. Drink Water, Gym"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="brutalist-input w-full px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="brutalist-input w-full px-3 py-2 text-xs bg-zinc-900"
              >
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as TrackerFrequency)}
                className="brutalist-input w-full px-3 py-2 text-xs bg-zinc-900"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekday">Weekdays</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TrackerType)}
                className="brutalist-input w-full px-3 py-2 text-xs bg-zinc-900"
              >
                <option value="boolean">Done/Not Done</option>
                <option value="numeric">Number Metric</option>
                <option value="duration">Timer/Duration</option>
              </select>
            </div>

            {type !== 'boolean' && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Daily Target</label>
                  <input
                    type="number"
                    placeholder="e.g. 10, 60"
                    value={target}
                    onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    min="1"
                    className="brutalist-input w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. pages, mins"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    required
                    className="brutalist-input w-full px-3 py-2 text-xs"
                  />
                </div>
              </>
            )}
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Select Icon</label>
            <div className="grid grid-cols-6 gap-1.5 p-2 rounded bg-zinc-900 border border-zinc-800 max-h-32 overflow-y-auto">
              {PRESET_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`h-8 rounded flex items-center justify-center text-sm hover:bg-zinc-800 transition-all border border-transparent ${
                    icon === i ? 'bg-zinc-800 border-zinc-700 text-zinc-100 scale-105' : 'cursor-pointer text-zinc-400'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Select Theme Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-950 hover:scale-105 transition-all cursor-pointer"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-zinc-900">
            <button
              type="submit"
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 flex-1 py-2 rounded text-xs font-semibold cursor-pointer transition-colors"
            >
              {editingTracker ? 'Save Changes' : 'Create Tracker'}
            </button>
            {editingTracker && (
              <button
                type="button"
                onClick={() => handleDelete(editingTracker.trackerId)}
                className="bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900 p-2 rounded cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
