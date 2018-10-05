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
				"*HelloBot"
			];
		},

		methods: {
			open(name) {
				this.$router.navigate(name);
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
			}
		},

		computed: {
			current() {
				return this.$store.state.currentChannel;
			}
		}
	};
</script>