const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private onScreenStoppedCallback?: () => void;
  private onRemoteStreamCallback?: (
    peerId: string,
    stream: MediaStream
  ) => void;
  private onPeerDisconnectedCallback?: (peerId: string) => void;

  setOnRemoteStream(callback: (peerId: string, stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  setOnPeerDisconnected(callback: (peerId: string) => void) {
    this.onPeerDisconnectedCallback = callback;
  }

  setOnScreenStopped(callback: () => void) {
    this.onScreenStoppedCallback = callback;
  }

  async getLocalStream(
    video: boolean = true,
    audio: boolean = true
  ): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: 1280, height: 720 } : false,
      audio: audio,
    });

    return this.localStream;
  }

  async getScreenStream(): Promise<MediaStream> {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080 },
      audio: true,
    });

    const videoTrack = this.screenStream.getVideoTracks()[0];
    videoTrack.onended = () => {
      // Stop and restore original camera track for all peers
      this.stopScreenSharing();
      // replace with local camera track if available
      this.replaceVideoTrack(false).catch(() => {});
      this.onScreenStoppedCallback?.();
    };

    console.debug(
      "WebRTCManager: obtained screen stream",
      this.screenStream.id
    );

    return this.screenStream;
  }

  getLocalStream_(): MediaStream | null {
    return this.localStream;
  }

  stopScreenSharing() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
  }

  async createPeerConnection(
    peerId: string,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    console.debug("WebRTCManager: creating peer connection for", peerId);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        console.debug("WebRTCManager ontrack", peerId, event.streams[0].id);
        this.onRemoteStreamCallback?.(peerId, event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        this.onPeerDisconnectedCallback?.(peerId);
        this.removePeerConnection(peerId);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
      console.debug(
        "WebRTCManager: local tracks added for",
        peerId,
        this.localStream?.getTracks().map((t) => t.kind)
      );
    }

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  getPeerConnection(peerId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  removePeerConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error("Peer connection not found");

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error("Peer connection not found");

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(
    peerId: string,
    description: RTCSessionDescriptionInit
  ) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error("Peer connection not found");

    await pc.setRemoteDescription(new RTCSessionDescription(description));
  }

  async addIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error("Peer connection not found");

    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  async replaceVideoTrack(screenSharing: boolean) {
    const stream = screenSharing ? this.screenStream : this.localStream;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];

    console.debug(
      "WebRTCManager.replaceVideoTrack: replacing with track",
      videoTrack.id
    );
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      const videoSender = senders.find(
        (sender) => sender.track?.kind === "video"
      );
      if (videoSender) {
        videoSender.replaceTrack(videoTrack);
      } else if (pc && videoTrack) {
        // fallback: add track if no sender exists yet
        pc.addTrack(videoTrack, stream);
      }
    });
  }

  cleanup() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
  }
}
