import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  CloudShareRecord,
  CloudShareService,
  CloudShareTorrent,
  CloudShareTorrentFile,
  MAX_SHARE_BYTES
} from '../../services/cloud-share.service';
import { AlertService } from '../../services/alert.service';

interface WritableFile {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

interface SaveFileHandle {
  createWritable(): Promise<WritableFile>;
}

interface DirectoryHandle {
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<DirectoryHandle>;
  getFileHandle(name: string, options: { create: boolean }): Promise<SaveFileHandle>;
}

interface FileSystemPickerWindow extends Window {
  showSaveFilePicker?: (options: { suggestedName: string }) => Promise<SaveFileHandle>;
  showDirectoryPicker?: () => Promise<DirectoryHandle>;
}

@Component({
  selector: 'app-cloud-share',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cloud-share.component.html',
  styleUrl: './cloud-share.component.scss'
})
export class CloudShareComponent implements OnInit, OnDestroy {
  readonly maxShareBytes = MAX_SHARE_BYTES;
  readonly maxShareSize = this.formatSize(MAX_SHARE_BYTES);

  history: CloudShareRecord[] = [];
  publicShare?: CloudShareRecord;
  torrent?: CloudShareTorrent;
  torrentFiles: CloudShareTorrentFile[] = [];
  latestShareUrl = '';
  latestShareId = '';
  isLoading = true;
  isPreparing = false;
  hashProgress = 0;
  senderProgress = 0;
  senderPeerCount = 0;
  isSeedingLatest = false;
  isShareLocked = false;
  isConnecting = false;
  isSaving = false;
  transferStatus = 'Waiting for the sender to connect...';
  transferProgress = 0;
  shareId?: string;
  private downloadReported = false;
  private receivedShareSaved = false;
  private readonly savedFilePaths = new Set<string>();
  private activeOutgoingShareId?: string;
  private activeOutgoingTorrent?: CloudShareTorrent;
  private activeShareStarted = false;
  private outgoingGeneration = 0;
  private receiverStartReported = false;
  private receiverStartReportInProgress = false;
  private activeShareDownloadCount = 0;
  private completionPoll?: ReturnType<typeof setInterval>;
  private completionCheckInProgress = false;
  private completionWarningShown = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly cloudShare: CloudShareService,
    private readonly alert: AlertService
  ) {}

  ngOnInit(): void {
    this.shareId = this.route.snapshot.paramMap.get('shareId') ?? undefined;
    if (this.shareId) {
      void this.loadPublicShare();
      return;
    }
    void this.loadHistory();
  }

  ngOnDestroy(): void {
    this.stopCompletionPolling();
  }

  @HostListener('window:beforeunload', ['$event'])
  protectActiveTransfer(event: BeforeUnloadEvent): void {
    const receivingUnfinishedShare = !!this.shareId
      && !!this.torrent
      && !this.receivedShareSaved
      && (this.isSaving || this.torrent.numPeers > 0 || this.transferProgress > 0);
    if (!this.isPreparing && !this.activeOutgoingTorrent && !this.isShareLocked && !this.isSaving
      && !this.cloudShare.hasActiveSeeds() && !receivingUnfinishedShare) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) {
      return;
    }
    if (this.isShareLocked) {
      this.alert.warning('The receiver has started this share. Wait until the transfer is saved before choosing another file.');
      return;
    }

    const sizeBytes = files.reduce((total, file) => total + file.size, 0);
    if (sizeBytes <= 0 || sizeBytes > this.maxShareBytes) {
      this.alert.error(`Choose files with a combined size greater than 0 and no more than ${this.maxShareSize}.`);
      return;
    }
    const name = this.getDisplayName(files);
    const generation = ++this.outgoingGeneration;
    try {
      await this.discardPreparedShare();
    } catch (error) {
      console.error('[CloudShare] Could not replace the prepared share', error);
      this.alert.error(this.getErrorMessage(error, 'Could not replace the prepared share.'));
      return;
    }

    this.isPreparing = true;
    this.senderProgress = 0;
    this.senderPeerCount = 0;
    this.isSeedingLatest = false;
    this.isShareLocked = false;
    let pendingShare: CloudShareRecord | undefined;
    try {
      pendingShare = await this.cloudShare.createShare(name, sizeBytes);
      if (generation !== this.outgoingGeneration) {
        await this.cloudShare.deleteShare(pendingShare.shareId);
        return;
      }

      this.latestShareId = pendingShare.shareId;
      this.latestShareUrl = this.getShareUrl(pendingShare.shareId);
      this.activeOutgoingShareId = pendingShare.shareId;
      this.activeShareStarted = false;
      this.activeShareDownloadCount = Number(pendingShare.downloadCount) || 0;
      this.history = [pendingShare, ...this.history];
      void this.copyShareLink(pendingShare.shareId);

      this.prepareTorrentPaths(files);
      const seed = await this.cloudShare.seedFiles(files, name, (hashedBytes, totalBytes) => {
        if (generation === this.outgoingGeneration) {
          this.hashProgress = totalBytes > 0 ? Math.floor((hashedBytes / totalBytes) * 100) : 0;
        }
      });
      if (generation !== this.outgoingGeneration) {
        await this.cloudShare.stopTorrent(seed.torrent);
        await this.cloudShare.deleteShare(pendingShare.shareId);
        return;
      }

      this.activeOutgoingTorrent = seed.torrent;
      seed.torrent.on('upload', () => {
        if (generation !== this.outgoingGeneration) return;
        this.activeShareStarted = true;
        this.isShareLocked = true;
        this.senderProgress = Math.min(100, Math.floor((seed.torrent.uploaded / sizeBytes) * 100));
        this.senderPeerCount = seed.torrent.numPeers;
      });
      seed.torrent.on('wire', () => {
        if (generation !== this.outgoingGeneration) return;
        this.senderPeerCount = seed.torrent.numPeers;
      });
      seed.torrent.on('noPeers', () => {
        if (generation !== this.outgoingGeneration) return;
        this.senderPeerCount = 0;
      });
      this.isPreparing = false;
      void seed.seeded
        .then(async (torrent) => {
          if (generation !== this.outgoingGeneration) {
            await this.cloudShare.stopTorrent(torrent);
            await this.cloudShare.deleteShare(pendingShare!.shareId);
            return;
          }
          if (!torrent.infoHash) {
            throw new Error('WebTorrent finished seeding without an info hash.');
          }
          this.isSeedingLatest = true;
          const readyShare = await this.cloudShare.completeShare(pendingShare!.shareId, torrent.infoHash);
          this.updateHistory(readyShare);
          this.startCompletionPolling();
          this.alert.success('CloudShare is ready. Keep MyStudio running while recipients download.');
        })
        .catch(async (error: unknown) => {
          if (generation !== this.outgoingGeneration) {
            return;
          }
          if (this.activeOutgoingTorrent) {
            try {
              await this.cloudShare.stopTorrent(this.activeOutgoingTorrent);
            } catch (stopError) {
              console.error('[CloudShare] Could not stop the failed seed', stopError);
            }
          }
          this.isSeedingLatest = false;
          this.releaseShareLock();
          console.error('[CloudShare] Seeding failed', error);
          try {
            await this.cloudShare.failShare(pendingShare!.shareId);
          } catch (failError) {
            console.error('[CloudShare] Could not mark failed share', failError);
          }
          this.updateHistory({ ...pendingShare!, status: 'failed' });
          this.alert.error(this.getErrorMessage(error, 'Could not prepare the CloudShare transfer.'));
        });
    } catch (error) {
        if (generation !== this.outgoingGeneration) {
          return;
        }
        this.isSeedingLatest = false;
        this.releaseShareLock();
      console.error('[CloudShare] Could not prepare the share', error);
      if (pendingShare) {
        try {
          await this.cloudShare.failShare(pendingShare.shareId);
        } catch (failError) {
          console.error('[CloudShare] Could not mark failed share', failError);
        }
        this.updateHistory({ ...pendingShare, status: 'failed' });
      }
      this.alert.error(this.getErrorMessage(error, 'Could not create the CloudShare link.'));
    } finally {
      if (generation === this.outgoingGeneration) {
        this.isPreparing = false;
      }
    }
  }

  async deleteShare(share: CloudShareRecord): Promise<void> {
    if (!window.confirm(`Delete the share link for "${share.name}"?`)) {
      return;
    }
    try {
      await this.cloudShare.deleteShare(share.shareId);
      if (share.infoHash) {
        await this.cloudShare.stopSeeding(share.infoHash);
      }
      this.history = this.history.filter((item) => item.shareId !== share.shareId);
      if (share.shareId === this.activeOutgoingShareId) {
        this.releaseShareLock();
      }
      this.alert.success('CloudShare link deleted.');
    } catch (error) {
      console.error('[CloudShare] Could not delete the share', error);
      this.alert.error(this.getErrorMessage(error, 'Could not delete the CloudShare link.'));
    }
  }

  async copyShareLink(shareId: string): Promise<void> {
    const url = this.getShareUrl(shareId);
    this.latestShareUrl = url;
    try {
      await navigator.clipboard.writeText(url);
      this.alert.success('Share link copied to clipboard.');
    } catch (error) {
      console.error('[CloudShare] Clipboard access failed', error);
      this.alert.warning('The share link is ready below. Copy it from the link field.');
    }
  }

  async saveFile(file: CloudShareTorrentFile): Promise<void> {
    const picker = (window as FileSystemPickerWindow).showSaveFilePicker;
    if (!picker) {
      this.alert.error('This browser does not support large-file saving. Open the link in a Chromium-based browser.');
      return;
    }

    try {
      const handle = await picker.call(window, { suggestedName: this.safeName(file.name) });
      this.isSaving = true;
      this.transferStatus = `Saving ${file.name}...`;
      await this.streamFileToHandle(file, handle);
      this.transferStatus = 'Download complete.';
      this.alert.success('File saved.');
      this.savedFilePaths.add(file.path);
      await this.reportDownloadIfComplete();
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('[CloudShare] Could not save file', error);
        this.alert.error(this.getErrorMessage(error, 'Could not save the file.'));
      }
    } finally {
      this.isSaving = false;
    }
  }

  async saveFolder(): Promise<void> {
    const picker = (window as FileSystemPickerWindow).showDirectoryPicker;
    if (!picker) {
      this.alert.error('Folder saving is not supported in this browser. Open the link in a Chromium-based browser.');
      return;
    }

    try {
      const root = await picker.call(window);
      this.isSaving = true;
      for (let index = 0; index < this.torrentFiles.length; index++) {
        const file = this.torrentFiles[index];
        this.transferStatus = `Saving ${index + 1} of ${this.torrentFiles.length}: ${file.path}`;
        const pathParts = file.path.split(/[\\/]/).filter((part) => part && part !== '.' && part !== '..');
        const fileName = this.safeName(pathParts.pop() || file.name);
        let directory = root;
        for (const part of pathParts) {
          directory = await directory.getDirectoryHandle(this.safeName(part), { create: true });
        }
        const handle = await directory.getFileHandle(fileName, { create: true });
        await this.streamFileToHandle(file, handle);
      }
      this.transferStatus = 'Folder download complete.';
      this.alert.success('Folder saved.');
      this.receivedShareSaved = true;
      await this.reportDownload();
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('[CloudShare] Could not save folder', error);
        this.alert.error(this.getErrorMessage(error, 'Could not save the folder.'));
      }
    } finally {
      this.isSaving = false;
    }
  }

  formatSize(value: number | string): string {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** unit).toFixed(unit ? 2 : 0)} ${units[unit]}`;
  }

  isSeeding(share: CloudShareRecord): boolean {
    return !!share.infoHash && this.cloudShare.isLocallySeeding(share.infoHash);
  }

  canCopyShare(share: CloudShareRecord): boolean {
    if (share.status === 'failed') {
      return false;
    }
    if (share.shareId === this.activeOutgoingShareId) {
      return this.isPreparing || !!this.activeOutgoingTorrent;
    }
    return this.isSeeding(share);
  }

  isCurrentPreparedShare(share: CloudShareRecord): boolean {
    return share.shareId === this.activeOutgoingShareId && !this.activeShareStarted;
  }

  private async loadHistory(): Promise<void> {
    this.isLoading = true;
    try {
      this.history = await this.cloudShare.listShares();
    } catch (error) {
      console.error('[CloudShare] Could not load history', error);
      this.alert.error(this.getErrorMessage(error, 'Could not load CloudShare history.'));
    } finally {
      this.isLoading = false;
    }
  }

  private async loadPublicShare(): Promise<void> {
    this.isLoading = true;
    try {
      this.publicShare = await this.cloudShare.getPublicShare(this.shareId!);
      while (this.publicShare.status === 'pending') {
        this.transferStatus = 'The sender is preparing the share. This page will connect automatically when it is ready.';
        await new Promise((resolve) => setTimeout(resolve, 2000));
        this.publicShare = await this.cloudShare.getPublicShare(this.shareId!);
      }
      if (!['ready', 'in_progress'].includes(this.publicShare.status) || !this.publicShare.infoHash) {
        throw new Error('The sender has not made this share available.');
      }
      this.isConnecting = true;
      this.transferStatus = 'Connecting to the sender... Keep this page open during the transfer.';
      this.torrent = await this.cloudShare.joinShare(this.publicShare.infoHash);
      const torrent = this.torrent;
      const onTorrentReady = () => {
        this.torrentFiles = [...torrent.files];
        this.isConnecting = false;
        this.transferProgress = Math.round(torrent.progress * 100);
        this.transferStatus = torrent.numPeers
          ? `Connected to ${torrent.numPeers} peer(s).`
          : 'Waiting for the sender to connect... Keep this page open.';
      };
      if (torrent.ready) {
        onTorrentReady();
      } else {
        torrent.once('ready', onTorrentReady);
      }
      torrent.on('wire', () => {
        this.isConnecting = false;
        this.transferStatus = `Connected to ${torrent.numPeers} peer(s).`;
      });
      torrent.on('download', () => {
        this.transferProgress = Math.round(torrent.progress * 100);
        void this.reportShareStarted();
      });
      torrent.on('noPeers', () => {
        this.transferStatus = 'No sender is online. If they refreshed or closed MyStudio, ask them to reopen the link and reselect the files.';
      });
      torrent.on('error', (error: Error) => {
        console.error('[CloudShare] Transfer failed', error);
        this.isConnecting = false;
        this.transferStatus = 'The peer-to-peer connection failed.';
        this.alert.error(error.message || 'The peer-to-peer connection failed.');
      });
    } catch (error) {
      console.error('[CloudShare] Could not open public share', error);
      this.transferStatus = this.getErrorMessage(error, 'This share link is unavailable.');
    } finally {
      this.isLoading = false;
    }
  }

  private prepareTorrentPaths(files: File[]): void {
    for (const file of files) {
      if (!file.webkitRelativePath) {
        continue;
      }
      Object.defineProperty(file, 'fullPath', {
        configurable: true,
        value: file.webkitRelativePath
      });
    }
  }

  private getDisplayName(files: File[]): string {
    const firstRelativePath = files[0].webkitRelativePath;
    if (firstRelativePath) {
      return firstRelativePath.split('/')[0] || files[0].name;
    }
    return files.length === 1 ? files[0].name : `${files.length} files`;
  }

  private getShareUrl(shareId: string): string {
    return `${window.location.origin}/cloud-share/${shareId}`;
  }

  private updateHistory(share: CloudShareRecord): void {
    this.history = this.history.map((item) => item.shareId === share.shareId ? share : item);
  }

  private async discardPreparedShare(): Promise<void> {
    if (this.activeShareStarted || this.isShareLocked) {
      throw new Error('A receiver has already started this share.');
    }

    this.stopCompletionPolling();
    const previousShareId = this.activeOutgoingShareId;
    const previousTorrent = this.activeOutgoingTorrent;
    this.activeOutgoingShareId = undefined;
    this.activeOutgoingTorrent = undefined;
    this.isSeedingLatest = false;

    if (previousTorrent) {
      await this.cloudShare.stopTorrent(previousTorrent);
    }
    if (previousShareId) {
      await this.cloudShare.deleteShare(previousShareId);
      this.history = this.history.filter((share) => share.shareId !== previousShareId);
    }

    this.latestShareId = '';
    this.latestShareUrl = '';
    this.hashProgress = 0;
    this.senderProgress = 0;
    this.senderPeerCount = 0;
  }

  private startCompletionPolling(): void {
    this.stopCompletionPolling();
    void this.checkShareCompletion();
    this.completionPoll = setInterval(() => void this.checkShareCompletion(), 3000);
  }

  private async checkShareCompletion(): Promise<void> {
    const shareId = this.activeOutgoingShareId;
    if (!shareId || this.completionCheckInProgress) {
      return;
    }

    this.completionCheckInProgress = true;
    try {
      const shares = await this.cloudShare.listShares();
      const activeShare = shares.find((share) => share.shareId === shareId);
      if (!activeShare) {
        this.releaseShareLock();
        return;
      }

      this.updateHistory(activeShare);
      if (activeShare.status === 'in_progress') {
        this.activeShareStarted = true;
        this.isShareLocked = true;
      }
      if (Number(activeShare.downloadCount) > this.activeShareDownloadCount) {
        this.releaseShareLock();
        this.alert.success('The receiver saved the file. You can create another share now.');
      }
    } catch (error) {
      console.error('[CloudShare] Could not check whether the receiver saved the file', error);
      if (!this.completionWarningShown) {
        this.completionWarningShown = true;
        this.alert.warning('Could not confirm when the receiver saves the file. CloudShare will keep checking.');
      }
    } finally {
      this.completionCheckInProgress = false;
    }
  }

  private releaseShareLock(): void {
    this.stopCompletionPolling();
    this.isShareLocked = false;
    this.activeOutgoingShareId = undefined;
    this.activeOutgoingTorrent = undefined;
    this.activeShareStarted = false;
    this.completionWarningShown = false;
  }

  private stopCompletionPolling(): void {
    if (this.completionPoll) {
      clearInterval(this.completionPoll);
      this.completionPoll = undefined;
    }
  }

  private async streamFileToHandle(file: CloudShareTorrentFile, handle: SaveFileHandle): Promise<void> {
    const writable = await handle.createWritable();
    try {
      for await (const chunk of file.createReadStream()) {
        await writable.write(chunk);
      }
      await writable.close();
    } catch (error) {
      await writable.abort?.();
      throw error;
    }
  }

  private async reportDownload(): Promise<void> {
    if (!this.shareId || this.downloadReported || !this.receivedShareSaved) {
      return;
    }
    try {
      await this.cloudShare.recordDownload(this.shareId);
      this.downloadReported = true;
    } catch (error) {
      console.error('[CloudShare] Download succeeded, but its history could not be updated', error);
      this.alert.warning('The file was saved, but the download count could not be updated.');
    }
  }

  private async reportDownloadIfComplete(): Promise<void> {
    if (this.torrentFiles.every((file) => this.savedFilePaths.has(file.path))) {
      this.receivedShareSaved = true;
      await this.reportDownload();
    }
  }

  private async reportShareStarted(): Promise<void> {
    if (!this.shareId || this.receiverStartReported || this.receiverStartReportInProgress) {
      return;
    }

    this.receiverStartReportInProgress = true;
    try {
      await this.cloudShare.markShareStarted(this.shareId);
      this.receiverStartReported = true;
    } catch (error) {
      console.error('[CloudShare] Could not report that receiving has started', error);
      this.alert.warning('Receiving has started, but the sender may not see the in-progress status yet.');
    } finally {
      this.receiverStartReportInProgress = false;
    }
  }

  private safeName(name: string): string {
    return name.replace(/[<>:"|?*\u0000-\u001f]/g, '_').trim() || 'download';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const responseError = (error as { error?: { error?: string; message?: string } }).error;
      if (responseError?.error || responseError?.message) {
        return responseError.error || responseError.message || fallback;
      }
    }
    return error instanceof Error ? error.message : fallback;
  }
}
