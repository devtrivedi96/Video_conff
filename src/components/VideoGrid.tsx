import { useEffect, useRef, useState } from "react";

interface VideoGridProps {
  streams: Map<string, { stream: MediaStream; userId: string }>;
  localStream: MediaStream | null;
  localUserId: string;
}

export function VideoGrid({
  streams,
  localStream,
  localUserId,
}: VideoGridProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [focusedPeerId, setFocusedPeerId] = useState<string | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const totalParticipants = streams.size + 1; // +1 for local user

  // Calculate optimal grid layout
  const getGridLayout = (count: number) => {
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count === 3) return { cols: 3, rows: 1 };
    if (count === 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    return { cols: 4, rows: 4 };
  };

  const layout = getGridLayout(totalParticipants);

  const gridColsClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
    }[layout.cols] || "grid-cols-3";

  const allStreams = [
    {
      peerId: "local",
      stream: localStream,
      userId: localUserId,
      isLocal: true,
    },
    ...Array.from(streams.entries()).map(([peerId, { stream, userId }]) => ({
      peerId,
      stream,
      userId,
      isLocal: false,
    })),
  ];

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Main Grid Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className={`grid ${gridColsClass} gap-3 h-full auto-rows-fr`}>
          {allStreams.map((item) => (
            <VideoCell
              key={item.peerId}
              peerId={item.peerId}
              stream={item.stream}
              userId={item.userId}
              isLocal={item.isLocal}
              isFocused={focusedPeerId === item.peerId}
              onFocus={() => setFocusedPeerId(item.peerId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface VideoCellProps {
  peerId: string;
  stream: MediaStream | null;
  userId: string;
  isLocal: boolean;
  isFocused: boolean;
  onFocus: () => void;
}

function VideoCell({
  peerId,
  stream,
  userId,
  isLocal,
  isFocused,
  onFocus,
}: VideoCellProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      if (!isLocal) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream, isLocal]);

  return (
    <div
      onClick={onFocus}
      className={`relative bg-slate-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 cursor-pointer group ${
        isFocused
          ? "ring-3 ring-blue-500 shadow-2xl shadow-blue-500/30"
          : "ring-2 ring-slate-700 hover:ring-slate-600"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-cover bg-slate-900"
      />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* User Label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg text-white text-sm font-medium ring-1 ring-white/20">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="truncate max-w-[150px]">{userId}</span>
        {isLocal && (
          <span className="text-xs bg-blue-500/70 px-2 py-0.5 rounded">
            You
          </span>
        )}
      </div>

      {/* Focus Indicator */}
      {isFocused && (
        <div className="absolute top-3 right-3 bg-blue-500/80 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold ring-1 ring-white/20">
          Active
        </div>
      )}
    </div>
  );
}
