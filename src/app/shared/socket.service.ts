import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket!: Socket;
  private currentUserId: any = null;

  // -------------------- CONNECT --------------------
  connect(userId: any) {
    if (this.socket && this.socket.connected) {
      console.log('🔁 Socket already connected:', this.socket.id);
      return;
    }

    this.currentUserId = userId;

    this.socket = io(environment.apiUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      if (this.currentUserId) {
        this.socket.emit('register', this.currentUserId);
        console.log('📡 Registered socket for user:', this.currentUserId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 Socket disconnected:', reason);
    });
  }

  // -------------------- QR --------------------
  onQR(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('qr', (qr: string) => {
        observer.next(qr);
      });
    });
  }

   Qr(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('wa:qr', (qr: string) => {
        observer.next(qr);
      });
    });
  }

  Authen(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('wa:connected', () => {
        observer.next();
      });
    });
  }

  eroor(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('wa:error', (msg: string) => {
        observer.next(msg);
      });
    });
  }

  // -------------------- AUTHENTICATED --------------------
  onAuthenticated(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('authenticated', () => {
        observer.next();
      });
    });
  }

  // -------------------- READY --------------------
  onReady(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('ready', () => {
        observer.next();
      });
    });
  }

  // -------------------- WHATSAPP DISCONNECTED --------------------
  onDisconnected(): Observable<string> {
    return new Observable(observer => {
      // ⚠️ Listen to custom event from backend, not socket.io's 'disconnect'
      this.socket.on('wa_disconnected', (reason: string) => {
        observer.next(reason);
      });
    });
  }

  // -------------------- AUTH FAILURE --------------------
  onAuthFailure(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('auth_failure', () => {
        observer.next();
      });
    });
  }

  // -------------------- MANUAL DISCONNECT SOCKET --------------------
  disconnectSocket() {
    if (this.socket) {
      console.log('🔌 Manually disconnecting socket');
      this.socket.disconnect();
      this.currentUserId = null;
    }
  }
}
