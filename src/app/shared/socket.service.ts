import { Injectable } from '@angular/core';
import { io, Socket } from "socket.io-client";
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  socket!: Socket;
  qrCodeString: string | null = null;
  isReady = false;

  connect(adminId: any) {
    if (this.socket && this.socket.connected) {
      console.log('🔁 Socket already connected:', this.socket.id);
      return;
    }
    // enable reconnection
    this.socket = io(environment.apiUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      transports: ['websocket']
    });

    console.log("CALLED HERE", adminId);

    // Register user on first connect
    this.socket.emit('register', adminId);

    // Handle reconnect automatically
    this.socket.on('connect', () => {
      console.log("✅ Socket connected again:", this.socket.id);
      if (adminId) {
        this.socket.emit('register', adminId);
        console.log("📡 Re-registered after reconnect:", adminId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
    });
  }

  onQR(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('qr', (qr: any) => {
        console.log("GOTEHRE ", qr);

        observer.next(qr);
      });
    });
  }

  onAuthenticated(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('authenticated', () => {
        console.log("GOTEHRE authenticated ",);
        observer.next();
      });
    });
  }

  onReady(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('ready', () => {
        console.log("GOTEHRE ready ",);
        observer.next();
      });
    });
  }

  onDisconnected(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('disconnected', () => {
        console.log("GOTEHRE disconnected ");
        observer.next();
      });
    });
  }
}
