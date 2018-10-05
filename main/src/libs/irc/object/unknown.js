import Speakable from "libs/irc/speakable";

export default class Unknown extends Speakable {
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