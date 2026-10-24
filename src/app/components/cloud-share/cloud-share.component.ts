import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  CloudShareRecord,
  CloudShareBranding,
  CloudShareService,
  CloudShareTorrent,
  CloudShareTorrentFile,
  MAX_SHARE_BYTES
} from '../../services/cloud-share.service';
import { AlertService } from '../../services/alert.service';

const LARGE_SHARE_THRESHOLD_BYTES = 5 * 1024 ** 3;
const PEER_DISCONNECT_GRACE_MS = 2500;

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
  isDropZoneActive = false;
  hashProgress = 0;
  hashedBytes = 0;
  latestShareName = '';
  senderProgress = 0;
  senderPeerCount = 0;
  isSeedingLatest = false;
  isShareLocked = false;
  isConnecting = false;
  isSaving = false;
  largeFileChoiceRequired = false;
  isShareSuccessModalOpen = false;
  isErrorModalOpen = false;
  isConnectionModalOpen = false;
  isDeleteModalOpen = false;
  modalClosing = false;
  errorModalMessage = '';
  errorModalTitle = 'Error Processing File';
  connectionModalDescription = 'Waiting for MyStudio to connect. Please keep this page open.';
  preparingTotalBytes = 0;
  transferStatus = 'Waiting for the sender to connect...';
  transferProgress = 0;
  transferSpeed = 0;
  senderUploadSpeed = 0;
  studioName = 'MY STUDIO';
  studioIcon = '';
  studioPhone = '';
  studioAddress = '';
  studioInstagramUrl = '';
  studioFacebookUrl = '';
  studioYoutubeUrl = '';
  shareId?: string;
  private downloadReported = false;
  private receivedShareSaved = false;
  private readonly savedFilePaths = new Set<string>();
  activeOutgoingShareId?: string;
  private activeOutgoingTorrent?: CloudShareTorrent;
  private activeShareStarted = false;
  private outgoingGeneration = 0;
  private receiverStartReported = false;
  private receiverStartReportInProgress = false;
  receiverDownloadStarted = false;
  private receiverWasConnected = false;
  private senderWasConnected = false;
  private lastReceiverPeerCount = 0;
  private lastSenderPeerCount = 0;
  private receiverDisconnectTimer?: ReturnType<typeof setTimeout>;
  private senderDisconnectTimer?: ReturnType<typeof setTimeout>;
  private receiverFailureInProgress = false;
  private receiverGeneration = 0;
  private connectionMonitor?: ReturnType<typeof setInterval>;
  private activeShareDownloadCount = 0;
  private completionPoll?: ReturnType<typeof setInterval>;
  private completionCheckInProgress = false;
  private completionWarningShown = false;
  private receiverInactivityTimer?: ReturnType<typeof setTimeout>;
  pendingDeleteShare?: CloudShareRecord;
  private copiedLinkResetTimer?: ReturnType<typeof setTimeout>;
  private modalCloseTimer?: ReturnType<typeof setTimeout>;
  modalCopied = false;
  private electronActiveShares: Record<string, any> = {};

  constructor(
    private readonly route: ActivatedRoute,
    private readonly cloudShare: CloudShareService,
    private readonly alert: AlertService
  ) { }

  // ngOnInit(): void {
  //   this.shareId = this.route.snapshot.paramMap.get('shareId') ?? undefined;
  //   this.startConnectionMonitoring();
  //   if (this.shareId) {
  //     void this.loadPublicShare();
  //     return;
  //   }
  //   this.loadStudioBrandingFromStorage();
  //   void this.loadHistory();
  // }

  async ngOnInit(): Promise<void> {
    this.shareId = this.route.snapshot.paramMap.get('shareId') ?? undefined;
    this.startConnectionMonitoring();
    // If in Electron, fetch active local seeds
    const electron = (window as any).electronAPI;
    if (electron?.isElectron) {
      this.electronActiveShares = await electron.getActiveLocalShares().catch(() => ({}));
    }
    if (this.shareId) {
      void this.loadPublicShare();
      return;
    }
    this.loadStudioBrandingFromStorage();
    void this.loadHistory();
  }

  isSeeding(share: CloudShareRecord): boolean {
    if (!share.infoHash) return false;
    // Active if seeded in browser OR actively seeded in Electron background
    const isBrowserSeeding = this.cloudShare.isLocallySeeding(share.infoHash);
    const isDesktopSeeding = !!this.electronActiveShares[share.shareId];
    return isBrowserSeeding || isDesktopSeeding;
  }
  canCopyShare(share: CloudShareRecord): boolean {
    if (share.status === 'failed') {
      return false;
    }
    if (share.shareId === this.activeOutgoingShareId) {
      return this.isPreparing || !!this.activeOutgoingTorrent;
    }
    // If status is pending but not currently preparing, it's expired -> disable copy
    if (share.status === 'pending') {
      return false;
    }
    return this.isSeeding(share);
  }

  ngOnDestroy(): void {
    this.receiverGeneration++;
    this.stopCompletionPolling();
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
    }
    this.clearPeerDisconnectTimers();
    this.clearReceiverInactivityTimer();
    if (this.copiedLinkResetTimer) {
      clearTimeout(this.copiedLinkResetTimer);
    }
    if (this.modalCloseTimer) {
      clearTimeout(this.modalCloseTimer);
    }
    if (this.shareId && this.torrent) {
      void this.cloudShare.stopTorrent(this.torrent).catch((error) => {
        console.error('[CloudShare] Could not stop the receiver transfer during cleanup', error);
      });
    }
  }

  private async writeFolderToDirectory(root: DirectoryHandle, streamWhileReceiving = false): Promise<void> {
    for (let index = 0; index < this.torrentFiles.length; index++) {
      const file = this.torrentFiles[index];
      this.transferStatus = streamWhileReceiving
        ? `Downloading and saving ${index + 1} of ${this.torrentFiles.length}: ${file.path}`
        : `Saving ${index + 1} of ${this.torrentFiles.length}: ${file.path}`;
      const pathParts = file.path.split(/[\\/]/).filter((part) => part && part !== '.' && part !== '..');
      const fileName = this.safeName(pathParts.pop() || file.name);
      let directory = root;
      for (const part of pathParts) {
        directory = await directory.getDirectoryHandle(this.safeName(part), { create: true });
      }
      const handle = await directory.getFileHandle(fileName, { create: true });
      if (streamWhileReceiving) {
        file.select();
        this.torrent?.resume();
      }
      try {
        await this.streamFileToHandle(file, handle);
      } finally {
        if (streamWhileReceiving) {
          file.deselect();
        }
      }
      this.savedFilePaths.add(file.path);
    }
  }

  @HostListener('window:offline')
  onNetworkOffline(): void {
    if (this.shareId && !this.receivedShareSaved) {
      this.showConnectionDelayedModal('Your internet connection was lost. Waiting for network to resume...');
    } else if (this.senderWasConnected && this.activeShareStarted) {
      this.showConnectionDelayedModal('Your internet connection was lost during the transfer. The receiver has been notified.');
    }
  }

  @HostListener('window:online')
  onNetworkOnline(): void {
    if (this.shareId && !this.receivedShareSaved) {
      this.closeConnectionModal();
      if (this.largeFileChoiceRequired) {
        this.transferStatus = 'Choose how you would like to receive this large file.';
      } else if (this.transferProgress > 0) {
        this.transferStatus = `Resuming download ${this.publicShare?.name ?? ''}...`;
      }
      this.resetReceiverInactivityTimer();
    } else if (this.senderWasConnected) {
      this.closeConnectionModal();
    }
  }

  @HostListener('window:dragover', ['$event'])
  preventWindowDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  @HostListener('window:drop', ['$event'])
  preventWindowDrop(event: DragEvent): void {
    event.preventDefault();
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
    await this.startShare(files);
  }

    async onFilesDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDropZoneActive = false;
    try {
      const files = await this.readDroppedFiles(event.dataTransfer);
      await this.startShare(files);
    } catch (error) {
      console.error('[CloudShare] Could not read dropped files or folders', error);
      this.showErrorModal(this.getErrorMessage(error, 'Could not read the dropped files or folders.'));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.isPreparing && !this.isShareLocked) {
      this.isDropZoneActive = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDropZoneActive = false;
  }

  private async startShare(files: File[]): Promise<void> {
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
    this.preparingTotalBytes = sizeBytes;
    this.hashProgress = 0;
    this.hashedBytes = 0;
    this.senderProgress = 0;
    this.senderUploadSpeed = 0;
    this.senderPeerCount = 0;
    this.clearSenderDisconnectTimer();
    this.clearReceiverDisconnectTimer();
    this.senderWasConnected = false;
    this.lastSenderPeerCount = 0;
    this.isSeedingLatest = false;
    this.isShareLocked = false;
    let pendingShare: CloudShareRecord | undefined;
    try {
      pendingShare = await this.cloudShare.createShare(name, sizeBytes, this.getStudioBranding());
      if (generation !== this.outgoingGeneration) {
        await this.cloudShare.deleteShare(pendingShare.shareId);
        return;
      }

      this.latestShareId = pendingShare.shareId;
      this.latestShareUrl = this.getShareUrl(pendingShare.shareId);
      this.latestShareName = name;
      this.activeOutgoingShareId = pendingShare.shareId;
      this.activeShareStarted = false;
      this.activeShareDownloadCount = Number(pendingShare.downloadCount) || 0;
      this.history = [pendingShare, ...this.history];

      this.prepareTorrentPaths(files);
      const seed = await this.cloudShare.seedFiles(files, name, (hashedBytes, totalBytes) => {
        if (generation === this.outgoingGeneration) {
          this.hashedBytes = hashedBytes;
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
        this.senderUploadSpeed = seed.torrent.uploadSpeed;
      });
      seed.torrent.on('wire', () => {
        if (generation !== this.outgoingGeneration) return;
        this.senderWasConnected = seed.torrent.numPeers > 0;
        this.senderPeerCount = seed.torrent.numPeers;
        this.lastSenderPeerCount = seed.torrent.numPeers;
      });
      seed.torrent.on('noPeers', () => {
        if (generation !== this.outgoingGeneration) return;
        const hasPeers = seed.torrent.numPeers > 0;
        if (hasPeers) {
          this.clearSenderDisconnectTimer();
        } else if (this.senderWasConnected && this.activeShareStarted) {
          this.scheduleSenderDisconnectCheck(seed.torrent);
        }
        this.senderPeerCount = seed.torrent.numPeers;
        this.lastSenderPeerCount = seed.torrent.numPeers;
        if (!hasPeers) {
          this.senderUploadSpeed = 0;
        }
      });
      const torrent = await seed.seeded;
      if (generation !== this.outgoingGeneration) {
        await this.cloudShare.stopTorrent(torrent);
        await this.cloudShare.deleteShare(pendingShare.shareId);
        return;
      }
      if (!torrent.infoHash) {
        throw new Error('WebTorrent finished seeding without an info hash.');
      }
      this.isSeedingLatest = true;
      const readyShare = await this.cloudShare.completeShare(pendingShare.shareId, torrent.infoHash);
      this.updateHistory(readyShare);;

      const electron = (window as any).electronAPI;
      if (electron?.isElectron) {
        const localDiskPath = this.getLocalDiskPath(files);
        if (localDiskPath) {
          await electron.startBackgroundSeed({
            shareId: readyShare.shareId,
            localPath: localDiskPath,
            name: name,
            sizeBytes: sizeBytes,
            infoHash: torrent.infoHash
          });
          this.electronActiveShares[readyShare.shareId] = true;
        }
      }

      this.startCompletionPolling();
      this.isShareSuccessModalOpen = true;
    } catch (error) {
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
      console.error('[CloudShare] Could not prepare the share', error);
      if (pendingShare) {
        try {
          await this.cloudShare.failShare(pendingShare.shareId);
        } catch (failError) {
          console.error('[CloudShare] Could not mark failed share', failError);
        }
        this.updateHistory({ ...pendingShare, status: 'failed' });
      }
      this.showErrorModal(this.getErrorMessage(error, 'Could not create the CloudShare link.'));
    } finally {
      if (generation === this.outgoingGeneration) {
        this.isPreparing = false;
      }
    }
  }

  requestDeleteShare(share: CloudShareRecord): void {
    this.pendingDeleteShare = share;
    this.isDeleteModalOpen = true;
  }

  cancelDeleteShare(): void {
    this.dismissModal(() => {
      this.isDeleteModalOpen = false;
      this.pendingDeleteShare = undefined;
    });
  }

  async confirmDeleteShare(): Promise<void> {
    const share = this.pendingDeleteShare;
    if (!share) {
      return;
    }
    this.dismissModal(() => {
      this.isDeleteModalOpen = false;
      this.pendingDeleteShare = undefined;
    });
    try {
      await this.cloudShare.deleteShare(share.shareId);
      if (share.infoHash) {
        await this.cloudShare.stopSeeding(share.infoHash);
      }
      const electron = (window as any).electronAPI;
      if (electron?.isElectron) {
        await electron.removeBackgroundSeed(share.shareId).catch(() => {});
        delete this.electronActiveShares[share.shareId];
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

  closeShareSuccessModal(): void {
    this.dismissModal(() => this.isShareSuccessModalOpen = false);
  }

  closeErrorModal(): void {
    this.dismissModal(() => this.isErrorModalOpen = false);
  }

  closeConnectionModal(): void {
    this.dismissModal(() => this.isConnectionModalOpen = false);
  }

  async copyLatestShareLink(): Promise<void> {
    if (!this.latestShareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.latestShareUrl);
      this.modalCopied = true;
      if (this.copiedLinkResetTimer) {
        clearTimeout(this.copiedLinkResetTimer);
      }
      this.copiedLinkResetTimer = setTimeout(() => {
        this.modalCopied = false;
      }, 2000);
    } catch (error) {
      console.error('[CloudShare] Clipboard access failed', error);
      this.alert.warning('Clipboard access was blocked. Copy the link from the field.');
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

    let transferStarted = false;
    try {
      const handle = await picker.call(window, { suggestedName: this.safeName(file.name) });
      this.isSaving = true;
      this.transferStatus = `Saving ${file.name}...`;
      transferStarted = true;
      await this.streamFileToHandle(file, handle);
      this.transferStatus = 'Download complete.';
      this.alert.success('File saved.');
      this.savedFilePaths.add(file.path);
      await this.reportDownloadIfComplete();
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError' || transferStarted) {
        console.error('[CloudShare] Could not save file', error);
        await this.resetReceiverAfterFailure(
          `${this.getErrorMessage(error, 'Could not save the file.')} The download was reset to 0%.`
        );
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

    let transferStarted = false;
    try {
      const root = await picker.call(window);
      this.isSaving = true;
      transferStarted = true;
      await this.writeFolderToDirectory(root);
      this.transferStatus = 'Folder download complete.';
      this.alert.success('Folder saved.');
      this.receivedShareSaved = true;
      await this.reportDownload();
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError' || transferStarted) {
        console.error('[CloudShare] Could not save folder', error);
        await this.resetReceiverAfterFailure(
          `${this.getErrorMessage(error, 'Could not save the folder.')} The download was reset to 0%.`
        );
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

  formatTransferSpeed(bytesPerSecond: number): string {
    if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
      return '0 KB/s';
    }
    const kbPerSecond = bytesPerSecond / 1024;
    return kbPerSecond >= 1024
      ? `${(kbPerSecond / 1024).toFixed(1)} MB/s`
      : `${Math.round(kbPerSecond)} KB/s`;
  }

  get isLargeShare(): boolean {
    return Number(this.publicShare?.sizeBytes) > LARGE_SHARE_THRESHOLD_BYTES;
  }

  continueLargeDownloadInBrowser(): void {
    if (!this.torrent || !this.largeFileChoiceRequired || this.isSaving) {
      return;
    }
    this.receiverDownloadStarted = true;
    for (const file of this.torrentFiles) {
      file.select();
    }
    this.torrent.resume();
    this.largeFileChoiceRequired = false;
    this.transferStatus = 'Downloading in this browser...';
  }

  startBrowserDownload(): void {
    if (!this.torrent || !this.torrentFiles.length || this.receiverDownloadStarted || this.isSaving) {
      return;
    }
    this.receiverDownloadStarted = true;
    for (const file of this.torrentFiles) {
      file.select();
    }
    this.torrent.resume();
    this.transferStatus = 'Downloading the selected files...';
  }

  async retryReceiving(): Promise<void> {
    if (!this.shareId || this.isConnecting || this.isSaving) {
      return;
    }
    this.isErrorModalOpen = false;
    if (this.torrent) {
      try {
        await this.cloudShare.stopTorrent(this.torrent);
      } catch (error) {
        console.error('[CloudShare] Could not clear the failed receiver transfer', error);
      }
    }
    this.torrent = undefined;
    this.torrentFiles = [];
    this.transferProgress = 0;
    this.transferSpeed = 0;
    this.receiverDownloadStarted = false;
    this.receiverWasConnected = false;
    this.receivedShareSaved = false;
    this.savedFilePaths.clear();
    this.largeFileChoiceRequired = false;
    this.transferStatus = 'Restarting the download from the beginning...';
    await this.loadPublicShare();
  }

  async saveLargeShareDirectly(): Promise<void> {
    if (!this.torrent || !this.torrentFiles.length || !this.largeFileChoiceRequired) {
      return;
    }
    const pickerWindow = window as FileSystemPickerWindow;
    const firstFile = this.torrentFiles[0];
    const isSingleFile = this.torrentFiles.length === 1;
    if (isSingleFile && !pickerWindow.showSaveFilePicker) {
      this.alert.error('Direct-to-device streaming requires a Chromium-based browser with file saving support.');
      return;
    }
    if (!isSingleFile && !pickerWindow.showDirectoryPicker) {
      this.alert.error('Direct folder streaming requires a Chromium-based browser with folder saving support.');
      return;
    }

    let transferStarted = false;
    try {
      const fileHandle = isSingleFile
        ? await pickerWindow.showSaveFilePicker!.call(window, {
          suggestedName: this.safeName(firstFile.name)
        })
        : undefined;
      const directoryHandle = isSingleFile
        ? undefined
        : await pickerWindow.showDirectoryPicker!.call(window);

      this.isSaving = true;
      this.largeFileChoiceRequired = false;
      this.receiverDownloadStarted = true;
      transferStarted = true;
      if (fileHandle) {
        const file = this.torrentFiles[0];
        file.select();
        this.torrent.resume();
        this.transferStatus = `Downloading ${file.name} directly to your device...`;
        await this.streamFileToHandle(file, fileHandle);
        file.deselect();
        this.savedFilePaths.add(file.path);
      } else if (directoryHandle) {
        this.torrent.resume();
        await this.writeFolderToDirectory(directoryHandle, true);
      }

      this.receivedShareSaved = true;
      this.transferStatus = 'Download complete.';
      this.alert.success(isSingleFile ? 'File saved.' : 'Folder saved.');
      await this.reportDownload();
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError' || transferStarted) {
        console.error('[CloudShare] Could not stream the large share to disk', error);
        await this.resetReceiverAfterFailure(
          this.getErrorMessage(error, 'Could not save the large share. The transfer was reset.')
        );
      }
      for (const file of this.torrentFiles) {
        file.deselect();
      }
      if ((error as DOMException)?.name === 'AbortError' && !transferStarted) {
        this.largeFileChoiceRequired = true;
      }
    } finally {
      this.isSaving = false;
    }
  }

  // isSeeding(share: CloudShareRecord): boolean {
  //   return !!share.infoHash && this.cloudShare.isLocallySeeding(share.infoHash);
  // }

  getSenderTransferState(): string {
    if (this.isPreparing) {
      return 'Preparing the file for sharing';
    }
    if (!this.isSeedingLatest) {
      return 'Share link is not active';
    }
    if (this.senderPeerCount > 0 && this.senderProgress > 0) {
      return `Sending to ${this.senderPeerCount} user(s) · ${this.senderProgress}% uploaded`;
    }
    if (this.senderPeerCount > 0) {
      return `Connected to ${this.senderPeerCount} user(s) · waiting for transfer`;
    }
    if (this.senderProgress > 0) {
      return `Transfer paused · ${this.senderProgress}% uploaded so far`;
    }
    return 'Link ready · waiting for a receiver';
  }

  getReceiverTransferState(): string {
    if (this.transferProgress >= 100) {
      return 'File received · save it to your device';
    }
    if (this.transferProgress > 0 && this.torrent?.numPeers) {
      return `Receiving from ${this.torrent.numPeers} user(s) · ${this.transferProgress}%`;
    }
    if (this.transferProgress > 0) {
      return `Transfer paused · ${this.transferProgress}% received so far`;
    }
    if (this.torrent?.numPeers) {
      return `Connected to ${this.torrent.numPeers} user(s) · receiving will start shortly`;
    }
    return this.transferStatus;
  }

  // canCopyShare(share: CloudShareRecord): boolean {
  //   if (share.status === 'failed') {
  //     return false;
  //   }
  //   if (share.shareId === this.activeOutgoingShareId) {
  //     return this.isPreparing || !!this.activeOutgoingTorrent;
  //   }
  //   return this.isSeeding(share);
  // }

  isShareConnected(share: CloudShareRecord): boolean {
    return share.shareId === this.activeOutgoingShareId && this.senderPeerCount > 0;
  }


  getHistoryStatus(share: CloudShareRecord): string {
    if (share.status === 'failed') {
      return 'Failed';
    }
    if (share.status === 'pending') {
      // Only return 'Preparing' if this share is ACTIVELY being hashed right now
      if (share.shareId === this.activeOutgoingShareId && this.isPreparing) {
        return 'Preparing';
      }
      return 'Expired';
    }
    if (this.isShareConnected(share)) {
      const peerLabel = this.senderPeerCount === 1 ? 'User' : 'Users';
      return `${this.senderPeerCount} ${peerLabel} connected`;
    }
    return 'Ready to Share';
  }

  // getHistoryStatus(share: CloudShareRecord): string {
  //   if (share.status === 'failed') {
  //     return 'Failed';
  //   }
  //   if (share.status === 'pending') {
  //     return 'Preparing';
  //   }
  //   if (this.isShareConnected(share)) {
  //     const peerLabel = this.senderPeerCount === 1 ? 'User' : 'Users';
  //     return `${this.senderPeerCount} ${peerLabel} connected`;
  //   }
  //   return 'Ready to Share';
  // }

  isCurrentPreparedShare(share: CloudShareRecord): boolean {
    return share.shareId === this.activeOutgoingShareId && !this.activeShareStarted;
  }

  private async loadHistory(): Promise<void> {
    this.isLoading = true;
    try {
      this.history = await this.cloudShare.listShares();
      for (const share of this.history) {
        if (share.status === 'pending' && share.shareId !== this.activeOutgoingShareId) {
          share.status = 'failed';
          void this.cloudShare.failShare(share.shareId).catch(() => {});
        }
      }
    } catch (error) {
      console.error('[CloudShare] Could not load history', error);
      this.alert.error(this.getErrorMessage(error, 'Could not load CloudShare history.'));
    } finally {
      this.isLoading = false;
    }
  }

  private async loadPublicShare(): Promise<void> {
    const generation = ++this.receiverGeneration;
    this.isLoading = true;
    try {
      this.publicShare = await this.cloudShare.getPublicShare(this.shareId!);
      this.applyStudioBranding(this.publicShare);
      while (this.publicShare.status === 'pending') {
        if (generation !== this.receiverGeneration) return;
        this.transferStatus = 'The sender is preparing the share. This page will connect automatically when it is ready.';
        await new Promise((resolve) => setTimeout(resolve, 2000));
        this.publicShare = await this.cloudShare.getPublicShare(this.shareId!);
        this.applyStudioBranding(this.publicShare);
      }
      if (generation !== this.receiverGeneration) return;
      if (!['ready', 'in_progress'].includes(this.publicShare.status) || !this.publicShare.infoHash) {
        throw new Error('The sender has not made this share available.');
      }
      this.isConnecting = true;
      this.transferStatus = 'Connecting to the sender... Keep this page open during the transfer.';
      this.torrent = await this.cloudShare.joinShare(this.publicShare.infoHash, true);
      if (generation !== this.receiverGeneration) {
        await this.cloudShare.stopTorrent(this.torrent);
        return;
      }
      const torrent = this.torrent;
      this.resetReceiverInactivityTimer();
      const onTorrentReady = () => {
        if (generation !== this.receiverGeneration) return;
        this.torrentFiles = [...torrent.files];
        this.isConnecting = false;
        for (const file of this.torrentFiles) {
          file.deselect();
        }
        this.transferProgress = this.receiverDownloadStarted ? Math.min(99, Math.floor(torrent.progress * 100)) : 0;
        this.transferSpeed = 0;
        if (this.isLargeShare) {
          this.largeFileChoiceRequired = true;
          this.transferStatus = 'Large file detected. Choose how you would like to receive it.';
          return;
        }
        this.transferStatus = torrent.numPeers
          ? 'File ready. Choose Download to start receiving it.'
          : 'File ready. Waiting for the sender; choose Download when you are ready.';
      };
      if (torrent.ready) {
        onTorrentReady();
      } else {
        torrent.once('ready', onTorrentReady);
      }
      torrent.on('wire', () => {
        if (generation !== this.receiverGeneration) return;
        this.isConnecting = false;
        this.receiverWasConnected = true;
        this.lastReceiverPeerCount = torrent.numPeers;
        this.resetReceiverInactivityTimer();
        this.transferStatus = this.largeFileChoiceRequired
          ? 'Connected. Choose how you would like to receive this large file.'
          : this.receiverDownloadStarted
            ? `Connected to ${torrent.numPeers} user(s).`
            : 'Sender connected. Choose Download to start receiving the file.';
      });
      torrent.on('download', () => {
        if (generation !== this.receiverGeneration || !this.receiverDownloadStarted) return;
        this.transferProgress = Math.min(99, Math.floor(torrent.progress * 100));
        this.transferSpeed = torrent.downloadSpeed;
        this.resetReceiverInactivityTimer();
        void this.reportShareStarted();
      });
      torrent.on('noPeers', () => {
        if (generation !== this.receiverGeneration) return;
        if (torrent.numPeers > 0) return;
        this.transferStatus = this.largeFileChoiceRequired
          ? 'Waiting for the sender. Choose a receive method when they are online.'
          : this.receiverDownloadStarted
            ? 'Connection interrupted. Waiting for the sender to reconnect...'
            : 'Waiting for the sender to connect...';
      });
      torrent.on('done', () => {
        if (generation !== this.receiverGeneration) return;
        this.transferProgress = 100;
        this.transferSpeed = 0;
        this.transferStatus = this.isSaving
          ? 'Transfer complete. Finishing the save to your device...'
          : 'Transfer Complete! Your files are ready to be saved to your device.';
        this.clearReceiverInactivityTimer();
      });
      torrent.on('error', (error: Error) => {
        if (generation !== this.receiverGeneration) return;
        console.error('[CloudShare] Transfer failed', error);
        void this.resetReceiverAfterFailure(
          `${error.message || 'The connection failed unexpectedly.'} The sender may have refreshed or closed their page. The download was reset to 0%.`
        );
      });
    } catch (error) {
      if (generation !== this.receiverGeneration) return;
      console.error('[CloudShare] Could not open public share', error);
      this.transferStatus = this.getErrorMessage(error, 'This share link is unavailable.');
      this.showErrorModal(this.transferStatus);
    } finally {
      if (generation === this.receiverGeneration) {
        this.isLoading = false;
      }
    }
  }

  private startConnectionMonitoring(): void {
    this.connectionMonitor = setInterval(() => {
      const senderTorrent = this.activeOutgoingTorrent;
      if (senderTorrent) {
        const senderPeerCount = senderTorrent.numPeers;
        this.senderPeerCount = senderPeerCount;
        this.senderUploadSpeed = senderTorrent.uploadSpeed;
        if (senderTorrent.length > 0) {
          this.senderProgress = Math.min(100, Math.floor((senderTorrent.uploaded / senderTorrent.length) * 100));
        }
        if (senderPeerCount > 0) {
          this.clearSenderDisconnectTimer();
          this.senderWasConnected = true;
          this.lastSenderPeerCount = senderPeerCount;
        } else if (this.lastSenderPeerCount > 0 && this.senderWasConnected && this.activeShareStarted) {
          this.scheduleSenderDisconnectCheck(senderTorrent);
        }
      }

      const receiverTorrent = this.torrent;
      if (!receiverTorrent) {
        return;
      }
      if (this.receiverDownloadStarted) {
        this.transferProgress = Math.min(99, Math.floor(receiverTorrent.progress * 100));
        this.transferSpeed = receiverTorrent.downloadSpeed;
      }
      const receiverPeerCount = receiverTorrent.numPeers;
      if (receiverPeerCount > 0) {
        this.clearReceiverDisconnectTimer();
        this.receiverWasConnected = true;
        this.lastReceiverPeerCount = receiverPeerCount;
        if (this.receiverDownloadStarted && this.transferProgress < 100) {
          this.transferStatus = `Receiving from ${receiverPeerCount} user(s)...`;
        }
      } else if (this.receiverDownloadStarted && !this.receiverWasConnected && this.transferProgress < 100) {
        this.transferStatus = 'Waiting for the sender to connect...';
      } else if (this.lastReceiverPeerCount > 0 && this.receiverWasConnected
        && this.receiverDownloadStarted && this.transferProgress < 100) {
        this.scheduleReceiverDisconnectCheck(receiverTorrent);
      }
    }, 500);
  }

  private scheduleSenderDisconnectCheck(torrent: CloudShareTorrent): void {
    if (this.senderDisconnectTimer) {
      return;
    }
    this.senderDisconnectTimer = setTimeout(() => {
      this.senderDisconnectTimer = undefined;
      if (this.activeOutgoingTorrent !== torrent || torrent.numPeers > 0) {
        return;
      }
      this.senderWasConnected = false;
      this.lastSenderPeerCount = 0;
      this.senderPeerCount = 0;
      this.senderUploadSpeed = 0;
      this.showConnectionDelayedModal(
        'The receiver went offline during the transfer. The download was reset on their side; they can retry when your share is online.'
      );
    }, PEER_DISCONNECT_GRACE_MS);
  }

  private scheduleReceiverDisconnectCheck(torrent: CloudShareTorrent): void {
    if (this.receiverDisconnectTimer) {
      return;
    }
    this.receiverDisconnectTimer = setTimeout(() => {
      this.receiverDisconnectTimer = undefined;
      if (this.torrent !== torrent || torrent.numPeers > 0 || !this.receiverDownloadStarted
        || this.transferProgress >= 100) {
        return;
      }
      this.receiverWasConnected = false;
      this.lastReceiverPeerCount = 0;
      void this.resetReceiverAfterFailure(
        'The sender went offline, possibly by refreshing or closing their page, or the connection failed unexpectedly. The download was reset to 0%. Retry when the sender is back online.'
      );
    }, PEER_DISCONNECT_GRACE_MS);
  }

  private clearSenderDisconnectTimer(): void {
    if (this.senderDisconnectTimer) {
      clearTimeout(this.senderDisconnectTimer);
      this.senderDisconnectTimer = undefined;
    }
  }

  private clearReceiverDisconnectTimer(): void {
    if (this.receiverDisconnectTimer) {
      clearTimeout(this.receiverDisconnectTimer);
      this.receiverDisconnectTimer = undefined;
    }
  }

  private clearPeerDisconnectTimers(): void {
    this.clearSenderDisconnectTimer();
    this.clearReceiverDisconnectTimer();
  }

  private async resetReceiverAfterFailure(message: string): Promise<void> {
    if (this.receiverFailureInProgress) {
      return;
    }
    this.receiverFailureInProgress = true;
    this.receiverGeneration++;
    this.clearReceiverDisconnectTimer();
    this.clearReceiverInactivityTimer();
    const failedTorrent = this.torrent;
    this.torrent = undefined;
    this.torrentFiles = [];
    this.isConnecting = false;
    this.receiverDownloadStarted = false;
    this.receiverWasConnected = false;
    this.lastReceiverPeerCount = 0;
    this.transferProgress = 0;
    this.transferSpeed = 0;
    this.largeFileChoiceRequired = false;
    this.receivedShareSaved = false;
    this.savedFilePaths.clear();
    this.transferStatus = message;
    if (failedTorrent) {
      try {
        failedTorrent.pause();
        for (const file of failedTorrent.files) {
          file.deselect();
        }
      } catch (error) {
        console.error('[CloudShare] Could not pause the failed receiver transfer', error);
      }
      try {
        await this.cloudShare.stopTorrent(failedTorrent);
      } catch (error) {
        console.error('[CloudShare] Could not clear the failed receiver transfer', error);
      }
    }
    this.showErrorModal(message);
    this.receiverFailureInProgress = false;
  }

  private loadStudioBrandingFromStorage(): void {
    const storedUserData = localStorage.getItem('userData');
    if (!storedUserData) {
      return;
    }
    try {
      const userData = JSON.parse(storedUserData) as Record<string, unknown>;
      this.studioName = this.readBrandingValue(userData['studio_name']) || this.studioName;
      this.studioIcon = this.readBrandingValue(userData['studio_icon']);
      this.studioPhone = this.readBrandingValue(userData['phone_number']);
      this.studioAddress = this.readBrandingValue(userData['address']);
      this.studioInstagramUrl = this.readBrandingValue(userData['instagram_url']);
      this.studioFacebookUrl = this.readBrandingValue(userData['facebook_url']);
      this.studioYoutubeUrl = this.readBrandingValue(userData['youtube_url']);
    } catch (error) {
      console.error('[CloudShare] Could not read MyStudio branding from local storage', error);
    }
  }

  private applyStudioBranding(share: CloudShareRecord): void {
    this.studioName = this.readBrandingValue(share.studioName) || this.studioName;
    this.studioIcon = this.readBrandingValue(share.studioIcon) || this.studioIcon;
    this.studioPhone = this.readBrandingValue(share.phoneNumber) || this.studioPhone;
    this.studioAddress = this.readBrandingValue(share.address) || this.studioAddress;
    this.studioInstagramUrl = this.readBrandingValue(share.instagramUrl) || this.studioInstagramUrl;
    this.studioFacebookUrl = this.readBrandingValue(share.facebookUrl) || this.studioFacebookUrl;
    this.studioYoutubeUrl = this.readBrandingValue(share.youtubeUrl) || this.studioYoutubeUrl;
  }

  private getStudioBranding(): CloudShareBranding {
    return {
      studioName: this.studioName,
      studioIcon: this.studioIcon,
      phoneNumber: this.studioPhone,
      address: this.studioAddress,
      instagramUrl: this.studioInstagramUrl,
      facebookUrl: this.studioFacebookUrl,
      youtubeUrl: this.studioYoutubeUrl
    };
  }

  private readBrandingValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private prepareTorrentPaths(files: File[]): void {
    for (const file of files) {
      const relativePath = this.getFilePath(file);
      if (relativePath === file.name) {
        continue;
      }
      Object.defineProperty(file, 'fullPath', {
        configurable: true,
        value: relativePath
      });
    }
  }

  private getLocalDiskPath(files: File[]): string {
    const electron = (window as any).electronAPI;
    if (!electron?.isElectron || !files.length) return '';
    const firstFile = files[0];
    const fullFilePath = electron.getPathForFile(firstFile);
    if (!fullFilePath) return '';

    const relativePath = (firstFile as File & { fullPath?: string }).fullPath || firstFile.webkitRelativePath || '';
    if (relativePath && relativePath.includes('/')) {
      const normalizedPath = fullFilePath.replace(/\\/g, '/');
      const normalizedRelative = relativePath.replace(/\\/g, '/');
      const idx = normalizedPath.lastIndexOf('/' + normalizedRelative);
      if (idx !== -1) {
        const rootFolder = normalizedRelative.split('/')[0];
        return (normalizedPath.substring(0, idx) + '/' + rootFolder).replace(/\//g, '\\');
      }
    }
    return fullFilePath;
  }

  private getDisplayName(files: File[]): string {
    const firstRelativePath = this.getFilePath(files[0]);
    if (firstRelativePath) {
      const rootName = firstRelativePath.split('/')[0];
      if (rootName !== files[0].name || firstRelativePath.includes('/')) {
        return rootName || files[0].name;
      }
    }
    return files.length === 1 ? files[0].name : `${files.length} files`;
  }

  private async readDroppedFiles(dataTransfer: DataTransfer | null): Promise<File[]> {
    if (!dataTransfer) {
      return [];
    }
    const entries = Array.from(dataTransfer.items)
      .map((item) => item.webkitGetAsEntry?.() ?? null)
      .filter((entry): entry is FileSystemEntry => entry !== null);
    if (entries.length === 0) {
      return Array.from(dataTransfer.files);
    }

    const files: File[] = [];
    for (const entry of entries) {
      files.push(...await this.readDroppedEntry(entry));
    }
    return files;
  }

  private async readDroppedEntry(entry: FileSystemEntry, parentPath = ''): Promise<File[]> {
    const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      Object.defineProperty(file, 'fullPath', { configurable: true, value: path });
      return [file];
    }
    if (!entry.isDirectory) {
      return [];
    }

    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children: FileSystemEntry[] = [];
    while (true) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      if (batch.length === 0) {
        break;
      }
      children.push(...batch);
    }

    const files: File[] = [];
    for (const child of children) {
      files.push(...await this.readDroppedEntry(child, path));
    }
    return files;
  }

  private getFilePath(file: File): string {
    return (file as File & { fullPath?: string }).fullPath || file.webkitRelativePath || file.name;
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
    this.clearSenderDisconnectTimer();
    this.clearReceiverDisconnectTimer();
    this.senderWasConnected = false;
    this.lastSenderPeerCount = 0;
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

  private resetReceiverInactivityTimer(): void {
    this.clearReceiverInactivityTimer();
    if (!this.shareId || this.transferProgress >= 100 || this.receivedShareSaved) {
      return;
    }
    this.receiverInactivityTimer = setTimeout(() => {
      this.showConnectionDelayedModal();
    }, 120_000);
  }

  private clearReceiverInactivityTimer(): void {
    if (this.receiverInactivityTimer) {
      clearTimeout(this.receiverInactivityTimer);
      this.receiverInactivityTimer = undefined;
    }
  }

  private showConnectionDelayedModal(message?: string): void {
    if (this.receivedShareSaved || this.transferProgress >= 100) {
      return;
    }
    this.connectionModalDescription = message
      ?? (this.transferProgress > 0
        ? `Paused at ${this.transferProgress}% - Waiting for connection... Please keep this page open.`
        : 'Waiting for MyStudio to connect. Please keep this page open.');
    this.isConnectionModalOpen = true;
  }

  private showErrorModal(message: string): void {
    this.errorModalMessage = message;
    this.errorModalTitle = this.shareId ? 'Transfer Interrupted' : 'Error Processing File';
    this.isErrorModalOpen = true;
  }

  private dismissModal(close: () => void): void {
    if (this.modalCloseTimer) {
      clearTimeout(this.modalCloseTimer);
    }
    this.modalClosing = true;
    this.modalCloseTimer = setTimeout(() => {
      close();
      this.modalClosing = false;
      this.modalCloseTimer = undefined;
    }, 180);
  }

  private safeName(name: string): string {
    const sanitizedName = name
      .normalize('NFC')
      .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_')
      .trim()
      .replace(/[. ]+$/g, '');
    const nameWithSafeDevicePrefix = /^(con|prn|aux|nul|com[1-9]|lpt[1-9]|conin\$|conout\$|clock\$)(?:\..*)?$/i.test(sanitizedName)
      ? `_${sanitizedName}`
      : sanitizedName;
    const safeName = Array.from(nameWithSafeDevicePrefix)
      .reduce((result, character) => result.length + character.length <= 255 ? result + character : result, '');
    return safeName || 'download';
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
