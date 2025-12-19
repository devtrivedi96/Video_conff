import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff } from 'lucide-react';

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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 rounded-full px-6 py-4 shadow-2xl flex items-center gap-4">
      <button
        onClick={onToggleAudio}
        className={`p-4 rounded-full transition-all ${
          audioEnabled
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
        title={audioEnabled ? 'Mute' : 'Unmute'}
      >
        {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
      </button>

      <button
        onClick={onToggleVideo}
        className={`p-4 rounded-full transition-all ${
          videoEnabled
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
        title={videoEnabled ? 'Stop Video' : 'Start Video'}
      >
        {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
      </button>

      <button
        onClick={onToggleScreenShare}
        className={`p-4 rounded-full transition-all ${
          screenSharing
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
        title={screenSharing ? 'Stop Sharing' : 'Share Screen'}
      >
        {screenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
      </button>

      <div className="w-px h-10 bg-gray-600" />

      <button
        onClick={onLeaveCall}
        className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
        title="Leave Call"
      >
        <PhoneOff size={24} />
      </button>
    </div>
  );
}
