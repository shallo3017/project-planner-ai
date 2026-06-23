/**
 * Socket.IO client singleton (placeholder).
 *
 * The real-time layer (chat streaming, AI doc_chunk events, generation status)
 * isn't built yet — the backend Socket.IO server doesn't exist. When it does:
 *
 *   1. `npm install socket.io-client --workspace apps/web`
 *   2. Implement getSocket() to connect once with the JWT in the handshake:
 *
 *        import { io, type Socket } from 'socket.io-client';
 *        import { getAccessToken } from './api';
 *        let socket: Socket | null = null;
 *        export function getSocket(): Socket {
 *          if (!socket) {
 *            socket = io(process.env.NEXT_PUBLIC_API_URL!, {
 *              auth: { token: getAccessToken() },
 *              withCredentials: true,
 *            });
 *          }
 *          return socket;
 *        }
 *
 * See Technical Architecture §3 for the full event reference.
 */
export function getSocket(): never {
  throw new Error('Socket.IO client not implemented yet — real-time layer is not built.');
}
