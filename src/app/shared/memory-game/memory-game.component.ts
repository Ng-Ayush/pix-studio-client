import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
type Card = {
  id: number;
  pairId: number;
  image: string;
  flipped: boolean;
  matched: boolean;
};

@Component({
  selector: 'app-memory-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory-game.component.html',
  styleUrl: './memory-game.component.scss'
})
export class MemoryGameComponent {
   private readonly imgPool = [
    10, 11, 12, 14, 16, 18, 20, 22, 24
  ].map(id => `https://picsum.photos/id/${id}/600/600`);

  cards = signal<Card[]>([]);
  firstFlipDone = signal(false);
  timerHandle: any = null;
  elapsed = signal(0);
  moves = signal(0);
  boardLocked = signal(false);
  matchesFound = signal(0);
  won = signal(false);

  constructor() {
    this.reset();
    effect(() => { if (this.won()) this.stopTimer(); });
  }

  reset() {
    this.stopTimer();
    this.elapsed.set(0);
    this.moves.set(0);
    this.matchesFound.set(0);
    this.won.set(false);
    this.boardLocked.set(false);
    this.firstFlipDone.set(false);
    this.cards.set(this.buildDeck(this.imgPool));
  }

  timeDisplay() {
    const s = this.elapsed();
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  onCardClick(card: Card) {
    if (this.boardLocked() || card.flipped || card.matched) return;

    if (!this.firstFlipDone()) {
      this.firstFlipDone.set(true);
      this.startTimer();
    }

    this.flipCard(card.id, true);
    const open = this.cards().filter(c => c.flipped && !c.matched);

    if (open.length === 2) {
      this.moves.set(this.moves() + 1);
      const [a, b] = open;

      if (a.pairId === b.pairId) {
        this.setMatched(a.id, true);
        this.setMatched(b.id, true);
        this.matchesFound.set(this.matchesFound() + 1);
        if (this.matchesFound() >= 9) this.won.set(true);
      } else {
        this.boardLocked.set(true);
        setTimeout(() => {
          this.flipCard(a.id, false);
          this.flipCard(b.id, false);
          this.boardLocked.set(false);
        }, 700);
      }
    }
  }

  trackCard = (_: number, c: Card) => c.id;

  private buildDeck(images: string[]): Card[] {
    const pairs = images.map((src, idx) => ({ src, pairId: idx }));
    const doubled = [...pairs, ...pairs]; // 9 pairs => 18 cards
    const shuffled = this.shuffle(doubled);
    return shuffled.map((p, i) => ({
      id: i + 1,
      pairId: p.pairId,
      image: p.src,
      flipped: false,
      matched: false,
    }));
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private flipCard(id: number, state: boolean) {
    this.cards.update(cs => cs.map(c => (c.id === id ? { ...c, flipped: state } : c)));
  }

  private setMatched(id: number, state: boolean) {
    this.cards.update(cs => cs.map(c => (c.id === id ? { ...c, matched: state } : c)));
  }

  private startTimer() {
    if (this.timerHandle) return;
    this.timerHandle = setInterval(() => this.elapsed.set(this.elapsed() + 1), 1000);
  }

  private stopTimer() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
