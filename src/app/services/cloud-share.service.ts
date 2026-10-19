import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type WebTorrent from 'webtorrent';
import type { WebTorrentTorrent } from 'webtorrent';
import { environment } from '../../environments/environment';

export interface CloudShareRecord {
  shareId: string;
  infoHash: string | null;
  name: string;
  sizeBytes: number | string;
  downloadCount: number;
  createdAt: string;
  status: 'pending' | 'ready' | 'in_progress' | 'failed';
}

export type CloudShareTorrentFile = import('webtorrent').WebTorrentFile;
export type CloudShareTorrent = WebTorrentTorrent;

export interface CloudShareSeed {
  torrent: CloudShareTorrent;
  seeded: Promise<CloudShareTorrent>;
}

const MAX_SHARE_BYTES = 50 * 1024 ** 4;
const API_URL = `${environment.apiUrl}/api/mystudio/cloud-share`;
const PUBLIC_TRACKERS = [
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev'
];

@Injectable({ providedIn: 'root' })
export class CloudShareService {
  private clientPromise?: Promise<WebTorrent>;
  private client?: WebTorrent;
  private readonly locallySeededHashes = new Set<string>();

  constructor(private readonly http: HttpClient) {}

  async listShares(): Promise<CloudShareRecord[]> {
    const response = await firstValueFrom(
      this.http.get<{ data: CloudShareRecord[] }>(API_URL)
    );
    return response.data;
  }

  async createShare(name: string, sizeBytes: number): Promise<CloudShareRecord> {
    const response = await firstValueFrom(
      this.http.post<{ data: CloudShareRecord }>(API_URL, { name, sizeBytes })
    );
    return response.data;
  }

  async completeShare(shareId: string, infoHash: string): Promise<CloudShareRecord> {
    const response = await firstValueFrom(
      this.http.patch<{ data: CloudShareRecord }>(
        `${API_URL}/${encodeURIComponent(shareId)}/ready`,
        { infoHash }
      )
    );
    return response.data;
  }

  async failShare(shareId: string): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${API_URL}/${encodeURIComponent(shareId)}/failed`, {})
    );
  }

  async deleteShare(shareId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_URL}/${encodeURIComponent(shareId)}`)
    );
  }

  async getPublicShare(shareId: string): Promise<CloudShareRecord> {
    const response = await firstValueFrom(
      this.http.get<{ data: CloudShareRecord }>(
        `${API_URL}/public/${encodeURIComponent(shareId)}`
      )
    );
    return response.data;
  }

  async recordDownload(shareId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_URL}/public/${encodeURIComponent(shareId)}/downloaded`, {})
    );
  }

  async markShareStarted(shareId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_URL}/public/${encodeURIComponent(shareId)}/started`, {})
    );
  }

  async seedFiles(
    files: File[],
    name: string,
    onProgress: (hashedBytes: number, totalBytes: number) => void
  ): Promise<CloudShareSeed> {
    const client = await this.getClient();
    const options = { announce: this.getAnnounceUrls(), name, onProgress };
    let resolveSeeded!: (torrent: CloudShareTorrent) => void;
    let rejectSeeded!: (error: Error) => void;
    const seeded = new Promise<CloudShareTorrent>((resolve, reject) => {
      resolveSeeded = resolve;
      rejectSeeded = reject;
    });

    const torrent = client.seed(files, options, (readyTorrent) => {
      this.locallySeededHashes.add(readyTorrent.infoHash);
      resolveSeeded(readyTorrent);
    });
    torrent.once('error', rejectSeeded);
    return { torrent, seeded };
  }

  async joinShare(infoHash: string): Promise<CloudShareTorrent> {
    const client = await this.getClient();
    const existingTorrent = await client.get(infoHash);
    if (existingTorrent) {
      return existingTorrent;
    }

    const trackers = this.getAnnounceUrls()
      .map((tracker) => `&tr=${encodeURIComponent(tracker)}`)
      .join('');
    const magnetUri = `magnet:?xt=urn:btih:${infoHash}${trackers}`;
    return client.add(magnetUri, { announce: this.getAnnounceUrls() });
  }

  isLocallySeeding(infoHash: string): boolean {
    return this.locallySeededHashes.has(infoHash);
  }

  hasActiveSeeds(): boolean {
    return this.locallySeededHashes.size > 0;
  }

  async stopSeeding(infoHash: string): Promise<void> {
    this.locallySeededHashes.delete(infoHash);
    if (!this.client || !await this.client.get(infoHash)) {
      return;
    }
    await this.client.remove(infoHash, { destroyStore: true });
  }

  async stopTorrent(torrent: CloudShareTorrent): Promise<void> {
    this.locallySeededHashes.delete(torrent.infoHash);
    if (!this.client) {
      return;
    }
    const existingTorrent = await this.client.get(torrent.infoHash || torrent);
    if (existingTorrent) {
      await this.client.remove(existingTorrent.infoHash || existingTorrent, { destroyStore: true });
    }
  }

  private async getClient(): Promise<WebTorrent> {
    if (!this.clientPromise) {
      this.clientPromise = import('webtorrent/dist/webtorrent.min.js').then(({ default: WebTorrentClient }) => {
        this.client = new WebTorrentClient({
          tracker: {
            rtcConfig: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
              ]
            }
          }
        });
        return this.client;
      });
    }
    return this.clientPromise;
  }

  private getAnnounceUrls(): string[] {
    const apiUrl = new URL(environment.apiUrl);
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    apiUrl.pathname = '/';
    apiUrl.search = '';
    apiUrl.hash = '';
    return [apiUrl.toString().replace(/\/$/, ''), ...PUBLIC_TRACKERS];
  }
}

export { MAX_SHARE_BYTES };
