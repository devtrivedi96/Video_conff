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
  const [permissionDenied, setPermissionDenied] = useState<string | null>(null);

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
          newMap.set(peerId, { stream, userId: peerId.split("-")[0] });
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

      {permissionDenied ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 p-6 rounded-lg text-white max-w-md text-center">
            <h3 className="text-lg font-semibold mb-2">Permissions required</h3>
            <p className="mb-4">{permissionDenied}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={requestPermissions}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              >
                Enable Camera & Microphone
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
