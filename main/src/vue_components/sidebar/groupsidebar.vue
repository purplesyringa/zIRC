<template>
	<aside>
		<div class="top">
			<h2>Administrators</h2>

			<template v-for="member in adminMembers">
				<div class="member">
					<Avatar
						:channel="member.name"
						:authAddress="member.authAddress"
						status="online"
					/>

					<div class="content">
						<div class="name">{{member.name}}</div>
					</div>
				</div>
			</template>

			<h2 v-if="members.length > 0">Members</h2>

			<template v-for="member in members">
				<div class="member">
					<Avatar
						:channel="member.name"
						:authAddress="member.authAddress"
						status="online"
					/>

					<div class="content">
						<div class="name">{{member.name}}</div>
						<button v-if="isAdmin" @click="makeAdmin(member)">Make admin</button>
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
			<div class="footer-icon" @click="invite">Invite</div>
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

		.top
			flex: 1 1 0

			display: flex
			flex-direction: column
			padding: 16px

			.member
				display: flex
				flex-direction: row
				align-items: center
				padding: 8px 0
				font-family: "Courier New", monospace

				.avatar
					margin-right: 16px
				.content
					min-width: 0
					flex: 1 1 0
					.name
						margin-bottom: 4px
						overflow: hidden
						white-space: nowrap
						text-overflow: ellipsis
					button
						border: none
						border-radius: 4px
						padding: 4px 8px
						border: 1px solid #F28
						cursor: pointer

						[theme=dark] &
							background-color: #000
							color: #FFF
						[theme=light] &
							background-color: #FFF
							color: #000

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
	import {zeroPage, zeroDB} from "zero";

	export default {
		name: "GroupSidebar",
		props: ["object"],
		data() {
			return {
				object: null
			};
		},

		methods: {
			async invite() {
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
					await this.object.invite(authAddress);
					await this.object._send({
						special: "invite",
						authAddress
					});
				} catch(e) {
					zeroPage.error(e.message);
					return;
				}
			},

			async makeAdmin({authAddress}) {
				this.object.sendAdminSigned({
					special: "makeAdmin",
					authAddress
				});
			}
		},

		computed: {
			adminMembers() {
				return this.allMembers.filter(member => {
					return this.object.history.some(message => {
						return (
							message.message.adminSig &&
							message.message.special === "makeAdmin" &&
							message.message.authAddress === member.authAddress
						);
					});
				});
			},
			members() {
				return this.allMembers.filter(member => {
					return (
						this.adminMembers.indexOf(member) == -1 &&
						this.object.history.some(message => {
							return (
								message.message.special === "join" &&
								message.authAddress === member.authAddress
							);
						})
					);
				});
			},
			invitedMembers() {
				return this.allMembers.filter(member => {
					return (
						this.adminMembers.indexOf(member) === -1 &&
						this.members.indexOf(member) === -1
					);
				});
			},

			isAdmin() {
				const authAddress = this.$store.state.siteInfo.auth_address;
				return !!this.adminMembers.find(m => m.authAddress === authAddress);
			}
		},

		asyncComputed: {
			allMembers: {
				default: [],
				async get() {
					if(!this.object.history) {
						return [];
					}

					return (
						await Promise.all(
							this.object.history
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
						)
					).filter((member, idx, arr) => {
						return arr.findIndex(m => {
							return m.authAddress === member.authAddress;
						}) === idx;
					});
				}
			}
		}
	};
</script>