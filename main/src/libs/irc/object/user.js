import Speakable from "libs/irc/speakable";
import {zeroPage, zeroFS, zeroDB} from "zero";
import {sha256} from "libs/crypto";
import CryptMessage from "libs/irc/cryptmessage";
import InviteStorage from "libs/irc/invitestorage";
import UserStorage from "libs/irc/userstorage";
import FileTransport from "libs/irc/transport/file";
import Lock from "libs/lock";

export default class User extends Speakable {
	static async get(name) {
		const visibleName = (
			name.startsWith("cert_user_id:")
				? name.replace("cert_user_id:", "")
				: `@${name.replace("auth_address:", "")}`
		);

		// Set correct name
		let authAddress;
		if(name.startsWith("auth_address:")) {
			authAddress = name.replace("auth_address:", "");
			name = `@${authAddress}`;
		} else if(name.startsWith("cert_user_id:")) {
			// Find auth address via DB
			const certUserId = name.replace("cert_user_id:", "");
			const directory = ((await zeroDB.query(dedent`
				SELECT directory FROM json WHERE cert_user_id = :cert_user_id
			`, {
				cert_user_id: certUserId
			}))[0] || {}).directory;
			if(!directory) {
				name = "@unknown";
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "/HelloBot",
					message: {
						date: Date.now(),
						text: "Error getting auth address of the user.",
						id: Math.random().toString(36).substr(2) + "/" + Date.now()
					}
				});
			} else {
				name = "@" + directory.replace("users/", "");
			}
		} else {
			// Should never happen
			name = "@unknown";
		}

		return new this(name, visibleName);
	}


	constructor(name, visibleName) {
		super(name);
		this.visibleName = visibleName;
		this.theyInvited = false;
		this.weInvited = false;
		this.wasTheirInviteHandled = false;
		this.wasOurInviteHandled = false;
		this.theirInviteState = null;
		this.ourInviteState = null;
		this.initLock = new Lock();
		this.publicKeyLock = new Lock();
		this.publicKeyCache = undefined;
		this.encId = null;
		this.init();
		InviteStorage.bindUser(this);
		UserStorage.on("changeUser", () => this.init());
		zeroPage.on("setSiteInfo", async () => {
			await this.init();
		});
	}
	async init() {
		await this.initLock.acquire();

		// Check whether a user invited us, and we have handled the result (i.e. accepted or dismissed)
		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;
		const content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));

		this.wasTheirInviteHandled = (await Promise.all(
			(content.handledInvites || []).map(invite => {
				return CryptMessage.decrypt(invite.for_self)
					.catch(() => null);
			})
		)).some(invite => {
			if(!invite) {
				return false;
			}

			const encId = invite.substr(0, invite.indexOf("!!"));

			if(invite === `${encId}!!${this.name}:accept` || invite === `${encId}!!${this.name}:dismiss`) {
				this.encId = encId;
				this.theirInviteState = invite.split(":").slice(-1)[0];
				return true;
			} else {
				return false;
			}
		});

		// Check whether we invited them
		this.weInvited = (await Promise.all(
			(content.invites || []).map(invite => {
				return CryptMessage.decrypt(invite.for_self)
					.catch(() => null);
			})
		)).some(invite => invite === this.name);

		// Now check whether the user accepted/dismissed our invite
		let theirContent;
		try {
			theirContent = JSON.parse(await zeroFS.readFile(`data/users/${this.name.substr(1)}/content.json`));
		} catch(e) {
			theirContent = null;
		}

		if(theirContent) {
			const theirContent = JSON.parse(await zeroFS.readFile(`data/users/${this.name.substr(1)}/content.json`));
			const siteInfo = await zeroPage.getSiteInfo();
			const authAddress = siteInfo.auth_address;

			this.wasOurInviteHandled = (await Promise.all(
				(theirContent.handledInvites || []).map(invite => {
					return CryptMessage.decrypt(invite.for_inviter)
						.catch(() => null);
				})
			)).some(invite => {
				if(!invite) {
					return false;
				}

				const encId = invite.substr(0, invite.indexOf("!!"));

				if(invite !== `${encId}!!@${authAddress}:accept` && invite !== `${encId}!!@${authAddress}:dismiss`) {
					return false;
				}

				this.ourInviteState = invite.split(":").slice(-1)[0];
				this.encId = encId;
				return true;
			});

			// Check whether they invited us
			this.theyInvited = (await Promise.all(
				(theirContent.invites || []).map(invite => {
					return CryptMessage.decrypt(invite.for_invitee)
						.catch(() => null);
				})
			)).some(invite => invite === `@${authAddress}`);
		}


		this.initLock.release();

		await this.loadHistory();
	}

	async _loadHistory() {
		if(!this.encId) {
			return [];
		}

		const hash = sha256(`@${this.encId}`);

		// Download user optional file
		await FileTransport.pin(this.name.substr(1), `@${this.encId}`);

		const response = await zeroDB.query(dedent`
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

	async _doesNeedToLoadHistory() {
		return this.theirInviteState === "accept" || this.ourInviteState === "accept";
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

		if(!this.encId) {
			this._received({
				authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
				certUserId: "/HelloBot",
				message: {
					date: Date.now(),
					text: `The users didn't reach consensus on invitation, can't send message.`,
					id: Math.random().toString(36).substr(2) + "/" + Date.now()
				}
			});
			return;
		}

		transport.send(`@${this.encId}`, {
			cmd: "user",
			message: await CryptMessage.encrypt(message, publicKey)
		});
	}

	async getPublicKey() {
		if(this.publicKeyCache !== undefined) {
			return this.publicKeyCache;
		}
		await this.publicKeyLock.acquire();
		if(this.publicKeyCache !== undefined) {
			this.publicKeyLock.release();
			return this.publicKeyCache;
		}

		try {
			const publicKey = await CryptMessage.findPublicKey(this.name.replace("@", ""));
			if(!publicKey) {
				throw new Error("Couldn't find public key of the user")
			}
			this.publicKeyCache = publicKey;
			return publicKey;
		} catch(e) {
			this.publicKeyCache = null;
			throw e;
		} finally {
			this.publicKeyLock.release();
		}
	}

	// Invite a user to join a direct chat if he wasn't invited before
	async invite() {
		await this.initLock.peek();

		if(this.theyInvited && !this.wasTheirInviteHandled) {
			// If we were invited by the user, accept their invite instead of making ours
			await this.acceptInvite();
			return;
		}

		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;
		const content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));

		for(const invite of content.invites || []) {
			// Try to decrypt the invite
			try {
				const inviteContent = await CryptMessage.decrypt(invite.for_self);
				if(inviteContent === this.name) {
					// Invited before
					return;
				}
			} catch(e) {
				// fallthrough
			}
		}

		this.weInvited = true;

		// Add the invite
		content.invites = content.invites || [];
		content.invites.push({
			for_self: await CryptMessage.encrypt(this.name, await CryptMessage.getSelfPublicKey()),
			for_invitee: await CryptMessage.encrypt(this.name, await this.getPublicKey())
		});
		// Remove dismiss
		if(content.handledInvites) {
			content.handledInvites = (
				await Promise.all(
					content.handledInvites.map(async invite => {
						return (await CryptMessage.decrypt(invite.for_self)).endsWith(`!!${this.name}:dismiss`) ? null : invite;
					}).map(promise => promise.catch(() => null))
				)
			).filter(invite => invite);
		}

		// Publish
		await zeroFS.writeFile(`data/users/${authAddress}/content.json`, JSON.stringify(content, null, 1));
		zeroPage.publish(`data/users/${authAddress}/content.json`);
	}
	async cancelInvite() {
		await this.initLock.peek();

		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;
		const content = JSON.parse(await zeroFS.readFile(`data/users/${authAddress}/content.json`));

		let newInvites = [];
		for(const invite of content.invites || []) {
			// Try to decrypt the invite
			try {
				const inviteContent = await CryptMessage.decrypt(invite.for_self);
				if(inviteContent !== this.name) {
					newInvites.push(invite);
				}
			} catch(e) {
				// fallthrough
			}
		}
		content.invites = newInvites;

		this.weInvited = false;

		// Publish
		await zeroFS.writeFile(`data/users/${authAddress}/content.json`, JSON.stringify(content, null, 1));
		zeroPage.publish(`data/users/${authAddress}/content.json`);
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

		this.encId = Math.random().toString(36).substr(2);
		await zeroDB.insertRow(
			`data/users/${authAddress}/content.json`,
			`data/users/${authAddress}/content.json`,
			"handledInvites",
			{
				for_self: await CryptMessage.encrypt(`${this.encId}!!${this.name}:${result}`, await CryptMessage.getSelfPublicKey()),
				for_inviter: await CryptMessage.encrypt(`${this.encId}!!${this.name}:${result}`, await this.getPublicKey())
			}
		);

		this.wasTheirInviteHandled = true;
		this.emit("inviteHandled");

		this.history = null;
		await this.loadHistory();
	}
}