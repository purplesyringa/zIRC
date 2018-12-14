import ECIES from "libs/crypto/ecies";
import Lock from "libs/lock";
import {zeroPage, zeroFS} from "zero";
import {Buffer} from "buffer";
import UserStorage from "libs/irc/userstorage";

export default new class CryptMessage {
	constructor() {
		this.ecdh = null;
		this.ecdhLock = new Lock();
		this.ecdhLock.acquire();
		this.init();
	}

	async init() {
		// Get the private key from user settings
		let userSettings = (await UserStorage.get()) || {};
		let privateKey = userSettings.privateKey;

		if(privateKey) {
			// Derive from private key
			this.ecdh = ECIES.fromPrivatekey(Buffer.from(privateKey, "base64"));
		} else {
			// Generate keypair
			this.ecdh = ECIES.generateKey();
			// Save private key
			userSettings.privateKey = this.ecdh.getPrivateKey().toString("base64");
			await UserStorage.set(userSettings);
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
		if(content.publicKey !== this.ecdh.getPublicKey().toString("base64")) { // e.g. missing or incorrect
			content.publicKey = this.ecdh.getPublicKey().toString("base64");
			// Save
			content = JSON.stringify(content, null, 1);
			await zeroFS.writeFile(`data/users/${authAddress}/content.json`, content);
		}
	}

	async getECDH() {
		// Wait for ECDH
		await this.ecdhLock.acquire();
		this.ecdhLock.release();
		return this.ecdh;
	}

	// Encrypt via other's public key
	encrypt(message, publicKey) {
		message = JSON.stringify(message);
		return ECIES.encrypt(Buffer.from(message, "utf8"), Buffer.from(publicKey, "base64")).toString("base64");
	}
	async findPublicKey(authAddress) {
		try {
			const content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));
			return content.publicKey || null;
		} catch(e) {
			throw new Error("User isn't registered");
		}
	}
	async getSelfPublicKey() {
		return (await this.getECDH()).getPublicKey().toString("base64");
	}

	// Decrypt via own private key
	async decrypt(message) {
		// Wait for ECDH
		const ecdh = await this.getECDH();
		return JSON.parse(ECIES.decrypt(Buffer.from(message, "base64"), ecdh.getPrivateKey()).toString("utf8"));
	}
};