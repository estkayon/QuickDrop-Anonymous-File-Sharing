import { useEffect, useRef, useCallback } from "react";
import { getWsUrl } from "../lib/api";
import { useRoomStore } from "../stores/roomStore";
import { useChatStore } from "../stores/chatStore";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const intentionalClose = useRef(false);
  const { roomId, password, setUserId, setPeers, addPeer, removePeer, setConnected, setError } =
    useRoomStore();
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (!roomId || !password) return;

    intentionalClose.current = false;
    const ws = new WebSocket(getWsUrl(roomId, password));
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      setConnected(true);
      setError(null);
    });

    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));

      switch (msg.type) {
        case "joined":
          setUserId(msg.payload.userId);
          setPeers(msg.payload.peers);
          break;

        case "peer-joined":
          addPeer(msg.payload.userId);
          break;

        case "peer-left":
          removePeer(msg.payload.userId);
          break;

        case "chat":
          addMessage({
            id: crypto.randomUUID(),
            sender: msg.from,
            text: msg.payload.text,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isMe: false,
          });
          break;

        case "error":
          setError(msg.payload);
          ws.close();
          break;
      }
    });

    ws.addEventListener("close", () => {
      // only show error if we didn't close intentionally (cleanup/unmount)
      if (!intentionalClose.current) {
        setConnected(false);
        setError("Connection lost");
      }
    });

    ws.addEventListener("error", () => {
      if (!intentionalClose.current) {
        setError("Connection failed");
        setConnected(false);
      }
    });

    return () => {
      intentionalClose.current = true;
      ws.close();
      wsRef.current = null;
    };
  }, [roomId, password]);

  const sendChat = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat", payload: { text } }));
    }
  }, []);

  const sendSignal = useCallback((type: string, to: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, to, payload }));
    }
  }, []);

  return { sendChat, sendSignal, ws: wsRef };
}