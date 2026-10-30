import { useRef, useCallback, useEffect } from "react";
import { useRoomStore } from "../stores/roomStore";

function genId(): string {
  // Generate a 36-char ID to match UUID length (chunks expect 36-byte prefix)
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const parts = [8, 4, 4, 4, 12];
  return parts
    .map((len) => {
      let s = "";
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    })
    .join("-");
}

const CHUNK_SIZE = 16 * 1024;

export function useWebRTC(
  sendSignal: (type: string, to: string, payload: unknown) => void,
  ws: React.RefObject<WebSocket | null>,
  onFileReceived: (file: File, senderId: string) => void,
  onProgress: (transferId: string, progress: number) => void
) {
  const peers = useRoomStore((s) => s.peers);
  const connections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const incomingFiles = useRef<Map<string, {
    id: string;
    name: string;
    size: number;
    type: string;
    chunks: ArrayBuffer[];
    received: number;
  }>>(new Map());

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel, peerId: string) => {
      channel.binaryType = "arraybuffer";

      channel.onopen = () => {
        console.log(`[WebRTC] Data channel open with ${peerId}`);
        dataChannels.current.set(peerId, channel);
      };

      channel.onclose = () => {
        console.log(`[WebRTC] Data channel closed with ${peerId}`);
        dataChannels.current.delete(peerId);
      };

      channel.onmessage = (event) => {
        if (typeof event.data === "string") {
          const meta = JSON.parse(event.data);

          if (meta.type === "file-start") {
            incomingFiles.current.set(meta.id, {
              id: meta.id,
              name: meta.name,
              size: meta.size,
              type: meta.fileType,
              chunks: [],
              received: 0,
            });
            onProgress(meta.id, 0);
          } else if (meta.type === "file-end") {
            const transfer = incomingFiles.current.get(meta.id);
            if (transfer) {
              const blob = new Blob(transfer.chunks, { type: transfer.type });
              const file = new File([blob], transfer.name, { type: transfer.type });
              onFileReceived(file, peerId);
              incomingFiles.current.delete(meta.id);
            }
          }
        } else {
          const view = new Uint8Array(event.data);
          const idBytes = view.slice(0, 36);
          const transferId = new TextDecoder().decode(idBytes);
          const chunk = view.slice(36).buffer;

          const transfer = incomingFiles.current.get(transferId);
          if (transfer) {
            transfer.chunks.push(chunk);
            transfer.received += chunk.byteLength;
            onProgress(transferId, Math.min(transfer.received / transfer.size, 1));
          }
        }
      };
    },
    [onFileReceived, onProgress]
  );

  const createConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = connections.current.get(peerId);
      if (existing) {
        existing.close();
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", peerId, event.candidate.toJSON());
        }
      };

      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel, peerId);
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection to ${peerId}: ${pc.connectionState}`);
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          connections.current.delete(peerId);
          dataChannels.current.delete(peerId);
        }
      };

      connections.current.set(peerId, pc);
      return pc;
    },
    [sendSignal, setupDataChannel]
  );

  const connectToPeer = useCallback(
    async (peerId: string) => {
      if (connections.current.has(peerId)) return;

      console.log(`[WebRTC] Initiating connection to ${peerId}`);
      const pc = createConnection(peerId);
      const channel = pc.createDataChannel("files", { ordered: true });
      setupDataChannel(channel, peerId);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal("offer", peerId, pc.localDescription?.toJSON());
    },
    [createConnection, setupDataChannel, sendSignal]
  );

  // listen for signaling messages
  useEffect(() => {
    const currentWs = ws.current;
    if (!currentWs) return;

    const handler = async (event: MessageEvent) => {
      const msg = JSON.parse(String(event.data));

      if (msg.type === "offer") {
        console.log(`[WebRTC] Received offer from ${msg.from}`);
        const pc = createConnection(msg.from);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal("answer", msg.from, pc.localDescription?.toJSON());
      } else if (msg.type === "answer") {
        const pc = connections.current.get(msg.from);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        }
      } else if (msg.type === "ice-candidate") {
        const pc = connections.current.get(msg.from);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
          } catch (e) {
            console.warn("[WebRTC] Failed to add ICE candidate:", e);
          }
        }
      }
    };

    currentWs.addEventListener("message", handler);
    return () => currentWs.removeEventListener("message", handler);
  }, [ws.current, createConnection, sendSignal]);

  // auto-connect to peers
  useEffect(() => {
    for (const peerId of peers) {
      if (!connections.current.has(peerId)) {
        connectToPeer(peerId);
      }
    }
  }, [peers, connectToPeer]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      for (const [, pc] of connections.current) {
        pc.close();
      }
      connections.current.clear();
      dataChannels.current.clear();
    };
  }, []);

  const sendFile = useCallback(
    async (file: File): Promise<string | null> => {
      const openChannels = Array.from(dataChannels.current.values()).filter(
        (ch) => ch.readyState === "open"
      );

      if (openChannels.length === 0) {
        console.warn("[WebRTC] No open data channels. Peers:", peers.length);
        return null;
      }

      const transferId = genId();

      // send file metadata
      const meta = JSON.stringify({
        type: "file-start",
        id: transferId,
        name: file.name,
        size: file.size,
        fileType: file.type,
      });
      for (const ch of openChannels) {
        ch.send(meta);
      }

      // send chunks
      const buffer = await file.arrayBuffer();
      const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);
      const idBytes = new TextEncoder().encode(transferId);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, buffer.byteLength);
        const chunk = buffer.slice(start, end);

        const combined = new Uint8Array(idBytes.byteLength + chunk.byteLength);
        combined.set(idBytes, 0);
        combined.set(new Uint8Array(chunk), idBytes.byteLength);

        for (const ch of openChannels) {
          while (ch.bufferedAmount > 1024 * 1024) {
            await new Promise((r) => setTimeout(r, 50));
          }
          ch.send(combined.buffer);
        }

        onProgress(transferId, (i + 1) / totalChunks);
      }

      // send end signal
      for (const ch of openChannels) {
        ch.send(JSON.stringify({ type: "file-end", id: transferId }));
      }

      return transferId;
    },
    [onProgress, peers]
  );

  return { sendFile };
}