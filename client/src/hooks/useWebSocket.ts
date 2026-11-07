import { useEffect, useRef, useCallback } from "react";
import { getWsUrl } from "../lib/api";
import { useRoomStore } from "../stores/roomStore";
import { useChatStore } from "../stores/chatStore";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const intentionalClose = useRef(false);
  const connectAttempt = useRef(0);
  const { roomId, userId: savedUserId, password, setUserId, setPeers, addPeer, removePeer, setConnected, setError } =
    useRoomStore();
  const addMessage = useChatStore((s) => s.addMessage);

  useEffect(() => {
    if (!roomId || !password) return;

    intentionalClose.current = false;
    const attempt = ++connectAttempt.current;

    const connectTimer = setTimeout(() => {
      if (attempt !== connectAttempt.current) return;

      let wsUrl = getWsUrl(roomId, password);
      if (savedUserId) {
        wsUrl += `&userId=${encodeURIComponent(savedUserId)}`;
      }

      console.log("[WS] Connecting to", wsUrl.replace(/pwd=[^&]+/, "pwd=***"));

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        console.log("[WS] Connected");
        setConnected(true);
        setError(null);
      });

      ws.addEventListener("message", (event) => {
        const msg = JSON.parse(String(event.data));

        switch (msg.type) {
          case "joined":
            console.log("[WS] Joined as", msg.payload.userId, "| Peers:", msg.payload.peers);
            setUserId(msg.payload.userId);
            setPeers(msg.payload.peers);
            break;

          case "peer-joined":
            console.log("[WS] Peer joined:", msg.payload.userId);
            addPeer(msg.payload.userId);
            break;

          case "peer-left":
            console.log("[WS] Peer left:", msg.payload.userId);
            removePeer(msg.payload.userId);
            break;

          case "chat":
            addMessage({
              id: Math.random().toString(36).slice(2) + Date.now().toString(36),
              sender: msg.from,
              text: msg.payload.text,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
              isMe: false,
            });
            break;

          case "offer":
          case "answer":
          case "ice-candidate":
            console.log("[WS] Signal:", msg.type, "from", msg.from);
            window.dispatchEvent(new CustomEvent("webrtc-signal", { detail: msg }));
            break;

          case "error":
            console.error("[WS] Server error:", msg.payload);
            setError(msg.payload);
            ws.close();
            break;
        }
      });

      ws.addEventListener("close", (event) => {
        console.log("[WS] Closed. Code:", event.code, "Reason:", event.reason, "Intentional:", intentionalClose.current);
        if (!intentionalClose.current) {
          setConnected(false);
        }
      });

      ws.addEventListener("error", (event) => {
        console.error("[WS] Error:", event);
        if (!intentionalClose.current) {
          setConnected(false);
        }
      });
    }, 100);

    return () => {
      clearTimeout(connectTimer);
      intentionalClose.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
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
    } else {
      console.warn("[WS] Cannot send signal — WebSocket not open. State:", wsRef.current?.readyState);
    }
  }, []);

  return { sendChat, sendSignal, ws: wsRef };
}