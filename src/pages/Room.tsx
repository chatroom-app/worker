import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { 
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, 
  MessageSquare, Users, Check, Share, X, Copy,
  Pin, PinOff, PictureInPicture, Lock, Settings, Moon, Sun, User, Star
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { SettingsModal } from '../components/SettingsModal';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode') || 'video';
  
  const { displayName, setDisplayName, theme, toggleTheme, videoResolution, setVideoResolution, noiseCancellation, setNoiseCancellation, mirrorVideo, setMirrorVideo } = useAppStore();
  
  const {
    isJoined,
    joinCall,
    localStream,
    peers,
    isMuted,
    isVideoOff,
    isScreenSharing,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    messages,
    sendMessage,
    error,
    permissionDenied,
    myPeerId
  } = useWebRTC(roomId!, initialMode === 'video', videoResolution, noiseCancellation);

  const [activeTab, setActiveTab] = useState<'chat' | 'people' | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const idleTimeout = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimeout.current) clearTimeout(idleTimeout.current);
    idleTimeout.current = setTimeout(() => setIsIdle(true), 3500);
  }, []);

  useEffect(() => {
    if (!isJoined) return;
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    resetIdleTimer();
    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
    };
  }, [isJoined, resetIdleTimer]);

  useEffect(() => {
    if (!isJoined) return;
    const timer = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isJoined]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    navigate('/');
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handlePiP = async () => {
    try {
      const video = document.querySelector('video');
      if (video && document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await video.requestPictureInPicture();
        }
      }
    } catch (err) {
      console.error('PiP failed', err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-neutral-50 dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full shadow-sm text-center">
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900 dark:text-white">
            {permissionDenied ? 'Permission Denied' : 'Connection Error'}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-black dark:bg-white text-white dark:text-black font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          
          {/* Video Preview */}
          <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full">
            <VideoPlayer stream={localStream} isLocal={true} isVideoOff={isVideoOff} name={displayName} mirrorVideo={mirrorVideo} />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10">
              <button 
                onClick={toggleMute} 
                className={clsx("p-3.5 rounded-xl transition-all active:scale-95", isMuted ? "bg-neutral-800 text-white" : "bg-white/20 text-white hover:bg-white/30")}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button 
                onClick={toggleVideo} 
                className={clsx("p-3.5 rounded-xl transition-all active:scale-95", isVideoOff ? "bg-neutral-800 text-white" : "bg-white/20 text-white hover:bg-white/30")}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Join Form */}
          <div className="flex flex-col gap-8 p-4 md:p-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">Ready to join?</h1>
              <p className="text-neutral-500 dark:text-neutral-400">Setup your audio and video before entering.</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 ml-1">Display Name</label>
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-5 py-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all text-neutral-900 dark:text-white text-lg"
                placeholder="Enter your name"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { if(displayName.trim()) joinCall(displayName.trim()) }}
                disabled={!displayName.trim()}
                className="flex-1 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-semibold text-lg hover:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                Join Meeting
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-900 dark:text-white"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Modal (Pre-join) */}
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

  const allParticipants = [
    { 
      id: myPeerId, 
      name: displayName, 
      stream: localStream, 
      isLocal: true, 
      isScreenSharing,
      audioEnabled: !isMuted,
      videoEnabled: !isVideoOff
    },
    ...peers.map(p => ({ 
      id: p.id, 
      name: p.name, 
      stream: p.stream, 
      isLocal: false, 
      isScreenSharing: false,
      audioEnabled: p.audioEnabled,
      videoEnabled: p.videoEnabled
    }))
  ];

  const pinnedParticipant = pinnedId 
    ? allParticipants.find(p => p.id === pinnedId) || allParticipants[0]
    : allParticipants[0];

  const gridParticipants = pinnedId 
    ? allParticipants.filter(p => p.id !== pinnedParticipant.id)
    : allParticipants;

  return (
    <div className="h-[100dvh] w-full bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-white flex flex-col overflow-hidden font-sans transition-colors duration-300 relative">
      
      {/* Top Left Info (Time + Lock) */}
      <div className={clsx(
        "absolute top-4 md:top-6 left-4 md:left-6 z-40 transition-opacity duration-500",
        isIdle && !activeTab && !isSettingsOpen ? "opacity-0" : "opacity-100",
        activeTab ? "hidden md:block" : "block"
      )}>
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm border border-neutral-200/50 dark:border-neutral-800/50">
          <Lock className="w-4 h-4 text-green-500" />
          <span className="font-semibold tabular-nums text-sm">{formatTime(meetingDuration)}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden p-2 md:p-4 gap-4 relative">
        
        {/* Video Area (Relative container for centering toolbar) */}
        <div className={clsx(
          "flex-1 flex flex-col relative transition-all duration-300",
          activeTab ? "hidden lg:flex" : "flex"
        )}>
          
          {/* Video Grid */}
          <div className="flex-1 flex flex-col gap-4">
            {pinnedId ? (
              // Pinned View
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="flex-1 bg-black rounded-3xl overflow-hidden relative shadow-sm border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                  <VideoPlayer stream={pinnedParticipant.stream} isLocal={pinnedParticipant.isLocal} isScreenSharing={pinnedParticipant.isScreenSharing} isVideoOff={!pinnedParticipant.videoEnabled} name={pinnedParticipant.name} objectFit="contain" mirrorVideo={mirrorVideo} />
                  
                  {pinnedParticipant.videoEnabled && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-sm font-medium text-white border border-white/10 flex items-center gap-2">
                        {pinnedParticipant.name}
                        {pinnedParticipant.isLocal && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                      </div>
                      {!pinnedParticipant.audioEnabled && (
                        <div className="bg-neutral-800/80 backdrop-blur-md p-1.5 rounded-xl text-white border border-white/10">
                          <MicOff className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button 
                      onClick={handlePiP}
                      className="bg-black/60 backdrop-blur-md p-2.5 rounded-xl text-white hover:bg-black/80 transition-colors border border-white/10"
                      title="Picture in Picture"
                    >
                      <PictureInPicture className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setPinnedId(null)}
                      className="bg-blue-600/90 backdrop-blur-md p-2.5 rounded-xl text-white hover:bg-blue-600 transition-colors border border-white/10"
                      title="Unpin"
                    >
                      <PinOff className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Thumbnail strip */}
                {gridParticipants.length > 0 && (
                  <div className="h-32 md:h-40 flex gap-2 md:gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
                    {gridParticipants.map(p => (
                      <div 
                        key={p.id} 
                        className="h-full aspect-video bg-black rounded-2xl overflow-hidden relative flex-shrink-0 cursor-pointer snap-center border-2 border-transparent hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                        onClick={() => setPinnedId(p.id)}
                      >
                        <VideoPlayer stream={p.stream} isLocal={p.isLocal} isScreenSharing={p.isScreenSharing} isVideoOff={!p.videoEnabled} name={p.name} mirrorVideo={mirrorVideo} />
                        {p.videoEnabled && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                            <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-medium text-white border border-white/10 max-w-[100px] truncate flex items-center gap-1.5">
                              {p.name}
                              {p.isLocal && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                            </div>
                            {!p.audioEnabled && (
                              <div className="bg-neutral-800/80 backdrop-blur-md p-1 rounded-lg text-white border border-white/10">
                                <MicOff className="w-3 h-3 text-neutral-400" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Grid View
              <div className={clsx(
                "flex-1 grid gap-2 md:gap-4 place-content-center",
                gridParticipants.length === 1 ? "grid-cols-1" :
                gridParticipants.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                gridParticipants.length <= 4 ? "grid-cols-2" :
                gridParticipants.length <= 6 ? "grid-cols-2 md:grid-cols-3" :
                "grid-cols-3 md:grid-cols-4"
              )}>
                {gridParticipants.map(p => (
                  <div 
                    key={p.id} 
                    className="bg-black rounded-3xl overflow-hidden relative shadow-sm border border-neutral-200 dark:border-neutral-800 group aspect-video max-h-full w-full"
                  >
                    <VideoPlayer stream={p.stream} isLocal={p.isLocal} isScreenSharing={p.isScreenSharing} isVideoOff={!p.videoEnabled} name={p.name} mirrorVideo={mirrorVideo} />
                    
                    {p.videoEnabled && (
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-sm font-medium text-white border border-white/10 max-w-[150px] truncate flex items-center gap-2">
                          {p.name}
                          {p.isLocal && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                        </div>
                        {!p.audioEnabled && (
                          <div className="bg-neutral-800/80 backdrop-blur-md p-1.5 rounded-xl text-white border border-white/10">
                            <MicOff className="w-4 h-4 text-neutral-400" />
                          </div>
                        )}
                      </div>
                    )}

                    <button 
                      onClick={() => setPinnedId(p.id)}
                      className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-2.5 rounded-xl text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all border border-white/10"
                      title="Pin to screen"
                    >
                      <Pin className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Bottom Toolbar (Centered relative to Video Area) */}
          <div 
            className={clsx(
              "absolute bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-in-out w-[95%] sm:w-auto",
              isIdle && !activeTab && !isSettingsOpen ? "opacity-0 translate-y-8 pointer-events-none" : "opacity-100 translate-y-0 pointer-events-auto"
            )}
            onMouseEnter={() => { if (idleTimeout.current) clearTimeout(idleTimeout.current); setIsIdle(false); }}
            onMouseLeave={resetIdleTimer}
          >
            <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-2xl rounded-3xl px-3 sm:px-4 py-3 flex items-center justify-between sm:justify-center gap-1.5 sm:gap-4 w-full overflow-x-auto no-scrollbar">
              
              <button 
                onClick={toggleMute}
                className={clsx(
                  "p-3 sm:p-4 rounded-2xl transition-all active:scale-95 flex-shrink-0",
                  isMuted 
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black" 
                    : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white"
                )}
                title={isMuted ? "Turn on microphone" : "Turn off microphone"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={toggleVideo}
                className={clsx(
                  "p-3 sm:p-4 rounded-2xl transition-all active:scale-95 flex-shrink-0",
                  isVideoOff 
                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black" 
                    : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white"
                )}
                title={isVideoOff ? "Turn on camera" : "Turn off camera"}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={toggleScreenShare}
                className={clsx(
                  "p-3 sm:p-4 rounded-2xl transition-all active:scale-95 hidden sm:block flex-shrink-0",
                  isScreenSharing 
                    ? "bg-black dark:bg-white text-white dark:text-black" 
                    : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
                title="Present now"
              >
                <MonitorUp className="w-5 h-5" />
              </button>
              
              <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block flex-shrink-0"></div>

              <button 
                onClick={() => setActiveTab(activeTab === 'people' ? null : 'people')}
                className={clsx(
                  "p-3 sm:p-4 rounded-2xl transition-all relative active:scale-95 flex-shrink-0",
                  activeTab === 'people' 
                    ? "bg-black dark:bg-white text-white dark:text-black" 
                    : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
                title="Participants"
              >
                <Users className="w-5 h-5" />
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-neutral-900">
                  {allParticipants.length}
                </span>
              </button>
              
              <button 
                onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
                className={clsx(
                  "p-3 sm:p-4 rounded-2xl transition-all relative active:scale-95 flex-shrink-0",
                  activeTab === 'chat' 
                    ? "bg-black dark:bg-white text-white dark:text-black" 
                    : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
                title="Chat"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 sm:p-4 rounded-2xl transition-all active:scale-95 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 hidden sm:block flex-shrink-0"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-800 mx-1 flex-shrink-0"></div>

              <button 
                onClick={handleLeave}
                className="p-3 sm:p-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all active:scale-95 px-5 sm:px-8 flex-shrink-0"
                title="Leave call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>

        {/* Sidebar (Chat / People) */}
        <AnimatePresence>
          {activeTab && (
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-2 right-2 left-2 lg:relative lg:inset-auto lg:w-[450px] bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col z-50 overflow-hidden flex-shrink-0"
            >
              <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {activeTab === 'chat' ? 'In-call messages' : 'Participants'}
                </h2>
                <button 
                  onClick={() => setActiveTab(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                  {activeTab === 'chat' ? (
                    <motion.div 
                      key="chat"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex flex-col"
                    >
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
                        {messages.length === 0 ? (
                          <div className="text-center text-neutral-400 dark:text-neutral-500 mt-10">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">Messages are ephemeral and disappear when the call ends.</p>
                          </div>
                        ) : (
                          messages.map((msg) => (
                            <div key={msg.id} className={clsx(
                              "flex flex-col gap-1 max-w-[85%]",
                              msg.senderId === myPeerId ? "self-end items-end" : "self-start items-start"
                            )}>
                              <div className="flex items-baseline gap-2 px-1">
                                <span className="font-medium text-xs text-neutral-500 dark:text-neutral-400">{msg.senderName}</span>
                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className={clsx(
                                "text-sm p-3.5 rounded-2xl break-words",
                                msg.senderId === myPeerId 
                                  ? "bg-black dark:bg-white text-white dark:text-black rounded-tr-sm" 
                                  : "bg-neutral-100 dark:bg-neutral-800 rounded-tl-sm"
                              )}>
                                {msg.text}
                              </p>
                            </div>
                          ))
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <form onSubmit={handleChatSubmit} className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Message..."
                            className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 focus:border-black dark:focus:border-white rounded-xl px-4 py-3 text-sm transition-all outline-none"
                          />
                          <button 
                            type="submit"
                            disabled={!chatInput.trim()}
                            className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-xl disabled:opacity-50 transition-colors active:scale-95"
                          >
                            <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="people"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 overflow-y-auto p-4 no-scrollbar"
                    >
                      <div className="flex items-center gap-2 mb-6">
                        <button 
                          onClick={handleCopyLink}
                          className="flex-1 flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium p-3.5 rounded-xl transition-colors active:scale-[0.98]"
                        >
                          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                        <button 
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: 'Join Meeting',
                                url: window.location.href
                              }).catch(console.error);
                            } else {
                              handleCopyLink();
                            }
                          }}
                          className="p-3.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl transition-colors active:scale-[0.98]"
                          title="Share"
                        >
                          <Share className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="text-xs font-bold tracking-wider text-neutral-500 dark:text-neutral-400 mb-4 uppercase">
                        In Call ({allParticipants.length})
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {allParticipants.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-semibold text-neutral-700 dark:text-neutral-300">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium truncate max-w-[140px] flex items-center gap-1.5">
                                {p.name}
                                {p.isLocal && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-neutral-400">
                              {!p.audioEnabled ? <MicOff className="w-4 h-4 text-neutral-500" /> : <Mic className="w-4 h-4" />}
                              {!p.videoEnabled && <VideoOff className="w-4 h-4 text-neutral-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Modal (In-call) */}
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

function VideoPlayer({ stream, isLocal, isScreenSharing, isVideoOff, name, objectFit = "cover", mirrorVideo = true }: { stream?: MediaStream, isLocal: boolean, isScreenSharing?: boolean, isVideoOff?: boolean, name: string, objectFit?: "cover" | "contain", mirrorVideo?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream || stream.getVideoTracks().length === 0 || isVideoOff) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 gap-4">
        <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
          <span className="text-4xl text-neutral-400 font-semibold">{name.charAt(0).toUpperCase()}</span>
        </div>
        <span className="text-white font-medium text-lg">{name}</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className={clsx(
        "w-full h-full",
        objectFit === "contain" ? "object-contain" : "object-cover",
        isLocal && !isScreenSharing && mirrorVideo && "scale-x-[-1]" // Mirror local video, but not screen share
      )}
    />
  );
}
