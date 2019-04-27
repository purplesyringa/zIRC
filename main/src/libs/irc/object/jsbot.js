import Bot from "libs/irc/object/bot";
import Lock from "libs/lock";
import {zeroFS} from "zero";

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}


const DEBUGGING_BUTTONS = [
	[
		{text: "/HelloBot restart", color: "yellow"},
		{text: "/HelloBot undebug", color: "yellow"}
	]
];

function webWorker(name, code) {
	try {
		eval(code);

		(function() {
			const formatError = e => {
				return `${e.constructor.name}: ${e.message}${e.stack ? `\n${e.stack}` : ""}`;
			};


			const Bot = self[name];

			// Bind all methods
			for(const key of Object.keys(Bot)) {
				if(Bot[key] instanceof Function) {
					Bot[key] = Bot[key].bind(Bot);
				}
			}
			// Define .send()
			Bot.send = (message, buttons=null) => {
				try {
					postMessage({
						cmd: "send",
						message,
						buttons
					});
				} catch(e) {
					postMessage({
						cmd: "error",
						text: "Error during sending message",
						error: formatError(e)
					});
				}
			};

			self.onmessage = e => {
				if(e.data.cmd === "onStart") {
					try {
						if(Bot.onStart) {
							Bot.onStart();
						}
					} catch(e) {
						postMessage({
							cmd: "error",
							text: "Error during startup",
							error: formatError(e)
						});
					}
				} else if(e.data.cmd === "onReceived") {
					try {
						if(Bot.onReceived) {
							Bot.onReceived(e.data.message);
						}
					} catch(e) {
						postMessage({
							cmd: "error",
							text: "Error during handling message",
							error: formatError(e)
						});
					}
				} else if(e.data.cmd === "onTabOpened") {
					try {
						if(Bot.onTabOpened) {
							Bot.onTabOpened();
						}
					} catch(e) {
						postMessage({
							cmd: "error",
							text: "Error during handling channel opening",
							error: formatError(e)
						});
					}
				}
			};
		})();
	} catch(e) {
		postMessage({
			cmd: "error",
			text: "Error during startup",
			error: `${e.constructor.name}: ${e.message}${e.stack ? `\n${e.stack}` : ""}`
		});
	}
}

export default class JSBot extends Bot {
	static async get(...args) {
		return new this(...args);
	}


	constructor(name, path) {
		super(name, path);

		this.name = name;
		this.path = path;

		this.on("start", this.onStart);
		this.on("received", this.onReceived);
		this.on("tabOpened", this.onTabOpened);

		this.botInitLock = new Lock();
		this.botInitted = false;
		this.botExists = null;
		this.debugging = false;
		this.initBot();
	}

	async initBot() {
		if(this.botInitted) {
			return;
		}
		await this.botInitLock.acquire();
		if(this.botInitted) {
			this.botInitLock.release();
			return;
		}

		try {
			// Check that the bot exists
			let botCode;
			try {
				botCode = await zeroFS.readFile(this.path);
			} catch(e) {
				// Bot doesn't exist
				this.botExists = false;
				return;
			}

			this.botExists = true;

			// Create worker
			const code = dedent`
				(
					${webWorker.toString()}
				)(
					${JSON.stringify(this.name.substr(1))},
					${JSON.stringify(botCode)}
				);
			`;
			this.workerUrl = URL.createObjectURL(
				new Blob(
					[code],
					{
						type: "text/javascript"
					}
				)
			);

			this.worker = new Worker(this.workerUrl);
			this.worker.onmessage = e => {
				if(e.data.cmd === "error") {
					this._sendAs(
						"/HelloBot", "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
						`${e.data.text}\n${e.data.error}`
					);
				} else if(e.data.cmd === "send") {
					let buttons = e.data.buttons;
					if(this.debugging) {
						if(!buttons) {
							buttons = [];
						}
						buttons = buttons.concat(DEBUGGING_BUTTONS);
					}
					this.send(e.data.message, buttons);
				}
			};
		} finally {
			this.botInitted = true;
			this.botInitLock.release();
		}
	}

	async onStart() {
		await this.initBot();
		if(!this.botExists) {
			this._sendAs(
				"/HelloBot", "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
				`Bot ${this.name} doesn't exist.`
			);
			return;
		}
		await this._cmd("onStart");
	}
	async onReceived(message) {
		await this.initBot();
		await sleep(100); // doesn't make sense to receive a message that fast

		if(message.text.startsWith("/HelloBot ")) {
			// Intercept this message and handle it ourselves
			if(message.text === "/HelloBot restart") {
				this._sendAs(
					"/HelloBot", "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					`Restarting ${this.name}...`
				);
				if(this.worker) {
					this.worker.terminate();
				}
				this.botInitted = false;
				await this.initBot();
				await this._cmd("onStart");
				await this._cmd("onTabOpened");
			} else if(message.text === "/HelloBot debug") {
				this.debugging = true;
				this._sendAs(
					"/HelloBot", "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					"Debugging mode enabled.",
					DEBUGGING_BUTTONS
				);
			} else if(message.text === "/HelloBot undebug") {
				this.debugging = false;
				this._sendAs(
					"/HelloBot", "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					"Debugging mode disabled."
				);
			} else {
				this._sendAs(
					"/HelloBot", "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D",
					dedent`
						The supported commands are '/HelloBot restart' (reloads
						the source and restarts the bot), '/HelloBot debug'
						(adds /HelloBot buttons under each message) and
						'/HelloBot undebug'.
					`
				);
			}
			return;
		}

		if(this.botExists) {
			await this._cmd("onReceived", {message});
		}
	}
	async onTabOpened() {
		await this._cmd("onTabOpened");
	}


	async _cmd(cmd, params={}) {
		await this.initBot();
		if(!this.botExists) {
			return;
		}

		this.worker.postMessage(Object.assign({
			zIRC: true,
			cmd: cmd
		}, params));
	}
}