import Home from "./home/home.vue";

export default vue => [
	{
		path: "",
		controller: () => {
			vue.mainView = Home;
		}
	}
];