import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pdf-bill-selection',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pdf-bill-selection.component.html',
  styleUrl: './pdf-bill-selection.component.scss'
})
export class PdfBillSelectionComponent {
  todayDate: any = new Date();
}
