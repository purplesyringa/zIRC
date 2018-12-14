<template>
	<aside>
		<div class="channels">
			<template
				v-for="channel in channels"
			>
				<div
					v-if="(channel.object instanceof User) && channel.object.theyInvited && !channel.object.wasTheirInviteHandled"

					:class="['channel', {current: current === channel.visibleName}]"
				>
					<!-- Show invite -->
					<Avatar :channel="channel.visibleName" />

					<div class="invite">
						{{channel.visibleName.substr(0, 18)}}<br>
						<div class="invite-status">
							<button class="accept" @click="acceptInvite(channel)">Accept</button>
							<button class="dismiss" @click="dismissInvite(channel)">Dismiss</button>
						</div>
					</div>
				</div>

				<div
					v-else-if="(channel.object instanceof User) && channel.object.weInvited && !channel.object.wasOurInviteHandled"

					:class="['channel', {current: current === channel.visibleName}]"
				>
					<!-- Show invite -->
					<Avatar :channel="channel.visibleName" />

					<div class="invite">
						{{channel.visibleName.substr(0, 18)}}<br>
						<div class="invite-status">Invited</div>
					</div>

					<span class="close" @click.stop="removeChannel(channel.visibleName)">
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

					{{channel.visibleName.substr(0, 18)}}

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

				.invite
					display: inline-block
					vertical-align: middle

					.invite-status
						color: #F06

						button
							border: none
							border-radius: 4px
							padding: 4px 8px
							border: 1px solid #F06
							cursor: pointer

							&.accept
								background-color: #F06
								color: #FFF

				&:first-child
					border-top: 1px solid #FFF

				&.current, &:hover
					background-color: #FFF

				.close
					float: right
					margin: 16px 0
					padding: 8px
					border-radius: 50%
					font-size: 32px

					&:hover
						background-color: #EEE

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
	import IRC from "libs/irc";
	import InviteStorage from "libs/irc/invitestorage";
	import User from "libs/irc/object/user";

	export default {
		name: "Sidebar",
		data() {
			return {
				channels: [],
				invites: [],
				User
			};
		},

		async mounted() {
			const userSettings = await zeroPage.cmd("userGetSettings");
			this.channels = ((userSettings || {}).channels || [
				"/HelloBot"
			]).map(name => {
				return {
					visibleName: name,
					object: IRC.getObjectById(name),
					fromInviteStorage: false
				};
			});

			InviteStorage.on("invitesUpdated", this.renderInvites);
			this.renderInvites();
		},
		destroyed() {
			InviteStorage.off("invitesUpdated", this.renderInvites);
		},

		methods: {
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
				if(!this.channels.some(o => o.visibleName === channel)) {
					this.channels.push({
						visibleName: channel,
						object,
						fromInviteStorage: false
					});

					// Save
					let userSettings = await zeroPage.cmd("userGetSettings");
					if(!userSettings) {
						userSettings = {};
					}
					userSettings.channels = this.channels.map(o => o.visibleName);
					await zeroPage.cmd("userSetSettings", [userSettings]);
				}

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
						this.channels = this.channels.slice();
						return;
					}
					if(!object.wasTheirInviteHandled || !object.wasOurInviteHandled) {
						// Don't open in case invite wasn't handled
						return;
					}
				}

				// And open
				this.open(channel);
			},

			async removeChannel(channel) {
				this.channels = this.channels.filter(o => o.visibleName !== channel);

				// Save
				let userSettings = await zeroPage.cmd("userGetSettings");
				if(!userSettings) {
					userSettings = {};
				}
				userSettings.channels = this.channels.map(o => o.visibleName);
				await zeroPage.cmd("userSetSettings", [userSettings]);

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

				channel.fromInviteStorage = false;
				this.channels.push(channel);

				// Save
				let userSettings = await zeroPage.cmd("userGetSettings");
				if(!userSettings) {
					userSettings = {};
				}
				userSettings.channels = this.channels.map(o => o.visibleName);
				await zeroPage.cmd("userSetSettings", [userSettings]);
			},
			async dismissInvite(channel) {
				try {
					await channel.object.dismissInvite();
				} catch(e) {
					zeroPage.error(`Error while dismissing user's invite: ${e}`);
				}
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
			}
		},

		computed: {
			current() {
				return this.$store.state.currentChannel;
			}
		}
	};
</script>