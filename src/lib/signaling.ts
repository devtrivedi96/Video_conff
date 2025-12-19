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
  private pendingAnswers: Map<string, RTCSessionDescriptionInit[]> = new Map();

  constructor(roomId: string, peerId: string, webrtc: WebRTCManager) {
    this.roomId = roomId;
    this.peerId = peerId;
    this.webrtc = webrtc;
  }

  private log(...args: any[]) {
    console.debug(new Date().toISOString(), "SignalingService:", ...args);
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

        this.log("received signal", {
          from: from_peer_id,
          to: to_peer_id,
          type: signal_type,
        });

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
    this.log("found participants", snapshot.size);
    snapshot.forEach((doc) => {
      const remoteId = doc.id;
      this.log("participant doc", remoteId);
      if (remoteId === this.peerId) return;
      // deterministic initiator to avoid glare: only the peer with lexicographically
      // larger id will initiate when both are present during startup
      if (this.peerId > remoteId) {
        this.log("initiating to existing participant", remoteId);
        this.initiateConnection(remoteId);
      } else {
        this.log("skipping initiate to", remoteId, "(peerId <= remoteId)");
      }
    });
  }

  private async handleUserJoined(fromPeerId: string) {
    if (fromPeerId === this.peerId) return;
    // deterministic initiator: only initiate if our peerId is greater
    if (this.peerId > fromPeerId) {
      this.log("handleUserJoined initiating to", fromPeerId);
      await this.initiateConnection(fromPeerId);
    } else {
      this.log("handleUserJoined skipping initiate for", fromPeerId);
    }
  }

  private async initiateConnection(remotePeerId: string) {
    // avoid duplicate initiation if a peer connection already exists
    if (this.webrtc.getPeerConnection(remotePeerId)) {
      console.debug(
        "SignalingService: peerConnection already exists for",
        remotePeerId
      );
      return;
    }
    this.log("initiating connection to", remotePeerId);
    await this.webrtc.createPeerConnection(remotePeerId, (candidate) => {
      this.log("local ice candidate for", remotePeerId, candidate);
      this.broadcastSignal(remotePeerId, "ice-candidate", candidate.toJSON());
    });

    // attach signalingstatechange handler to flush any pending answers
    const pc = this.webrtc.getPeerConnection(remotePeerId);
    if (pc) {
      pc.onsignalingstatechange = () => {
        try {
          if (pc.signalingState === "have-local-offer") {
            this.log(
              "onsignalingstatechange: have-local-offer for",
              remotePeerId
            );
            this.flushPendingAnswers(remotePeerId);
          }
        } catch (e) {
          this.log("onsignalingstatechange error", e);
        }
      };
    }

    const offer = await this.webrtc.createOffer(remotePeerId);
    this.log("created offer for", remotePeerId, offer.type);
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
    const pc = this.webrtc.getPeerConnection(fromPeerId);
    if (!pc) {
      this.log(
        "handleAnswer: no peerConnection for",
        fromPeerId,
        "-- queuing answer"
      );
      const arr = this.pendingAnswers.get(fromPeerId) || [];
      arr.push(answer);
      this.pendingAnswers.set(fromPeerId, arr);
      return;
    }

    // If not in have-local-offer, queue the answer and wait for signaling state change
    if (pc.signalingState !== "have-local-offer") {
      this.log(
        "handleAnswer: queuing answer because signalingState is",
        pc.signalingState
      );
      const arr = this.pendingAnswers.get(fromPeerId) || [];
      arr.push(answer);
      this.pendingAnswers.set(fromPeerId, arr);
      return;
    }

    await this.applyAnswerWithRollback(fromPeerId, answer);
  }

  private async applyAnswerWithRollback(
    fromPeerId: string,
    answer: RTCSessionDescriptionInit
  ) {
    const pc = this.webrtc.getPeerConnection(fromPeerId);
    if (!pc) return;
    try {
      await this.webrtc.setRemoteDescription(fromPeerId, answer);
      this.log("Applied answer for", fromPeerId);
    } catch (err: any) {
      this.log("Error setting remote description (answer):", err?.name || err);
      // Attempt SDP rollback if supported
      try {
        this.log("Attempting SDP rollback for", fromPeerId);
        await pc.setLocalDescription({ type: "rollback" } as any);
        await this.webrtc.setRemoteDescription(fromPeerId, answer);
        this.log("Rollback + setRemoteDescription succeeded for", fromPeerId);
      } catch (rbErr) {
        this.log("Rollback failed for", fromPeerId, rbErr);
        // Give up and remove the peer connection to allow a fresh retry
        try {
          pc.close();
        } catch (e) {}
        this.webrtc.removePeerConnection(fromPeerId);
      }
    }
  }

  private async flushPendingAnswers(peerId: string) {
    const arr = this.pendingAnswers.get(peerId) || [];
    if (!arr.length) return;
    this.log("Flushing", arr.length, "pending answers for", peerId);
    for (const ans of arr) {
      await this.applyAnswerWithRollback(peerId, ans);
    }
    this.pendingAnswers.delete(peerId);
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
