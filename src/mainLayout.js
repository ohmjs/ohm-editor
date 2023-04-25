import Vue from 'vue/dist/vue.common.js';

import mainLayoutConfig from './components/main-layout.vue';

const MainLayout = Vue.component('main-layout', mainLayoutConfig);

export const mainLayout = new MainLayout({
  el: '#mainLayout',
  propsData: {},
});
