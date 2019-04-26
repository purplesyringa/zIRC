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
			<textarea
				v-model="message"
				ref="message"
				class="input"
				placeholder="Type here..."
				@keypress.enter.exact.prevent="submit"
				@input="autoreplace"
			/>
		</div>

		<div>
			<button class="right" title="Delete history from permanent storage" @click="deleteHistory">
				<icon name="trash" />
			</button>
		</div>

		<div class="messages">
			<Message
				v-for="message in reverseHistory"
				:key="message.messages[0].id"

				v-bind="message"
				@sendButton="sendButton"
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
			border: none

			[theme=dark] &
				background-color: #444
			[theme=light] &
				background-color: #FDD

		.input
			width: 100%
			resize: none
			height: 1em
		button
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2)

		.right
			margin-top: 16px
			float: right

		.info
			margin-bottom: 16px

			.monospace
				font-family: "Courier New", monospace
				font-size: 16px

		.messages
			margin-top: 32px
</style>

<script type="text/javascript">
	import IRC from "libs/irc";
	import {zeroPage, zeroAuth} from "zero";
	import autosize from "autosize";
	import "vue-awesome/icons/trash";
	import emojis from "./emojis";

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
			autosize(this.$refs.message);

			this.currentObject = IRC.getObjectById(this.current);
			this.history = await this.currentObject.loadHistory();
			this.currentObject.on("received", this.onReceived);
			this.currentObject.markRead();
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
				setTimeout(() => {
					autosize.update(this.$refs.message);
				}, 0);

				try {
					await this.currentObject.send(message);
				} catch(e) {
					zeroPage.error(`Error while sending message: ${e}`);
				}
			},

			async sendButton(button) {
				try {
					await this.currentObject.send(button);
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
				this.currentObject.markRead();
			},

			async deleteHistory() {
				await this.currentObject.deleteHistory();
				this.history = await this.currentObject.refreshHistory();
			},

			autoreplace() {
				const textarea = this.$refs.message;

				let cursorStart = textarea.selectionStart;
				let cursorEnd = textarea.selectionEnd;

				let newValue = "";
				for(let i = 0; i < this.message.length; i++) {
					newValue += this.message[i];
					if(newValue.endsWith(":")) {
						// Probably emoji
						let emojiStart = newValue.lastIndexOf(":", newValue.length - 2);
						if(emojiStart !== -1) {
							// It's most likely an emoji
							const emojiName = newValue.slice(emojiStart + 1, -1);
							// Replace emoji
							const emoji = emojis[emojiName];
							if(!emoji) {
								continue;
							}
							newValue = newValue.substr(0, emojiStart) + emoji;
							// Check whether we're breaking the selection
							const d = emoji.length - (emojiName.length + 2);
							if(cursorStart > i) {
								// After emoji
								//     :heart:
								//            |___|
								cursorStart += d;
								cursorEnd += d;
							} else if(cursorStart > emojiStart) {
								// Start is inside emoji
								if(cursorEnd <= i) {
									//     :heart:
									//       |__|
									cursorStart = emojiStart;
									cursorEnd = emojiStart;
								} else {
									//     :heart:
									//        |_____|
									cursorStart = emojiStart;
									cursorEnd -= d;
								}
							} else if(cursorEnd > emojiStart) {
								// End is inside emoji
								//     :heart:
								//   |____|
								cursorEnd = emojiStart;
							}
						}
					}
				}

				// Update textarea
				if(newValue !== this.message) {
					setTimeout(() => {
						this.message = newValue;
						setTimeout(() => {
							textarea.selectionStart = cursorStart;
							textarea.selectionEnd = cursorEnd;
						}, 0);
					}, 0);
				}
			}
		},

		computed: {
			current() {
				return this.$store.state.currentChannel;
			},
			username() {
				return this.$store.state.siteInfo.cert_user_id || "Anonymous";
			},
			reverseHistory() {
				// Combine posts by one user, posted within 2 minutes
				const posts = this.history.slice().reverse();
				let i = 0;
				let result = [];

				while(i < posts.length) {
					const curPost = posts[i];
					let messages = [curPost.message];
					let prevDate = curPost.message.date;
					while(true) {
						const prevPost = posts[++i];
						if(
							prevPost &&
							prevPost.authAddress === curPost.authAddress &&
							prevPost.certUserId === curPost.certUserId &&
							!prevPost.message.buttons &&
							!curPost.message.buttons &&
							prevDate - prevPost.message.date < 2 * 60 * 1000 // 2 min
						) {
							prevDate = prevPost.message.date;
							messages.push(prevPost.message);
						} else {
							break;
						}
					}
					result.push({
						authAddress: curPost.authAddress,
						certUserId: curPost.certUserId,
						receiveDate: curPost.receiveDate,
						messages
					});
				}
				return result;
			}
		}
	};
</script>