<template>
	<div class="message">
		<template v-if="message.special === 'invite'">
			<template v-if="authAddress === message.authAddress">
				<b>{{name}}</b> created the group.
			</template>
			<template v-else>
				<b>{{name}}</b> invited <b>{{nameMessage}}</b> to
				join the conversation.
			</template>
		</template>
		<template v-else-if="message.special === 'join'">
			<b>{{name}}</b> joined the conversation.
		</template>
		<template v-else>
			<b>{{name}}</b> fucked up the messages.
		</template>
	</div>
</template>

<style lang="sass" scoped>
	.message
		margin: 16px 0
		font-family: "Arial", sans-serif
</style>

<script type="text/javascript">
	import {zeroDB} from "zero";

	export default {
		name: "SpecialMessage",
		props: ["authAddress", "certUserId", "receiveDate", "messages"],
		data() {
			return {
				authAddress: "",
				certUserId: "",
				receiveDate: 0,
				messages: []
			};
		},

		computed: {
			message() {
				return this.messages[0];
			},
			name() {
				return this.certUserId || `@${this.authAddress}`;
			}
		},

		asyncComputed: {
			async nameMessage() {
				if(!this.message.authAddress) {
					return null;
				}

				const certUserId = ((await zeroDB.query(dedent`
					SELECT cert_user_id
					FROM json
					WHERE (
						directory = :directory AND
						file_name = "content.json"
					)
				`, {
					directory: `users/${this.message.authAddress}`
				}))[0] || {}).cert_user_id;
				return certUserId || `@${this.message.authAddress}`;
			}
		}
	};
</script>