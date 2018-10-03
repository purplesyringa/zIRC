import EventEmitter from "wolfy87-eventemitter";
import {zeroPage} from "zero";

export default new class PeerTransport extends EventEmitter {
	constructor() {
		super();

		zeroPage.on("peerReceive", ({params: {cert, message, signed_by: signedBy}}) => {
			this.emit("receive", {
				authAddress: signedBy,
				certUserId: cert.split("/").slice(1).join("/"),
				message: message.message
			});
		});
	}

	send(message) {
		zeroPage.cmd("peerBroadcast", {
			message,
			immediate: false,
			privatekey: false
		});
	}
};