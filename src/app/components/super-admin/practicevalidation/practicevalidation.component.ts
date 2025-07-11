import { CommonModule, } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-practicevalidation',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './practicevalidation.component.html',
  styleUrl: './practicevalidation.component.scss'
})
export class PracticevalidationComponent {
  loginForm:FormGroup;

  constructor(private fb:FormBuilder){
    this.loginForm = this.fb.group({
      name:['',[Validators.required, Validators.pattern('^[a-z]+$')]],
      email:['',[Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')]],
      password:['',[Validators.required,Validators.minLength(10)]]
    })
  }

  getLoginCredential(){
    console.log(this.loginForm.value);
    
  }

  get name(){
    return this.loginForm.get("name")
  }


}
