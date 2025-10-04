import { Injectable } from '@angular/core';
import { io, Socket } from "socket.io-client";
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  socket!: Socket;
  qrCodeString: string | null = null;
  isReady = false;
  userId = 'user123'; // Unique per logged-in user

  connect(adminId: any) {
    this.socket = io('http://localhost:3000'); // Connect to master worker port
    console.log("CALELDHERE", adminId);
    this.socket.emit('register', adminId);
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
        observer.next();
      });
    });
  }

  onReady(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('ready', () => {
        observer.next();
      });
    });
  }

  onDisconnected(): Observable<void> {
    return new Observable(observer => {
      this.socket.on('disconnected', () => {
        observer.next();
      });
    });
  }
}
