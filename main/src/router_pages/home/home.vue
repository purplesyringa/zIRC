<template>
	<div class="root">
		<aside>
			<div v-for="channel in channels" class="channel">
				<Avatar :channel="channel" />
				{{channel.substr(0, 18)}}
			</div>
		</aside>

		<main>
			<input
				type="text"
				v-model="message"
				ref="message"
				class="message"
				@keypress.enter="submit"
			/>
			<button @click="submit">Send &gt;</button>
		</main>
	</div>
</template>

<style lang="sass" scoped>
	.root
		height: 100%

		aside
			padding: 32px 16px
			float: left
			width: 320px
			height: 100%
			background-color: #EEE

			.channel
				padding: 12px 16px
				border-bottom: 1px solid #FFF
				font-family: "Courier New", monospace
				cursor: pointer

				&:first-child
					border-top: 1px solid #FFF

				&.current, &:hover
					background-color: #FFF

		main
			padding: 32px
			float: left

			.message, button
				font-family: "Courier New", monospace
				font-size: 16px
				padding: 8px 12px
</style>

<script type="text/javascript">
	import IRC from "libs/irc";

	export default {
		name: "Home",
		data() {
			return {
				message: "",
				channels: [
					"#lobby",
					"krixano@kxoid.bit",
					"@1A5jvsSuBHC7HAFGazmKSmNanh1pWY8Smy",
					"!zim"
				]
			};
		},

		methods: {
			submit() {
				if(!this.message.trim()) {
					return;
				}

				IRC.send(this.message.trim());

				this.message = "";
				this.$refs.message.focus();
			}
		}
	};
</script>