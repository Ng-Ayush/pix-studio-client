import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { interval } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminService } from '../../services/admin.service';
import { environment } from '../../../environments/environment';
import { AlertService } from '../../services/alert.service';
declare var Razorpay: any;
@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule,RouterModule, ],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
})
export class FeaturesComponent {

  stats: any;
  todayDate: any = new Date();
  constructor(
    private router: Router,
    private sanitizer: DomSanitizer,
    private _adminService:AdminService,
    private alert: AlertService
  ) { }

  ngOnInit() {
    this.getRealTime();
  }

  getRealTime() {
    interval(1000).subscribe(() => {
      this.todayDate = new Date();
    })
  }

  logout() {
    this.router.navigate(['/login']);
  }

  showVideoModal = false
  selectedCard: any | null = null
  currentVideoUrl: SafeResourceUrl = ""

  // Sample YouTube video IDs for random selection
  private youtubeVideoIds = [
    "dQw4w9WgXcQ", // Rick Roll
    "9bZkp7q19f0", // Gangnam Style
    "kJQP7kiw5Fk", // Despacito
    "fJ9rUzIMcZQ", // Bohemian Rhapsody
    "hTWKbfoikeg", // Smells Like Teen Spirit
    "YQHsXMglC9A", // Hello - Adele
    "CevxZvSJLk8", // Katy Perry - Roar
    "JGwWNGJdvx8", // Shape of You
    "M7lc1UVf-VE", // Uptown Funk
    "RgKAFK5djSk", // See You Again
  ]

  travelCards:any = [
    {
      id: 1,
      title: "Project Name",
      description:
        "Discover the most beautiful destinations to explore in 2023, featuring diverse landscapes and cultural experiences for an unforgettable adventure.",
      category_icon: "/images/coastal-view.png",
      price: 10,
      category: "Travel",
      youtube_link:'',
      drive_link:'',
    },
    {
      id: 2,
      name: "Mountain Adventure",
      description:
        "Experience breathtaking mountain views and thrilling adventures in the heart of nature. Perfect for hiking enthusiasts and nature lovers.",
      image:
        "https://images.unsplash.com/photo-1464822759844-d150baec0494?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: 25,
      category: "Adventure",
      fileType: "Video",
      duration: "5 Days",
      bestTime: "April - October",
    },
    {
      id: 3,
      name: "City Explorer",
      description:
        "Explore vibrant cityscapes, rich culture, and modern architecture. Discover hidden gems in bustling metropolitan areas.",
      image:
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: 15,
      category: "Urban",
      fileType: "Video",
      duration: "3 Days",
      bestTime: "Year Round",
    },
    {
      id: 4,
      name: "Desert Safari",
      description:
        "Journey through golden sand dunes and experience the magic of desert landscapes. Includes camel rides and stargazing.",
      image:
        "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: 30,
      category: "Desert",
      fileType: "Video",
      duration: "4 Days",
      bestTime: "October - February",
    },
    {
      id: 5,
      name: "Forest Retreat",
      description:
        "Immerse yourself in lush green forests and discover wildlife in their natural habitat. Perfect for eco-tourism enthusiasts.",
      image:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: 20,
      category: "Forest",
      fileType: "Video",
      duration: "6 Days",
      bestTime: "May - September",
    },
    {
      id: 6,
      name: "Coastal Drive",
      description:
        "Take a scenic coastal drive along pristine beaches and dramatic cliffs. Experience the beauty of ocean meets land.",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      price: 18,
      category: "Coastal",
      fileType: "Video",
      duration: "4 Days",
      bestTime: "March - November",
    },
  ]


  playVideo(card:any): void {
    this.selectedCard = card
    const randomVideoId = this.youtubeVideoIds[Math.floor(Math.random() * this.youtubeVideoIds.length)]
    const videoUrl = `https://www.youtube.com/embed/${randomVideoId}?autoplay=1&rel=0&modestbranding=1&controls=1`
    this.currentVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(videoUrl)
    this.showVideoModal = true
  }

   payNow() {
    // 1. Create Razorpay order
    const params:any = {
      amount: 50000,
      currency: 'INR',
      receipt: 'order_rcptid_11',
    };

    this._adminService.createOrder(params,(order:any)=>{

        console.log("ORDER ",order);
        
        const options: any = {
          key: environment.razorpay_key,
          amount: order.amount,
          currency: order.currency,
          name: 'Suraj Studio',
          description: 'Test Transaction',
          order_id: order.id,
          handler: (response: any) => {
            // 2. Send payment info to backend for verification
            console.log("GOTHE ORDER",response);
            
            let data = {razorpay_payment_id:response.razorpay_payment_id,razorpay_order_id:response.razorpay_order_id,razorpay_signature:response.razorpay_signature}
            this._adminService.verifyPayment(data,(res:any)=>{
              console.log("GOT PAYMENT",res);
              
               if(res.status == 200){
                  this.alert.success(res.message);
               }else{
                  this.alert.error(res.message);
               }
            })
          },
          prefill: {
            name: 'Test User',
            email: 'test@example.com',
            contact: '9999999999',
          },
          theme: {
            color: '#3399cc',
          },
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
      });
  }

  closeVideo(): void {
    this.showVideoModal = false
    this.selectedCard = null
    this.currentVideoUrl = ""
  }

 
}
