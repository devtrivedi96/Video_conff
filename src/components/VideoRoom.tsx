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
  collection,
} from "firebase/firestore";
import { VideoGrid } from "./VideoGrid";
import { ControlBar } from "./ControlBar";
import { Copy, Check } from "lucide-react";
import { AdminPanel } from "./AdminPanel";
import { SharedBoard } from "./SharedBoard";

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
  const [permissionDenied, setPermissionDenied] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [participantsInfo, setParticipantsInfo] = useState<
    Map<string, { uid: string; displayName?: string }>
  >(new Map());
  const participantsRef = useRef<
    Map<string, { uid: string; displayName?: string }>
  >(new Map());

  const [joinNotifications, setJoinNotifications] = useState<string[]>([]);

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const peerIdRef = useRef<string>(`${localUid}-${Date.now()}`);
  const [isHost, setIsHost] = useState(false);

  // finish initialization after acquiring local stream
  const finishInitialization = async (webrtc: WebRTCManager) => {
    let mounted = true;

    webrtc.setOnRemoteStream((peerId, stream) => {
      if (mounted) {
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          const info = participantsRef.current.get(peerId);
          const display = info?.displayName || peerId.split("-")[0];
          newMap.set(peerId, { stream, userId: display });
          console.debug(
            "VideoRoom: remoteStreams updated, count=",
            newMap.size
          );
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
    try {
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

      const signaling = new SignalingService(roomId, peerIdRef.current, webrtc);
      signalingRef.current = signaling;
      await signaling.initialize();
      setPermissionDenied(null);
    } catch (err) {
      console.error("Error finishing initialization:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeCall() {
      const webrtc = new WebRTCManager();
      webrtcRef.current = webrtc;

      // notify UI when screen sharing stops (e.g. via browser stop button)
      webrtc.setOnScreenStopped(() => {
        setScreenSharing(false);
        updateDoc(doc(db, "rooms", roomId, "participants", peerIdRef.current), {
          screen: false,
        }).catch(() => {});
      });

      try {
        const stream = await webrtc.getLocalStream();
        if (mounted) {
          setLocalStream(stream);
        }
        await finishInitialization(webrtc);
      } catch (error: any) {
        console.error("Failed to initialize call:", error);
        if (
          error &&
          (error.name === "NotAllowedError" || error.name === "NotFoundError")
        ) {
          setPermissionDenied(
            "Camera and microphone access required. Click to enable."
          );
        }
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

  // Subscribe to participants collection to keep display names and detect joins
  useEffect(() => {
    const participantsCol = collection(db, "rooms", roomId, "participants");
    const unsub = onSnapshot(participantsCol, (snap) => {
      const newMap = new Map<string, { uid: string; displayName?: string }>();
      snap.forEach((d) => {
        const data = d.data() as any;
        newMap.set(d.id, { uid: data.uid, displayName: data.displayName });
      });

      // detect added participants for notifications
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const d = change.doc.data() as any;
          // don't notify for ourselves
          if (change.doc.id !== peerIdRef.current) {
            const name = d.displayName || d.uid || change.doc.id.split("-")[0];
            setJoinNotifications((arr) => [...arr, `${name} joined`]);
            // auto remove notification after 4s
            setTimeout(() => {
              setJoinNotifications((arr) => arr.slice(1));
            }, 4000);
          }
        }
      });

      participantsRef.current = newMap;
      setParticipantsInfo(newMap);
    });

    return () => unsub();
  }, [roomId]);

  // When participantsInfo updates, refresh remoteStreams' userId labels
  useEffect(() => {
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      for (const [peerId, value] of newMap.entries()) {
        const info = participantsRef.current.get(peerId);
        if (info && value.userId !== info.displayName) {
          newMap.set(peerId, {
            stream: value.stream,
            userId: info.displayName || value.userId,
          });
        }
      }
      return newMap;
    });
  }, [participantsInfo]);

  // Watch our own participant doc: if deleted (kicked) -> leave
  useEffect(() => {
    const partRef = doc(db, "rooms", roomId, "participants", peerIdRef.current);
    const unsub = onSnapshot(partRef, (snap) => {
      if (!snap.exists()) {
        // our participant doc removed -> we were kicked
        alert("You were removed from the room by the host.");
        onLeave();
      }
    });
    return () => unsub();
  }, [roomId, onLeave]);

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
        // update presence
        updateDoc(doc(db, "rooms", roomId, "participants", peerIdRef.current), {
          screen: true,
        }).catch(() => {});
      } else {
        webrtcRef.current.stopScreenSharing();
        await webrtcRef.current.replaceVideoTrack(false);
        setScreenSharing(false);
        updateDoc(doc(db, "rooms", roomId, "participants", peerIdRef.current), {
          screen: false,
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Screen sharing error:", error);
    }
  }, [screenSharing]);

  const requestPermissions = async () => {
    setPermissionDenied(null);
    try {
      const webrtc = webrtcRef.current ?? new WebRTCManager();
      webrtcRef.current = webrtc;
      const stream = await webrtc.getLocalStream();
      setLocalStream(stream);
      await finishInitialization(webrtc);
    } catch (err: any) {
      console.error("Permission request failed:", err);
      console.error(err);
      // Try incremental fallbacks to determine which permission is blocked
      try {
        console.debug("Attempting audio-only fallback");
        const webrtc = webrtcRef.current ?? new WebRTCManager();
        webrtcRef.current = webrtc;
        const audioStream = await webrtc
          .getLocalStream(true, true)
          .catch(() => null);
        if (audioStream) {
          setLocalStream(audioStream);
          await finishInitialization(webrtc);
          return;
        }
      } catch (e) {
        console.debug("Audio-only fallback failed", e);
      }

      try {
        console.debug(
          "Attempting audio-only (explicit) via navigator.mediaDevices.getUserMedia"
        );
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        if (audioOnly) {
          const webrtc = webrtcRef.current ?? new WebRTCManager();
          webrtcRef.current = webrtc;
          setLocalStream(audioOnly);
          await finishInitialization(webrtc);
          return;
        }
      } catch (e) {
        console.debug("Explicit audio-only failed", e);
      }

      try {
        console.debug("Attempting video-only fallback");
        const videoOnly = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        if (videoOnly) {
          const webrtc = webrtcRef.current ?? new WebRTCManager();
          webrtcRef.current = webrtc;
          setLocalStream(videoOnly);
          await finishInitialization(webrtc);
          return;
        }
      } catch (e) {
        console.debug("Video-only failed", e);
      }

      const name = err?.name || "Error";
      const msg = err?.message || String(err);
      setPermissionDenied(`${name}: ${msg}`);
    }
  };

  const runDiagnostics = async () => {
    const results: string[] = [];
    try {
      if (navigator.permissions && (navigator.permissions as any).query) {
        try {
          const cam = await (navigator.permissions as any).query({
            name: "camera",
          });
          results.push(`camera:${cam.state}`);
        } catch (e) {
          results.push("camera:unknown");
        }
        try {
          const mic = await (navigator.permissions as any).query({
            name: "microphone",
          });
          results.push(`microphone:${mic.state}`);
        } catch (e) {
          results.push("microphone:unknown");
        }
      } else {
        results.push("Permissions API not available");
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      results.push(`deviceCount:${devices.length}`);
      devices.forEach((d) =>
        results.push(`${d.kind}:${d.label || "<no-label>"}`)
      );
    } catch (e: any) {
      results.push(`diagnostic_error:${e?.name || e}`);
    }

    console.debug("Diagnostics:", results.join(", "));
    setPermissionDenied(`Diagnostics: ${results.slice(0, 8).join(" | ")}`);
  };

  // expose diagnostics to window for manual invocation from console
  (window as any).runDiagnostics = runDiagnostics;

  const handleLeave = useCallback(() => {
    const doLeave = async () => {
      if (signalingRef.current) {
        signalingRef.current.cleanup();
      }
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }

      // If host, mark room inactive so others leave
      if (isHost) {
        try {
          await updateDoc(doc(db, "rooms", roomId), {
            is_active: false,
          });
        } catch (e) {}
      }

      try {
        await deleteDoc(
          doc(db, "rooms", roomId, "participants", peerIdRef.current)
        );
      } catch (e) {}

      onLeave();
    };

    doLeave();
  }, [onLeave]);

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  return (
    <div className="h-screen w-screen bg-slate-950 relative flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-slate-900/80 to-slate-900/0 backdrop-blur-sm z-10 border-b border-white/5">
        {/* Room ID Badge */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl border border-white/10 hover:border-blue-400/50 rounded-full px-5 py-2.5 flex items-center gap-3 transition-all duration-300 shadow-lg">
          <span className="text-white font-semibold text-sm">Room:</span>
          <code className="text-blue-300 font-mono font-bold tracking-wider text-xs">
            {roomId.slice(0, 8)}...
          </code>
          <button
            onClick={copyRoomId}
            className="p-1.5 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110"
            title="Copy Room ID"
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} className="text-white/70 hover:text-white" />
            )}
          </button>
        </div>

        {/* Center - App Title */}
        <div className="text-center">
          <h1 className="text-white font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Video Conference
          </h1>
        </div>

        {/* Participants Badge */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl border border-white/10 hover:border-green-400/50 rounded-full px-5 py-2.5 text-white font-semibold shadow-lg transition-all duration-300">
          <span className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {remoteStreams.size + 1} user
            {remoteStreams.size !== 0 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Join notifications */}
      <div className="absolute top-20 right-6 z-50 flex flex-col gap-2">
        {joinNotifications.map((n, idx) => (
          <div
            key={idx}
            className="bg-green-600/90 text-white px-4 py-2 rounded-md shadow-md text-sm"
          >
            {n}
          </div>
        ))}
      </div>

      {/* Permission Modal */}
      {permissionDenied ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-2xl text-white max-w-md text-center shadow-2xl border border-white/10">
            <h3 className="text-xl font-bold mb-3 text-red-400">
              Permissions Required
            </h3>
            <p className="mb-6 text-slate-300 text-sm">{permissionDenied}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={requestPermissions}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 px-6 py-3 rounded-lg font-semibold transition-all duration-200"
              >
                Enable Camera & Microphone
              </button>
              <button
                onClick={runDiagnostics}
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                title="Run diagnostics to gather camera/mic/device state"
              >
                Run Diagnostics
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Video Grid Container */}
      <div className="flex-1 overflow-hidden">
        <VideoGrid
          streams={remoteStreams}
          localStream={localStream}
          localUserId={localDisplayName}
        />
      </div>

      {/* Control Bar */}
      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        screenSharing={screenSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveCall={handleLeave}
        isHost={isHost}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenBoard={() => setShowBoard((s) => !s)}
      />

      {showAdmin && isHost ? (
        <AdminPanel roomId={roomId} onClose={() => setShowAdmin(false)} />
      ) : null}

      {showBoard ? <SharedBoard roomId={roomId} isHost={isHost} /> : null}
    </div>
  );
}
