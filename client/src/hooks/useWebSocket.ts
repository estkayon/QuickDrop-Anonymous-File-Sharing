import { useEffect, useRef, useCallback } from "react";
import { getWsUrl } from "../lib/api";
import { useRoomStore } from "../stores/roomStore";
import { useChatStore } from "../stores/chatStore";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const intentionalClose = useRef(false);
  const { roomId, userId: savedUserId, password, setUserId, setPeers, addPeer, removePeer, setConnected, setError } =
    useRoomStore();
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (!roomId || !password) return;

    intentionalClose.current = false;

    // Pass saved userId for reconnect
    let wsUrl = getWsUrl(roomId, password);
    if (savedUserId) {
      wsUrl += `&userId=${encodeURIComponent(savedUserId)}`;
    }

    const ws = new WebSocket(wsUrl);
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
            id: Math.random().toString(36).slice(2) + Date.now().toString(36),
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
      if (!intentionalClose.current) {
        setConnected(false);
        // Auto reconnect after 2 seconds
        setTimeout(() => {
          const state = useRoomStore.getState();
          if (state.roomId && state.password && !intentionalClose.current) {
            // Re-trigger the effect by resetting connected
            setConnected(false);
          }
        }, 2000);
      }
    });

    ws.addEventListener("error", () => {
      if (!intentionalClose.current) {
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