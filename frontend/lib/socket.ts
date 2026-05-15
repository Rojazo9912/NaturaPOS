import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

let socket: Socket | null = null;

export const getSocket = (orgId?: string) => {
  if (!socket) {
    socket = io(`${SOCKET_URL}/events`, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
  }
  // Always (re)join the org room when orgId is provided
  if (orgId) {
    socket.emit('join_org', orgId);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
