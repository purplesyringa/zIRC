import {zeroPage} from "zero";

export default new class UserStorage {
	async getAuthAddress() {
		return (await zeroPage.getSiteInfo()).auth_address;
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