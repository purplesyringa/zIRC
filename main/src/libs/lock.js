export default class Lock {
	constructor() {
		this.callbacks = [];
		this.acquired = false;
	}

	async acquire() {
		if(!this.acquired) {
			this.acquired = true;
			return;
		}

		return await new Promise(resolve => {
			this.callbacks.push(resolve);
		});
	}

	release() {
		if(this.callbacks.length) {
			this.callbacks.shift()();
		} else {
			this.acquired = false;
		}
	}

	async peek() {
		await this.acquire();
		this.release();
	}
}