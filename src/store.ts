import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  theme: 'light' | 'dark';
  displayName: string;
  videoResolution: 'default' | '720p' | '1080p';
  noiseCancellation: boolean;
  mirrorVideo: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setDisplayName: (name: string) => void;
  setVideoResolution: (res: 'default' | '720p' | '1080p') => void;
  setNoiseCancellation: (enabled: boolean) => void;
  setMirrorVideo: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      displayName: '',
      videoResolution: 'default',
      noiseCancellation: true,
      mirrorVideo: true,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
      setDisplayName: (name) => set({ displayName: name }),
      setVideoResolution: (res) => set({ videoResolution: res }),
      setNoiseCancellation: (enabled) => set({ noiseCancellation: enabled }),
      setMirrorVideo: (enabled) => set({ mirrorVideo: enabled }),
    }),
    { name: 'chatroom-settings' }
  )
);
