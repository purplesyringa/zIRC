<template>
	<main>
		<div class="info">
			You are logged in as
			<span class="monospace">
				{{username}}
				<a @click="login">[Change]</a>
			</span>
		</div>

		<div>
			<input
				type="text"
				v-model="message"
				ref="message"
				class="input"
				@keypress.enter="submit"
			/>
			<button @click="submit">Send &gt;</button>

			<button class="right" title="Delete history from permanent storage" @click="deleteHistory">
				<icon name="trash" />
			</button>
		</div>

		<div class="messages">
			<Message
				v-for="message in history.slice().reverse()"
				:key="message.message.id"

				v-bind="message"
			/>
		</div>
	</main>
</template>

<style lang="sass" scoped>
	main
		padding: 32px
		flex: 1 0 0
		overflow-y: auto

		.input, button
			font-family: "Courier New", monospace
			font-size: 16px
			padding: 8px 12px

		.right
			float: right

		.info
			margin-bottom: 16px

			.monospace
				font-family: "Courier New", monospace
				font-size: 16px

		.messages
			margin-top: 16px
</style>

<script type="text/javascript">
	import IRC from "libs/irc";
	import {zeroPage, zeroAuth} from "zero";
	import "vue-awesome/icons/trash";

	export default {
		name: "Home",
		data() {
			return {
				message: "",
				currentObject: null,
				history: []
			};
		},

		async mounted() {
			this.currentObject = IRC.getObjectById(this.current);
			this.history = await this.currentObject.loadHistory();
			this.currentObject.on("received", this.onReceived);
		},
		destroyed() {
			if(this.currentObject) {
				this.history = [];
				this.currentObject.off("received", this.onReceived);
			}
		},

		methods: {
			async submit() {
				if(!this.message.trim()) {
					return;
				}

				const message = this.message.trim();
				this.message = "";
				this.$refs.message.focus();

				try {
					await this.currentObject.send(message);
				} catch(e) {
					zeroPage.error(`Error while sending message: ${e}`);
				}
			},

			login() {
				zeroPage.cmd("certSelect", {
					accepted_domains: zeroAuth.acceptedDomains
				});
			},

			onReceived(obj) {
				//this.history.push(obj);
			},

			async deleteHistory() {
				await this.currentObject.deleteHistory();
				this.history = await this.currentObject.refreshHistory();
			}
		},

		computed: {
			current() {
				return this.$store.state.currentChannel;
			},
			username() {
				return this.$store.state.siteInfo.cert_user_id || "Anonymous";
			}
		}
	};
</script>