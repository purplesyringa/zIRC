import Speakable from "libs/irc/speakable";

export default class HelloBot extends Speakable {
	constructor(name) {
		super();
		this.name = name;
		this.state = "start";
	}

	async _loadHistory() {
		return [
			{
				authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
				certUserId: "HelloBot",
				message: {
					date: Date.now(),
					text: `
						Hi, I'm *HelloBot! I'll help you start using our IRC.
						Please choose your account (if you'd like to use it) by
						clicking [Change] button above. ^-^ Then, tell me
						something! O_o
					`,
					id: "hellobot/0"
				}
			}
		];
	}

	_listen() {
		return;
	}

	_transfer(message, transport) {
		if(this.state === "start") {
			transport.send("#HelloBot_join", {
				cmd: "channel#HelloBot_join",
				message
			});

			setTimeout(() => {
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "HelloBot",
					message: {
						date: Date.now(),
						text: `
							OMG!! Now, look at the sidebar at the left << Right
							now, you only see *HelloBot (that's me!!) here.
							Let's start our tour by opening #lobby. Press the +
							at the bottom-left corner and type in "#lobby".
						`,
						id: "hellobot/1"
					}
				});
				this.state = "omg";
			}, 1000);
		}
	}
}