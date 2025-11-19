import { io, Socket } from 'socket.io-client';
import { TableState, ClientAction } from '@/types/poker';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(url: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(url, {
    transports: ['websocket', 'polling'], // Allow both websocket and polling as fallback
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
    forceNew: true, // Force a new connection
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket?.id);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket.IO error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitRoomJoin(roomCode: string, name: string, buyIn?: number, smallBlind?: number, bigBlind?: number, profilePic?: string | null): void {
  if (socket?.connected) {
    // Normalize room code to uppercase
    const normalizedRoomCode = roomCode.toUpperCase();
    console.log('📤 emitRoomJoin called:', { roomCode, normalizedRoomCode, name, buyIn, smallBlind, bigBlind, profilePic });
    socket.emit('room:join', { roomCode: normalizedRoomCode, name, buyIn, smallBlind, bigBlind, profilePic });
  } else {
    console.warn('⚠️ Socket not connected, cannot join room');
  }
}

export function emitRoomCreate(settings: any): void {
  if (socket?.connected) {
    console.log('📤 Emitting room:create:', settings);
    socket.emit('room:create', settings);
  } else {
    console.warn('⚠️ Socket not connected, cannot create room');
    throw new Error('Socket not connected');
  }
}

export function emitPlayerAction(action: ClientAction): void {
  if (socket?.connected) {
    socket.emit('player:action', { action });
  }
}

export function emitRebuy(buyIn?: number): void {
  if (socket?.connected) {
    socket.emit('player:rebuy', { buyIn });
  }
}

