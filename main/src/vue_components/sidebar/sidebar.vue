<template>
	<aside>
		<div class="channels">
			<template
				v-for="channel in visibleChannels"
			>
				<div
					v-if="(channel.object instanceof User) && channel.object.theyInvited && !channel.object.wasTheirInviteHandled"

					:class="['channel', {current: current === channel.name}]"
				>
					<!-- Show invite -->
					<Avatar
						:channel="channel.name"
						:authAddress="channel.object.name"
					/>

					<div class="content">
						<div class="invite">
							<div class="name">{{channel.name}}</div>
							<div class="invite-status">
								<button class="accept" @click="acceptInvite(channel)">Accept</button>
								<button class="dismiss" @click="dismissInvite(channel)">Dismiss</button>
							</div>
						</div>
					</div>
				</div>

				<div
					v-else-if="(channel.object instanceof User) && channel.object.theirInviteState === 'dismiss' && !channel.object.weInvited"

					:class="['channel', {current: current === channel.name}]"
				>
					<!-- Show invite -->
					<Avatar
						:channel="channel.name"
						:authAddress="channel.object.name"
					/>

					<div class="content">
						<div class="invite">
							<div class="name">{{channel.name}}</div>
							<div class="invite-status">
								<button class="accept" @click="invite(channel)">Invite</button>
							</div>
						</div>
					</div>

					<span class="close" @click.stop="removeChannel(channel.name)">
						&times;
					</span>
				</div>

				<div
					v-else-if="(channel.object instanceof User) && channel.object.weInvited && channel.object.ourInviteState !== 'accept'"

					:class="['channel', {current: current === channel.name}]"
				>
					<!-- Show invite -->
					<Avatar
						:channel="channel.name"
						:authAddress="channel.object.name"
					/>

					<div class="content">
						<div class="invite">
							<div class="name">{{channel.name}}</div>
							<div v-if="!channel.object.wasOurInviteHandled" class="invite-status">Invited</div>
							<div v-else class="invite-status">Dismissed :(</div>
						</div>
					</div>

					<span class="close" @click.stop="cancelInvite(channel)">
						&times;
					</span>
				</div>

				<div
					v-if="(channel.object instanceof Group) && channel.object.wasInvited && !channel.object.hasJoined && !channel.object.hasDismissed"

					:class="['channel', {current: current === channel.name}]"
				>
					<!-- Show invite -->
					<Avatar
						:channel="channel.name"
						:authAddress="channel.object.name"
					/>

					<div class="content">
						<div class="invite">
							<div class="name">{{channel.name}}</div>
							<div class="invite-status">
								<button class="accept" @click="acceptInvite(channel)">Accept</button>
								<button class="dismiss" @click="dismissInvite(channel)">Dismiss</button>
							</div>
						</div>
					</div>
				</div>

				<div
					v-else

					:class="['channel', {current: current === channel.name}]"
					@click="open(channel.name)"
				>
					<!-- Show user/channel/group badge -->
					<Avatar
						:channel="channel.name"
						:authAddress="channel.object.name"
					/>

					<div class="content">
						<div class="name">{{channel.name}}</div>

						<SmallMessage
							v-if="
								(channel.object.history || [])
									.filter(message => !message.message.special)
									.length > 0
							"
							v-bind="
								(channel.object.history || [])
									.filter(message => !message.message.special)
									.slice(-1)[0]
							"
							:channelName="channel.name"
						/>
					</div>

					<span class="unread" v-if="channel.object.countUnread">
						{{channel.object.countUnread}}
					</span>

					<span class="close" @click.stop="removeChannel(channel.name)">
						&times;
					</span>
				</div>
			</template>
		</div>

		<div class="footer">
			<div class="footer-icon" @click="addChannel">Join</div>
			<div class="footer-icon" @click="createGroup">Create new group</div>
		</div>
	</aside>
</template>

<style lang="sass" scoped>
	aside
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

		.channels
			flex: 1 1 0

			.channel
				padding: 12px 16px
				font-family: "Courier New", monospace
				cursor: pointer

				display: flex
				flex-direction: row

				.avatar
					flex: 0 0 64px
					margin-right: 16px

				&.current, &:hover
					[theme=dark] &
						background-color: #444
					[theme=light] &
						background-color: #FFF

				.content
					flex: 1 1 0
					min-width: 0

					display: flex
					flex-direction: column
					justify-content: center
					align-items: stretch

					.name
						overflow: hidden
						white-space: nowrap
						text-overflow: ellipsis

					.invite
						display: inline-block

						.invite-status
							color: #F28

							button
								border: none
								border-radius: 4px
								padding: 4px 8px
								border: 1px solid #F28
								cursor: pointer

								&.dismiss
									[theme=dark] &
										background-color: #000
										color: #FFF
									[theme=light] &
										background-color: #FFF
										color: #000
								&.accept
									background-color: #F28
									color: #FFF

				.close
					margin: 16px 0
					padding: 8px
					border-radius: 50%
					font-size: 32px

					&:hover
						[theme=dark] &
							background-color: #000
						[theme=light] &
							background-color: #BDB

				.unread
					width: 32px
					height: 32px
					text-align: center

					margin: 16px 8px
					padding: 8px
					border-radius: 50%

					[theme=dark] &
						background-color: #F28
					[theme=light] &
						background-color: #F5C

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
	import {zeroPage} from "zero";
	import IRC from "libs/irc";
	import InviteStorage from "libs/irc/invitestorage";
	import CryptMessage from "libs/irc/cryptmessage";
	import UserStorage from "libs/irc/userstorage";
	import User from "libs/irc/object/user";
	import Group from "libs/irc/object/group";
	import EventEmitter from "wolfy87-eventemitter";

	export default {
		name: "Sidebar",
		data() {
			return {
				channels: [],
				invites: [],
				unreadInterval: null,
				unreadIntervalParity: false, 
				User,
				Group
			};
		},

		async mounted() {
			await this.reloadAll();
			InviteStorage.on("invitesUpdated", this.renderInvites);
			UserStorage.on("changeUser", this.reloadAll);
			this.unreadInterval = setInterval(this.updateTitle.bind(this), 1000);
		},
		destroyed() {
			InviteStorage.off("invitesUpdated", this.renderInvites);
			UserStorage.off("changeUser", this.reloadAll);
			clearInterval(this.unreadInterval);
		},

		methods: {
			async reloadAll() {
				const userSettings = await UserStorage.get();
				this.channels = await Promise.all(
					((userSettings || {}).channels || [
						"/HelloBot"
					]).map(async name => {
						return {
							name: name,
							object: await IRC.getObjectById(name),
							fromInviteStorage: false
						};
					})
				);

				await this.renderInvites();
				this.bindEvents();
			},

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

				const object = await IRC.getObjectById(channel);
				let doOpen = true;

				// Invite user (in case they weren't invited before)
				if(object instanceof User) {
					await object.initLock.acquire();
					object.initLock.release();

					if(!object.weInvited && !object.wasTheirInviteHandled) {
						// Invite user
						try {
							await object.invite();
						} catch(e) {
							zeroPage.error(`Error while inviting user: ${e}`);
							this.channels = this.channels.filter(o => o.object !== object);
							return;
						}
						doOpen = false;
					}
					if((object.theyInvited && !object.wasTheirInviteHandled) || (object.weInvited && !object.wasOurInviteHandled) || object.theirInviteState === "dismiss" || object.ourInviteState === "dismiss") {
						// Don't open in case invite wasn't handled
						doOpen = false;
					}
				}

				// Add channel to list
				if(!this.channels.some(o => !o.fromInviteStorage && o.object !== object)) {
					this.channels.push({
						name: channel,
						object,
						fromInviteStorage: false
					});
					this.channels = this.channels.slice();
					this.bindEvents();

					await this.saveChannels();
				}

				// Open channel
				if(doOpen) {
					this.open(channel);
				}
			},

			async removeChannel(channel) {
				this.channels = this.channels.filter(o => o.name !== channel);

				await this.saveChannels();

				if(this.current === channel) {
					// Open #lobby if we removed the current channel
					this.open("#lobby");
				}
			},

			async createGroup() {
				const encKey = await CryptMessage.generateRandomSymmetricKey();

				const object = await IRC.getObjectById(`+${encKey}`);

				// Add channel to list
				if(!this.channels.some(o => o.object === object)) {
					this.channels.push({
						name: `+${encKey}`,
						object,
						fromInviteStorage: false
					});
					this.channels = this.channels.slice();
					this.bindEvents();

					await this.saveChannels();
				}

				// Open channel
				this.open(`+${encKey}`);

				// Invite yourself
				await object._send({
					special: "invite",
					authAddress: this.$store.state.siteInfo.auth_address
				});
				// Join
				await object._send({
					special: "join"
				});
			},

			async acceptInvite(channel) {
				try {
					await channel.object.acceptInvite();
				} catch(e) {
					zeroPage.error(`Error while accepting invite: ${e}`);
					return;
				}

				this.channels.push({
					name: channel.name,
					object: channel.object,
					fromInviteStorage: false
				});
				await this.renderInvites();
				this.bindEvents();

				await this.saveChannels();
			},
			async dismissInvite(channel) {
				try {
					await channel.object.dismissInvite();
				} catch(e) {
					zeroPage.error(`Error while dismissing invite: ${e}`);
				}
				this.removeChannel(channel.name);
			},
			async invite(channel) {
				try {
					await channel.object.invite();
				} catch(e) {
					zeroPage.error(`Error while inviting user: ${e}`);
					return;
				}

				this.channels.push({
					name: channel.name,
					object: channel.object,
					fromInviteStorage: false
				});
				await this.renderInvites();
				this.bindEvents();

				await this.saveChannels();
			},

			async cancelInvite(channel) {
				await channel.object.cancelInvite();
				await this.removeChannel(channel.name);
			},

			async renderInvites() {
				this.channels = this.channels.filter(o => !o.fromInviteStorage);

				const inviteChannels = await Promise.all(
					InviteStorage.invites.map(async invite => {
						const user = await IRC.getObjectById(`@${invite.authAddress}`);
						return {
							name: invite.certUserId || `@${invite.authAddress}`,
							object: user,
							fromInviteStorage: true
						};
					})
				);

				const inviteGroups = await Promise.all(
					InviteStorage.groupInvites.map(async invite => {
						const group = await IRC.getObjectById(`+${invite.encKey}`);
						return {
							name: `+${invite.encKey}`,
							object: group,
							fromInviteStorage: true
						};
					})
				);

				this.channels = inviteChannels.concat(inviteGroups, this.channels)
					.filter((val, idx, arr) => {
						return arr.findIndex(o => o.object === val.object) === idx;
					});
				this.bindEvents();
			},

			async saveChannels() {
				// Save
				let userSettings = await UserStorage.get();
				userSettings.channels = this.channels
					.filter(o => !o.fromInviteStorage)
					.map(o => o.name);
				await UserStorage.set(userSettings);
			},

			async updateTitle() {
				this.unreadIntervalParity = !this.unreadIntervalParity;
				const title = this.$store.state.siteInfo.content.title;
				if(this.unreadIntervalParity && this.totalCountUnread > 0) {
					await zeroPage.cmd("wrapperSetTitle", `(${this.totalCountUnread}) ${title} - ZeroNet`);
				} else {
					await zeroPage.cmd("wrapperSetTitle", `${title} - ZeroNet`);
				}
			},

			bindEvents() {
				// (Re)bind message event listeners
				for(const channel of this.channels) {
					if(channel.eventListener) {
						channel.object.off("received", channel.eventListener);
					}
					channel.eventListener = message => {
						this.showNotification(message, channel);
					};
					channel.object.on("received", channel.eventListener);
				}
			},

			async showNotification(message, channel) {
				// First, check whether notifications are enabled
				if(!(await UserStorage.get()).notificationsEnabled) {
					return;
				}

				// Only show the notification if the user is on another tab, or
				// if the user is on another channel
				if(channel.name === this.current && !document.hidden) {
					return;
				}

				// Generate random notification ID
				const id = Math.random().toString(36).substr(2);
				// Send the notification
				let title = message.certUserId;
				if(channel.name !== message.certUserId) {
					title += ` (${channel.name})`;
				}
				// Body
				let body;

				if(message.message.special) {
					// Prepare
					const origName = message.certUserId || `@${message.authAddress}`;
					let distName;
					if(message.message.authAddress) {
						const certUserId = await zeroDB.query(dedent`
							SELECT cert_user_id
							FROM json
							WHERE (
								directory = :directory AND
								file_name = "content.json"
							)
						`, {
							directory: `users/${message.message.authAddress}`
						});
						distName = certUserId || `@${message.message.authAddress}`;
					}
					if(message.message.special === "invite") {
						body = `${origName} invited ${certUserId} to join the conversation.`;
					} else if(message.message.special === "join") {
						body = `${origName} joined the conversation.`;
					} else if(message.message.special === "dismiss") {
						body = `${origName} dismissed the invite.`;
					} else {
						body = `${origName} fucked up the messages`;
					}
				} else {
					body = message.message.text.replace(/\s+/g, " ").trim();
					if(message.message.buttons) {
						body += "\n";
						for(const row of message.message.buttons) {
							body += "\n";
							body += row.map(button => `[${button.text}]`).join(" ");
						}
					}
				}
				const options = {
					body,
					renotify: true,
					tag: `zIRC:${channel.name}`,
					focus_tab: true
				};
				zeroPage.cmd("wrapperWebNotification", [title, id, options]);

				setTimeout(() => {
					zeroPage.cmd("wrapperCloseWebNotification", [id]);
				}, 5000);

				// Add event handlers
				const onClick = e => {
					if(e.params.id === id) {
						this.open(channel.name);
					}
				};
				zeroPage.on("webNotificationClick", onClick);
				const onClose = e => {
					if(e.params.id === id) {
						zeroPage.off("webNotificationClick", onClick);
						zeroPage.off("webNotificationClose", onClose);
					}
				};
				zeroPage.on("webNotificationClose", onClose);
			}
		},

		computed: {
			current() {
				return this.$store.state.currentChannel;
			},
			visibleChannels() {
				// I know that sort() has side effects -- actually it doesn't
				// matter
				return this.channels.sort((a, b) => {
					const aMessage = (a.object.history || []).slice(-1)[0];
					const bMessage = (b.object.history || []).slice(-1)[0];

					const aDate = aMessage ? aMessage.receiveDate || aMessage.message.date : null;
					const bDate = bMessage ? bMessage.receiveDate || bMessage.message.date : null;

					if(aDate === null && bDate === null) {
						return 0;
					} else if(aDate === null) {
						return 1;
					} else if(bDate === null) {
						return -1;
					}
					return bDate - aDate;
				});
			},
			totalCountUnread() {
				return this.channels
					.map(channel => channel.object.countUnread || 0)
					.reduce((a, b) => a + b, 0);
			}
		}
	};
</script>