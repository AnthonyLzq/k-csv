/* eslint-disable no-extra-parens */
import { initializeApp, cert } from 'firebase-admin/app'

const firebaseConnection = async (): Promise<void> => {
  initializeApp({
    credential: cert({
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
      privateKey : (process.env.FIREBASE_PRIVATE_KEY as string)
        .replace(/\\n/g, '\n'),
      projectId: process.env.FIREBASE_PROJECT_ID as string
    }),
    storageBucket: process.env.STORAGE_BUCKET as string
  })

  console.log('Firebase connection established.')
}

export { firebaseConnection }
