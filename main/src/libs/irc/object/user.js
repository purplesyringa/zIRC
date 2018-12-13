import Speakable from "libs/irc/speakable";
import {zeroPage, zeroFS, zeroDB} from "zero";
import crypto from "crypto";
import CryptMessage from "libs/irc/cryptmessage";
import InviteStorage from "libs/irc/invitestorage";
import Lock from "libs/lock";

export default class User extends Speakable {
	constructor(name) {
		super(name);
		this.id = name;
		this.wasTheirInviteHandled = false;
		this.initLock = new Lock();
		this.initLock.acquire();
		this.init();
	}
	async init() {
		// Set correct name
		if(this.name.startsWith("auth_address:")) {
			this.name = "@" + this.name.replace("auth_address:", "");
		} else if(this.name.startsWith("cert_user_id:")) {
			// Find auth address via DB
			const certUserId = this.name.replace("cert_user_id:", "");
			const directory = ((await zeroDB.query(`
				SELECT directory FROM json WHERE cert_user_id = :cert_user_id
			`, {
				cert_user_id: certUserId
			}))[0] || {}).directory;
			if(!directory) {
				this.name = "@unknown";
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "UserBot",
					message: {
						date: Date.now(),
						text: "Error getting auth address of the user.",
						id: Math.random().toString(36).substr(2) + "/" + Date.now()
					}
				});
			} else {
				this.name = "@" + directory.replace("users/", "");
			}
		}

		InviteStorage.bindUser(this);

		// Check whether a user invited us, and we have handled the result (i.e. accepted or dismissed)
		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;
		const content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));

		this.wasTheirInviteHandled = (await Promise.all(
			(content.handledInvites || []).map(invite => {
				return CryptMessage.decrypt(invite.for_self);
			})
		)).some(invite => invite.startsWith(this.name + ":"));

		this.initLock.release();
	}

	async _loadHistory() {
		const hash = crypto.createHash("sha256").update(this.name).digest("hex");

		const response = await zeroDB.query(`
			SELECT
				users.*,
				content_json.directory,
				content_json.cert_user_id
			FROM users

			LEFT JOIN json AS data_json
			ON (data_json.json_id = users.json_id)

			LEFT JOIN json AS content_json
			ON (
				content_json.directory = data_json.directory AND
				content_json.file_name = "content.json"
			)

			WHERE hash = :hash
		`, {
			hash
		});

		const history = [];
		for(const message of response) {
			// Try to decrypt the message
			let messageContent = JSON.parse(message.message);
			if(messageContent.cmd !== "user") {
				continue;
			}

			let data;
			try {
				data = await CryptMessage.decrypt(messageContent.message);
			} catch(e) {
				continue;
			}

			history.push({
				authAddress: message.directory.replace("users/", ""),
				certUserId: message.cert_user_id,
				message: data
			});
		}
		return history;
	}

	_listen(transport) {
		transport.on("receive", async ({authAddress, certUserId, message}) => {
			if(message.cmd === "user") {
				if(authAddress !== this.name.replace("@", "")) {
					return;
				}

				// Try to decrypt the message, in case it's for us

				let data;
				try {
					data = await CryptMessage.decrypt(message.message);
				} catch(e) {
					return;
				}

				this._received({
					authAddress,
					certUserId,
					message: data
				});
			}
		});
	}

	async _transfer(message, transport) {
		const publicKey = await this.getPublicKey();
		if(!publicKey) {
			return;
		}

		transport.send(this.name, {
			cmd: "user",
			message: CryptMessage.encrypt(message, publicKey)
		});
	}

	async getPublicKey() {
		let publicKey;
		try {
			publicKey = await CryptMessage.findPublicKey(this.name.replace("@", ""));
		} catch(e) {
			this._received({
				authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
				certUserId: "UserBot",
				message: {
					date: Date.now(),
					text: `Error getting public key: ${e.message}`,
					id: Math.random().toString(36).substr(2) + "/" + Date.now()
				}
			});
			return null;
		}
		if(!publicKey) {
			this._received({
				authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
				certUserId: "UserBot",
				message: {
					date: Date.now(),
					text: "Couldn't find public key of the user.",
					id: Math.random().toString(36).substr(2) + "/" + Date.now()
				}
			});
			return null;
		}
		return publicKey;
	}

	// Invite a user to join a direct chat if he wasn't invited before
	async invite() {
		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;
		const content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));

		for(const invite of content.invites || []) {
			// Try to decrypt the invite
			const inviteContent = await CryptMessage.decrypt(invite.for_self);
			if(inviteContent === self.name) {
				// Invited before
				return;
			}
		}

		// Add the invite
		await zeroDB.insertRow(
			`data/users/${authAddress}/content.json`,
			`data/users/${authAddress}/content.json`,
			"invites",
			{
				for_self: await CryptMessage.encrypt(this.name, await CryptMessage.getSelfPublicKey()),
				for_invitee: await CryptMessage.encrypt(this.name, await this.getPublicKey())
			}
		);
	}

	// Accept/dismiss user's invite
	async acceptInvite() {
		await this.handleInvite("accept");
	}
	async dismissInvite() {
		await this.handleInvite("dismiss");
	}
	async handleInvite(result) {
		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;

		await zeroDB.insertRow(
			`data/users/${authAddress}/content.json`,
			`data/users/${authAddress}/content.json`,
			"handledInvites",
			{
				for_self: await CryptMessage.encrypt(`${this.name}:${result}`, await CryptMessage.getSelfPublicKey()),
				for_invitee: await CryptMessage.encrypt(`${this.name}:${result}`, await this.getPublicKey())
			}
		);

		this.wasThreirInviteHandled = true;
		this.emit("inviteHandled");
	}
}