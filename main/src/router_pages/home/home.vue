<template>
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
</template>

<style lang="sass" scoped>
	main
		padding: 32px

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
				message: ""
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