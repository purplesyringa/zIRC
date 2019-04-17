<template>
	<aside>
		<div class="channels">
			<template
				v-for="channel in visibleChannels"
			>
				<div
					v-if="(channel.object instanceof User) && channel.object.theyInvited && !channel.object.wasTheirInviteHandled"

					:class="['channel', {current: current === channel.visibleName}]"
				>
					<!-- Show invite -->
					<Avatar :channel="channel.visibleName" />

					<div class="content">
						<div class="invite">
							<div class="name">{{channel.visibleName}}</div>
							<div class="invite-status">
								<button class="accept" @click="acceptInvite(channel)">Accept</button>
								<button class="dismiss" @click="dismissInvite(channel)">Dismiss</button>
							</div>
						</div>
					</div>
				</div>

				<div
					v-else-if="(channel.object instanceof User) && channel.object.theirInviteState === 'dismiss' && !channel.object.weInvited"

					:class="['channel', {current: current === channel.visibleName}]"
				>
					<!-- Show invite -->
					<Avatar :channel="channel.visibleName" />

					<div class="content">
						<div class="invite">
							<div class="name">{{channel.visibleName}}</div>
							<div class="invite-status">
								<button class="accept" @click="invite(channel)">Invite</button>
							</div>
						</div>
					</div>

					<span class="close" @click.stop="removeChannel(channel.visibleName)">
						&times;
					</span>
				</div>

				<div
					v-else-if="(channel.object instanceof User) && channel.object.weInvited && channel.object.ourInviteState !== 'accept'"

					:class="['channel', {current: current === channel.visibleName}]"
				>
					<!-- Show invite -->
					<Avatar :channel="channel.visibleName" />

					<div class="content">
						<div class="invite">
							<div class="name">{{channel.visibleName}}</div>
							<div v-if="!channel.object.wasOurInviteHandled" class="invite-status">Invited</div>
							<div v-else class="invite-status">Dismissed :(</div>
						</div>
					</div>

					<span class="close" @click.stop="cancelInvite(channel)">
						&times;
					</span>
				</div>

				<div
					v-else

					:class="['channel', {current: current === channel.visibleName}]"
					@click="open(channel.visibleName)"
				>
					<!-- Show user/channel/group badge -->
					<Avatar :channel="channel.visibleName" />

					<div class="content">
						<div class="name">{{channel.visibleName}}</div>

						<SmallMessage
							v-if="(channel.object.history || []).length"
							v-bind="(channel.object.history || []).slice(-1)[0]"
						/>
					</div>

					<span class="unread" v-if="channel.object.countUnread">
						{{channel.object.countUnread}}
					</span>

					<span class="close" @click.stop="removeChannel(channel.visibleName)">
						&times;
					</span>
				</div>
			</template>
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
		background-color: #223
		overflow-y: auto
		overflow-x: hidden

		display: flex
		flex-direction: column

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
					background-color: #444

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
								background-color: #000
								color: #FFF

								&.accept
									background-color: #F28

				.close
					margin: 16px 0
					padding: 8px
					border-radius: 50%
					font-size: 32px

					&:hover
						background-color: #000

				.unread
					width: 32px
					height: 32px
					text-align: center

					margin: 16px 8px
					padding: 8px
					border-radius: 50%
					background-color: #F28

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
					background-color: #000
</style>

<script type="text/javascript">
	import {zeroPage} from "zero";
	import IRC from "libs/irc";
	import InviteStorage from "libs/irc/invitestorage";
	import UserStorage from "libs/irc/userstorage";
	import User from "libs/irc/object/user";

	export default {
		name: "Sidebar",
		data() {
			return {
				channels: [],
				invites: [],
				unreadInterval: null,
				unreadIntervalParity: false, 
				User
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
				this.channels = ((userSettings || {}).channels || [
					"/HelloBot"
				]).map(name => {
					return {
						visibleName: name,
						object: IRC.getObjectById(name),
						fromInviteStorage: false
					};
				});

				this.renderInvites();
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

				const object = IRC.getObjectById(channel);
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
							this.channels = this.channels.filter(o => o.visibleName !== channel);
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
				if(!this.channels.some(o => !o.fromInviteStorage && o.visibleName === channel)) {
					this.channels.push({
						visibleName: channel,
						object,
						fromInviteStorage: false
					});
					this.channels = this.channels.slice();

					await this.saveChannels();
				}

				// Open channel
				if(doOpen) {
					this.open(channel);
				}
			},

			async removeChannel(channel) {
				this.channels = this.channels.filter(o => o.visibleName !== channel);

				await this.saveChannels();

				if(this.current === channel) {
					// Open #lobby if we removed the current channel
					this.open("#lobby");
				}
			},

			async acceptInvite(channel) {
				try {
					await channel.object.acceptInvite();
				} catch(e) {
					zeroPage.error(`Error while accepting user's invite: ${e}`);
					return;
				}

				this.channels.push({
					visibleName: channel.visibleName,
					object: channel.object,
					fromInviteStorage: false
				});
				this.renderInvites();

				await this.saveChannels();
			},
			async dismissInvite(channel) {
				try {
					await channel.object.dismissInvite();
				} catch(e) {
					zeroPage.error(`Error while dismissing user's invite: ${e}`);
				}
			},
			async invite(channel) {
				try {
					await channel.object.invite();
				} catch(e) {
					zeroPage.error(`Error while inviting user: ${e}`);
					return;
				}

				this.channels.push({
					visibleName: channel.visibleName,
					object: channel.object,
					fromInviteStorage: false
				});
				this.renderInvites();

				await this.saveChannels();
			},

			async cancelInvite(channel) {
				await channel.object.cancelInvite();
				await this.removeChannel(channel.visibleName);
			},

			renderInvites() {
				this.channels = this.channels.filter(o => !o.fromInviteStorage);

				const inviteChannels = InviteStorage.invites.map(invite => {
					const user = IRC.getObjectById(`@${invite.authAddress}`);
					return {
						visibleName: invite.certUserId || `@${invite.authAddress}`,
						object: user,
						fromInviteStorage: true
					};
				});

				this.channels = inviteChannels.concat(this.channels)
					.filter((val, idx, arr) => {
						return arr.findIndex(o => o.visibleName === val.visibleName) === idx;
					});
			},

			async saveChannels() {
				// Save
				let userSettings = (await UserStorage.get()) || {};
				userSettings.channels = this.channels
					.filter(o => !o.fromInviteStorage)
					.map(o => o.visibleName);
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
					.reduce((a, b) => a + b);
			}
		}
	};
</script>