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
    <div className={`grid ${gridCols} gap-4 w-full h-full p-4`}>
      <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm">
          You ({localUserId})
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
        // try to play to satisfy autoplay policies; may be blocked until user interacts
        videoRef.current.play().catch(() => {});
      } catch (e) {}
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full text-white text-sm">
        {userId}
      </div>
    </div>
  );
}
