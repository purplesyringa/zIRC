import {zeroPage} from "zero";

export default new class UserStorage {
	async get() {
		return await zeroPage.cmd("userGetSettings");
	}
	async set(settings) {
		await zeroPage.cmd("userSetSettings", [settings]);
	}
};