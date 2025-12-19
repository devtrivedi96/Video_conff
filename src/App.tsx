import { useState, useEffect } from "react";
import { useAuth } from "./lib/auth";
import { db } from "./lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { RoomLobby } from "./components/RoomLobby";
import { VideoRoom } from "./components/VideoRoom";

function App() {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState<{
    roomId: string;
    userId: string;
  } | null>(null);

  const handleCreateRoom = async (roomName: string, userName: string) => {
    try {
      if (!user) {
        alert("Please sign in to create a room.");
        return;
      }
      const roomsCol = collection(db, "rooms");
      const docRef = await addDoc(roomsCol, {
        name: roomName,
        created_by: userName,
        created_at: serverTimestamp(),
        is_active: true,
      });

      const display = user
        ? user.displayName ?? user.email ?? user.uid
        : userName;
      setCurrentRoom({ roomId: docRef.id, userId: display });
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room. Please try again.");
    }
  };

  const handleJoinRoom = async (roomId: string, userName: string) => {
    try {
      if (!user) {
        alert("Please sign in to join a room.");
        return;
      }
      const roomDoc = await getDoc(doc(db, "rooms", roomId));
      if (!roomDoc.exists()) {
        alert("Room not found. Please check the room ID.");
        return;
      }

      const displayJoin = user
        ? user.displayName ?? user.email ?? user.uid
        : userName;
      setCurrentRoom({ roomId, userId: displayJoin });
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room. Please try again.");
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  // If user signs out while in a room, drop them back to lobby.
  useEffect(() => {
    if (currentRoom && !user) {
      setCurrentRoom(null);
    }
  }, [currentRoom, user]);

  if (currentRoom) {
    return (
      <VideoRoom
        roomId={currentRoom.roomId}
        userId={currentRoom.userId}
        onLeave={handleLeaveRoom}
      />
    );
  }

  return (
    <RoomLobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
  );
}

export default App;
