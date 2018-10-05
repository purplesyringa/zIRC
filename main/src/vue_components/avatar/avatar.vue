<template>
	<div class="avatar" :style="{backgroundColor}">
		<span class="small">{{icon[0] || ""}}</span>
		<span class="big">{{icon[1] || ""}}</span>
		<span class="small">{{icon[0] ? "&nbsp;" : ""}}</span>
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
		color: #000

		.small
			font-family: "Courier New", monospace
			font-size: 18px
			vertical-align: top

		.big
			font-size: 30px
			vertical-align: top
</style>

<script type="text/javascript">
	export default {
		name: "Avatar",
		props: ["channel"],
		data() {
			return {
				channel: ""
			};
		},

		computed: {
			type() {
				if(this.channel[0] === "#") {
					// It's a public channel
					return "channel";
				} else if(this.channel[0] === "!") {
					// It's a private group
					return "group";
				} else if(this.channel[0] === "*") {
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
					return "!" + this.channel[1].toUpperCase();
				} else if(this.type === "bot") {
					return "*" + this.channel[1].toUpperCase();
				} else if(this.type === "user-id") {
					return "@" + this.channel[2].toUpperCase();
				} else if(this.type === "user-name") {
					return "@" + this.channel[0].toUpperCase();
				} else {
					return "?";
				}
			},

			backgroundColor() {
				let hash = 0;
				for(let i = 0; i < this.channel.length; i++) {
					hash = this.channel.charCodeAt(i) + ((hash << 5) - hash);
				}
				for(let i = 0; i < this.channel.length; i++) {
					hash = this.channel.charCodeAt(i) + ((hash << 5) - hash);
				}
				for(let i = 0; i < this.channel.length; i++) {
					hash = this.channel.charCodeAt(i) + ((hash << 5) - hash);
				}

				let r = ((((hash      ) & 0xFF) >> 1) + 128).toString(16);
				let g = ((((hash >> 8 ) & 0xFF) >> 1) + 128).toString(16);
				let b = ((((hash >> 16) & 0xFF) >> 1) + 128).toString(16);

				r = "0".repeat(2 - r.length) + r;
				g = "0".repeat(2 - g.length) + g;
				b = "0".repeat(2 - b.length) + b;

				return "#" + r + g + b;
			}
		}
	};
</script>