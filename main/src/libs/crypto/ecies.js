import crypto from "crypto";
import ecies from "standard-ecies";

const options = {
	hashName: "sha256",
	hashLength: 32,
	macName: "sha256",
	macLength: 32,
	curveName: "secp256k1",
	symmetricCypherName: "aes-256-ecb",
	iv: null,
	keyFormat: "uncompressed",
	s1: null,
	s2: null
};

export default {
	generateKey() {
		const ecdh = crypto.createECDH(options.curveName);
		ecdh.generateKeys();
		return ecdh;
	},
	fromPrivatekey(privatekey) {
		const ecdh = crypto.createECDH(options.curveName);
		ecdh.setPrivateKey(privatekey);
		return ecdh;
	},
	encrypt(buf, publickey) {
		return ecies.encrypt(publickey, buf, options);
	},
	decrypt(buf, privatekey) {
		const ecdh = crypto.createECDH(options.curveName);
		ecdh.setPrivateKey(privatekey);
		return ecies.decrypt(ecdh, buf, options);
	}
};