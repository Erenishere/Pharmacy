import { Routes } from '@angular/router';

export const MY_PROFILE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./my-profile.component').then(m => m.MyProfileComponent)
    }
];
