import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface PeerConnection {
  id: string;
  name: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(roomId: string, initialVideo: boolean, resolution: string, noiseCancellation: boolean = true) {
  const [isJoined, setIsJoined] = useState(false);
  const [peers, setPeers] = useState<PeerConnection[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const myPeerId = useRef(uuidv4());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const userNameRef = useRef<string>('Anonymous');

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const sendMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: uuidv4(),
      senderId: myPeerId.current,
      senderName: userNameRef.current,
      text,
      timestamp: Date.now(),
    };
    addMessage(msg);
    const msgStr = JSON.stringify({ type: 'chat', payload: msg });
    dataChannelsRef.current.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(msgStr);
      }
    });
  }, [addMessage]);

  const setupDataChannel = useCallback((dc: RTCDataChannel, targetPeerId: string) => {
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat') {
          addMessage(data.payload);
        }
      } catch (e) {
        console.error('Failed to parse data channel message', e);
      }
    };
    dc.onopen = () => {
      dataChannelsRef.current.set(targetPeerId, dc);
    };
    dc.onclose = () => {
      dataChannelsRef.current.delete(targetPeerId);
    };
  }, [addMessage]);

  const createPeerConnection = useCallback((targetPeerId: string, targetName: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(STUN_SERVERS);
    
    const audioSender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender;
    const videoSender = pc.addTransceiver('video', { direction: 'sendrecv' }).sender;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === 'audio') audioSender.replaceTrack(track);
        if (track.kind === 'video') videoSender.replaceTrack(track);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          target: targetPeerId,
          caller: myPeerId.current,
          candidate: event.candidate,
        }));
      }
    };

    pc.ontrack = (event) => {
      setPeers((prev) => {
        const existing = prev.find((p) => p.id === targetPeerId);
        if (existing) {
          return prev.map((p) => p.id === targetPeerId ? { ...p, stream: event.streams[0] } : p);
        }
        return [...prev, { 
          id: targetPeerId, 
          name: targetName, 
          pc, 
          stream: event.streams[0],
          audioEnabled: true,
          videoEnabled: true
        }];
      });
    };

    if (isInitiator) {
      const dc = pc.createDataChannel('chat');
      setupDataChannel(dc, targetPeerId);
    } else {
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel, targetPeerId);
      };
    }

    const newPeer: PeerConnection = { 
      id: targetPeerId, 
      name: targetName, 
      pc,
      audioEnabled: true,
      videoEnabled: true
    };
    peersRef.current.set(targetPeerId, newPeer);
    setPeers((prev) => {
      const filtered = prev.filter(p => p.id !== targetPeerId);
      return [...filtered, newPeer];
    });

    return pc;
  }, [setupDataChannel]);

  useEffect(() => {
    let mounted = true;

    const initMedia = async () => {
      try {
        const constraints: MediaStreamConstraints = { 
          audio: {
            noiseSuppression: noiseCancellation,
            echoCancellation: true
          } 
        };
        if (initialVideo) {
          constraints.video = resolution === '1080p' ? { width: 1920, height: 1080 } :
                              resolution === '720p' ? { width: 1280, height: 720 } : true;
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        setLocalStream(stream);
        localStreamRef.current = stream;
        setIsVideoOff(!initialVideo);
        setPermissionDenied(false);
      } catch (err) {
        console.error('Error accessing media devices.', err);
        setPermissionDenied(true);
        setError('Could not access camera or microphone. Please allow permissions in your browser.');
      }
    };

    initMedia();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      peersRef.current.forEach(peer => peer.pc.close());
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [initialVideo, resolution, noiseCancellation]);

  const joinCall = useCallback((userName: string) => {
    if (isJoined) return;
    userNameRef.current = userName;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        roomId,
        peerId: myPeerId.current,
        name: userName,
      }));
      setIsJoined(true);

      if (localStreamRef.current) {
        const audioEnabled = localStreamRef.current.getAudioTracks()[0]?.enabled ?? false;
        const videoEnabled = localStreamRef.current.getVideoTracks()[0]?.enabled ?? false;
        ws.send(JSON.stringify({
          type: 'media-state',
          roomId,
          peerId: myPeerId.current,
          audioEnabled,
          videoEnabled
        }));
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'user-joined': {
            const pc = createPeerConnection(data.peerId, data.name, true);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({
              type: 'offer',
              target: data.peerId,
              caller: myPeerId.current,
              name: userName,
              sdp: pc.localDescription,
            }));
            break;
          }
          case 'offer': {
            const pc = createPeerConnection(data.caller, data.name, false);
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({
              type: 'answer',
              target: data.caller,
              caller: myPeerId.current,
              sdp: pc.localDescription,
            }));
            break;
          }
          case 'answer': {
            const peer = peersRef.current.get(data.caller);
            if (peer) {
              await peer.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
            break;
          }
          case 'ice-candidate': {
            const peer = peersRef.current.get(data.caller);
            if (peer) {
              await peer.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;
          }
          case 'user-left': {
            const peerId = data.peerId;
            const peer = peersRef.current.get(peerId);
            if (peer) {
              peer.pc.close();
              peersRef.current.delete(peerId);
              setPeers((prev) => prev.filter((p) => p.id !== peerId));
              dataChannelsRef.current.delete(peerId);
            }
            break;
          }
          case 'media-state': {
            const peerId = data.peerId;
            const peer = peersRef.current.get(peerId);
            if (peer) {
              peer.audioEnabled = data.audioEnabled;
              peer.videoEnabled = data.videoEnabled;
              setPeers((prev) => prev.map(p => p.id === peerId ? { ...p, audioEnabled: data.audioEnabled, videoEnabled: data.videoEnabled } : p));
            }
            break;
          }
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
    };
  }, [roomId, isJoined, createPeerConnection]);

  const broadcastMediaState = useCallback((audioEnabled: boolean, videoEnabled: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'media-state',
        roomId,
        peerId: myPeerId.current,
        audioEnabled,
        videoEnabled
      }));
    }
  }, [roomId]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        broadcastMediaState(audioTrack.enabled, !isVideoOff);
      }
    }
  }, [broadcastMediaState, isVideoOff]);

  const toggleVideo = useCallback(async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        broadcastMediaState(!isMuted, videoTrack.enabled);
      } else {
        try {
          const videoConstraints = resolution === '1080p' ? { width: 1920, height: 1080 } :
                                   resolution === '720p' ? { width: 1280, height: 720 } : true;
          const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
          const newVideoTrack = stream.getVideoTracks()[0];
          
          localStreamRef.current.addTrack(newVideoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          
          peersRef.current.forEach(peer => {
            const sender = peer.pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            }
          });
          setIsVideoOff(false);
          broadcastMediaState(!isMuted, true);
        } catch (err) {
          console.error('Failed to get video', err);
          alert('Could not access camera. Please check your browser permissions.');
        }
      }
    }
  }, [resolution, isMuted, broadcastMediaState]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        peersRef.current.forEach(peer => {
          const sender = peer.pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        screenStreamRef.current = screenStream;
        
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        
        screenVideoTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            peersRef.current.forEach(peer => {
              const sender = peer.pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender && videoTrack) {
                sender.replaceTrack(videoTrack);
              }
            });
          }
        };

        peersRef.current.forEach(peer => {
          const sender = peer.pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenVideoTrack);
          }
        });
        
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Error sharing screen', err);
      }
    }
  }, [isScreenSharing]);

  return {
    isJoined,
    joinCall,
    localStream: isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStream,
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
    myPeerId: myPeerId.current
  };
}
