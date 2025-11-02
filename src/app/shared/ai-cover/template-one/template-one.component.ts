import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';


interface GalleryImage {
  id: number;
  url: string;
  category: string;
  title: string;
}

@Component({
  selector: 'app-template-one',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './template-one.component.html',
  styleUrl: './template-one.component.scss'
})
export class TemplateOneComponent {
  isHeaderScrolled = false;
  currentYear = new Date().getFullYear();

  carouselImages: string[] = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
    'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200'
  ];

  currentSlide = 0;
  carouselInterval: any;

  activeTab = 'all';

  allImages: GalleryImage[] = [
    { id: 1, url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600', category: 'photos', title: 'Wedding Ceremony' },
    { id: 2, url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600', category: 'photos', title: 'Bride Portrait' },
    { id: 3, url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600', category: 'mehdi', title: 'Mehndi Design 1' },
    { id: 4, url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600', category: 'mehdi', title: 'Mehndi Design 2' },
    { id: 5, url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600', category: 'haldi', title: 'Haldi Ceremony' },
    { id: 6, url: 'https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=600', category: 'haldi', title: 'Haldi Celebration' },
    { id: 7, url: 'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=600', category: 'matched', title: 'Couple Photo 1' },
    { id: 8, url: 'https://images.unsplash.com/photo-1623428187425-9831e13d2e8a?w=600', category: 'matched', title: 'Couple Photo 2' },
    { id: 9, url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600', category: 'photos', title: 'Reception Hall' },
    { id: 10, url: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=600', category: 'photos', title: 'Wedding Decor' },
    { id: 11, url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600', category: 'mehdi', title: 'Mehndi Design 3' },
    { id: 12, url: 'https://images.unsplash.com/photo-1599950834462-ca89718ef0d0?w=600', category: 'haldi', title: 'Haldi Function' }
  ];

  filteredImages: GalleryImage[] = [];

  isModalOpen = false;
  currentImageIndex = 0;
  currentImage: GalleryImage | null = null;

  ngOnInit(): void {
    this.filteredImages = this.allImages;
    this.startCarousel();
    window.addEventListener('scroll', this.onScroll.bind(this));
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
    window.removeEventListener('scroll', this.onScroll.bind(this));
  }

  onScroll(): void {
    this.isHeaderScrolled = window.scrollY > 50;
  }

  startCarousel(): void {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 4000);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.carouselImages.length;
  }

  prevSlide(): void {
    this.currentSlide = this.currentSlide === 0
      ? this.carouselImages.length - 1
      : this.currentSlide - 1;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  filterImages(category: string): void {
    this.activeTab = category;
    if (category === 'all') {
      this.filteredImages = this.allImages;
    } else {
      this.filteredImages = this.allImages.filter(img => img.category === category);
    }
  }

  openModal(image: GalleryImage): void {
    this.currentImage = image;
    this.currentImageIndex = this.filteredImages.findIndex(img => img.id === image.id);
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.currentImage = null;
    document.body.style.overflow = 'auto';
  }

  nextImage(): void {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.filteredImages.length;
    this.currentImage = this.filteredImages[this.currentImageIndex];
  }

  prevImage(): void {
    this.currentImageIndex = this.currentImageIndex === 0
      ? this.filteredImages.length - 1
      : this.currentImageIndex - 1;
    this.currentImage = this.filteredImages[this.currentImageIndex];
  }

  downloadImage(url: string, title: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
