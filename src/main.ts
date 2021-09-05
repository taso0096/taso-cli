import { createApp } from 'vue';
import App from './App.vue';
import './registerServiceWorker';
import router from './router';

import firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/firestore';
import firebaseConfig from './firebaseConfig';

import '@/assets/sass/main.scss';

firebase.initializeApp(firebaseConfig);
firebase.analytics();
firebase.firestore().enablePersistence({
  synchronizeTabs: true
});

createApp(App).use(router).mount('#app');
