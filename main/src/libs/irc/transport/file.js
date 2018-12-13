import EventEmitter from "wolfy87-eventemitter";
import {zeroPage, zeroDB, zeroFS, zeroAuth} from "zero";
import crypto from "crypto";
import CryptMessage from "libs/irc/cryptmessage";

export default new class FileTransport extends EventEmitter {
	constructor() {
		super();

		zeroPage.on("setSiteInfo", async ({params: {event}}) => {
			if(
				event &&
				event[0] === "file_done" &&
				event[1].startsWith("data/users/")
			) {
				// We've received *something*, but we don't know what *exactly*
				// was updated.
				if(event[1].endsWith("/content.json")) {
					// Probably an invite?
					const authAddress = event[1].split("/")[2];

					const contentJson = JSON.parse(await zeroFS.readFile(event[1]));
					const certUserId = contentJson.cert_user_id;

					for(const invite of contentJson.invites || []) {
						try {
							await CryptMessage.decrypt(invite.for_invitee);
						} catch(e) {
							continue;
						}

						// We are invited. Check whether we have dismissed/accepted the invite before
						// We can't use top-level import because of circular dependency loop
						const IRC = await import("libs/irc");

						const user = IRC.getObjectById(`@${authAddress}`);
						await user.initLock.acquire();
						user.initLock.release();
						if(user.wasTheirInviteHandled) {
							continue;
						}

						this.emit("invite", {
							authAddress,
							certUserId
						});
					}

					// Or maybe they replied to our invite?
					for(const invite of contentJson.handledInvites || []) {
						let result;
						try {
							result = (await CryptMessage.decrypt(invite.for_invitee)).split(":").slice(-1)[0];
						} catch(e) {
							continue;
						}

						this.emit("inviteHandled", {
							authAddress,
							certUserId,
							result
						});
					}
				} else {
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

		// Check content.json
		let contentJson;
		try {
			contentJson = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));
		} catch(e) {
			contentJson = {
				files: {}
			};
		}
		if(!contentJson.optional) {
			contentJson.optional = "(2b|40)_.*\\.json";
			await zeroFS.writeFile(`data/users/${authAddress}/content.json`, JSON.stringify(contentJson, null, 1))
		}

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