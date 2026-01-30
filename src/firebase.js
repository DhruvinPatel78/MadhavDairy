import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBKmGmDjEXCtJg4dT_VFp79ysVj0n66y9s",
    authDomain: "madhavdairy-bc0b5.firebaseapp.com",
    projectId: "madhavdairy-bc0b5",
    storageBucket: "madhavdairy-bc0b5.firebasestorage.app",
    messagingSenderId: "885269491536",
    appId: "1:885269491536:web:a2c752c57b922348b04655",
    measurementId: "G-YGVNC2LFPK"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
