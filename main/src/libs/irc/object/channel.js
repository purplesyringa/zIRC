import Speakable from "libs/irc/speakable";
import {zeroDB} from "zero";
import {sha256} from "libs/crypto";

export default class Channel extends Speakable {
	async _loadHistory() {
		const hash = sha256(this.name);

		const response = await zeroDB.query(dedent`
			SELECT
				channels.*,
				content_json.directory,
				content_json.cert_user_id
			FROM channels

			LEFT JOIN json AS data_json
			ON (data_json.json_id = channels.json_id)

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
			const data = JSON.parse(message.message);
			history.push({
				authAddress: message.directory.replace("users/", ""),
				certUserId: message.cert_user_id,
				message: data.message
			});
		}
		return history;
	}

	_listen(transport) {
		transport.on("receive", ({authAddress, certUserId, message}) => {
			if(message.cmd === "channel" + this.name) {
				this._received({
					authAddress,
					certUserId,
					message: message.message
				});
			}
		});
	}

	_transfer(message, transport) {
		transport.send(this.name, {
			cmd: "channel" + this.name,
			message
		});
	}
}