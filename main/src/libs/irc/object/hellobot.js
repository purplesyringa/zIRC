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
						Please, tell me something! ^_^
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
			setTimeout(() => {
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "HelloBot",
					message: {
						date: Date.now(),
						text: `
							First, let me briefly explain what's going on.
							ZeroNet has a plugin called "PeerMessage".
							Unfortunately, it's not included to the standard
							package. It will let you send and receive messages
							very fast. If you don't have the plugin, you'll
							still be able to receive and send messages, but with
							30-second limit. So, if you need fast communication,
							we recommend you to install the plugin at:
							[https://github.com/HelloZeroNet/Plugin-PeerMessage]
							.
						`,
						id: "hellobot/1"
					}
				});
				this.state = "plugin";

				setTimeout(() => {
					this._received({
						authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
						certUserId: "HelloBot",
						message: {
							date: Date.now(),
							text: `
								Aah, yet another thing. On our IRC, you can log
								in as "Anonymous". You may find this feature
								useful -- but! You'll only be able to use
								"Anonymous" if you use PeerMessage plugin, and
								others will only be able to read "Anonymous"
								messages if they have PeerMessage plugin.
							`,
							id: "hellobot/2"
						}
					});
					this.state = "anonymous";

					setTimeout(() => {
						this._received({
							authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
							certUserId: "HelloBot",
							message: {
								date: Date.now(),
								text: `
									After that, please login (if you want to) by
									clicking the [Change] button ^^ and tell me
									when you're ready.
								`,
								id: "hellobot/3"
							}
						});
						this.state = "login";
					}, 1000);
				}, 5000);
			}, 1000);
		} else if(this.state === "login") {
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
							Okay. Now, look at the sidebar at the left << Right
							now, you only see *HelloBot (that's me!!) here.
							Let's start our tour by opening #lobby. Press the +
							at the bottom-left corner and type in "#lobby". Now,
							enjoy using the IRC! ^_^
						`,
						id: "hellobot/4"
					}
				});
				this.state = "done";
			}, 1000);
		}
	}
}