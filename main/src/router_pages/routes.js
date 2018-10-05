import Home from "./home/home.vue";

export default vue => [
	{
		path: "",
		controller: () => {
			vue.currentView = Home;
			vue.$store.commit("openChannel", "*HelloBot");
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