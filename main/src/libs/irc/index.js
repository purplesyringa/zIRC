import Channel from "./object/channel";
import Group from "./object/group";
import User from "./object/user";
import HelloBot from "./object/hellobot";
import JSBot from "./object/jsbot";
import Unknown from "./object/unknown";

export default new class IRC {
	constructor() {
		this.objectCache = {};
	}

	async getObjectById(id) {
		if(this.objectCache[id]) {
			return this.objectCache[id];
		}

		if(id[0] === "#") {
			this.objectCache[id] = await Channel.get(id);
		} else if(id[0] === "+") {
			this.objectCache[id] = await Group.get(id.substr(1));
		} else if(id[0] === "@") {
			this.objectCache[id] = await User.get(`auth_address:${id.substr(1)}`);
		} else if(id === "/HelloBot") {
			this.objectCache[id] = (await HelloBot.get()).speakable;
		} else if(id[0] === "/" && id.indexOf("@") > -1) {
			let [botName, authAddress] = id.split("@");
			this.objectCache[id] = (await JSBot.get(botName, `data/users/${authAddress}/bots/${botName.substr(1)}.js`)).speakable;
		} else if(id[0] === "/") {
			this.objectCache[id] = (await JSBot.get(id, `data/bots/${id.substr(1)}.js`)).speakable;
		} else if(id.indexOf("@") > -1) {
			this.objectCache[id] = await User.get(`cert_user_id:${id}`);
		} else {
			this.objectCache[id] = await Unknown.get(id);
		}

		return this.objectCache[id];
	}
};