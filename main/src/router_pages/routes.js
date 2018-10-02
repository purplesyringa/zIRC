import Home from "./home/home.vue";

export default vue => [
	{
		path: "",
		controller: () => {
			vue.currentView = Home;
			vue.$store.commit("openChannel", "#lobby");
		}
	},
	{
		path: ":channel",
		controller: ({channel}) => {
			vue.currentView = Home;
			vue.$store.commit("openChannel", channel);
		}
	}
];