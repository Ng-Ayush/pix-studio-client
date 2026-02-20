export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  previewUrl:"https://tn3.mieuxcloud.com:9443/api/v1/buckets/akash/objects/download?preview=true&prefix=",
  downloadUrl:"https://tn3.mieuxcloud.com:9443/api/v1/buckets/akash/objects/download?prefix=",
  // razorpay_key:"rzp_test_jODMqQ414J8DOi", // test : rzp_test_jODMqQ414J8DOi
  razorpay_key:"rzp_live_R6S9KpHqJSUEdA", // test : rzp_test_jODMqQ414J8DOi
  firebaseConfig : {
    apiKey: "AIzaSyBH-L41Eu4UImmKAnBu-L3db30p_fwNfEs",
    authDomain: "surajproductions-3f28b.firebaseapp.com",
    projectId: "surajproductions-3f28b",
    storageBucket: "surajproductions-3f28b.firebasestorage.app",
    messagingSenderId: "387097922587",
    appId: "1:387097922587:web:b98ab333a7ab7142c2bcbe",
    measurementId: "G-W337K1J6PL"
  }
};

 // "build": {
  //   "appId": "com.pixstudio.app",
  //   "productName": "PixStudioPro",
  //   "win": {
  //     "target": "nsis",  
  //     "icon": "build/icon.ico",  
  //     "requestedExecutionLevel": "requireAdministrator",  
  //     "extraMetadata": {
  //       "main": "index.js"
  //     }
  //   },
  //   "compression": "maximum", 
  //   "publish": null,
  //   "electronVersion": "28.1.0",
  //   "directories": {
  //     "output": "dist_electron"
  //   },
  //   "files": [
  //     "**/*",
  //     "node_modules/**/*"
  //   ],
  //   "extraMetadata": {
  //     "main": "index.js"
  //   }
  // }