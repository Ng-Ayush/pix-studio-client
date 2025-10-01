import { Injectable } from '@angular/core';
import { io, Socket } from "socket.io-client";
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | any;

  connect(adminId: string) {
    this.socket = io('http://localhost:3000');
    // Join room after connection
    this.socket.on('connect', () => {
      this.socket.emit('join-room', adminId);
      console.log(`Socket connected, joined room ${adminId}`);
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
}
