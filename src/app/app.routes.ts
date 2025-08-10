import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AiUploadComponent } from './ai-upload/ai-upload.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'ps', component: AiUploadComponent },
  {
    path: 'photo-selection',
    loadComponent: () => import("./components/photo-selection/photo-selection.component").then(m => m.PhotoSelectionComponent)
  },
  {
    path: 'customer',
    loadComponent: () => import("./components/customer/customer.component").then(m => m.CustomerComponent)
  },
  {
    path: 'photo-selection-folder/:event-id',
    loadComponent: () => import("./components/photo-selection-folder/photo-selection-folder.component").then(m => m.PhotoSelectionFolderComponent)
  },
  {
    path: 'photo-selection-photos/:folder-id',
    loadComponent: () => import("./components/photo-selection-photos/photo-selection-photos.component").then(m => m.PhotoSelectionPhotosComponent)
  },
  {
    path: 'billing',
    loadComponent: () => import("./components/billing/billing.component").then(m => m.BillingComponent)
  },
  {
    path: 'billing/new-bill',
    loadComponent: () => import("./components/billing/new-bill/new-bill.component").then(m => m.NewBillComponent)
  },
  {
    path: 'billing/e-invoice/:invoice-id',
    loadComponent: () => import("./components/billing/pdf-bill-selection/pdf-bill-selection.component").then(m => m.PdfBillSelectionComponent)
  },
  {
    path: 'billing/edit-bill',
    loadComponent: () => import("./components/billing/new-bill/new-bill.component").then(m => m.NewBillComponent)
  },
  {
    path: 'bill-estimate',
    loadComponent: () => import("./components/billing/bill-estimate/bill-estimate.component").then(m => m.BillEstimateComponent)
  },
  {
    path: 'billing/calendar',
    loadComponent: () => import("./components/billing/billing-calendar/billing-calendar.component").then(m => m.BillingCalendarComponent)
  },
  {
    path: 'manage-profile',
    loadComponent: () => import("./components/manage-profile/manage-profile.component").then(m => m.ManageProfileComponent)
  },
  {
    path: 'features',
    loadComponent: () => import("./components/features/features.component").then(m => m.FeaturesComponent)
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import("./components/shared/privacy-policy/privacy-policy.component").then(m => m.PrivacyPolicyComponent)
  },
  {
    path: 'terms-and-condition',
    loadComponent: () => import("./components/shared/terms-and-condition/terms-and-condition.component").then(m => m.TermsAndConditionComponent)
  },
  {
    path: 'photo-sharing',
    loadComponent: () => import("./components/ai-photo-sharing/ai-photo-sharing.component").then(m => m.AiPhotoSharingComponent)
  },
  {
    path: 'calling',
    loadComponent: () => import("./components/calling/calling.component").then(m => m.CallingComponent)
  },
  {
    path: 'selection',
    loadComponent: () => import("./components/selection/selection.component").then(m => m.SelectionComponent),
    children: [
      {
        path: '',
        redirectTo: 'auth-screen',
        pathMatch:'full'
      },
      {
        path: 'auth-screen',
        loadComponent: () => import("./components/customer-auth-screen/customer-auth-screen.component").then(m => m.CustomerAuthScreenComponent)
      },
      {
        path: 'folder-listing-screen',
        loadComponent: () => import("./components/folder-listing-screen/folder-listing-screen.component").then(m => m.FolderListingScreenComponent)
      },
      {
        path: 'image-listing-screen',
        loadComponent: () => import("./components/image-listing-screen/image-listing-screen.component").then(m => m.ImageListingScreenComponent),
      },
    ]
  },
  {
    path: 'admin',
    loadComponent: () => import("./components/super-admin/admin/admin.component").then(m => m.AdminComponent),
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        loadComponent: () => import("./components/super-admin/admin-login/admin-login.component").then(m => m.AdminLoginComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import("./components/super-admin/admin-dashboard/admin-dashboard.component").then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () => import("./components/super-admin/users/users.component").then(m => m.UsersComponent),
      },
      {
        path: 'add-user',
        loadComponent: () => import("./components/super-admin/users/add-user/add-user.component").then(m => m.AddUserComponent),
      },
      {
        path: 'edit-user/:id',
        loadComponent: () => import("./components/super-admin/users/add-user/add-user.component").then(m => m.AddUserComponent),
      },
      {
        path: 'manage-features',
        loadComponent: () => import("./components/super-admin/manage-features/manage-features.component").then(m => m.ManageFeaturesComponent),
      },
      {
        path: 'manage-categories',
        loadComponent: () => import("./components/super-admin/manage-features/manage-categories/manage-categories.component").then(m => m.ManageCategoriesComponent),
      },
      {
        path: 'add-features',
        loadComponent: () => import("./components/super-admin/manage-features/add-manage-features/add-manage-features.component").then(m => m.AddManageFeaturesComponent),
      },
      {
        path: 'edit-feature/:id',
        loadComponent: () => import("./components/super-admin/manage-features/add-manage-features/add-manage-features.component").then(m => m.AddManageFeaturesComponent),
      },
      {
        path: 'customer-request',
        loadComponent: () => import("./components/super-admin/customer-request/customer-request.component").then(m => m.CustomerRequestComponent),
      },
      {
        path: 'edit-customer/:id',
        loadComponent: () => import("./components/super-admin/customer-request/edit-customers/edit-customers.component").then(m => m.EditCustomersComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import("./components/super-admin/manage-features/notification/notification.component").then(m => m.NotificationComponent),
      },

    ]
  },

  {
    path: '**',
    redirectTo:'/dashboard'
  },
];
