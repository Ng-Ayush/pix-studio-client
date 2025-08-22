import { CommonModule, LocationStrategy } from '@angular/common';
import { Component, ElementRef, inject, ViewChild } from '@angular/core';
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
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
@Component({
  selector: 'app-pdf-bill-selection',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pdf-bill-selection.component.html',
  styleUrl: './pdf-bill-selection.component.scss'
})
export class PdfBillSelectionComponent {
  todayDate: any = new Date();
  selectedTemplateId: any = 'template1';
  selectedColor: any = '#5958b2';
  colors: any = [
    '#5958b2', '#565462', '#141a23', '#304e60', '#4c0013', '#684740', '#647c9c', '#8d6e63',
    '#463d21', '#516580', '#4b3935', '#30414b', '#050638', '#5a0505', '#78359a', '#46039a',
    '#40c4ff', '#42a5f5', '#66bb6a', '#ffa726', '#ef5350',
    '#bdbdbd', '#78909c', '#4dd0e1'
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
  isLoading: boolean = false;
  storage = inject(Storage);


  constructor(private adminService: AdminService,
    public constants: AppConstants,
    private loader: LoaderService,
    private _service: BillingService,
    private route: ActivatedRoute,
    private commonService: CommonService,
    private alert: AlertService,
    private router: Router,
    private location: LocationStrategy
  ) {
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

  async downloadPDF(isWhatsApp = false): Promise<{ data: Blob } | void> {
    this.loader.show();
    this.exportMode = true;
    this.isLoading = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const data = document.getElementById(this.selectedTemplateId);
      if (!data) throw new Error("Template element not found");

      const logo = document.getElementById('logo') as HTMLImageElement | null;
      const canvas = await html2canvas(data, { useCORS: true });

      const A4_WIDTH = 210;
      const A4_HEIGHT = 297;
      const MARGIN = 10;

      const imgWidth = A4_WIDTH - 2 * MARGIN;
      const ratio = imgWidth / canvas.width;
      const imgHeight = canvas.height * ratio;

      const contentY = MARGIN + 15; // space for logo
      const availableHeight = A4_HEIGHT - contentY - MARGIN;
      const adjustedImgHeight = Math.min(imgHeight, availableHeight);

      const pdf = new jsPDF.jsPDF('p', 'mm', 'a4');

      if (logo) {
        pdf.addImage(logo.src, 'PNG', MARGIN, MARGIN, 30, 10);
      }

      const contentDataURL = canvas.toDataURL('image/png');
      pdf.addImage(contentDataURL, 'PNG', MARGIN, contentY, imgWidth, adjustedImgHeight);

      if (!isWhatsApp) {
        pdf.save(`exported-file_${Date.now()}.pdf`);
        this.alert.success('PDF downloaded successfully.');
        this.isLoading=false;
      }

      return { data: pdf.output('blob') };

    } catch (error: any) {
      console.error(error);
      this.alert.error('Error generating PDF.');
    } finally {
      this.exportMode = false;
      this.loader.hide();
    }
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

  async shareViaWhatsapp() {
    this.loader.show();
    this.isLoading = true;
    const data: any = await this.downloadPDF(true);
    const fileRef = ref(this.storage, `invoice-pdf/${this.invoiceBillConfig.party_name.split(" ").join("_")}/${this.invoiceBillConfig.party_name.split(" ").join("_")}-${this.invoiceBillConfig.invoice_type == 'sale' ? 'sale' : 'estimate'}-invoice.pdf`);
    const uploadTask = uploadBytesResumable(fileRef, data.data, { contentType: 'application/pdf' });

    uploadTask.then(async () => {
      this.loader.show();
      const url = await getDownloadURL(fileRef);
      const params: any = {
        url: url,
        party_name: this.invoiceBillConfig.party_name,
        phone_number: this.invoiceBillConfig.party_phone_number,
        message_body: `Your ${this.invoiceBillConfig.invoice_type == 'sale' ? 'Sale' : 'Estimate'} Invoice Bill is ready to download.`
      }
      this._service.sendPdfViaWhatsApp(params, (res: any) => {
        if (res.status == 200) {
          this.loader.hide();
          this.isLoading = false;
          this.alert.success(res.message);
        } else {
          this.loader.hide();
          this.isLoading = false;
          this.alert.error(res.message);
        }
      });

    })

  }

  onImgUpload(event: any) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = async () => {
      let compressedImage = reader.result as string;
      let blob = this.dataURLtoBlob(compressedImage);
      const fileRef = ref(this.storage, `invoice_pdf/${this.invoiceBillConfig.party_name.split(" ").join("_")}/`);
      const uploadTask = uploadBytesResumable(fileRef, blob);

      uploadTask.then(async () => {
        const url = await getDownloadURL(fileRef);
      })
    }
  }

  dataURLtoBlob(dataURL: string) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeString });
  }

}
