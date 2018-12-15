import EventEmitter from "wolfy87-eventemitter";
import {zeroPage} from "zero";

export default new class UserStorage extends EventEmitter {
	constructor() {
		super();

		(async () => {
			let currentId = await this.getUniqueId();
			zeroPage.on("setSiteInfo", async ({params: siteInfo}) => {
				const newId = await this.getUniqueId(siteInfo);
				if(newId !== currentId) {
					currentId = newId;
					this.emit("changeUser");
				}
			});
		})();
	}

	async getAuthAddress() {
		return (await zeroPage.getSiteInfo()).auth_address;
	}
	async getUniqueId(siteInfo=null) {
		if(!siteInfo) {
			siteInfo = await zeroPage.getSiteInfo();
		}
		return siteInfo.auth_address + "/" + siteInfo.auth_address;
	}

	async get() {
		return ((await zeroPage.cmd("userGetSettings")) || {})[await this.getAuthAddress()];
	}
	async set(settings) {
		const globalSettings = (await zeroPage.cmd("userGetSettings")) || {};
		globalSettings[await this.getAuthAddress()] = settings;
		await zeroPage.cmd("userSetSettings", [globalSettings]);
	}
};