import {zeroDB} from "zero";
import FileTransport from "libs/irc/transport/file";
import CryptMessage from "libs/irc/cryptmessage";

export default new class InviteStorage {
	constructor() {
		this.invites = [];

		this.loadInvites();

		this.listen(FileTransport);
	}

	async loadInvites() {
		const response = await zeroDB.query(`
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

		const User = await import("libs/irc/object/user");

		for(const invite of response) {
			const authAddress = invite.directory.replace("users/", "");
			const certUserId = invite.cert_user_id;

			try {
				await CryptMessage.decrypt(invite.for_invitee);
			} catch(e) {
				continue;
			}

			// We are invited. Check whether we have dismissed/accepted the invite before
			const user = new User(`auth_address:${authAddress}`);
			if(await user.wasInviteHandled()) {
				continue;
			}

			this.invites.push({authAddress, certUserId});
		}
	}

	listen(transport) {
		transport.on("invite", ({authAddress, certUserId}) => {
			// Skip if we already have this invite
			if(this.invites.some(invite => invite.authAddress === authAddress)) {
				return;
			}

			this.invites.push({authAddress, certUserId});
		});
	}

	bindUser(user) {
		user.on("inviteHandled", () => {
			this.invites = this.invites.filter(invite => {
				if(user.id[0] === "@") {
					return invite.authAddress !== user.id.substr(1);
				} else {
					return invite.certUserId !== user.id;
				}
			})
		});
	}
};