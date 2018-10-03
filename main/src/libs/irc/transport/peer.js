import EventEmitter from "wolfy87-eventemitter";
import {zeroPage} from "zero";

const PEERMESSAGE_HUB = "19Ruw8j8YVq2W3Snkm6rKyWN1gmFBKUBay";

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

	async send(message) {
		// Check that we have the plugin
		const plugins = (await zeroPage.cmd("serverInfo")).plugins;
		if(plugins.indexOf("PeerMessage") === -1) {
			// Oops
			return;
		}

		// Request add
		const mergedSites = await zeroPage.cmd("mergerSiteList");
		if(!mergedSites[PEERMESSAGE_HUB]) {
			// await zeroPage.cmd("mergerSiteAdd", [PEERMESSAGE_HUB]);
			await new Promise(resolve => {
				const handler = ({params: siteInfo}) => {
					if(siteInfo.address === PEERMESSAGE_HUB) {
						// We started downloading the hub
						zeroPage.off("setSiteInfo", handler);
						// Wait a bit and send
						setTimeout(resolve, 1000);
					}
				};
				zeroPage.on("setSiteInfo", handler);
			});
		}

		zeroPage.cmd("as", [
			PEERMESSAGE_HUB,
			"peerBroadcast",
			{
				message,
				immediate: false,
				privatekey: false
			}
		]);
	}
};