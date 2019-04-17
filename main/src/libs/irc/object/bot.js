import Speakable from "libs/irc/speakable";
import EventEmitter from "wolfy87-eventemitter";

class SpeakableBot extends Speakable {
	constructor(bot, name) {
		super(name);
		this._readMessages = {};
		this._tabOpened = false;
		this.bot = bot;
	}

	async _loadHistory() {
		setTimeout(() => {
			this.bot.emit("start");
		}, 0);
		return [];
	}

	_listen() {
	}

	async _transfer(message) {
		if(this._readMessages[message.id]) {
			return;
		}
		this._readMessages[message.id] = true;

		this.bot.emit("received", message);
	}

	markRead() {
		super.markRead();

		if(!this._tabOpened) {
			this._tabOpened = true;
			this.bot.emit("tabOpened");
		}
	}
}

export default class Bot extends EventEmitter {
	constructor(name, authAddress) {
		super();

		this._authAddress = authAddress;
		this.speakable = new SpeakableBot(this, name);
	}

	send(text, buttons=null) {
		this.speakable._received({
			authAddress: this._authAddress,
			certUserId: this.speakable.name,
			message: {
				date: Date.now(),
				text,
				buttons,
				id: Math.random().toString(36).substr(2)
			}
		});
	}
}