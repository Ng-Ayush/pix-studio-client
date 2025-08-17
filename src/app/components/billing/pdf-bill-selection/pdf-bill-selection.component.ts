import { CommonModule, LocationStrategy } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonService } from '../../../services/common.service';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../services/alert.service';
import { BillingService } from '../../../services/billing.service';
import { LoaderService } from '../../../shared/loader.service';
import { AdminService } from '../../../services/admin.service';
import { AppConstants } from '../../super-admin/users/constants/app.constants';
import * as jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
@Component({
  selector: 'app-pdf-bill-selection',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pdf-bill-selection.component.html',
  styleUrl: './pdf-bill-selection.component.scss'
})
export class PdfBillSelectionComponent {
  todayDate: any = new Date();
  selectedTemplateId: any = 'template2'
  selectedColor: any = '#5958b2';
  colors: any = [
    '#5958b2', '#7e57c2', '#42a5f5', '#66bb6a', '#ffee58', '#ffa726', '#ef5350', '#8d6e63',
    '#bdbdbd', '#78909c', '#4dd0e1', '#b2ff59', '#ffab00', '#f50057', '#e040fb', '#c6ff00',
    '#00e5ff', '#ff1744', '#651fff', '#7c4dff', '#40c4ff'
  ];
  templates: any = [
    { id: 'template1', name: 'GST Theme 1' },
    { id: 'template2', name: 'GST Theme 2' },
    { id: 'template3', name: 'GST Theme 3' },
    { id: 'template4', name: 'GST Theme 4' },
    { id: 'template5', name: 'GST Theme 5' },
    { id: 'template6', name: 'GST Theme 6' },
    { id: 'template7', name: 'GST Theme 7' },
    { id: 'template8', name: 'GST Theme 8' },
    { id: 'template9', name: 'GST Theme 9' },
    { id: 'template10', name: 'GST Theme 10' },
  ];
  invoiceBillConfig: any = {};

  @ViewChild('autoTextarea') textareaRef!: ElementRef;

  currentInvoiceId: any = -1;
  currentUserId: any = 0;
  userData: any = {};
  showLogOutModal: boolean = false;
  exportMode: boolean = false;


  constructor(private adminService: AdminService, public constants: AppConstants, private loader: LoaderService, private _service: BillingService, private route: ActivatedRoute, private commonService: CommonService, private alert: AlertService, private router: Router, private location: LocationStrategy) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
    this.route.params.subscribe(params => {
      if (params['invoice-id']) {
        this.currentInvoiceId = params['invoice-id'];
        this.getInvoiceDetailsById();
      }
    })
    // this.getUserData();   //to be commented and removed in future.
  }

  getUserData() {
    this.currentUserId = JSON.parse(<any>localStorage.getItem("currentUserId"));
    this.adminService.getUsersByCurrentId(this.currentUserId, (res: any) => {
      // localStorage.setItem("user_data",JSON.stringify(res));
      console.log(res);
      this.userData = res;

    })
  }

  getInvoiceDetailsById() {
    this._service.getInvoiceById(this.currentInvoiceId, (res: any) => {
      if (res.status == 200) {
        console.log(res);
        this.invoiceBillConfig = res.data;
        this.invoiceBillConfig['priceInWords'] = this.commonService.convertToRupeesInWords(+this.invoiceBillConfig.total);
        this.invoiceBillConfig.tnc = res.data.terms_and_conditions || this.userData?.terms_and_condition || null;
        console.log(this.invoiceBillConfig.tnc);

        this.countTotalAndTotalQty();
      }
    })
  }

  selectColor(color: any) {
    this.selectedColor = color;
  }

  selectTemplate(tempId: any) {
    this.selectedTemplateId = tempId;

  }

  getTemplateClass(tempId: any) {
    return this.selectedColor;

  }

  printSection() {
    this.exportMode = true;
    setTimeout(() => {
      const content = document.getElementById(this.selectedTemplateId);
      const head = document.head.cloneNode(true) as HTMLElement;
      this.resizeTextarea();
      const logoHTML = `<img src="${this.userData?.studio_icon}" alt="Logo" style="width:100px; margin-bottom:20px;">`;
      console.log(logoHTML);
      const printWindow = window.open('', '', 'width=800,height=900');
      if (printWindow && content) {
        printWindow.document.open();
        printWindow.document.write(`
      <html>
        <head>
          <title>Print</title>
          ${head.innerHTML} <!-- Inject your head (which includes Tailwind links) -->
        </head>
        <body class="p-4 font-sans">
          ${content.innerHTML}
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
      this.exportMode = false;
    }, 100);

  }

  async downloadPDF() {
    this.loader.show();
    this.exportMode = true;
    setTimeout(async () => {
      try {
        const data = document.getElementById(this.selectedTemplateId);
        const logo: HTMLImageElement = document.getElementById('logo') as HTMLImageElement;
        const canvas = await html2canvas(data!, { useCORS: true });

        const A4_WIDTH = 210;
        const A4_HEIGHT = 297;
        const MARGIN = 10;

        const imgWidth = A4_WIDTH - 2 * MARGIN;
        const ratio = imgWidth / canvas.width;
        const imgHeight = canvas.height * ratio;

        const contentY = MARGIN + 15; // space for logo
        const availableHeight = A4_HEIGHT - contentY - MARGIN;
        const adjustedImgHeight = imgHeight > availableHeight ? availableHeight : imgHeight;

        const pdf = new jsPDF.jsPDF('p', 'mm', 'a4');
        if (logo) {
          pdf.addImage(logo.src, 'PNG', MARGIN, MARGIN, 30, 10);
        }

        const contentDataURL = canvas.toDataURL('image/png');
        pdf.addImage(contentDataURL, 'PNG', MARGIN, contentY, imgWidth, adjustedImgHeight);

        pdf.save(`exported-file_${Date.now()}.pdf`);
        this.loader.hide();
        this.exportMode = false;
        this.alert.success('PDF downloaded successfully.');
      }
      catch (error) {
        this.alert.error('Error downloading pdf');
        this.exportMode = false;
        this.loader.hide();
      }
    }, 100);

  }

  ngAfterViewInit() {
    this.resizeTextarea();
  }

  resizeTextarea() {
    const textarea = this.textareaRef?.nativeElement;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  saveAndClose(isUpdated?: boolean) {
    this.loader.show();
    const params: any = {
      invoice_id: this.currentInvoiceId,
      terms_and_conditions: this.invoiceBillConfig.tnc
    };
    this._service.createEstimate(params, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.alert.success(res.message);
        this.invoiceBillConfig.estimate_id = res?.estimate_id;
        if (isUpdated) {
          this.updateAndconvertToSales()
        } else {
          this.router.navigate(['billing']);
        }
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    });
  }


  countTotalAndTotalQty() {
    let total = 0;
    let totalQty = 0;
    this.invoiceBillConfig.invoice_items.forEach((item: any) => {
      total += item.sale_price * item.quantity;
      totalQty += item.quantity;
    });
    this.invoiceBillConfig.total = total;
    this.invoiceBillConfig.total_quantity = totalQty;
  }

  updateAndClose(isUpdated?: boolean) {
    this.loader.show();
    const params: any = {
      terms_and_conditions: this.invoiceBillConfig.tnc
    };
    this._service.updateEstimate(this.invoiceBillConfig?.invoice_id, params, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.alert.success(res.message);
        if (isUpdated) {
          this.updateAndconvertToSales()
        } else {
          this.router.navigate(['billing']);
        }
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    });
  }

  directconvertToSales() {
    this.loader.show();
    if (this.invoiceBillConfig.tnc && this.invoiceBillConfig.estimate_id) {
      this.updateAndClose(true);
    } else {
      this.saveAndClose(true)
    }
  }

  updateAndconvertToSales() {
    this.loader.show();
    this._service.convertToSales(this.currentInvoiceId, (res: any) => {
      if (res.status == 200) {
        this.alert.success(res.message);
        this.loader.hide();
        this.getInvoiceDetailsById();
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    })
  }

  backToBill() {
    this.location.back();
  }

  toggleLogoutModal() {
    this.showLogOutModal = !this.showLogOutModal;
  }

  logout() {
    this.showLogOutModal = false;
    localStorage.clear();
    this.alert.success('Logout Successfully');
    this.router.navigate(['/login']);
  }

}
