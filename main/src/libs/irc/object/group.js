import Speakable from "libs/irc/speakable";
import {zeroPage, zeroFS, zeroDB} from "zero";
import {sha256} from "libs/crypto";
import CryptMessage from "libs/irc/cryptmessage";
import UserStorage from "libs/irc/userstorage";
import Lock from "libs/lock";

export default class Group extends Speakable {
	constructor(name) {
		super(name);

		[this.encKey, this.adminAddr] = name.split(":");

		this.initLock = new Lock();

		this.wasInvited = false;
		this.hasJoined = false;
		this.hasDismissed = false;

		this.init();
		UserStorage.on("changeUser", () => this.init());
	}

	async init() {
		await this.initLock.acquire();

		const history = await this._loadHistory();

		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;

		this.wasInvited = history.some(message => {
			return (
				message.message.special === "invite" &&
				message.message.authAddress === authAddress
			);
		});
		this.hasJoined = history.some(message => {
			return (
				message.message.special === "join" &&
				message.authAddress === authAddress
			);
		});
		this.hasDismissed = history.some(message => {
			return (
				message.message.special === "dismiss" &&
				message.authAddress === authAddress
			);
		});

		try {
			this.visibleName = history
				.filter(({message: m}) => m.adminSig && m.special === "setTitle")
				.slice(-1)[0]
				.message.title;
		} catch(e) {
			this.visibleName = "New group";
		}

		this.initLock.release();
	}

	async _loadHistory() {
		if(!this.encKey) {
			return [];
		}

		const hash = sha256(`+${this.encKey}:${this.adminAddr}`);

		const response = await zeroDB.query(dedent`
			SELECT
				groups.*,
				content_json.directory,
				content_json.cert_user_id
			FROM groups

			LEFT JOIN json AS data_json
			ON (data_json.json_id = groups.json_id)

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
			if(messageContent.cmd !== "group") {
				continue;
			}

			let data;
			try {
				data = await CryptMessage.decryptSymmetric(
					messageContent.message, this.encKey
				);
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
			if(message.cmd === "group") {
				// Try to decrypt the message, in case it's for us

				let data;
				try {
					data = await CryptMessage.decryptSymmetric(
						message.message, this.encKey
					);
				} catch(e) {
					return;
				}

				// Verify admin signature
				if(data.adminSig) {
					const sig = data.adminSig;
					delete data.adminSig;
					if(!(await CryptMessage.verify(data, this.adminAddr, sig))) {
						return;
					}
					data.adminSig = true;
				}

				// Update title
				if(data.adminSig && data.special === "setTitle") {
					this.visibleName = data.title;
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
		if(!this.encKey) {
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

		transport.send(`+${this.encKey}:${this.adminAddr}`, {
			cmd: "group",
			message: await CryptMessage.encryptSymmetric(message, this.encKey)
		});
	}

	// Invite a user to join a direct chat if he wasn't invited before
	async invite(inviteeAuthAddress) {
		const siteInfo = await zeroPage.getSiteInfo();
		const authAddress = siteInfo.auth_address;
		const content = JSON.parse(
			await zeroFS.readFile(`data/users/${authAddress}/content.json`)
		);

		for(const invite of content.group_invites || []) {
			// Try to decrypt the invite
			try {
				const inviteContent = await CryptMessage.decrypt(
					invite.for_inviter
				);
				if(inviteContent === `${this.encKey}:${this.adminAddr}`) {
					// Invited before
					return;
				}
			} catch(e) {
				// fallthrough
			}
		}

		// Add the invite
		content.group_invites = content.group_invites || [];
		content.group_invites.push({
			for_inviter: await CryptMessage.encrypt(
				`${this.encKey}:${this.adminAddr}`,
				await CryptMessage.getSelfPublicKey()
			),
			for_invitee: await CryptMessage.encrypt(
				`${this.encKey}:${this.adminAddr}`,
				await CryptMessage.findPublicKey(inviteeAuthAddress)
			)
		});


		// Publish
		await zeroFS.writeFile(
			`data/users/${authAddress}/content.json`,
			JSON.stringify(content, null, 1)
		);
		zeroPage.publish(`data/users/${authAddress}/content.json`);
	}


	async acceptInvite() {
		this.hasJoined = true;
		await this._send({
			special: "join"
		});
	}
	async dismissInvite() {
		this.hasDismissed = true;
		await this._send({
			special: "dismiss"
		});
	}


	async sendAdminSigned(message) {
		// Get admin key
		const userStorage = await UserStorage.get();
		const adminKey = (userStorage.groupAdminKeys || {})[this.name];
		if(!adminKey) {
			throw new Error("You're not an administrator of this group");
		}
		message.adminSig = await CryptMessage.sign(message);
		await this._send(message);
	}


	async send(text) {
		if(text.startsWith("/title ")) {
			const title = text.replace("/title ", "");
			await this.sendAdminSigned({
				special: "setTitle",
				title
			});
			this.visibleName = title;
			return;
		}

		await super.send(text);
	}
}