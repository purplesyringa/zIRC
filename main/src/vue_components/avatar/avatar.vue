<template>
	<div
		class="avatar"
		:class="[useJdenticon ? 'jdenticon' : 'text']"
		:style="{'--dark': darkBackgroundColor, '--light': lightBackgroundColor}"
	>
		<template v-if="useJdenticon">
			<div class="jdenticon" v-html="jdenticon" />
		</template>
		<template v-else>
			<span class="small">{{icon[0] || ""}}</span>
			<span class="big">{{icon[1] || ""}}</span>
			<span class="small">{{icon[0] ? "&nbsp;" : ""}}</span>
		</template>
	</div>
</template>

<style lang="sass" scoped>
	.avatar
		display: inline-block
		width: 64px
		height: 64px
		border-radius: 50%
		vertical-align: middle

		text-align: center
		font-family: Verdana, Arial, sans-serif
		font-size: 0
		line-height: 60px

		[theme=dark] &
			color: #000
			&.jdenticon
				background-color: #002
			&.text
				background-color: var(--dark)
		[theme=light] &
			color: #FFF
			&.jdenticon
				background-color: #002
			&.text
				background-color: var(--light)


		.jdenticon
			margin-top: 8px

		.small
			font-family: "Courier New", monospace
			font-size: 18px
			vertical-align: top

		.big
			font-size: 30px
			vertical-align: top
</style>

<script type="text/javascript">
	import jdenticon from "jdenticon";

	export default {
		name: "Avatar",
		props: ["channel", "authAddress"],
		data() {
			return {
				channel: "",
				authAddress: ""
			};
		},

		computed: {
			type() {
				if(this.channel[0] === "#") {
					// It's a public channel
					return "channel";
				} else if(this.channel[0] === "+") {
					// It's a private group
					return "group";
				} else if(this.channel[0] === "/") {
					// It's a bot
					return "bot";
				} else if(this.channel[0] === "@") {
					// It's an ID-based user
					return "user-id";
				} else if(this.channel.indexOf("@") > -1) {
					// It's an username-based user
					return "user-name";
				} else {
					// ???
					return "unknown";
				}
			},

			icon() {
				if(this.type === "channel") {
					return "#" + this.channel[1].toUpperCase();
				} else if(this.type === "group") {
					return "+" + this.channel[1].toUpperCase();
				} else if(this.type === "bot") {
					return "/" + this.channel[1].toUpperCase();
				} else if(this.type === "user-id") {
					return "@" + this.channel[2].toUpperCase();
				} else if(this.type === "user-name") {
					return "@" + this.channel[0].toUpperCase();
				} else {
					return "?";
				}
			},

			jdenticon() {
				return jdenticon.toSvg(this.authAddress.replace("@", ""), 48);
			},

			useJdenticon() {
				return ["user-id", "user-name", "group"].indexOf(this.type) > -1;
			},

			rgbHash() {
				let hash = 0;
				for(let j = 0; j < 3; j++) {
					for(let i = 0; i < this.channel.length; i++) {
						hash = this.channel.charCodeAt(i) + ((hash << 5) - hash);
					}
				}

				const r = (((hash      ) & 0xFF) >> 1);
				const g = (((hash >> 8 ) & 0xFF) >> 1);
				const b = (((hash >> 16) & 0xFF) >> 1);
				return [r, g, b];
			},

			darkBackgroundColor() {
				let [r, g, b] = this.rgbHash;
				r = ("0" + (r + 128).toString(16)).slice(-2);
				g = ("0" + (g + 128).toString(16)).slice(-2);
				b = ("0" + (b + 128).toString(16)).slice(-2);
				return "#" + r + g + b;
			},
			lightBackgroundColor() {
				let [r, g, b] = this.rgbHash;
				r = ("0" + (r + 64).toString(16)).slice(-2);
				g = ("0" + (g + 64).toString(16)).slice(-2);
				b = ("0" + (b + 64).toString(16)).slice(-2);
				return "#" + r + g + b;
			}
		}
	};
</script>