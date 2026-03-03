import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  videoResolution: string;
  setVideoResolution: (res: any) => void;
  noiseCancellation: boolean;
  setNoiseCancellation: (enabled: boolean) => void;
  mirrorVideo: boolean;
  setMirrorVideo: (enabled: boolean) => void;
}

export function SettingsModal({ 
  isOpen, onClose, displayName, setDisplayName, theme, toggleTheme, 
  videoResolution, setVideoResolution, noiseCancellation, setNoiseCancellation,
  mirrorVideo, setMirrorVideo
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-neutral-900 p-8 rounded-[2rem] w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto no-scrollbar"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
              <X className="w-6 h-6"/>
            </button>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Display Name</label>
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-5 py-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-lg text-neutral-900 dark:text-white"
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Video & Audio</label>
              
              <div className="space-y-4">
                <select 
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value)}
                  className="w-full px-5 py-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-lg appearance-none text-neutral-900 dark:text-white"
                >
                  <option value="default">Default Resolution (Auto)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                </select>

                <label className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-2xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <span className="font-medium text-neutral-900 dark:text-white">Mirror local video</span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={mirrorVideo} onChange={(e) => setMirrorVideo(e.target.checked)} />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-2xl cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <span className="font-medium text-neutral-900 dark:text-white">Noise suppression</span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={noiseCancellation} onChange={(e) => setNoiseCancellation(e.target.checked)} />
                    <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Appearance</label>
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-2xl">
                <span className="font-medium text-neutral-900 dark:text-white">Theme</span>
                <button 
                  onClick={toggleTheme} 
                  className="p-3 bg-white dark:bg-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shadow-sm text-neutral-900 dark:text-white"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
