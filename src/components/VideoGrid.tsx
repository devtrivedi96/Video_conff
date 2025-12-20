import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const gridCols =
    streams.size + 1 <= 2
      ? "grid-cols-1"
      : streams.size + 1 <= 4
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div
      className={`grid ${gridCols} gap-6 w-full h-full p-6 bg-gradient-to-b from-slate-950 to-slate-900`}
    >
      <div className="relative bg-slate-800 rounded-xl overflow-hidden shadow-2xl ring-2 ring-slate-700 hover:ring-blue-500 transition-all duration-300 group">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium ring-1 ring-white/20">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          You
        </div>
        <div className="absolute top-4 right-4 bg-blue-500/80 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-semibold">
          Local
        </div>
      </div>

      {Array.from(streams.entries()).map(([peerId, { stream, userId }]) => (
        <RemoteVideo key={peerId} stream={stream} userId={userId} />
      ))}
    </div>
  );
}

function RemoteVideo({
  stream,
  userId,
}: {
  stream: MediaStream;
  userId: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        videoRef.current.play().catch(() => {});
      } catch (e) {}
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-800 rounded-xl overflow-hidden shadow-2xl ring-2 ring-slate-700 hover:ring-green-500 transition-all duration-300 group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium ring-1 ring-white/20">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        {userId}
      </div>
    </div>
  );
}
