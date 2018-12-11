import crypto from "crypto";
import {Buffer} from "buffer";

export default {
	generateKey() {
		return crypto.randomBytes(32);
	},
	generateSalt() {
		return crypto.randomBytes(32);
	},
	fromPassword(password, salt) {
		return crypto.pbkdf2Sync(password, salt, 50000, 32, "sha1");
	},
	encrypt(buf, privatekey) {
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv("aes-256-cbc", privatekey, iv);

		// Encrypt
		let encrypted = cipher.update(buf);
		encrypted = Buffer.concat([encrypted, cipher.final()]);

		// Prepend with constant-size IV
		encrypted = Buffer.concat([iv, encrypted]);

		return encrypted;
	},
	decrypt(buf, privatekey) {
		// Get IV
		const iv = buf.slice(0, 16);
		const cipher = crypto.createDecipheriv("aes-256-cbc", privatekey, iv);

		// Decrypt
		let decrypted = cipher.update(buf.slice(16));
		decrypted = Buffer.concat([decrypted, cipher.final()]);
		return decrypted;
	}
};