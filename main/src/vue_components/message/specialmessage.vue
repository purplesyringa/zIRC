<template>
	<div class="message">
		<template v-if="message.special === 'invite'">
			<b>{{name}}</b> was invited to the conversation.
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
		}
	};
</script>