<template>
	<aside>
		<div class="channels">
			<div
				v-for="channel in channels"
				:class="['channel', {current: current === channel}]"
				@click="open(channel)"
			>
				<Avatar :channel="channel" />
				{{channel.substr(0, 18)}}

				<span class="close" @click.stop="removeChannel(channel)">
					&times;
				</span>
			</div>
		</div>

		<div class="footer">
			<div class="footer-icon" @click="addChannel">+</div>
		</div>
	</aside>
</template>

<style lang="sass" scoped>
	aside
		width: 320px
		height: 100%
		background-color: #EEE
		border-right: 1px solid #DDD
		overflow-y: auto
		overflow-x: hidden

		display: flex
		flex-direction: column

		.channels
			flex: 1 1 0

			.channel
				padding: 12px 16px
				border-bottom: 1px solid #DDD
				font-family: "Courier New", monospace
				cursor: pointer

				&:first-child
					border-top: 1px solid #FFF

				&.current, &:hover
					background-color: #FFF

				.close
					float: right
					margin: 16px 0
					padding: 8px
					border-radius: 50%
					font-size: 32px

					&:hover
						background-color: #EEE

		.footer
			flex: 0 0 48px
			display: flex
			flex-direction: row
			align-content: space-between

			.footer-icon
				display: block
				flex: 1 1 0
				font-size: 32px
				text-align: center
				cursor: pointer
				padding-top: 12px

				&:hover
					background-color: #DDD
</style>

<script type="text/javascript">
	import {zeroPage} from "zero";

	export default {
		name: "Sidebar",
		data() {
			return {
				channels: []
			};
		},

		async mounted() {
			const userSettings = await zeroPage.cmd("userGetSettings");
			this.channels = (userSettings || {}).channels || [
				"/HelloBot"
			];
		},

		methods: {
			open(name) {
				if(name[0] === "/") {
					this.$router.navigate(`bot${name}`);
				} else {
					this.$router.navigate(name);
				}
			},

			async addChannel() {
				const channel = await zeroPage.prompt(
					"Which channel (user, group) are you going to join?"
				);

				if(this.channels.indexOf(channel) === -1) {
					this.channels.push(channel);

					// Save
					let userSettings = await zeroPage.cmd("userGetSettings");
					if(!userSettings) {
						userSettings = {};
					}
					userSettings.channels = this.channels;
					await zeroPage.cmd("userSetSettings", [userSettings]);
				}

				// And open
				this.open(channel);
			},

			async removeChannel(channel) {
				const idx = this.channels.indexOf(channel);
				if(idx > -1) {
					this.channels.splice(idx, 1);
				}

				// Save
				let userSettings = await zeroPage.cmd("userGetSettings");
				if(!userSettings) {
					userSettings = {};
				}
				userSettings.channels = this.channels;
				await zeroPage.cmd("userSetSettings", [userSettings]);

				if(this.current === channel) {
					// Open #lobby if we removed the current channel
					this.open("#lobby");
				}
			}
		},

		computed: {
			current() {
				return this.$store.state.currentChannel;
			}
		}
	};
</script>