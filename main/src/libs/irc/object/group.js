import Speakable from "libs/irc/speakable";
import {zeroPage, zeroFS, zeroDB} from "zero";
import {sha256} from "libs/crypto";
import CryptMessage from "libs/irc/cryptmessage";

export default class Group extends Speakable {
	constructor(encKey) {
		super(encKey);
		this.encKey = encKey;
	}

	async _loadHistory() {
		if(!this.encKey) {
			return [];
		}

		const hash = sha256(`+${this.encKey}`);

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

		transport.send(`+${this.encKey}`, {
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

		for(const invite of content.groupInvites || []) {
			// Try to decrypt the invite
			try {
				const inviteContent = await CryptMessage.decrypt(
					invite.for_inviter
				);
				if(inviteContent === this.encKey) {
					// Invited before
					return;
				}
			} catch(e) {
				// fallthrough
			}
		}

		// Add the invite
		content.groupInvites = content.groupInvites || [];
		content.groupInvites.push({
			for_inviter: await CryptMessage.encrypt(
				this.encKey,
				await CryptMessage.getSelfPublicKey()
			),
			for_invitee: await CryptMessage.encrypt(
				this.encKey,
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
}