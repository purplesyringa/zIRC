import ECIES from "libs/crypto/ecies";
import Lock from "libs/lock";
import {zeroPage, zeroFS} from "zero";
import {Buffer} from "buffer";

export default new class CryptMessage {
	constructor() {
		this.ecdh = null;
		this.ecdhLock = new Lock();
		this.ecdhLock.acquire();
		this.init();
	}

	async init() {
		// Get the private key from user settings
		let userSettings = await zeroPage.cmd("userGetSettings");
		let privateKey = (userSettings || {}).privateKey;

		if(privateKey) {
			// Derive from private key
			this.ecdh = ECIES.fromPrivatekey(privateKey);
		} else {
			// Generate keypair
			this.ecdh = ECIES.generateKey();
			// Save private key
			userSettings.privateKey = this.ecdh.getPrivateKey();
			await zeroPage.cmd("userSetSettings", userSettings);
		}

		this.ecdhLock.release();

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
		if(content.publicKey !== this.ecdh.getPublicKey()) { // e.g. missing or incorrect
			content.publicKey = this.ecdh.getPublicKey();
			// Save
			content = JSON.stringify(content, null, 1);
			await zeroFS.writeFile(`data/users/${authAddress}/content.json`, content);
		}
	}

	// Encrypt via other's public key
	encrypt(message, publicKey) {
		return ECIES.encrypt(Buffer.from(message, "utf8"), publicKey).toString("base64");
	}
	// Decrypt via own private key
	async decrypt(message) {
		// Wait for ECDH
		await this.ecdhLock.acquire();
		this.ecdhLock.release();
		return ECIES.decrypt(Buffer.from(message, "base64"), this.ecdh.getPrivateKey());
	}
};