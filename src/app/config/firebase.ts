import { FirebaseOptions, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../../environments/environment';

const configuredFirebase = environment.firebase;

export const firebaseConfig: FirebaseOptions = {
  apiKey: configuredFirebase.apiKey,
  authDomain: configuredFirebase.authDomain,
  projectId: configuredFirebase.projectId,
  storageBucket: configuredFirebase.storageBucket,
  messagingSenderId: configuredFirebase.messagingSenderId,
  appId: configuredFirebase.appId,
  measurementId: configuredFirebase.measurementId,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
