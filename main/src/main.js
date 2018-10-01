import "./sass/main.sass";

import Vue from "vue/dist/vue.min.js";

import AsyncComputed from "vue-async-computed";
Vue.use(AsyncComputed);

Vue.prototype.$eventBus = new Vue();

import Vuex from "vuex";
Vue.use(Vuex);
const store = new Vuex.Store({
	state: {
		siteInfo: {
			settings: {
				own: false
			}
		},
		currentParams: null,
		currentRoute: null,
		currentHash: null,
		tab: ""
	},
	mutations: {
		setSiteInfo(state, siteInfo) {
			state.siteInfo = siteInfo;
		},
		route(state, router) {
			state.currentParams = router.currentParams;
			state.currentRoute = router.currentRoute;
			state.currentHash = router.currentHash;
		}
	}
});

import root from "./vue_components/root.vue";
var app = new Vue({
	el: "#app",
	render: h => h(root),
	data: {
		currentView: null
	},
	store
});

import {route} from "./route.js";
import {zeroPage} from "./zero";

Vue.prototype.$zeroPage = zeroPage;

(async function() {
	const siteInfo = await zeroPage.getSiteInfo();
	store.commit("setSiteInfo", siteInfo);
	route(app);
	app.$eventBus.$emit("setSiteInfo", siteInfo);
})();
zeroPage.on("setSiteInfo", msg => {
	store.commit("setSiteInfo", msg.params);
	app.$eventBus.$emit("setSiteInfo", msg.params);
});