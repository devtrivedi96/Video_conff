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
}

export function ControlBar({
  audioEnabled,
  videoEnabled,
  screenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveCall,
}: ControlBarProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-full px-8 py-4 shadow-2xl backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300">
        {/* Audio Toggle */}
        <button
          onClick={onToggleAudio}
          className={`p-3 rounded-full transition-all duration-200 font-semibold ${
            audioEnabled
              ? "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white shadow-lg"
              : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg"
          }`}
          title={audioEnabled ? "Mute" : "Unmute"}
          aria-label={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          className={`p-3 rounded-full transition-all duration-200 font-semibold ${
            videoEnabled
              ? "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white shadow-lg"
              : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg"
          }`}
          title={videoEnabled ? "Stop Video" : "Start Video"}
          aria-label={videoEnabled ? "Stop Video" : "Start Video"}
        >
          {videoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3 rounded-full transition-all duration-200 font-semibold ${
            screenSharing
              ? "bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-lg"
              : "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white shadow-lg"
          }`}
          title={screenSharing ? "Stop Sharing" : "Share Screen"}
          aria-label={screenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {screenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10" />

        {/* Leave Call */}
        <button
          onClick={onLeaveCall}
          className="p-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white transition-all duration-200 shadow-lg font-semibold"
          title="Leave Call"
          aria-label="Leave Call"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
