import {zeroPage, zeroFS} from "zero";
import UserStorage from "libs/irc/userstorage";

export default new class CryptMessage {
	constructor() {
		this.init();
		UserStorage.on("changeUser", () => this.init());
	}

	async init() {
		// Now check that the user has the public key saved in content.json
		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;
		let content;
		try {
			content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));
		} catch(e) {
			// Create content.json
			await zeroPage.sign(`data/users/${authAddress}/content.json`);
			content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));
		}
		const publicKey = await this.getSelfPublicKey();
		if(content.publicKey !== publicKey) { // e.g. missing or incorrect
			content.publicKey = publicKey;
			// Save
			content = JSON.stringify(content, null, 1);
			await zeroFS.writeFile(`data/users/${authAddress}/content.json`, content);
		}
	}

	async getSelfPublicKey() {
		return await zeroPage.cmd("userPublickey");
	}

	// Encrypt via other's public key
	async encrypt(message, publicKey) {
		return await zeroPage.cmd("eciesEncrypt", [
			JSON.stringify(message),
			publicKey
		]);
	}
	async findPublicKey(authAddress) {
		try {
			const content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));
			return content.publicKey || null;
		} catch(e) {
			throw new Error("User isn't registered");
		}
	}

	// Decrypt via own private key
	async decrypt(message) {
		const res = await zeroPage.cmd("eciesDecrypt", [message]);
		if(!res) {
			throw new Error("Could not decrypt message");
		}
		return JSON.parse(res);
	}

	// Encrypt/decrypt via AES
	async encryptSymmetric(message, encKey) {
		const [, iv, ciphertext] = await zeroPage.cmd("aesEncrypt", [
			JSON.stringify(message),
			encKey
		]);
		return `${iv}|${ciphertext}`;
	}
	async decryptSymmetric(message, encKey) {
		const [iv, ciphertext] = message.split("|");
		const res = await zeroPage.cmd("aesDecrypt", [iv, ciphertext, encKey]);
		if(!res) {
			throw new Error("Could not decrypt message");
		}
		return JSON.parse(res);
	}
	async generateRandomSymmetricKey() {
		return (await zeroPage.cmd("aesEncrypt", ["test"]))[0];
	}
};