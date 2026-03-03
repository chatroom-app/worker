import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Keyboard, Moon, Sun, ArrowRight, Mic, Video, Calendar, Copy, Check, X, Share, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { SettingsModal } from '../components/SettingsModal';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduledDetails, setScheduledDetails] = useState<{ id: string, link: string, text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const navigate = useNavigate();
  const { theme, toggleTheme, displayName, setDisplayName, videoResolution, setVideoResolution, noiseCancellation, setNoiseCancellation, mirrorVideo, setMirrorVideo } = useAppStore();

  const handleCreateRoom = (mode: 'voice' | 'video') => {
    const newRoomId = uuidv4().slice(0, 11).replace(/-/g, '');
    navigate(`/room/${newRoomId}?mode=${mode}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    
    let finalRoomId = roomId;
    if (roomId.includes('/room/')) {
      finalRoomId = roomId.split('/room/')[1].split('?')[0];
    }
    
    navigate(`/room/${finalRoomId}`);
  };

  const handleSchedule = () => {
    setScheduledDetails(null);
    setScheduleDate('');
    setScheduleTime('');
    setIsScheduleModalOpen(true);
  };

  const handleGenerateSchedule = () => {
    if (!scheduleDate || !scheduleTime) return;
    const newRoomId = uuidv4().slice(0, 11).replace(/-/g, '');
    const link = `${window.location.origin}/room/${newRoomId}`;
    
    // Format date and time nicely
    const dateObj = new Date(`${scheduleDate}T${scheduleTime}`);
    const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const text = `You have been invited to a meeting.\n\nWhen: ${formattedDate} at ${formattedTime}\nRoom ID: ${newRoomId}\nMeeting Link: ${link}`;
    setScheduledDetails({ id: newRoomId, link, text });
  };

  const handleCopyScheduled = () => {
    if (scheduledDetails) {
      navigator.clipboard.writeText(scheduledDetails.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col transition-colors duration-300">
      <header className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">chatroom</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full space-y-12"
        >
          <div className="space-y-4 text-center">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 dark:text-white">
              Start a conversation.
            </h1>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm max-w-2xl mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <button
                onClick={() => handleCreateRoom('video')}
                className="group relative w-full flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-4 rounded-xl font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.98]"
              >
                <Video className="w-5 h-5" />
                New Video
              </button>
              <button
                onClick={() => handleCreateRoom('voice')}
                className="group relative w-full flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white px-4 py-4 rounded-xl font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all active:scale-[0.98]"
              >
                <Mic className="w-5 h-5" />
                New Voice
              </button>
              <button
                onClick={handleSchedule}
                className="group relative w-full flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white px-4 py-4 rounded-xl font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all active:scale-[0.98]"
              >
                <Calendar className="w-5 h-5" />
                Schedule
              </button>
            </div>
            
            <form onSubmit={handleJoinRoom} className="relative w-full flex">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Keyboard className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                placeholder="Enter room code or link"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full pl-11 pr-12 py-4 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-neutral-900 dark:text-white transition-all"
              />
              <button
                type="submit"
                disabled={!roomId.trim()}
                className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </motion.div>
      </main>

      <footer className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</a>
          <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
          <a href="#" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</a>
        </div>
        <p>Designed by Midhun (dev)</p>
      </footer>

      <AnimatePresence>
        {isScheduleModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsScheduleModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 p-8 rounded-[2rem] w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Schedule Meeting</h2>
                <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                  <X className="w-6 h-6"/>
                </button>
              </div>
              
              {!scheduledDetails ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">Date</label>
                      <input 
                        type="date" 
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-5 py-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">Time</label>
                      <input 
                        type="time" 
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-5 py-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateSchedule}
                    disabled={!scheduleDate || !scheduleTime}
                    className="w-full bg-black dark:bg-white text-white dark:text-black font-semibold py-4 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    Generate Link
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">{scheduledDetails.link}</span>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={handleCopyScheduled}
                      className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black font-semibold py-4 px-4 rounded-xl transition-all active:scale-[0.98]"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {copied ? 'Copied!' : 'Copy Invite'}
                    </button>
                    <button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Join Meeting',
                            text: scheduledDetails.text
                          }).catch(console.error);
                        } else {
                          handleCopyScheduled();
                        }
                      }}
                      className="flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-semibold py-4 px-6 rounded-xl transition-all active:scale-[0.98] hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    >
                      <Share className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        displayName={displayName}
        setDisplayName={setDisplayName}
        theme={theme}
        toggleTheme={toggleTheme}
        videoResolution={videoResolution}
        setVideoResolution={setVideoResolution}
        noiseCancellation={noiseCancellation}
        setNoiseCancellation={setNoiseCancellation}
        mirrorVideo={mirrorVideo}
        setMirrorVideo={setMirrorVideo}
      />
    </div>
  );
}
