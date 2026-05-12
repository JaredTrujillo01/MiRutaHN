import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { initializeApp } from 'firebase/app';

import { routes } from './app.routes';
import { firebaseConfig } from './firebase.config';

// Initialize Firebase
initializeApp(firebaseConfig);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
