import Speakable from "libs/irc/speakable";
import {zeroPage, zeroFS} from "zero";

export default class HelloBot extends Speakable {
	constructor() {
		super("/HelloBot");
		this.state = "start";
		this.currentId = Math.random().toString(16).substr(2);
		this.postedHelloMessage = false;
	}

	async _loadHistory() {
		// Let's check whether there's a storage we haven't setup yet
		const mergedSites = await zeroPage.cmd("mergerSiteList", [true]);
		for(const address of Object.keys(mergedSites)) {
			const content = mergedSites[address].content;
			if(content.permanent_storage && !content.setup) {
				// Yay, we've found an unset hub!
				const messages = [
					{
						authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
						certUserId: "/HelloBot",
						message: {
							date: Date.now(),
							text: `
								Okay, so you've just made a permanent storage!
								It has address "${address}", but you don't have
								to remember that. Just know that nothing will be
								lost now! When you're ready to start using IRC,
								tell me.
							`,
							id: this.generateId(0)
						}
					}
				];
				this.state = "tour";

				let content = await zeroFS.readFile(`merged-IRC/${address}/content.json`);
				content = JSON.parse(content);
				content.setup = true;
				content = JSON.stringify(content, null, 1);
				await zeroFS.writeFile(`merged-IRC/${address}/content.json`, content);

				return messages;
			}
		}

		return [];
	}

	_listen() {
		return;
	}

	_transfer(message) {
		if(message.text === "/storage") {
			setTimeout(() => {
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "/HelloBot",
					message: {
						date: Date.now(),
						text: `
							You'll see a message inviting to clone a site,
							please do it! ^_^
						`,
						id: this.generateId(10)
					}
				});
				this.state = "clone";

				setTimeout(async () => {
					const siteInfo = await zeroPage.getSiteInfo();
					zeroPage.cmd("siteClone", [siteInfo.address, "storage"]);
				}, 1000);
			}, 1000);
			return;
		} else if(message.text === "/help") {
			setTimeout(() => {
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "/HelloBot",
					message: {
						date: Date.now(),
						text: `
							Help: /storage -- create a new permanent storage
						`,
						id: this.generateId(11)
					}
				});
			}, 1000);
			return;
		}

		if(this.state === "start") {
			setTimeout(() => {
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "/HelloBot",
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
						id: this.generateId(2)
					}
				});
				this.state = "plugin";

				setTimeout(() => {
					this._received({
						authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
						certUserId: "/HelloBot",
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
							id: this.generateId(3)
						}
					});
					this.state = "anonymous";

					setTimeout(() => {
						this._received({
							authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
							certUserId: "/HelloBot",
							message: {
								date: Date.now(),
								text: `
									After that, please login (if you want to) by
									clicking the [Change] button ^^ and tell me
									when you're ready.
								`,
								id: this.generateId(4)
							}
						});
						this.state = "login";
					}, 1000);
				}, 5000);
			}, 1000);
		} else if(this.state === "login") {
			setTimeout(() => {
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "/HelloBot",
					message: {
						date: Date.now(),
						text: `
							Nice! Now another question: would you like to save
							the messages you receive and send to a permanent
							storage? This means that Anonymous messages will be
							saved (not deleted, as usual), and if someone
							deletes his message, you'll still have it. Please
							answer "yes"/"no", whether you want to set up a
							permanent storage.
						`,
						id: this.generateId(5)
					}
				});
				this.state = "storage";
			}, 1000);
		} else if(this.state === "storage") {
			if(message.text === "yes") {
				setTimeout(() => {
					this._received({
						authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
						certUserId: "/HelloBot",
						message: {
							date: Date.now(),
							text: `
								Niiice! So, you'll see a message inviting to
								clone a site, please do it! ^_^
							`,
							id: this.generateId(6)
						}
					});
					this.state = "clone";

					setTimeout(async () => {
						const siteInfo = await zeroPage.getSiteInfo();
						zeroPage.cmd("siteClone", [siteInfo.address, "storage"]);
					}, 1000);
				}, 1000);
			} else if(message.text === "no") {
				setTimeout(() => {
					this._received({
						authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
						certUserId: "/HelloBot",
						message: {
							date: Date.now(),
							text: `
								Oh. Okaay, you can always setup the permanent
								storage any time later by accessing me
								(reminder: press "+", then "/HelloBot" ^_^) and
								typing "/storage". When you're ready to start
								using IRC, tell me.
							`,
							id: this.generateId(7)
						}
					});
					this.state = "tour";
				}, 1000);
			} else {
				setTimeout(() => {
					this._received({
						authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
						certUserId: "/HelloBot",
						message: {
							date: Date.now(),
							text: `
								Please answer "yes" or "no".
							`,
							id: this.generateId(8)
						}
					});
				}, 1000);
			}
		} else if(this.state === "tour") {
			setTimeout(() => {
				this._received({
					authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					certUserId: "/HelloBot",
					message: {
						date: Date.now(),
						text: `
							Okay. Now, look at the sidebar at the left << Right
							now, you only see /HelloBot (that's me!!) here.
							Let's start our tour by opening #lobby. Press the +
							at the bottom-left corner and type in "#lobby". Now,
							enjoy using the IRC! ^_^
						`,
						id: this.generateId(9)
					}
				});
				this.state = "done";
			}, 1000);
		}
	}

	markRead() {
		super.markRead();

		if(!this.postedHelloMessage) {
			this.postedHelloMessage = true;
			this._received({
				authAddress: "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
				certUserId: "/HelloBot",
				message: {
					date: Date.now(),
					text: `
						Hi, I'm /HelloBot! I'll help you start using our IRC.
						Please, tell me something! ^_^
					`,
					id: this.generateId(1)
				}
			});
		}
	}

	generateId(id) {
		return this.currentId + "/" + id;
	}
}