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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
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
    // { id: 'template8', name: 'GST Theme 8' },
    // { id: 'template9', name: 'GST Theme 9' },
    // { id: 'template10', name: 'GST Theme 10' },
  ];
  invoiceBillConfig: any = {};

  @ViewChild('autoTextarea') textareaRef!: ElementRef;

  currentInvoiceNumber: any = -1;
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
    private location: LocationStrategy,
    private http: HttpClient
  ) {
    this.userData = JSON.parse(<any>localStorage.getItem("userData"));
    this.route.params.subscribe(params => {
      if (params['invoice-id']) {
        this.currentInvoiceNumber = params['invoice-id'];
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
    this._service.getInvoiceById(this.currentInvoiceNumber, async (res: any) => {
      if (res.status == 200) {
        console.log(res);
        this.invoiceBillConfig = res.data;
        this.invoiceBillConfig['priceInWords'] = this.commonService.convertToRupeesInWords(+this.invoiceBillConfig.total);
        this.invoiceBillConfig.tnc = res.data.terms_and_conditions || this.userData?.terms_and_condition || null;
        console.log(this.invoiceBillConfig.tnc);
        const hasPastPayment = await this.getPastPayments();
        if (!hasPastPayment) {
          this.countTotalAndTotalQty();
        }

        console.log(this.invoiceBillConfig);


      }
    })
  }

  async getPastPayments() {
    return new Promise((resolve, reject) => {
      this._service.getPastPayments(this.invoiceBillConfig.invoice_id, (res: any) => {
        if (res.status == 200 && res.data.length > 0) {
          let total = 0;
          res.data.forEach((item: any) => {
            total = total + +item.amount_paid;
          });
          this.invoiceBillConfig['advancePayment'] = total || 0;

          this.countTotalAndTotalQty();
          resolve(true)
        } else {
          resolve(false);
        }
      })
    })
  }


  selectColor(color: any) {
    this.selectedColor = color;
  }

  selectTemplate(tempId: any) {
    this.selectedTemplateId = tempId;
    setTimeout(() => {
      this.resizeTextarea();
    }, 0);
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

      const summarySection = data.querySelector('.pdf-summary-section') as HTMLElement | null;
      if (!summarySection) throw new Error("Summary section not found");
      summarySection.style.display = 'none';

      const commonHeaderElem = data.querySelector('.pdf-common-header') as HTMLElement | null;
      if (!commonHeaderElem) throw new Error("Common header element not found");
      const commonHeaderCanvas = await html2canvas(commonHeaderElem, { scale: 3, useCORS: true });
      const commonHeaderImg = commonHeaderCanvas.toDataURL('image/png', 1.0);
      const commonHeaderHeight = (commonHeaderCanvas.height * 190) / commonHeaderCanvas.width;

      const pdf = new jsPDF.jsPDF('p', 'mm', 'a4', true);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const fudge = 0.5;
      const headerExtraSpace = 8;
      const sidePadding = 3;
      const topPadding = 3;

      // Render the full content canvas (with items, header, everything visible except summary)
      const contentCanvas = await html2canvas(data, { scale: 3, useCORS: true });
      const imgWidth = usableWidth;
      const imgHeight = (contentCanvas.height * imgWidth) / contentCanvas.width;

      // If everything fits on one page (taking into account margins, header height, extra padding), skip pagination and summary page splitting
      const fullContentNeedsOnePage = imgHeight <= usableHeight;

      if (fullContentNeedsOnePage) {
        // Add one page, no pagination
        pdf.setDrawColor(0, 0, 0);

        // Add whole image at once below margin
        pdf.addImage(contentCanvas.toDataURL('image/jpeg', 1.0),
          'JPEG',
          margin,
          margin,
          imgWidth,
          imgHeight);

        // Show summary section below the content if also fits on same page
        summarySection.style.display = '';
        const sumCanvas = await html2canvas(summarySection, { scale: 3, useCORS: true });
        const sumHeight = (sumCanvas.height * imgWidth) / sumCanvas.width;
        if ((imgHeight + sumHeight) <= usableHeight) {
          pdf.addImage(sumCanvas.toDataURL('image/jpeg', 1.0),
            'JPEG',
            margin,
            margin + imgHeight,
            imgWidth,
            sumHeight);
        } else {
          // Summary needs separate page
          pdf.addPage();
          pdf.addImage(commonHeaderImg, 'PNG', margin + sidePadding, margin + topPadding, usableWidth - 2 * sidePadding, commonHeaderHeight + fudge);
          pdf.addImage(sumCanvas.toDataURL('image/jpeg', 1.0),
            'JPEG',
            margin,
            margin + commonHeaderHeight + headerExtraSpace,
            imgWidth,
            sumHeight);
        }

      } else {
        // Content bigger than one page, do pagination as usual

        let yPx = 0;
        let pageIndex = 0;
        const pageContentHeightPx = ((usableHeight - commonHeaderHeight - headerExtraSpace) * contentCanvas.width) / imgWidth;

        while (yPx < contentCanvas.height) {
          if (pageIndex > 0) {
            pdf.addPage();
            pdf.addImage(
              commonHeaderImg,
              'PNG',
              margin + sidePadding,
              margin + topPadding,
              usableWidth - 2 * sidePadding,
              commonHeaderHeight + fudge
            );
          }

          let yOffset = margin + (pageIndex === 0 ? 0 : (commonHeaderHeight + headerExtraSpace));

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = contentCanvas.width;
          const availablePx = pageIndex === 0
            ? ((usableHeight) * contentCanvas.width) / imgWidth
            : ((usableHeight - commonHeaderHeight - headerExtraSpace) * contentCanvas.width) / imgWidth;
          cropCanvas.height = Math.min(availablePx, contentCanvas.height - yPx);

          const cropCtx = cropCanvas.getContext('2d')!;
          cropCtx.drawImage(
            contentCanvas,
            0, yPx,
            contentCanvas.width, cropCanvas.height,
            0, 0,
            contentCanvas.width, cropCanvas.height
          );

          const imgData = cropCanvas.toDataURL('image/jpeg', 1.0);
          pdf.addImage(
            imgData, 'JPEG',
            margin, yOffset,
            imgWidth, (cropCanvas.height * imgWidth) / contentCanvas.width
          );

          yPx += availablePx;
          pageIndex++;
        }

        // --- Render summary page after content ---
        summarySection.style.display = '';
        pdf.addPage();
        pdf.addImage(commonHeaderImg, 'PNG', margin + sidePadding, margin + topPadding, usableWidth - 2 * sidePadding, commonHeaderHeight + fudge);

        const sumCanvas = await html2canvas(summarySection, { scale: 3, useCORS: true });
        const sumImgData = sumCanvas.toDataURL('image/jpeg', 1.0);
        const sumHeight = (sumCanvas.height * imgWidth) / sumCanvas.width;
        pdf.addImage(
          sumImgData, 'JPEG',
          margin,
          margin + commonHeaderHeight + headerExtraSpace,
          imgWidth,
          sumHeight
        );
      }

      // Save/export
      if (!isWhatsApp) {
        const party = this.invoiceBillConfig.party_name.replace(/\s+/g, "_");
        const type = this.invoiceBillConfig.invoice_type === 'sale' ? 'Sale' : 'Estimate';
        const fileName = `${party}-${type}_${this.commonService.formatDate(new Date())}.pdf`;
        pdf.save(fileName);
        this.alert.success('PDF downloaded successfully.');
        this.isLoading = false;
      }

      return { data: pdf.output('blob') };

    } catch (error: any) {
      console.error(error);
      this.alert.error('Error generating PDF.');
      this.loader.hide();
      this.isLoading = false;
    } finally {
      this.exportMode = false;
      this.resizeTextarea();
      this.loader.hide();
      this.isLoading = false;
    }
  }


  ngAfterViewInit() {
    setTimeout(() => {
      this.resizeTextarea();
    }, 0);
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
      terms_and_conditions: this.invoiceBillConfig.tnc
    };
    this._service.updateEstimate(this.invoiceBillConfig?.invoice_id, params, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.alert.success(res.message);
        // this.invoiceBillConfig.estimate_id = res?.estimate_id;
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
    this._service.convertToSales(this.invoiceBillConfig.invoice_id, (res: any) => {
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

  // async shareViaWhatsapp() {
  //   this.alert.info("This feature is on development changes");
  //   return;
  //   this.loader.show();
  //   this.isLoading = true;
  //   const data: any = await this.downloadPDF(true);
  //   const fileRef = ref(this.storage, `invoice-pdf/${this.invoiceBillConfig.party_name.split(" ").join("_")}/${this.invoiceBillConfig.party_name.split(" ").join("_")}-${this.invoiceBillConfig.invoice_type == 'sale' ? 'sale' : 'estimate'}-invoice.pdf`);
  //   const uploadTask = uploadBytesResumable(fileRef, data.data, { contentType: 'application/pdf' });

  //   uploadTask.then(async () => {
  //     this.loader.show();
  //     const url = await getDownloadURL(fileRef);
  //     this.alert.success('PDF ready to share via WhatsApp.');
  //     const message = `Hi ${this.invoiceBillConfig.party_name}, your ${this.invoiceBillConfig.invoice_type == 'sale' ? 'Sale' : 'Estimate'
  //       } Invoice Bill is ready to download.\n\nLink: ${url}`;
  //     const whatsppUrl: any = `https://wa.me/+91${this.invoiceBillConfig.party_phone_number}?text=${encodeURIComponent(message)}`;
  //     const whatsappWindow: any = window.open(whatsppUrl, '', "width=300,height=300");
  //     setTimeout(() => {
  //       whatsappWindow.close();
  //     }, 2000);
  //     this.isLoading = false;
  //     this.loader.hide();

  //     // ****below code to send pdf media via whatsapp****

  //     // const params: any = {
  //     //   url: url,
  //     //   party_name: this.invoiceBillConfig.party_name,
  //     //   phone_number: this.invoiceBillConfig.party_phone_number,
  //     //   message_body: `Your ${this.invoiceBillConfig.invoice_type == 'sale' ? 'Sale' : 'Estimate'} Invoice Bill is ready to download.`
  //     // }
  //     // this._service.sendPdfViaWhatsApp(params, (res: any) => {
  //     //   if (res.status == 200) {
  //     //     this.loader.hide();
  //     //     this.isLoading = false;
  //     //     this.alert.success(res.message);
  //     //   } else {
  //     //     this.loader.hide();
  //     //     this.isLoading = false;
  //     //     this.alert.error(res.message);
  //     //   }
  //     // });

  //   })

  // }


  async shareViaWhatsapp() {
      // this.alert.info("This feature is on development changes");
    // return;
    try { 
      const { data } :any = await this.downloadPDF(true);
      this.isLoading=true;
      const base64 = await this.blobToBase64(data);
      const number = `${this.invoiceBillConfig.party_phone_number}@c.us`;
      await this.http.post(environment.apiUrl + '/api/mystudio/invoices/sendPdfViaWhatsApp', {
        number: `91${number}`,
        pdfBase64: base64,
        fileName: `${this.invoiceBillConfig.party_name.split(" ").join("_")}-${this.invoiceBillConfig.invoice_type == 'sale' ? 'sale' : 'estimate'}-invoice.pdf`
      }).toPromise();
      this.isLoading=false;
      this.alert.success('PDF sent to WhatsApp!');
    } catch (err) {
      this.isLoading=false;
      this.alert.error('Failed to send PDF to WhatsApp, please check your WhatsApp connection.',3000);
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

}
