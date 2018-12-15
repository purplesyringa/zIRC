<template>
	<div class="message">
		<Avatar class="avatar" :channel="certUserId || `@${authAddress}`" />

		<div class="header">
			<span class="user" v-if="certUserId">{{certUserId}}</span>
			<span class="user anonymous" v-else>Anonymous</span>
			<span class="date" :title="title">[{{dateText}}]</span>
		</div>
		{{message.text}}
		<ClearFix />
	</div>
</template>

<style lang="sass" scoped>
	.message
		margin: 16px 0
		font-family: "Courier New", monospace

		.avatar
			float: left
			margin-right: 16px

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
</style>

<script type="text/javascript">
	export default {
		name: "Message",
		props: ["authAddress", "certUserId", "receiveDate", "message"],
		data() {
			return {
				authAddress: "",
				certUserId: "",
				receiveDate: 0,
				message: {
					date: 0,
					text: "",
					id: ""
				}
			};
		},

		computed: {
			dateText() {
				return (new Date(this.message.date)).toLocaleString();
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