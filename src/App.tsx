/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Droplets, 
  Thermometer, 
  Camera, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  AlertTriangle,
  Info,
  Leaf,
  LogOut,
  X,
  Loader2,
  CloudRain,
  FlaskConical,
  Sun,
  Wind,
  Sprout,
  Calendar,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import { firebaseService } from './services/firebaseService';
import { useRootingTimer } from './hooks/useRootingTimer';
import { Plant, PlantStatus } from './types/schema';
import { ErrorBoundary } from './components/ErrorBoundary';

// Capacitor Plugins
import { Camera as CapCamera, CameraResultType } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import { GoogleGenAI, Type } from '@google/genai';

const SALVIA_IMAGE = "https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop";

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const selectedPlant = plants.find(p => p.id === selectedPlantId) || null;
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlantName, setNewPlantName] = useState('');
  const [isAddingPlant, setIsAddingPlant] = useState(false);
  const isAddingRef = useRef(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      firebaseService.testConnection();
      const unsubscribe = firebaseService.subscribeToPlants(setPlants);
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log('Login cancelled by user');
      } else {
        console.error('Login failed:', error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleAddPlant = async () => {
    if (!newPlantName.trim() || isAddingRef.current) return;
    isAddingRef.current = true;
    setIsAddingPlant(true);
    try {
      await firebaseService.addPlant(newPlantName, 'Vegetative');
      setNewPlantName('');
      setShowAddModal(false);
    } finally {
      setIsAddingPlant(false);
    }
  };

  const handleAction = async (plantId: string, action: 'water' | 'mist' | 'fertilize') => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;

    const updates: Partial<Plant> = {};
    const now = new Date();
    let title = '';
    let body = '';

    if (action === 'water') {
      updates.lastWatered = now;
      title = "Watering Logged";
      body = "Your hydration event has been recorded.";

      if (plant.lastWatered) {
        const diffTime = now.getTime() - plant.lastWatered.getTime();
        const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
        
        if (plant.wateringIntervalDays) {
          // Simple moving average to learn habits
          updates.wateringIntervalDays = Math.round((plant.wateringIntervalDays + diffDays) / 2);
        } else {
          updates.wateringIntervalDays = diffDays;
        }
      }
    } else if (action === 'mist') {
      updates.lastMisted = now;
      title = "Misting Logged";
      body = "Your humidity event has been recorded.";
    } else if (action === 'fertilize') {
      updates.lastFertilized = now;
      title = "Fertilizing Logged";
      body = "Your nutrient event has been recorded.";
    }

    await firebaseService.updatePlant(plantId, updates);
    
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Math.floor(Math.random() * 10000),
        }]
      });
    } catch (e) {
      console.log('Notifications not available');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-emerald-500"
        >
          <Leaf size={40} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="space-y-2">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto mb-6"
          >
            <Leaf size={48} />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tighter italic font-serif text-white">MAZATEC COMPANION</h1>
          <p className="text-zinc-500 max-w-xs mx-auto">The ultimate production-grade companion for Salvia divinorum cultivation.</p>
        </div>
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full max-w-xs py-4 bg-white text-black rounded-2xl font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:scale-100"
        >
          {isLoggingIn ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google" />
          )}
          {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      <AnimatePresence mode="wait">
        {selectedPlant ? (
          <PlantDetail 
            key="detail"
            plant={selectedPlant} 
            onBack={() => setSelectedPlantId(null)} 
            onAction={(action) => handleAction(selectedPlant.id, action)} 
          />
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-24"
          >
            {/* Header */}
            <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold tracking-tighter italic font-serif text-white">
                    MAZATEC COMPANION
                  </h1>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                    Salvia Divinorum Care
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      isAddingRef.current = false;
                      setNewPlantName('');
                      setShowAddModal(true);
                    }}
                    className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-500 hover:bg-zinc-800 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </header>

            <main className="p-6 max-w-md mx-auto">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-xl font-bold text-white">My Collection</h2>
                        <p className="text-sm text-zinc-500">{plants.length} {plants.length === 1 ? 'Specimen' : 'Specimens'}</p>
                      </div>
                    </div>

                    {plants.length === 0 ? (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600 mx-auto">
                          <Leaf size={32} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold">No plants yet</h3>
                          <p className="text-xs text-zinc-500">Start your first cultivation cycle.</p>
                        </div>
                        <button 
                          onClick={() => {
                            isAddingRef.current = false;
                            setNewPlantName('');
                            setShowAddModal(true);
                          }}
                          className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase"
                        >
                          Add Plant
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {plants.map(plant => (
                          <PlantCard 
                            key={plant.id} 
                            plant={plant} 
                            onClick={() => setSelectedPlantId(plant.id)}
                            onWater={() => handleAction(plant.id, 'water')} 
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'diagnose' && (
                  <DiagnosticView />
                )}

                {activeTab === 'guide' && (
                  <GuideView />
                )}
              </AnimatePresence>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-800 px-6 py-4">
              <div className="max-w-md mx-auto flex justify-around items-center">
                <NavButton active={activeTab === 'dashboard'} icon={<Leaf size={20} />} label="My Plants" onClick={() => setActiveTab('dashboard')} />
                <NavButton active={activeTab === 'diagnose'} icon={<Camera size={20} />} label="Diagnose" onClick={() => setActiveTab('diagnose')} />
                <NavButton active={activeTab === 'guide'} icon={<Info size={20} />} label="Care Guide" onClick={() => setActiveTab('guide')} />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-xs space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">New Specimen</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-500"><X size={20} /></button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase">Nickname</label>
                <input 
                  autoFocus
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlant()}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. Mazateca Queen"
                />
              </div>
              <button 
                onClick={handleAddPlant}
                disabled={isAddingPlant || !newPlantName.trim()}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAddingPlant ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Adding...
                  </>
                ) : (
                  'Add to Collection'
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlantCard({ plant, onClick, onWater }: { plant: Plant, onClick: () => void, onWater: (e: React.MouseEvent) => void }) {
  const getDaysAgo = (date?: Date) => {
    if (!date) return 'Never';
    const diff = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    return diff === 0 ? 'Today' : `${diff}d ago`;
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl cursor-pointer flex flex-col"
    >
      <div className="h-32 bg-zinc-800 relative overflow-hidden">
        <img 
          src={plant.imageUrl || SALVIA_IMAGE} 
          alt={plant.nickname} 
          className="w-full h-full object-cover opacity-80"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono uppercase font-bold text-emerald-400">
          {plant.status}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-white truncate">{plant.nickname}</h3>
          <p className="text-xs text-zinc-500 italic">Salvia divinorum</p>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1 text-zinc-400 text-xs">
            <Droplets size={12} className="text-blue-400" />
            <span>{getDaysAgo(plant.lastWatered)}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onWater(e); }}
            className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <Droplets size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PlantDetail({ plant, onBack, onAction }: { plant: Plant, onBack: () => void, onAction: (action: 'water' | 'mist' | 'fertilize') => void }) {
  const { daysElapsed, phase, progress } = useRootingTimer(plant.rootingStartedAt);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await firebaseService.deletePlant(plant.id);
      onBack();
    } finally {
      setIsDeleting(false);
    }
  };

  const getDaysUntil = (lastDate: Date | undefined, intervalDays: number) => {
    if (!lastDate) return 'Due Now';
    const nextDate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    const diff = Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (diff <= 0) return 'Due Now';
    return `In ${diff} ${diff === 1 ? 'day' : 'days'}`;
  };

  const handleUpdatePhoto = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64
      });
      
      if (image.base64String) {
        const imageUrl = `data:image/jpeg;base64,${image.base64String}`;
        await firebaseService.updatePlant(plant.id, { imageUrl });
      }
    } catch (error) {
      console.error('Failed to update photo:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="min-h-screen bg-zinc-950 pb-24"
    >
      <div className="relative h-72 bg-zinc-900 group">
        <img 
          src={plant.imageUrl || SALVIA_IMAGE} 
          alt={plant.nickname} 
          className="w-full h-full object-cover opacity-60"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
        
        <button 
          onClick={handleUpdatePhoto}
          className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/70 transition-colors z-10 shadow-lg border border-white/10"
        >
          <Camera size={20} />
        </button>

        <button 
          onClick={onBack}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <button 
          onClick={() => setShowDeleteModal(true)}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-red-500 hover:bg-black/60 transition-colors"
        >
          <Trash2 size={20} />
        </button>
        
        <div className="absolute bottom-6 left-6 right-6">
          <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase font-bold border border-emerald-500/20">
            {plant.status}
          </span>
          <h1 className="text-3xl font-bold text-white mt-2">{plant.nickname}</h1>
          <p className="text-sm text-zinc-400 italic">Salvia divinorum</p>
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-8">
        {plant.status === 'Rooting' && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
            <div className="flex justify-between items-end mb-2">
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Rooting Cycle</p>
                <p className="text-lg font-bold">Day {daysElapsed} <span className="text-zinc-500 font-normal text-sm">/ 28</span></p>
              </div>
              <p className="text-[10px] text-emerald-500 font-bold uppercase">{phase}</p>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
              />
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">Care Schedule</h2>
          <div className="grid gap-3">
            <ScheduleCard 
              icon={<Droplets size={20} />} 
              color="blue" 
              title="Watering" 
              subtitle={`Every ${plant.wateringIntervalDays || 3} days`} 
              status={getDaysUntil(plant.lastWatered, plant.wateringIntervalDays || 3)} 
              onClick={() => onAction('water')} 
            />
            <ScheduleCard 
              icon={<CloudRain size={20} />} 
              color="cyan" 
              title="Misting" 
              subtitle="Daily" 
              status={getDaysUntil(plant.lastMisted, 1)} 
              onClick={() => onAction('mist')} 
            />
            <ScheduleCard 
              icon={<FlaskConical size={20} />} 
              color="purple" 
              title="Fertilizer" 
              subtitle="Every 14 days" 
              status={getDaysUntil(plant.lastFertilized, 14)} 
              onClick={() => onAction('fertilize')} 
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white">Requirements</h2>
          <div className="grid grid-cols-2 gap-3">
            <RequirementCard icon={<Sun size={18} />} title="Sunlight" value="Indirect / Shade" />
            <RequirementCard icon={<Droplets size={18} />} title="Water" value="Keep Moist" />
            <RequirementCard icon={<Thermometer size={18} />} title="Temperature" value="15°C - 27°C" />
            <RequirementCard icon={<Wind size={18} />} title="Humidity" value="> 70% RH" />
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Delete Plant</h2>
                  <p className="text-sm text-zinc-400">This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ScheduleCard({ icon, color, title, subtitle, status, onClick }: any) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
  }[color as string] || 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700';

  const isDue = status === 'Due Now';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className={`text-xs font-bold ${isDue ? 'text-red-400' : 'text-zinc-400'}`}>
          {status}
        </span>
        <button 
          onClick={onClick}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${isDue ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
        >
          Log
        </button>
      </div>
    </div>
  );
}

function RequirementCard({ icon, title, value }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
      <div className="text-emerald-500">{icon}</div>
      <div>
        <p className="text-[10px] text-zinc-500 uppercase font-mono">{title}</p>
        <p className="text-sm font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-emerald-500' : 'text-zinc-500'}`}
    >
      {icon}
      <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function DiagnosticView() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<{ s: string, c: string, r: string } | null>(null);

  const handleCapture = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64
      });
      
      if (image.base64String) {
        setCapturedImage(`data:image/jpeg;base64,${image.base64String}`);
        setIsAnalyzing(true);
        setDiagnosis(null);
        
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: `image/${image.format || 'jpeg'}`,
                    data: image.base64String
                  }
                },
                {
                  text: "You are an expert botanist specializing in Salvia divinorum. Analyze this image of a plant leaf/stem. Identify the symptom, the likely cause, and provide a recommendation. Return the response in JSON format with exactly three keys: 's' for Symptom, 'c' for Cause, and 'r' for Recommendation."
                }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  s: { type: Type.STRING, description: "The symptom observed" },
                  c: { type: Type.STRING, description: "The likely cause" },
                  r: { type: Type.STRING, description: "The recommended action" }
                },
                required: ["s", "c", "r"]
              }
            }
          });
          
          if (response.text) {
            const result = JSON.parse(response.text);
            setDiagnosis(result);
          }
        } catch (aiError) {
          console.error("AI Analysis failed:", aiError);
          setDiagnosis({
            s: "Analysis Failed",
            c: "API Error",
            r: "Could not analyze the image. Please try again."
          });
        } finally {
          setIsAnalyzing(false);
        }
      }
    } catch (error) {
      console.error('Camera failed:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Symptom Checker</h2>
        <p className="text-sm text-zinc-500">Diagnose issues with your Salvia divinorum.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-4">
        {capturedImage ? (
          <div className="space-y-4">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-zinc-800">
              <img src={capturedImage} alt="Captured leaf" className="w-full h-full object-cover" />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-emerald-500 mb-4"
                  >
                    <Camera size={32} />
                  </motion.div>
                  <p className="text-emerald-500 font-mono text-xs uppercase tracking-widest animate-pulse">Analyzing...</p>
                </div>
              )}
            </div>
            
            {diagnosis && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-left space-y-2"
              >
                <div className="flex items-center gap-2 text-emerald-500 mb-2">
                  <Info size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Diagnosis Complete</span>
                </div>
                <h3 className="font-bold text-white">{diagnosis.s}</h3>
                <p className="text-sm text-emerald-400 font-mono">{diagnosis.c}</p>
                <p className="text-xs text-zinc-400 leading-relaxed mt-2">{diagnosis.r}</p>
              </motion.div>
            )}

            <button 
              onClick={() => {
                setCapturedImage(null);
                setDiagnosis(null);
              }}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors text-sm"
            >
              Take Another Photo
            </button>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
              <Camera size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Capture Leaf Photo</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Take a clear photo of the affected leaf or stem. Our analyzer will compare it against the Master Diagnostic Guide.
              </p>
            </div>
            <button 
              onClick={handleCapture}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-emerald-900/20"
            >
              Open Camera
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

function GuideView() {
  const guide = [
    { title: '1.1 Native Habitat', content: 'Salvia divinorum is endemic to the Sierra Mazateca cloud forests. It requires high humidity (70%+), stable temperatures (15-27°C), and filtered light.' },
    { title: '1.2 Propagation', content: 'Cuttings should be 2-8 inches with 2-3 nodes. Use rooting powder (Hormex) for better oxygenation. Maintain 100% RH for 2 weeks.' },
    { title: '2.1 Substrate', content: 'Use a well-draining loam: 1 part Peat/Coir, 1 part Organic Matter, 1 part Perlite. Terracotta pots are superior for root aeration.' },
    { title: '2.5 Microbial Engine', content: 'Use a Bacillus consortium (PGPR) for nutrient cycling and Trichoderma harzianum as a proactive biofungicide.' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Care Guide</h2>
        <p className="text-sm text-zinc-500">The complete handbook for Salvia divinorum.</p>
      </div>
      
      <div className="space-y-6">
        {guide.map((section, i) => (
          <div key={i} className="space-y-2">
            <h3 className="text-xs font-mono text-emerald-500 uppercase tracking-widest">{section.title}</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-sm text-zinc-400 leading-relaxed">{section.content}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
