import Speakable from "libs/irc/speakable";

export default class Unknown extends Speakable {
	constructor(name) {
		super();
		this.name = name;
	}

	_loadHistory() {
		return [];
	}

	_listen() {
		return;
	}

	_transfer() {
		return;
	}
}