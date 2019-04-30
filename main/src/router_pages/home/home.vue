<template>
	<div class="root">
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
				<template v-for="message in reverseHistory">
					<SpecialMessage
						v-if="message.special"
						v-bind="message"
						:key="message.messages[0].id"
					/>
					<Message
						v-else
						v-bind="message"
						@sendButton="sendButton"
						:key="message.messages[0].id"
					/>
				</template>
			</div>
		</main>

		<aside v-if="currentObject instanceof Group">
			<div class="top">
				<h2>Members</h2>

				<template v-for="member in members">
					<div class="member">
						<Avatar
							:channel="member.name"
							:authAddress="member.authAddress"
						/>

						<div class="content">
							<div class="name">{{member.name}}</div>
						</div>
					</div>
				</template>

				<h2 v-if="invitedMembers.length > 0">Invited</h2>

				<template v-for="member in invitedMembers">
					<div class="member">
						<Avatar
							:channel="member.name"
							:authAddress="member.authAddress"
						/>

						<div class="content">
							<div class="name">{{member.name}}</div>
						</div>
					</div>
				</template>
			</div>

			<div class="footer">
				<div class="footer-icon" @click="inviteToGroup">Invite</div>
			</div>
		</aside>
	</div>
</template>

<style lang="sass" scoped>
	.root
		display: flex
		flex-direction: row
		flex: 1 0 0

		> main
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

		> aside
			flex: 0 0 320px
			width: 320px
			height: 100%
			overflow-y: auto
			overflow-x: hidden

			display: flex
			flex-direction: column

			[theme=dark] &
				background-color: #223
			[theme=light] &
				background-color: #FDD

			.top
				flex: 1 1 0

				display: flex
				flex-direction: column
				padding: 16px

				.member
					display: flex
					flex-direction: row
					align-items: center
					font-family: "Courier New", monospace

					.avatar
						margin-right: 16px
					.content
						min-width: 0
						flex: 1 1 0
						.name
							overflow: hidden
							white-space: nowrap
							text-overflow: ellipsis

			.footer
				flex: 0 0 48px
				display: flex
				flex-direction: column
				align-content: space-between
				margin-bottom: 10px

				.footer-icon
					display: block
					flex: 1 1 0
					text-align: center
					cursor: pointer
					padding-top: 10px
					padding-bottom: 12px

					&:hover
						[theme=dark] &
							background-color: #000
						[theme=light] &
							background-color: #FFF
</style>

<script type="text/javascript">
	import IRC from "libs/irc";
	import {zeroPage, zeroDB, zeroAuth} from "zero";
	import Group from "libs/irc/object/group";
	import autosize from "autosize";
	import "vue-awesome/icons/trash";
	import emojis from "./emojis";

	export default {
		name: "Home",
		data() {
			return {
				message: "",
				currentObject: null,
				history: [],
				Group
			};
		},

		async mounted() {
			autosize(this.$refs.message);

			this.currentObject = await IRC.getObjectById(this.current);
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

			async inviteToGroup() {
				const user = await zeroPage.prompt(
					"Which user would you like to invite?"
				);

				let authAddress = null;
				if(user[0] === "@") {
					authAddress = user.substr(1);
				} else {
					const directory = ((await zeroDB.query(dedent`
						SELECT directory
						FROM json
						WHERE cert_user_id = :certUserId
					`, {
						certUserId: user
					}))[0] || {}).directory;
					if(directory) {
						authAddress = directory.replace("users/", "");
					}
				}

				try {
					await this.currentObject.invite(authAddress);
					await this.currentObject._send({
						special: "invite",
						authAddress
					});
				} catch(e) {
					zeroPage.error(e.message);
					return;
				}
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
							!prevPost.message.special &&
							!curPost.message.special &&
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
						special: curPost.message.special,
						messages
					});
				}
				return result;
			},

			members() {
				if(!this.allMembers) {
					return [];
				}

				return this.allMembers.filter(member => {
					return this.currentObject.history.some(message => {
						return (
							message.message.special === "join" &&
							message.authAddress === member.authAddress
						);
					});
				});
			},
			invitedMembers() {
				if(!this.allMembers) {
					return [];
				}

				return this.allMembers.filter(member => {
					return this.members.indexOf(member) === -1;
				});
			}
		},

		asyncComputed: {
			async allMembers() {
				if(!this.currentObject || !this.currentObject.history) {
					return null;
				}

				if(this.currentObject instanceof Group) {
					return await Promise.all(
						this.currentObject.history
							.filter(message => message.message.special === "invite")
							.map(async message => {
								const member = message.message.authAddress;

								const certUserId = ((await zeroDB.query(dedent`
									SELECT cert_user_id
									FROM json
									WHERE (
										directory = :directory AND
										file_name = "content.json"
									)
								`, {
									directory: `users/${member}`
								}))[0] || {}).cert_user_id;

								return {
									name: certUserId || `@${member}`,
									authAddress: member
								};
							})
					);
				} else {
					return [];
				}
			}
		}
	};
</script>