import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements AfterViewInit, OnDestroy {

  router: any = inject(Router);
  homePageConfig: any = { home: true };
  contactForm: any = {};
  isMobileMenuOpen = false;
  isPopupOpen = false;
  eventsPerMonth = 1;
  guestsPerEvent = 50;
  expandedFaq: number | null = null;
  hoursSaved = 2;

  private popupTimer?: ReturnType<typeof setTimeout>;
  private intersectionObserver?: IntersectionObserver;
  private counterObserver?: IntersectionObserver;

  constructor(private alert: AlertService, private sanitizer: DomSanitizer) {

  }

  ngOnInit() {
    this.popupTimer = setTimeout(() => this.openPopup(), 20000);
  }

  ngAfterViewInit() {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.intersectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-on-scroll').forEach(element => {
      this.intersectionObserver?.observe(element);
    });

    const counterSection = document.querySelector('.counter')?.closest('.glass-card');
    if (counterSection) {
      this.counterObserver = new IntersectionObserver((entries, observer) => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.startCounters();
          observer.disconnect();
        }
      }, { threshold: 0.3 });
      this.counterObserver.observe(counterSection);
    }
  }

  ngOnDestroy() {
    if (this.popupTimer) {
      clearTimeout(this.popupTimer);
    }
    this.intersectionObserver?.disconnect();
    this.counterObserver?.disconnect();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  openPopup() {
    this.isPopupOpen = true;
  }

  closePopup() {
    this.isPopupOpen = false;
  }

  calculateTime() {
    this.hoursSaved = this.eventsPerMonth * 2;
  }

  toggleFaq(id: number) {
    this.expandedFaq = this.expandedFaq === id ? null : id;
  }

  startCounters() {
    document.querySelectorAll<HTMLElement>('.counter').forEach(counter => {
      const target = Number(counter.dataset['target']);
      const decimalPlaces = Number(counter.dataset['decimal'] || 0);
      const suffix = `${counter.dataset['plus'] === 'true' ? '+' : ''}${counter.dataset['percent'] === 'true' ? '%' : ''}`;
      const increment = target / 200;
      let count = 0;

      const updateCount = () => {
        count = Math.min(count + increment, target);
        counter.textContent = `${count.toFixed(decimalPlaces)}${suffix}`;
        if (count < target) {
          setTimeout(updateCount, 15);
        }
      };

      updateCount();
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  downloadDesktopApp() {
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/surajproductions-3f28b.firebasestorage.app/o/default%20assets%2FMy%20Studio%20Desktop%20Setup%201.0.0.exe?alt=media&token=62bd1eb9-a550-4c25-81ce-fdcc7b9475b9`;
    try {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.target = '_blank';
        a.setAttribute('download', '');
        a.click();
      }, 300);
    } catch (error: any) {
      this.alert.error("Error in downloading the application");
    }
  }

  extractFileId(url: string): string | null {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    return match ? match[1] : null;
  }
 
}
