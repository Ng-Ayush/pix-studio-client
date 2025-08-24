import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `<div class="bg-gradient-to-r from-[#0B1E53] to-[#183D9E] text-white min-h-screen font-sans relative overflow-hidden">

    <!-- Main container -->
    <div class="flex flex-col md:flex-row items-center justify-between px-8 py-16 max-w-7xl mx-auto relative z-10 min-h-screen">

        <!-- Left Content -->
        <div class="w-full md:w-1/2">
            <div class="mb-6">
                <!-- Section Title -->
                <div class="flex items-center gap-3 mb-3">
                    <a href="javascript:void(0);" routerLink="/">
                        <button class="cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                                stroke="currentColor" class="size-6">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                            </svg>
                        </button>
                    </a>
                    <h2 class="text-2xl font-bold uppercase tracking-wide">About Us</h2>
                </div>

                <!-- Paragraphs -->
                <p class="text-lg leading-relaxed text-white/90">
                    At My IT Solutions, we are passionate about building innovative and reliable software solutions that
                    help businesses and individuals thrive in the digital era. With a team of skilled developers,
                    designers, and technology enthusiasts, we specialize in delivering customized applications that are
                    intuitive, scalable, and future-ready.
                </p>
                <p class="text-lg mt-4 text-white/90">
                    Our mission is simple: to simplify complexities through smart technology and empower clients to
                    focus on what they do best.
                </p>
            </div>

            <!-- CTA Button -->
            <a href="tel:+910000000000"
                class="inline-block bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold py-3 px-6 rounded-md shadow-md hover:opacity-90 transition">
                Contact Us
            </a>
        </div>

        <!-- Right Graphics -->
        <div class="w-full md:w-1/2 mt-12 md:mt-0 flex items-center justify-center">
            <img src="../../../assets/images/2.png" width="500" height="500" alt="Tech Tree" class="mx-auto justify-center">
        </div>
    </div>

    <!-- Background Decorations -->
    <img src="../../../assets/images/3.png" alt="Decorative Lines"
        class="absolute bottom-0 left-0 max-w-[90%] md:max-w-[70%] opacity-10 pointer-events-none select-none" />
</div>`,
  styles: ''
})
export class AboutUsComponent {

}
