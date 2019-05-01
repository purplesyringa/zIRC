import EventEmitter from "wolfy87-eventemitter";
import Lock from "libs/lock";
import {zeroPage} from "zero";

export default new class UserStorage extends EventEmitter {
	constructor() {
		super();

		this.saveLock = new Lock();

		this.storage = {};

		(async () => {
			await this.refresh();
			this.emit("changeUser");

			let currentId = await this.getUniqueId();
			zeroPage.on("setSiteInfo", async ({params: siteInfo}) => {
				const newId = await this.getUniqueId(siteInfo);
				if(newId !== currentId) {
					currentId = newId;
					await this.refresh();
					this.emit("changeUser");
				}
			});
		})();
	}

	async refresh() {
		this.storage = (
			(await zeroPage.cmd("userGetSettings")) || {}
		)[await this.getAuthAddress()] || {};
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

	async save() {
		await this.saveLock.acquire();

		const globalSettings = (await zeroPage.cmd("userGetSettings")) || {};
		globalSettings[await this.getAuthAddress()] = this.storage;
		await zeroPage.cmd("userSetSettings", [globalSettings]);

		this.saveLock.release();
	}
};