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
							<div class="name">{{channel.object.visibleName}}</div>
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
							<div class="name">{{channel.object.visibleName}}</div>
							<div class="invite-status">
								<button class="accept" @click="invite(channel)">Invite</button>
							</div>
						</div>
					</div>

					<span class="close" @click.stop="removeChannel(channel)">
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
							<div class="name">{{channel.object.visibleName}}</div>
							<div v-if="!channel.object.wasOurInviteHandled" class="invite-status">Invited</div>
							<div v-else class="invite-status">Dismissed :(</div>
						</div>
					</div>

					<span class="close" @click.stop="cancelInvite(channel)">
						&times;
					</span>
				</div>

				<div
					v-else-if="(channel.object instanceof Group) && channel.object.wasInvited && !channel.object.hasJoined && !channel.object.hasDismissed"

					:class="['channel', {current: current === channel.name}]"
				>
					<!-- Show invite -->
					<Avatar
						:channel="channel.name"
						:authAddress="channel.object.name"
					/>

					<div class="content">
						<div class="invite">
							<div class="name">{{channel.object.visibleName}}</div>
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
						<div class="name">{{channel.object.visibleName}}</div>

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

					<span class="close" @click.stop="removeChannel(channel)">
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
	import {zeroDB} from "zero";

	export default {
		name: "Sidebar",
		data() {
			return {
				channels: [],
				invites: [],
				eventListeners: {},
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
				this.channels = await Promise.all(
					(UserStorage.storage.channels || [
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
					await object.initLock.peek();

					if(!object.weInvited && !object.wasTheirInviteHandled) {
						// Invite user
						try {
							await object.invite();
						} catch(e) {
							zeroPage.error(`Error while inviting user: ${e}`);
							this.channels = this.channels.filter(o => o.object !== object);
							this.bindEvents();
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
				if(!this.channels.some(o => !o.fromInviteStorage && o.object === object)) {
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
				this.channels = this.channels.filter(o => o !== channel);
				this.bindEvents();

				await this.saveChannels();

				if(this.current === channel.name) {
					// Open #lobby if we removed the current channel
					this.open("#lobby");
				}
			},

			async createGroup() {
				const encKey = await CryptMessage.generateRandomSymmetricKey();
				const adminKey = await CryptMessage.generateRandomSymmetricKey();
				const adminAddr = await CryptMessage.privateKeyToAddress(adminKey);

				const object = await IRC.getObjectById(`+${encKey}:${adminAddr}`);

				// Add channel to list
				if(!this.channels.some(o => o.object === object)) {
					this.channels.push({
						name: object.name,
						object,
						fromInviteStorage: false
					});
					this.channels = this.channels.slice();
					this.bindEvents();

					await this.saveChannels();
				}

				// Save the admin key
				UserStorage.storage.groupAdminKeys = UserStorage.storage.groupAdminKeys || {};
				UserStorage.storage.groupAdminKeys[`${encKey}:${adminAddr}`] = adminKey;
				await UserStorage.save();

				// Open channel
				this.open(`+${encKey}:${adminAddr}`);

				// Invite yourself
				await object._send({
					special: "invite",
					authAddress: this.$store.state.siteInfo.auth_address
				});
				// Join
				await object._send({
					special: "join"
				});
				// Make yourself an admin
				await object.sendAdminSigned({
					special: "makeAdmin",
					authAddress: this.$store.state.siteInfo.auth_address
				});
				// Set title
				await object.sendAdminSigned({
					special: "setTitle",
					title: "New group"
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
				this.removeChannel(channel);
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
				await this.removeChannel(channel);
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

				const inviteGroups = (
					await Promise.all(
						InviteStorage.groupInvites.map(async invite => {
							const group = await IRC.getObjectById(`+${invite.encKey}:${invite.adminAddr}`);
							await group.initLock.peek();
							return {
								name: group.name,
								object: group,
								fromInviteStorage: true
							};
						})
					)
				)
					.filter(o => !o.object.hasJoined && !o.object.hasDismissed);

				this.channels = inviteChannels.concat(inviteGroups, this.channels)
					.filter((val, idx, arr) => {
						return arr.findIndex(o => o.object === val.object) === idx;
					});
				this.bindEvents();
			},

			async saveChannels() {
				// Save
				UserStorage.storage.channels = this.channels
					.filter(o => !o.fromInviteStorage)
					.map(o => o.name);
				await UserStorage.save();
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
				for(const listener of Object.values(this.eventListeners)) {
					listener.bound = false;
				}
				for(const channel of this.channels) {
					if(this.eventListeners[channel.name]) {
						channel.object.off(
							"received",
							this.eventListeners[channel.name].f
						);
					} else {
						this.eventListeners[channel.name] = {};
					}
					let listener = this.eventListeners[channel.name];
					listener.f = message => {
						this.showNotification(message, channel);
					};
					listener.object = channel.object;
					listener.bound = true;
					channel.object.on("received", listener.f);
				}
				for(const [name, {bound, f, object}] of Object.entries(this.eventListeners)) {
					if(!bound) {
						object.off("received", f);
						delete this.eventListeners[name];
					}
				}
			},

			async showNotification(message, channel) {
				// First, check whether notifications are enabled
				if(!UserStorage.storage.notificationsEnabled) {
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
					title += ` (${channel.object.visibleName})`;
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
						body = `${origName} invited ${distName} to join the conversation.`;
					} else if(message.message.special === "join") {
						body = `${origName} joined the conversation.`;
					} else if(message.message.special === "dismiss") {
						body = `${origName} dismissed the invite.`;
					} else if(message.message.adminSig) {
						if(message.message.special === "makeAdmin") {
							body = `${origName} made ${distName} an administrator.`;
						} else if(message.message.special === "setTitle") {
							body = `${origName} changed group title to ${message.message.title}.`;
						} else {
							body = `${origName} fucked up the messages`;
						}
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