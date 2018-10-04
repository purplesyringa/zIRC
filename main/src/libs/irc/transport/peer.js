import EventEmitter from "wolfy87-eventemitter";
import {zeroPage, zeroFS} from "zero";

const PEERMESSAGE_HUB = "19Ruw8j8YVq2W3Snkm6rKyWN1gmFBKUBay";

export default new class PeerTransport extends EventEmitter {
	constructor() {
		super();

		zeroPage.on("peerReceive", async ({params: {message, signed_by: signedBy}}) => {
			// message.signedBy -- main site address
			// signedBy -- unique hub address
			let contentJson = await zeroFS.readFile(`data/users/${message.signedBy}/content.json`);
			contentJson = JSON.parse(contentJson);
			if(contentJson.signatureAddresses.indexOf(signedBy) > -1) {
				// The sender and the signer both agree with each other's
				// identity, so they should be the same person.
				this.emit("receive", {
					authAddress: message.signedBy,
					certUserId: contentJson.cert_user_id,
					message
				});
			}
		});
	}

	async send(id, message) {
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

		// Get hub auth_address
		const hubInfo = await zeroPage.cmd("as", [
			PEERMESSAGE_HUB,
			"siteInfo"
		]);
		const hubAuthAddress = hubInfo.auth_address;

		// Get main auth_address
		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;

		// Add hub auth_address to our user's content.json
		let contentJson;
		try {
			contentJson = await zeroFS.readFile(`data/users/${authAddress}/content.json`);
			contentJson = JSON.parse(contentJson);
		} catch(e) {
			contentJson = {
				files: {}
			};
		}

		let currentSignatureAddresses = contentJson.signatureAddresses || [];
		if(currentSignatureAddresses.indexOf(hubAuthAddress) === -1) {
			// If it's not there, add & publish it
			currentSignatureAddresses.push(hubAuthAddress);
			contentJson.signatureAddresses = currentSignatureAddresses;

			contentJson = JSON.stringify(contentJson, null, 1);
			await zeroFS.writeFile(`data/users/${authAddress}/content.json`, contentJson);
			try {
				await zeroPage.publish(`data/users/${authAddress}/content.json`);
			} catch(e) {
				// Fallthrough
			}
		}

		// Send the message
		zeroPage.cmd("as", [
			PEERMESSAGE_HUB,
			"peerBroadcast",
			{
				message: {...message, signedBy: authAddress},
				immediate: false,
				privatekey: false
			}
		]);
	}
};