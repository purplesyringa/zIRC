<template>
	<div class="message">
		<Avatar class="avatar" :channel="certUserId || `@${authAddress}`" />

		<div class="content">
			<div class="header">
				<span class="user" v-if="certUserId">{{certUserId}}</span>
				<span class="user anonymous" v-else>Anonymous</span>
				<span class="date" :title="title">[{{dateText}}]</span>
			</div>
			<div class="messages">
				<div v-for="message in messages" class="message-item">
					{{message.text}}
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="sass" scoped>
	.message
		margin: 16px 0
		font-family: "Courier New", monospace

		display: flex
		flex-direction: row

		.avatar
			float: left
			margin-right: 16px
			flex: 0 0 64px

		.content
			.header
				padding: 8px 0
			.user
				font-weight: bold
			.anonymous
				font-style: italic
				color: #FCC
			.date
				font-style: italic
				color: #888

			.messages
				float: left
				margin: -8px 0
				.message-item
					margin: 8px 0
</style>

<script type="text/javascript">
	export default {
		name: "Message",
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
			dateText() {
				return (new Date(this.messages[0].date)).toLocaleString();
			},
			title() {
				if(this.receiveDate) {
					return `Received at: ${(new Date(this.receiveDate)).toLocaleString()}`;
				} else {
					return "";
				}
			}
		}
	};
</script>