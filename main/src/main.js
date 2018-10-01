import "./sass/main.sass";

// Vue.js
import Vue from "vue/dist/vue.min.js";

// asyncComputed
import AsyncComputed from "vue-async-computed";
Vue.use(AsyncComputed);

Vue.prototype.$eventBus = new Vue();

import root from "./vue_components/root.vue";
var app = new Vue({
	el: "#app",
	render: h => h(root),
	data: {
		mainView: null,
		pagesView: null,
		zeroPage: null
	}
});

import {route} from "./route.js";
import {zeroPage} from "zero";
route(app);

Vue.prototype.$zeroPage = zeroPage;

(async function() {
	const siteInfo = await zeroPage.getSiteInfo();
	app.$eventBus.$emit("setSiteInfo", siteInfo);
})();
zeroPage.on("setSiteInfo", msg => {
	app.$eventBus.$emit("setSiteInfo", msg.params);
});