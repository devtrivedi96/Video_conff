import { useEffect, useState, useCallback, useRef } from "react";
import { WebRTCManager } from "../lib/webrtc";
import { SignalingService } from "../lib/signaling";
import { db } from "../lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { VideoGrid } from "./VideoGrid";
import { ControlBar } from "./ControlBar";
import { Copy, Check } from "lucide-react";

interface VideoRoomProps {
  roomId: string;
  localUid: string;
  localDisplayName: string;
  onLeave: () => void;
}

export function VideoRoom({
  roomId,
  localUid,
  localDisplayName,
  onLeave,
}: VideoRoomProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Map<string, { stream: MediaStream; userId: string }>
  >(new Map());
  const [copied, setCopied] = useState(false);

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const peerIdRef = useRef<string>(`${localUid}-${Date.now()}`);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeCall() {
      try {
        const webrtc = new WebRTCManager();
        webrtcRef.current = webrtc;

        const stream = await webrtc.getLocalStream();
        if (mounted) {
          setLocalStream(stream);
        }

        webrtc.setOnRemoteStream((peerId, stream) => {
          if (mounted) {
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              newMap.set(peerId, { stream, userId: peerId.split("-")[0] });
              return newMap;
            });
          }
        });

        webrtc.setOnPeerDisconnected((peerId) => {
          if (mounted) {
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              newMap.delete(peerId);
              return newMap;
            });
          }
        });

        // Register participant in Firestore under rooms/{roomId}/participants/{peerId}
        await setDoc(
          doc(db, "rooms", roomId, "participants", peerIdRef.current),
          {
            uid: localUid,
            displayName: localDisplayName,
            joined_at: serverTimestamp(),
            audio: audioEnabled,
            video: videoEnabled,
            screen: false,
          }
        );

        const signaling = new SignalingService(
          roomId,
          peerIdRef.current,
          webrtc
        );
        signalingRef.current = signaling;
        await signaling.initialize();
      } catch (error) {
        console.error("Failed to initialize call:", error);
      }
    }

    initializeCall();

    return () => {
      mounted = false;
      if (signalingRef.current) {
        signalingRef.current.cleanup();
      }
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
      deleteDoc(
        doc(db, "rooms", roomId, "participants", peerIdRef.current)
      ).then();
    };
  }, [roomId, localUid, localDisplayName]);

  // Listen for room metadata (host, is_active)
  useEffect(() => {
    const roomRef = doc(db, "rooms", roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data() as any;
      if (!data) return;
      const hostId = data.hostId;
      const isActive = data.is_active;
      setIsHost(hostId === localUid);
      if (isActive === false && !isHost) {
        // host closed room, leave
        alert("Host has ended the call");
        onLeave();
      }
    });

    return () => unsub();
  }, [roomId, localUid, isHost, onLeave]);

  const handleToggleAudio = useCallback(() => {
    if (webrtcRef.current) {
      const newState = !audioEnabled;
      webrtcRef.current.toggleAudio(newState);
      setAudioEnabled(newState);
      // update presence
      updateDoc(doc(db, "rooms", roomId, "participants", peerIdRef.current), {
        audio: newState,
      }).catch(() => {});
    }
  }, [audioEnabled, roomId]);

  const handleToggleVideo = useCallback(() => {
    if (webrtcRef.current) {
      const newState = !videoEnabled;
      webrtcRef.current.toggleVideo(newState);
      setVideoEnabled(newState);
      updateDoc(doc(db, "rooms", roomId, "participants", peerIdRef.current), {
        video: newState,
      }).catch(() => {});
    }
  }, [videoEnabled, roomId]);

  const handleToggleScreenShare = useCallback(async () => {
    if (!webrtcRef.current) return;

    try {
      if (!screenSharing) {
        await webrtcRef.current.getScreenStream();
        await webrtcRef.current.replaceVideoTrack(true);
        setScreenSharing(true);
      } else {
        webrtcRef.current.stopScreenSharing();
        await webrtcRef.current.replaceVideoTrack(false);
        setScreenSharing(false);
      }
    } catch (error) {
      console.error("Screen sharing error:", error);
    }
  }, [screenSharing]);

  const handleLeave = useCallback(() => {
    if (signalingRef.current) {
      signalingRef.current.cleanup();
    }
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }
    deleteDoc(
      doc(db, "rooms", roomId, "participants", peerIdRef.current)
    ).then();
    onLeave();
  }, [onLeave]);

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  return (
    <div className="min-h-screen bg-slate-900 relative">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 flex items-center gap-3">
          <span className="text-white font-medium">Room ID:</span>
          <code className="text-blue-300 font-mono">
            {roomId.slice(0, 8)}...
          </code>
          <button
            onClick={copyRoomId}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Copy Room ID"
          >
            {copied ? (
              <Check size={16} className="text-green-400" />
            ) : (
              <Copy size={16} className="text-white" />
            )}
          </button>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 text-white">
          {remoteStreams.size + 1} participant
          {remoteStreams.size !== 0 ? "s" : ""}
        </div>
      </div>

      <VideoGrid
        streams={remoteStreams}
        localStream={localStream}
        localUserId={localUid}
      />

      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        screenSharing={screenSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveCall={handleLeave}
      />
    </div>
  );
}
