<template>
	<div class="message">
		<template v-if="message.special === 'invite'">
			<template v-if="authAddress === message.authAddress">
				<code>{{name}}</code> created the group.
			</template>
			<template v-else>
				<code>{{name}}</code> invited <code>{{nameMessage}}</code> to
				join the conversation.
			</template>
		</template>
		<template v-else-if="message.special === 'join'">
			<code>{{name}}</code> joined the conversation.
		</template>
		<template v-else-if="message.special === 'dismiss'">
			<code>{{name}}</code> dismissed the conversation.
		</template>
		<template v-else-if="message.special === 'away'">
			<template v-if="message.reason">
				<code>{{name}}</code> is away {{message.reason}}.
			</template>
			<template v-else>
				<code>{{name}}</code> is away.
			</template>
		</template>
		<template v-else-if="message.special === 'back'">
			<code>{{name}}</code> is back.
		</template>
		<template v-else-if="message.adminSig">
			<template v-if="message.special === 'makeAdmin'">
				<code>{{name}}</code> made <code>{{nameMessage}}</code> an
				administrator.
			</template>
			<template v-else-if="message.special === 'setTitle'">
				<code>{{name}}</code> changed group title to
				<code>{{message.title}}</code>.
			</template>
			<template v-else>
				<code>{{name}}</code> fucked up the messages.
			</template>
		</template>
		<template v-else>
			<code>{{name}}</code> fucked up the messages.
		</template>
	</div>
</template>

<style lang="sass" scoped>
	.message
		margin: 16px 0
		font-family: "Arial", sans-serif

		code
			font-family: "Courier New", monospace
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
				return (
					this.certUserId.replace(/@.*/, "") ||
					`@${this.authAddress.substr(0, 6)}...`
				);
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