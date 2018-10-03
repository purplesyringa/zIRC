import Channel from "./object/channel";
// import Group from "./object/group";
// import User from "./object/user";
import Unknown from "./object/unknown";

export default new class IRC {
	constructor() {
		this.objectCache = {};
	}

	getObjectById(id) {
		if(this.objectCache[id]) {
			return this.objectCache[id];
		}


		if(id[0] === "#") {
			this.objectCache[id] = new Channel(id);
		// } else if(id[0] === "!") {
		// 	this.objectCache[id] = new Group(id);
		// } else if(id[0] === "@") {
		// 	this.objectCache[id] = new User("auth_address", id.substr(1));
		// } else if(id.indexOf("@") > -1) {
		// 	this.objectCache[id] = new User("cert_user_id", id);
		} else {
			this.objectCache[id] = new Unknown(id);
		}

		return this.objectCache[id];
	}
};