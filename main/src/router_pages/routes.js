import Home from "./home/home.vue";
import UserStorage from "libs/irc/userstorage";
import {zeroPage} from "zero";

export default vue => [
	{
		path: "",
		controller: async () => {
			// Let's check whether there's an object in users.json
			const userSettings = await UserStorage.get();
			if(!userSettings || !userSettings.channels) {
				vue.$store.commit("openChannel", "/HelloBot");
			} else {
				vue.$store.commit("openChannel", "#lobby");
			}

			vue.currentView = Home;
		}
	},
	{
		path: ":channel",
		controller: ({channel}) => {
			vue.currentView = Home;
			vue.$store.commit("openChannel", channel);
		}
	},
	{
		path: "bot/:bot",
		controller: ({bot}) => {
			vue.currentView = Home;
			vue.$store.commit("openChannel", `/${bot}`);
		}
	},

	{
		path: "add-storage/:address",
		controller: ({address}) => {
			zeroPage.cmd("mergerSiteAdd", [address]);
			vue.$router.navigate("bot/HelloBot");
		}
	}
];