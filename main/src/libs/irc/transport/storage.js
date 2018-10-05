import EventEmitter from "wolfy87-eventemitter";
import {zeroPage, zeroFS} from "zero";
import crypto from "crypto";

export default new class StorageTransport extends EventEmitter {
	async send(id, message) {
		// Get permanent storages and sort them by their
		// current_size/max_size.
		const mergedSites = await zeroPage.cmd("mergerSiteList", [true]);
		let permanentStorages = [];
		for(const address of Object.keys(mergedSites)) {
			const content = mergedSites[address].content;
			if(content.permanent_storage && content.setup) {
				const currentSize = mergedSites[address].settings.size;
				const maxSize = mergedSites[address].size_limit * 1024 * 1024;
				permanentStorages.push({
					currentSize,
					maxSize,
					address
				});
			}
		}

		permanentStorages.sort((a, b) => {
			return a.currentSize / a.maxSize - b.currentSize / b.maxSize;
		});

		const address = permanentStorages[0].address;
		console.log("Saving to permanent storage at", address);


		const hash = crypto.createHash("sha256").update(id).digest("hex");
		const fileName = id.charCodeAt(0).toString(16) + "_" + hash;

		let data;
		try {
			data = await zeroFS.readFile(`merged-IRC/${address}/data/${fileName}.json`);
			data = JSON.parse(data);
		} catch(e) {
			data = {};
		}

		if(!data.messages) {
			data.messages = [];
		}
		data.messages.push(message);

		data = JSON.stringify(data);
		await zeroFS.writeFile(`merged-IRC/${address}/data/${fileName}.json`, data);

		// And sign
		await zeroPage.sign(`merged-IRC/${address}/content.json`);
	}
};