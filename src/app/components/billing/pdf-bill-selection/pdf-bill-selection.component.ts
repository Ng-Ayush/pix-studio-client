import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonService } from '../../../services/common.service';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../services/alert.service';
import { BillingService } from '../../../services/billing.service';
import { LoaderService } from '../../../shared/loader.service';
import { AppConstants } from '../../../constants/app.constants';
@Component({
  selector: 'app-pdf-bill-selection',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './pdf-bill-selection.component.html',
  styleUrl: './pdf-bill-selection.component.scss'
})
export class PdfBillSelectionComponent {
  todayDate: any = new Date();
  selectedTemplateId: any = 'template1'
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

  constructor(public constants: AppConstants, private loader: LoaderService, private _service: BillingService, private route: ActivatedRoute, private commonService: CommonService, private alert: AlertService, private router: Router) {
    this.route.params.subscribe(params => {
      if (params['invoice-id']) {
        this.currentInvoiceId = params['invoice-id'];
        this.getInvoiceDetailsById();
      }
    })
  }

  getInvoiceDetailsById() {
    this._service.getInvoiceById(this.currentInvoiceId, (res: any) => {
      if (res.status == 200) {
        console.log(res);
        this.invoiceBillConfig = res.data;
        this.invoiceBillConfig['priceInWords'] = this.commonService.convertToRupeesInWords(+this.invoiceBillConfig.total);
        this.invoiceBillConfig.tnc = res.data.terms_and_conditions || null;
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
    const content = document.getElementById('print-section');
    const head = document.head.cloneNode(true) as HTMLElement;

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
  }

  downloadPDF(): void {

  }

  ngAfterViewInit() {
    // Initial resize after view is ready
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
  saveAndClose() {
    this.loader.show();
    const params: any = {
      invoice_id: this.currentInvoiceId,
      terms_and_conditions: this.invoiceBillConfig.tnc
    };
    this._service.createEstimate(params, (res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.alert.success(res.message);
        this.router.navigate(['billing']);
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

  updateAndClose() {
    this.loader.show();
    const params: any = {
      terms_and_conditions: this.invoiceBillConfig.tnc
    };
    this._service.updateEstimate(this.invoiceBillConfig?.estimate_id, params,(res: any) => {
      if (res.status == 200) {
        this.loader.hide();
        this.alert.success(res.message);
        this.router.navigate(['billing']);
      } else {
        this.loader.hide();
        this.alert.error(res.message);
      }
    });
  }

  convertToSales(){
    this.loader.show();
    this._service.convertToSales(this.currentInvoiceId, (res: any) => {
      if(res.status == 200){
        this.alert.success(res.message);
        this.loader.hide();
        this.getInvoiceDetailsById();
      }else{
          this.loader.hide();
          this.alert.error(res.message);
        }
    })
  }


}
