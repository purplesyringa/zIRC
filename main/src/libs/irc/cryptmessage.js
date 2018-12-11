import ECIES from "@/libs/crypto/ecies";
import Lock from "@/libs/lock";

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