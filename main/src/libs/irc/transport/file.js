import EventEmitter from "wolfy87-eventemitter";
import {zeroPage, zeroDB, zeroFS, zeroAuth} from "zero";
import {sha256} from "libs/crypto";
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
						const IRC = (await import("libs/irc")).default;

						const user = IRC.getObjectById(`@${authAddress}`);
						await user.initLock.peek();
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
						let result, encId;
						try {
							const decrypted = await CryptMessage.decrypt(invite.for_inviter);
							result = decrypted.split(":").slice(-1)[0];
							encId = decrypted.split("!!")[0];
						} catch(e) {
							continue;
						}

						this.emit("inviteHandled", {
							authAddress,
							certUserId,
							result,
							encId
						});
					}

					// Or maybe it's a group invite?
					for(const invite of contentJson.group_invites || []) {
						let encKey, adminAddr;
						try {
							[encKey, adminAddr] = (
								await CryptMessage.decrypt(invite.for_invitee)
							).split(":");
						} catch(e) {
							continue;
						}

						// We are invited. Check whether we have dismissed/accepted the invite before
						// We can't use top-level import because of circular dependency loop
						const IRC = (await import("libs/irc")).default;

						const group = IRC.getObjectById(`+${encKey}:${adminAddr}`);
						await group.initLock.peek();
						if(!group.wasInvited || group.hasJoined || group.hasDismissed) {
							continue;
						}

						this.emit("groupInvite", {
							encKey,
							adminAddr
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

		const hash = sha256(id);
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

	async pin(authAddress, id) {
		const hash = sha256(id);
		const fileName = id.charCodeAt(0).toString(16) + "_" + hash;

		let authAddresses;
		if(authAddress === "*") {
			// All addresses
			authAddresses = (
				(await zeroPage.cmd("fileList", ["data/users"]))
					.filter(path => path.endsWith(`/${fileName}.json`))
					.map(path => path.split("/")[0])
			);
		} else {
			// Specific address
			authAddresses = [authAddress];
		}

		console.log("Pin", authAddresses, "/", id);

		// Get optional file info
		const allInfos = (await Promise.all(
			authAddresses
				.map(authAddress => `data/users/${authAddress}/${fileName}.json`)
				.map(async path => await zeroPage.cmd("optionalFileInfo", [path]))
		))
			.filter(info => info);

		// List unpinned files
		const unpinned = allInfos
			.filter(info => !info.is_pinned)
			.map(info => info.inner_path);
		if(unpinned.length) {
			await zeroPage.cmd("optionalFilePin", [unpinned]);
		}

		// List undownloaded files
		const undownloaded = allInfos
			.filter(info => !info.is_downloaded)
			.map(info => info.inner_path);
		await Promise.all(
			undownloaded.map(
				async path => await zeroPage.cmd("fileNeed", [path, 1])
			)
		);
	}
};