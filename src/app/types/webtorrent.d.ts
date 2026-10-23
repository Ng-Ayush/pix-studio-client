declare module 'webtorrent' {
  export interface WebTorrentFile {
    name: string;
    path: string;
    length: number;
    select(priority?: number): void;
    deselect(): void;
    createReadStream(options?: { start?: number; end?: number }): AsyncIterable<Uint8Array>;
  }

  export interface WebTorrentTorrent {
    infoHash: string;
    name: string;
    length: number;
    downloaded: number;
    uploaded: number;
    downloadSpeed: number;
    uploadSpeed: number;
    progress: number;
    numPeers: number;
    ready: boolean;
    done: boolean;
    files: WebTorrentFile[];
    pause(): this;
    resume(): this;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
  }

  interface WebTorrentOptions {
    onProgress?: (hashedBytes: number, totalBytes: number) => void;
    tracker?: {
      rtcConfig?: {
        iceServers?: Array<{ urls: string }>;
      };
    };
  }

  export default class WebTorrent {
    constructor(options?: WebTorrentOptions);
    seed(
      files: File[],
      options: WebTorrentOptions & { announce: string[]; name: string },
      callback: (torrent: WebTorrentTorrent) => void
    ): WebTorrentTorrent;
    add(
      magnetUri: string,
      options: { announce: string[]; deselect?: boolean; noPeersIntervalTime?: number }
    ): WebTorrentTorrent;
    get(infoHash: string | WebTorrentTorrent): Promise<WebTorrentTorrent | null>;
    remove(
      infoHash: string | WebTorrentTorrent,
      options: { destroyStore: boolean },
      callback?: (error?: Error) => void
    ): Promise<void>;
  }
}

declare module 'webtorrent/dist/webtorrent.min.js' {
  export { default } from 'webtorrent';
}
