import EventEmitter from "wolfy87-eventemitter";
import {zeroPage, zeroDB} from "zero";
import FileTransport from "libs/irc/transport/file";
import CryptMessage from "libs/irc/cryptmessage";
import UserStorage from "libs/irc/userstorage";

export default new class InviteStorage extends EventEmitter {
	constructor() {
		super();
		this.invites = [];

		this.loadInvites();

		this.listen(FileTransport);

		UserStorage.on("changeUser", () => {
			this.invites = [];
			this.loadInvites();
		});
	}

	async loadInvites() {
		const response = await zeroDB.query(dedent`
			SELECT
				invites.*,
				content_json.directory,
				content_json.cert_user_id
			FROM invites

			LEFT JOIN json AS data_json
			ON (data_json.json_id = invites.json_id)

			LEFT JOIN json AS content_json
			ON (
				content_json.directory = data_json.directory AND
				content_json.file_name = "content.json"
			)
		`);

		const siteInfo = await zeroPage.getSiteInfo();
		const myAuthAddress = siteInfo.auth_address;

		const IRC = (await import("libs/irc")).default;

		for(const invite of response) {
			const authAddress = invite.directory.replace("users/", "");
			const certUserId = invite.cert_user_id;

			try {
				if(await CryptMessage.decrypt(invite.for_invitee) !== `@${myAuthAddress}`) {
					continue;
				}
			} catch(e) {
				continue;
			}

			// We are invited. Check whether we have dismissed/accepted the invite before
			const user = await IRC.getObjectById(`@${authAddress}`);
			await user.initLock.acquire();
			user.initLock.release();
			user.theyInvited = true;
			if(user.wasTheirInviteHandled || user.wasOurInviteHandled) {
				continue;
			}

			this.invites.push({authAddress, certUserId});
		}

		this.emit("invitesUpdated");
	}

	listen(transport) {
		transport.on("invite", async ({authAddress, certUserId}) => {
			// Skip if we already have this invite
			if(this.invites.some(invite => invite.authAddress === authAddress)) {
				return;
			}

			const IRC = (await import("libs/irc")).default;
			const user = await IRC.getObjectById(`@${authAddress}`);
			await user.initLock.acquire();
			user.initLock.release();
			user.theyInvited = true;

			this.invites.push({authAddress, certUserId});
			this.emit("invitesUpdated");
		});

		transport.on("inviteHandled", async ({authAddress, result, encId}) => {
			let oldSize = this.invites.length;
			this.invites = this.invites.filter(invite => {
				return invite.authAddress !== authAddress;
			});

			const IRC = (await import("libs/irc")).default;
			const user = await IRC.getObjectById(`@${authAddress}`);
			await user.initLock.acquire();
			user.initLock.release();
			user.wasOurInviteHandled = true;
			user.ourInviteState = result;
			user.encId = encId;

			if(oldSize !== this.invites.length) {
				this.emit("invitesUpdated");
			}
		});
	}

	bindUser(user) {
		user.on("inviteHandled", () => {
			this.invites = this.invites.filter(invite => {
				return `@${invite.authAddress}` !== user.name;
			});
			this.emit("invitesUpdated");
		});
	}
};