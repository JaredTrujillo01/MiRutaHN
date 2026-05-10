import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => initializeApp({
      apiKey: "AIzaSyCpfFefKLtO0E70hI4SHXNkVeEMhm8Hee8",
      authDomain: "mirutahn-b1a7f.firebaseapp.com",
      projectId: "mirutahn-b1a7f",
      storageBucket: "mirutahn-b1a7f.firebasestorage.app",
      messagingSenderId: "845855174956",
      appId: "1:845855174956:web:2643c13acb68fb12c0bc89",
      measurementId: "G-XL5FV01BG1"
    })),
    provideFirestore(() => getFirestore()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
