<template>
	<div class="integration" v-if="info">
		<h2><a :href="`/${url}`">{{info.title}}</a></h2>
		<div class="status" v-html="info.status" />
		<div v-html="markdown(info.text, siteAddress)" />
	</div>
</template>

<style lang="sass" scoped>
	.integration
		display: block
		padding: 16px
		max-height: 200px
		overflow-x: hidden
		overflow-y: auto

		h2
			margin: 0
			margin-bottom: 8px
			font-size: 1.5em

		.status
			margin: 8px 0

		[theme=dark] &
			background-color: rgba(0, 0, 0, 0.5)
			.status
				color: #888
		[theme=light] &
			background-color: rgba(0, 0, 0, 0.1)
			.status
				color: #444
</style>

<script type="text/javascript">
	import markdown from "libs/markdown";

	const integrations = require.context("libs/integrations", false, /\.js$/);

	export default {
		name: "Integration",
		props: ["url"],
		data() {
			return {
				url: ""
			};
		},

		methods: {
			markdown
		},

		computed: {
			siteAddress() {
				return this.url.split("/")[0];
			},
			path() {
				return this.url.split("/").slice(1).join("/");
			}
		},

		asyncComputed: {
			async info() {
				if(!this.url) {
					return null;
				}

				for(const path of integrations.keys()) {
					const integration = integrations(path).default;
					try {
						const info = await integration.get(this.siteAddress, this.path);
						if(info) {
							return info;
						}
					} catch(e) {
						console.log("Error while using integration", path, ":", e);
					}
				}

				return null;
			}
		}
	};
</script>