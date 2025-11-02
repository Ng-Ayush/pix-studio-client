import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './auth.guard';
import { photoSelectionGuard } from './photo-selection.guard';
import { superAdminAuthGuard } from './super-admin-auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full',loadComponent: () => import("./shared/home-page/home-page.component").then(m => m.HomePageComponent) },

  {
    path: 'login',
    loadComponent: () => import("./components/login/login.component").then(m => m.LoginComponent)
  },
  {
    path: 'about-us',
    loadComponent: () => import("./shared/about-us/about-us.component").then(m => m.AboutUsComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import("./components/dashboard/dashboard.component").then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'photo-selection',
    loadComponent: () => import("./components/photo-selection/photo-selection.component").then(m => m.PhotoSelectionComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ps',
    loadComponent: () => import("./components/ai-upload/ai-upload.component").then(m => m.AiUploadComponent),
  },
  {
    path: 'customer',
    loadComponent: () => import("./components/customer/customer.component").then(m => m.CustomerComponent),
    canActivate: [authGuard]
  },
  {
    path: 'photo-selection-folder/:event-id',
    loadComponent: () => import("./components/photo-selection-folder/photo-selection-folder.component").then(m => m.PhotoSelectionFolderComponent),
    canActivate: [authGuard]
  },
  {
    path: 'photo-selection-photos/:folder-id',
    loadComponent: () => import("./components/photo-selection-photos/photo-selection-photos.component").then(m => m.PhotoSelectionPhotosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing',
    loadComponent: () => import("./components/billing/billing.component").then(m => m.BillingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing/new-bill',
    loadComponent: () => import("./components/billing/new-bill/new-bill.component").then(m => m.NewBillComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing/e-invoice/:invoice-id',
    loadComponent: () => import("./components/billing/pdf-bill-selection/pdf-bill-selection.component").then(m => m.PdfBillSelectionComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing/edit-bill',
    loadComponent: () => import("./components/billing/new-bill/new-bill.component").then(m => m.NewBillComponent),
    canActivate: [authGuard]
  },
  {
    path: 'bill-estimate',
    loadComponent: () => import("./components/billing/bill-estimate/bill-estimate.component").then(m => m.BillEstimateComponent),
    canActivate: [authGuard]
  },
  {
    path: 'billing/calendar',
    loadComponent: () => import("./components/billing/billing-calendar/billing-calendar.component").then(m => m.BillingCalendarComponent),
    canActivate: [authGuard]
  },
  {
    path: 'manage-profile',
    loadComponent: () => import("./components/manage-profile/manage-profile.component").then(m => m.ManageProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'features',
    loadComponent: () => import("./components/features/features.component").then(m => m.FeaturesComponent),
    canActivate: [authGuard]
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
    loadComponent: () => import("./components/ai-photo-sharing/ai-photo-sharing.component").then(m => m.AiPhotoSharingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'calling',
    loadComponent: () => import("./components/calling/calling.component").then(m => m.CallingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'template-one',
    loadComponent: () => import("./shared/ai-cover/template-one/template-one.component").then(m => m.TemplateOneComponent),
  },
  {
    path: 'template-two',
    loadComponent: () => import("./shared/ai-cover/template-two/template-two.component").then(m => m.TemplateTwoComponent),
  },
  {
    path: 'selection',
    loadComponent: () => import("./components/selection/selection.component").then(m => m.SelectionComponent),
    children: [
      {
        path: '',
        redirectTo: 'auth-screen',
        pathMatch: 'full'
      },
      {
        path: 'auth-screen',
        loadComponent: () => import("./components/customer-auth-screen/customer-auth-screen.component").then(m => m.CustomerAuthScreenComponent)
      },
      {
        path: 'folder-listing-screen',
        loadComponent: () => import("./components/folder-listing-screen/folder-listing-screen.component").then(m => m.FolderListingScreenComponent),
        canMatch: [photoSelectionGuard]
      },
      {
        path: 'image-listing-screen',
        loadComponent: () => import("./components/image-listing-screen/image-listing-screen.component").then(m => m.ImageListingScreenComponent),
        canMatch: [photoSelectionGuard]
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
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'users',
        loadComponent: () => import("./components/super-admin/users/users.component").then(m => m.UsersComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'add-user',
        loadComponent: () => import("./components/super-admin/users/add-user/add-user.component").then(m => m.AddUserComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'edit-user/:id',
        loadComponent: () => import("./components/super-admin/users/add-user/add-user.component").then(m => m.AddUserComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'manage-features',
        loadComponent: () => import("./components/super-admin/manage-features/manage-features.component").then(m => m.ManageFeaturesComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'manage-categories',
        loadComponent: () => import("./components/super-admin/manage-features/manage-categories/manage-categories.component").then(m => m.ManageCategoriesComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'manage-promocodes',
        loadComponent: () => import("./components/super-admin/manage-promocodes/manage-promocodes.component").then(m => m.ManagePromocodesComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'add-features',
        loadComponent: () => import("./components/super-admin/manage-features/add-manage-features/add-manage-features.component").then(m => m.AddManageFeaturesComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'edit-feature/:id',
        loadComponent: () => import("./components/super-admin/manage-features/add-manage-features/add-manage-features.component").then(m => m.AddManageFeaturesComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'customer-request',
        loadComponent: () => import("./components/super-admin/customer-request/customer-request.component").then(m => m.CustomerRequestComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'edit-customer/:id',
        loadComponent: () => import("./components/super-admin/customer-request/edit-customers/edit-customers.component").then(m => m.EditCustomersComponent),
        canActivate: [superAdminAuthGuard]
      },
      {
        path: 'notifications',
        loadComponent: () => import("./components/super-admin/manage-features/notification/notification.component").then(m => m.NotificationComponent),
        canActivate: [superAdminAuthGuard]
      },

    ]
  },

  {
    path: 'download-apk',
    loadComponent: () => import("./components/shared/download-apk/download-apk.component").then(m => m.DownloadApkComponent)
  },

  {
    path: '**',
    redirectTo: '/login'
  },
];
