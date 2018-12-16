import "./sass/main.sass";

import Vue from "vue/dist/vue.min.js";

import AsyncComputed from "vue-async-computed";
Vue.use(AsyncComputed);

// Components
import Icon from "vue-awesome/components/Icon.vue";
Vue.component("icon", Icon);
import Avatar from "vue_components/avatar/avatar.vue";
Vue.component("Avatar", Avatar);
import Sidebar from "vue_components/sidebar/sidebar.vue";
Vue.component("Sidebar", Sidebar);
import Message from "vue_components/message/message.vue";
Vue.component("Message", Message);
import SmallMessage from "vue_components/message/smallmessage.vue";
Vue.component("SmallMessage", SmallMessage);
import ClearFix from "vue_components/clearfix.vue";
Vue.component("ClearFix", ClearFix);

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
		currentChannel: null
	},
	mutations: {
		setSiteInfo(state, siteInfo) {
			if(siteInfo.address === state.siteInfo.address) {
				state.siteInfo = siteInfo;
			}
		},
		forceSetSiteInfo(state, siteInfo) {
			state.siteInfo = siteInfo;
		},
		route(state, router) {
			state.currentParams = router.currentParams;
			state.currentRoute = router.currentRoute;
			state.currentHash = router.currentHash;
		},
		openChannel(state, channel) {
			state.currentChannel = channel;
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
	zeroPage.cmd("wrapperInnerLoaded");
	const siteInfo = await zeroPage.getSiteInfo();
	store.commit("forceSetSiteInfo", siteInfo);
	route(app);
	app.$eventBus.$emit("setSiteInfo", siteInfo);
})();
zeroPage.on("setSiteInfo", msg => {
	store.commit("setSiteInfo", msg.params);
	app.$eventBus.$emit("setSiteInfo", msg.params);
});