import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
} from "lucide-react";

interface ControlBarProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveCall: () => void;
  isHost?: boolean;
  onOpenAdmin?: () => void;
  onOpenBoard?: () => void;
}

export function ControlBar({
  audioEnabled,
  videoEnabled,
  screenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveCall,
  isHost = false,
  onOpenAdmin,
  onOpenBoard,
}: ControlBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-6">
      <div className="flex items-center justify-center gap-4">
        {/* Audio Toggle */}
        <button
          onClick={onToggleAudio}
          className={`p-4 rounded-full transition-all duration-200 font-semibold group relative ${
            audioEnabled
              ? "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white shadow-lg hover:shadow-xl hover:scale-110"
              : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg hover:shadow-xl hover:scale-110"
          }`}
          title={audioEnabled ? "Mute (Alt+A)" : "Unmute (Alt+A)"}
          aria-label={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {audioEnabled ? "Mute" : "Unmute"}
          </div>
        </button>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          className={`p-4 rounded-full transition-all duration-200 font-semibold group relative ${
            videoEnabled
              ? "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white shadow-lg hover:shadow-xl hover:scale-110"
              : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg hover:shadow-xl hover:scale-110"
          }`}
          title={videoEnabled ? "Stop Video (Alt+V)" : "Start Video (Alt+V)"}
          aria-label={videoEnabled ? "Stop Video" : "Start Video"}
        >
          {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {videoEnabled ? "Stop Video" : "Start Video"}
          </div>
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={onToggleScreenShare}
          className={`p-4 rounded-full transition-all duration-200 font-semibold group relative ${
            screenSharing
              ? "bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-lg hover:shadow-xl hover:scale-110"
              : "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white shadow-lg hover:shadow-xl hover:scale-110"
          }`}
          title={
            screenSharing ? "Stop Sharing (Alt+S)" : "Share Screen (Alt+S)"
          }
          aria-label={screenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {screenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {screenSharing ? "Stop Sharing" : "Share Screen"}
          </div>
        </button>

        {/* Divider */}
        <div className="w-px h-10 bg-white/20" />

        {/* Host Controls */}
        {/* Shared board access for all participants */}
        <button
          onClick={() => onOpenBoard && onOpenBoard()}
          className="p-3 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md hover:scale-105"
          title="Open Shared Board"
        >
          Board
        </button>

        {/* Admin panel only for host */}
        {isHost ? (
          <button
            onClick={() => onOpenAdmin && onOpenAdmin()}
            className="p-3 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-md hover:scale-105"
            title="Admin Panel"
          >
            Admin
          </button>
        ) : null}

        {/* Leave Call */}
        <button
          onClick={onLeaveCall}
          className="p-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 font-semibold group relative"
          title="Leave Call (Esc)"
          aria-label="Leave Call"
        >
          <PhoneOff size={24} />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Leave Call
          </div>
        </button>
      </div>
    </div>
  );
}
