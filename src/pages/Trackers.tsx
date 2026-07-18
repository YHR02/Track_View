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
  '#87CEEB', // Pastel Blue
  '#90EE90', // Pastel Green
  '#FFDB58', // Pastel Yellow
  '#FFA07A', // Pastel Orange
  '#FF6B6B', // Pastel Red
  '#FFB2EF', // Pastel Pink
  '#A388EE', // Pastel Purple
  '#E3DFF2', // Soft Lavender
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
    <div className="space-y-8 animate-pop-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-black tracking-tight text-black">Trackers</h2>
          <p className="text-sm opacity-65 font-bold">Manage and organize your habits & metrics</p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="neo-btn bg-[#A388EE] border-3 border-black text-black px-5 py-3 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[4px] active:shadow-[1px_1px_0px_#000000] text-sm font-black cursor-pointer gap-2"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Add Tracker
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div 
              key={n} 
              className="h-44 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] animate-pulse"
            />
          ))}
        </div>
      ) : trackers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-[14px] border-3 border-black bg-[#FFB2EF] flex items-center justify-center shadow-[3px_3px_0px_#000000] mb-4">
            <FolderHeart className="w-8 h-8 text-black stroke-[2.5]" />
          </div>
          <h3 className="text-xl font-display font-black text-black">No trackers yet</h3>
          <p className="text-sm font-semibold opacity-60 max-w-sm mt-1 mb-6">Create a tracker for your daily runs, books read, or focus sessions to begin logging.</p>
          <button
            onClick={openCreateModal}
            className="neo-btn bg-[#FFDB58] border-3 border-black text-black px-5 py-2.5 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[4px] active:shadow-[1px_1px_0px_#000000] text-sm font-black cursor-pointer"
          >
            Create Your First Tracker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trackers.map((t, idx) => {
            const cat = categoryMap.get(t.categoryId);
            return (
              <div
                key={t.trackerId}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="neo-card hover:translate-y-[-3px] hover:shadow-[9px_9px_0px_#000000] p-5 select-none cursor-grab active:cursor-grabbing bg-white flex flex-col justify-between relative group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border-3 border-black shadow-[2px_2px_0px_#000000]"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.icon}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-base md:text-lg tracking-tight leading-tight text-black">{t.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        {cat && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg border-2 border-black uppercase tracking-wider bg-slate-100">
                            {cat.icon} {cat.name}
                          </span>
                        )}
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg border-2 border-black uppercase tracking-wider bg-[#E3DFF2]">
                          {t.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-slate-50 shadow-[2px_2px_0px_#000000] active:translate-y-[2px] active:shadow-none cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 stroke-[2.5] text-black" />
                    </button>
                    <div className="p-1.5 cursor-grab opacity-40 hover:opacity-75">
                      <Move className="w-4 h-4 text-black stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Goal metrics detail */}
                <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 flex items-center justify-between text-xs font-black opacity-75">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-black stroke-[2.5]" />
                    <span className="capitalize">{t.frequency}</span>
                  </div>
                  {t.target && (
                    <div className="flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-black stroke-[2.5]" />
                      <span>
                        Target: {t.target} {t.unit || ''}
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase opacity-75 mb-1.5">Name</label>
            <input
              type="text"
              placeholder="e.g. Drink Water, Gym"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="neo-input w-full px-4 py-3 text-sm bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase opacity-75 mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="neo-input w-full px-4 py-3 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase opacity-75 mb-1.5">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as TrackerFrequency)}
                className="neo-input w-full px-4 py-3 text-sm bg-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekday">Weekdays</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase opacity-75 mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TrackerType)}
                className="neo-input w-full px-4 py-3 text-sm bg-white"
              >
                <option value="boolean">Done/Not Done</option>
                <option value="numeric">Number Metric</option>
                <option value="duration">Timer/Duration</option>
              </select>
            </div>

            {type !== 'boolean' && (
              <>
                <div>
                  <label className="block text-xs font-black uppercase opacity-75 mb-1.5">Daily Target</label>
                  <input
                    type="number"
                    placeholder="e.g. 10, 60"
                    value={target}
                    onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    min="1"
                    className="neo-input w-full px-4 py-3 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase opacity-75 mb-1.5">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. pages, mins"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    required
                    className="neo-input w-full px-4 py-3 text-sm bg-white"
                  />
                </div>
              </>
            )}
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-black uppercase opacity-75 mb-2">Select Icon</label>
            <div className="grid grid-cols-6 gap-2 p-3 rounded-xl border-3 border-black bg-slate-50 max-h-36 overflow-y-auto">
              {PRESET_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`h-10 rounded-lg flex items-center justify-center text-lg hover:bg-slate-100 transition-all border-2 border-transparent ${
                    icon === i ? 'bg-[#FFB2EF] border-black shadow-[2px_2px_0px_#000000] scale-105' : 'cursor-pointer'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-black uppercase opacity-75 mb-2">Select Theme Color</label>
            <div className="flex flex-wrap items-center gap-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-black shadow-[1px_1px_0px_#000000] hover:scale-105 transition-all cursor-pointer"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t-3 border-black">
            <button
              type="submit"
              className="neo-btn bg-[#90EE90] border-3 border-black text-black flex-1 py-3.5 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[4px] active:shadow-[1px_1px_0px_#000000] text-sm font-black cursor-pointer"
            >
              {editingTracker ? 'Save Changes' : 'Create Tracker'}
            </button>
            {editingTracker && (
              <button
                type="button"
                onClick={() => handleDelete(editingTracker.trackerId)}
                className="neo-btn bg-[#FF6B6B] border-3 border-black text-black p-3.5 shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[4px] active:shadow-[1px_1px_0px_#000000] cursor-pointer"
              >
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
