import { CommonModule } from '@angular/common';
import { Component,HostListener  } from '@angular/core';
import { FormsModule } from '@angular/forms';


interface GalleryImage {
  id: number;
  url: string;
  category: string;
  title: string;
}


@Component({
  selector: 'app-template-two',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './template-two.component.html',
  styleUrl: './template-two.component.scss'
})
export class TemplateTwoComponent {
 isHeaderScrolled = false;
  currentYear = new Date().getFullYear();
  
  carouselImages: string[] = [
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200',
    'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?w=1200'
  ];

  currentSlide = 0;
  carouselInterval: any;

  activeTab = 'all';
  
  allImages: GalleryImage[] = [
    { id: 1, url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?', category: 'photos', title: 'Wedding Moment 1' },
    { id: 2, url: 'https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg', category: 'photos', title: 'Bride Portrait' },
    { id: 3, url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?', category: 'mehdi', title: 'Mehndi Art 1' },
    { id: 4, url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?', category: 'mehdi', title: 'Mehndi Art 2' },
    { id: 5, url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?', category: 'haldi', title: 'Haldi Ritual' },
    { id: 6, url: 'https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?', category: 'haldi', title: 'Haldi Fun' },
    { id: 7, url: 'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?', category: 'matched', title: 'Couple Shot 1' },
    { id: 8, url: 'https://images.unsplash.com/photo-1623428187425-9831e13d2e8a?', category: 'matched', title: 'Couple Shot 2' },
    { id: 9, url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?', category: 'photos', title: 'Reception' },
    { id: 10, url: 'https://images.unsplash.com/photo-1460978812857-470ed1c77af0?', category: 'photos', title: 'Decor Details' },
    { id: 11, url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?', category: 'mehdi', title: 'Mehndi Art 3' },
    { id: 12, url: 'https://images.unsplash.com/photo-1599950834462-ca89718ef0d0?', category: 'haldi', title: 'Haldi Celebration' }
  ];

  filteredImages: GalleryImage[] = [];
  
  isModalOpen = false;
  showThumbnails = false;
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
    }, 5000);
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
    this.showThumbnails = false;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.currentImage = null;
    this.showThumbnails = false;
    document.body.style.overflow = 'auto';
  }

  toggleThumbnails(): void {
    this.showThumbnails = !this.showThumbnails;
  }

  selectImage(image: GalleryImage): void {
    this.currentImage = image;
    this.currentImageIndex = this.filteredImages.findIndex(img => img.id === image.id);
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
