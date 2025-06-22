import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  private a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  private b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  constructor() { }

  formatDate(date: any) {
    var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

    if (month.length < 2)
      month = '0' + month;
    if (day.length < 2)
      day = '0' + day;

    return [year, month, day].join('-');
  }

  setCurrentTime() {
    const now = new Date();
    let hours: any = now.getHours();
    let minutes: any = now.getMinutes();
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes}`;
  }

  generateNewUniqueCode() {
    let optText = '';
    for (let i = 0; i < 5; i++) {
      optText += Math.floor(Math.random() * 10).toString();
    }
    return +optText;
  }


  inWords(num: number):any {
    if (num === 0) return '';
    if (num < 20) return this.a[num];
    if (num < 100) return this.b[Math.floor(num / 10)] + (num % 10 ? ' ' + this.a[num % 10] : '');
    if (num < 1000) return this.a[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + this.inWords(num % 100) : '');
    if (num < 100000) return this.inWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + this.inWords(num % 1000) : '');
    if (num < 10000000) return this.inWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + this.inWords(num % 100000) : '');
    return this.inWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + this.inWords(num % 10000000) : '');
  }

  convertToRupeesInWords(num: number) {
    if (typeof num !== 'number' || isNaN(num)) return 'Invalid number';
    let words = this.inWords(num).trim();
    return words ? `${words} Rupees Only` : 'Zero Rupees Only';
  }
}
