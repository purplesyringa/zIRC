<template>
	<div class="message">
		<span class="user" v-if="certUserId">{{certUserId}}</span>
		<span class="user anonymous" v-else>Anonymous</span>
		<span class="date" :title="title">[{{dateText}}]</span>:
		{{message.text}}
	</div>
</template>

<style lang="sass" scoped>
	.message
		margin: 4px 0
		font-family: "Courier New", monospace

		.user
			font-weight: bold
		.anonymous
			font-style: italic
			color: #008
		.date
			font-style: italic
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