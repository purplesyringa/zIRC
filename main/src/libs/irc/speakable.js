import PeerTransport from "libs/irc/transport/peer";
import FileTransport from "libs/irc/transport/file";
import Storage from "libs/irc/storage";
import EventEmitter from "wolfy87-eventemitter";
import Lock from "libs/lock";
import {zeroPage} from "zero";

export default class Speakable extends EventEmitter {
	constructor(name) {
		super();
		this.name = name;
		this.history = null;
		this.received = {};

		this.historyLock = new Lock();

		setTimeout(() => {
			// Listen from peers
			this._listen(PeerTransport);
			// Listen from files
			this._listen(FileTransport);
		}, 0);
	}

	async loadHistory() {
		// Wait for init (e.g. in User)
		if(this.initLock) {
			await this.initLock.acquire();
			this.initLock.release();
		}

		await this.historyLock.acquire();

		if(!this.history) {
			this.history = [];

			// First load history from permanent storage
			for(const message of await Storage.load(this.name)) {
				this.received[message.message.id] = true;
				this.history.push(message);
			}

			// And now history by reading data files
			for(const message of await this._loadHistory()) {
				if(this.received[message.message.id]) {
					continue;
				}

				this.received[message.message.id] = true;
				this.history.push(message);
			}

			this.history.sort((a, b) => {
				return a.message.date - b.message.date;
			});
		}

		this.historyLock.release();
		return this.history;
	}

	async deleteHistory() {
		await Storage.deleteHistory(this.name);
	}

	async refreshHistory() {
		delete this.history;
		this.received = {};
		return await this.loadHistory();
	}

	async send(message) {
		message = {
			date: Date.now(),
			text: message,
			id: Math.random().toString(36).substr(2) + "/" + Date.now()
		};

		// Receive, in case the transfers are slow
		const siteInfo = await zeroPage.getSiteInfo();
		this._received({
			authAddress: siteInfo.auth_address,
			certUserId: siteInfo.cert_user_id,
			message
		});

		// Use Promise.all to handle errors
		await Promise.all([
			// Transfer via peers
			this._transfer(message, PeerTransport),
			// Transfer via files
			this._transfer(message, FileTransport)
		]);
	}

	async _received({authAddress, certUserId, message}) {
		if(!this.received[message.id]) {
			this.received[message.id] = true;

			const object = {
				authAddress,
				certUserId,
				receiveDate: Date.now(),
				message
			};

			await this.loadHistory();
			this.history.push(object);

			Storage.save(this.name, object);
			this.emit("received", object);
		}
	}
}