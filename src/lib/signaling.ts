import { WebRTCManager } from "./webrtc";
import { db } from "./firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

export class SignalingService {
  private roomId: string;
  private peerId: string;
  private webrtc: WebRTCManager;
  private unsubscribe: (() => void) | null = null;

  constructor(roomId: string, peerId: string, webrtc: WebRTCManager) {
    this.roomId = roomId;
    this.peerId = peerId;
    this.webrtc = webrtc;
  }

  async initialize() {
    const signalsRef = collection(db, "rooms", this.roomId, "signals");
    const q = query(signalsRef, orderBy("created_at"));

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type !== "added") return;
        const payload = change.doc.data();
        const { from_peer_id, to_peer_id, signal_type, signal_data } =
          payload as any;

        if (from_peer_id === this.peerId) return; // ignore our own signals
        if (to_peer_id && to_peer_id !== this.peerId) return; // not for us

        try {
          if (signal_type === "offer") {
            await this.handleOffer(from_peer_id, signal_data);
          } else if (signal_type === "answer") {
            await this.handleAnswer(from_peer_id, signal_data);
          } else if (signal_type === "ice-candidate") {
            await this.handleIceCandidate(from_peer_id, signal_data);
          } else if (signal_type === "user-joined") {
            await this.handleUserJoined(from_peer_id);
          }
        } catch (error) {
          console.error("Error handling signal:", error);
        }
      });
    });

    await this.broadcastSignal(null, "user-joined", {});

    const participantsRef = collection(
      db,
      "rooms",
      this.roomId,
      "participants"
    );
    const snapshot = await getDocs(participantsRef);
    snapshot.forEach((doc) => {
      if (doc.id !== this.peerId) {
        // doc.id is the peer id (we store participants with peerId as doc id)
        this.initiateConnection(doc.id);
      }
    });
  }

  private async handleUserJoined(fromPeerId: string) {
    await this.initiateConnection(fromPeerId);
  }

  private async initiateConnection(remotePeerId: string) {
    await this.webrtc.createPeerConnection(remotePeerId, (candidate) => {
      this.broadcastSignal(remotePeerId, "ice-candidate", candidate.toJSON());
    });

    const offer = await this.webrtc.createOffer(remotePeerId);
    await this.broadcastSignal(remotePeerId, "offer", offer);
  }

  private async handleOffer(
    fromPeerId: string,
    offer: RTCSessionDescriptionInit
  ) {
    await this.webrtc.createPeerConnection(fromPeerId, (candidate) => {
      this.broadcastSignal(fromPeerId, "ice-candidate", candidate.toJSON());
    });

    await this.webrtc.setRemoteDescription(fromPeerId, offer);
    const answer = await this.webrtc.createAnswer(fromPeerId);
    await this.broadcastSignal(fromPeerId, "answer", answer);
  }

  private async handleAnswer(
    fromPeerId: string,
    answer: RTCSessionDescriptionInit
  ) {
    await this.webrtc.setRemoteDescription(fromPeerId, answer);
  }

  private async handleIceCandidate(
    fromPeerId: string,
    candidate: RTCIceCandidateInit
  ) {
    await this.webrtc.addIceCandidate(fromPeerId, candidate);
  }

  private async broadcastSignal(
    toPeerId: string | null,
    signalType: string,
    signalData: any
  ) {
    const signalsRef = collection(db, "rooms", this.roomId, "signals");
    await addDoc(signalsRef, {
      from_peer_id: this.peerId,
      to_peer_id: toPeerId,
      signal_type: signalType,
      signal_data: signalData,
      created_at: serverTimestamp(),
    });
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
