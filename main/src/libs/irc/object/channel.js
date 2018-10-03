import Speakable from "libs/irc/speakable";

export default class Channel extends Speakable {
	constructor(name) {
		super();
		this.name = name;
	}

	async _loadHistory() {
		return [];
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
		transport.send({
			cmd: "channel" + this.name,
			message
		});
	}
}