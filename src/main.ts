import { createApp } from 'vue';
import App from './App.vue';
import './registerServiceWorker';
import router from './router';

import firebase from 'firebase/app';
import firebaseConfig from './firebaseConfig';

import '@/assets/sass/main.scss';

firebase.initializeApp(firebaseConfig);

createApp(App).use(router).mount('#app');
