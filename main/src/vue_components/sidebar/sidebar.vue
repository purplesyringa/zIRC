<template>
	<aside>
		<div
			v-for="channel in channels"
			:class="['channel', {current: current === channel}]"
			@click="open(channel)"
		>
			<Avatar :channel="channel" />
			{{channel.substr(0, 18)}}
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

		.channel
			padding: 12px 16px
			border-bottom: 1px solid #DDD
			font-family: "Courier New", monospace
			cursor: pointer

			&:first-child
				border-top: 1px solid #FFF

			&.current, &:hover
				background-color: #FFF
</style>

<script type="text/javascript">
	export default {
		name: "Sidebar",
		data() {
			return {
				channels: [
					"#lobby",
					"krixano@kxoid.bit",
					"@1A5jvsSuBHC7HAFGazmKSmNanh1pWY8Smy",
					"!zim"
				]
			};
		},

		methods: {
			open(name) {
				this.$router.navigate(name);
			}
		},

		computed: {
			current() {
				return this.$store.state.currentChannel;
			}
		}
	};
</script>