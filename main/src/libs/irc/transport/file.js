import EventEmitter from "wolfy87-eventemitter";
import {zeroPage, zeroDB, zeroFS, zeroAuth} from "zero";
import crypto from "crypto";

export default new class FileTransport extends EventEmitter {
	constructor() {
		super();

		zeroPage.on("setSiteInfo", async ({params: {event}}) => {
			if(
				event &&
				event[0] === "file_done" &&
				event[1].startsWith("data/users/") &&
				!event[1].endsWith("/content.json")
			) {
				// We've received *something*, but we don't know what *exactly*
				// was updated.
				const authAddress = event[1].split("/")[2];

				const contentJson = JSON.parse(
					await zeroFS.readFile(
						`data/users/${authAddress}/content.json`
					)
				);
				const certUserId = contentJson.cert_user_id;

				const dataJson = JSON.parse(await zeroFS.readFile(event[1]));
				for(const message of dataJson.messages) {
					const data = JSON.parse(message.message);

					this.emit("receive", {
						authAddress,
						certUserId,
						message: data
					});
				}
			}
		});
	}

	async send(id, message) {
		const siteInfo = await zeroPage.getSiteInfo();
		const certUserId = siteInfo.cert_user_id;
		if(
			!certUserId ||
			!zeroAuth.acceptedDomains.some(domain => certUserId.endsWith("@" + domain))
		) {
			// The cert_user_id is not signed by any provider
			// we allow -- post as anonymous, via peer transport.
			return;
		}


		const authAddress = siteInfo.auth_address;

		const hash = crypto.createHash("sha256").update(id).digest("hex");
		const fileName = id.charCodeAt(0).toString(16) + "_" + hash;

		await zeroDB.insertRow(
			`data/users/${authAddress}/${fileName}.json`,
			`data/users/${authAddress}/content.json`,
			"messages",
			{
				hash,
				message: JSON.stringify(message)
			}
		);
	}
};