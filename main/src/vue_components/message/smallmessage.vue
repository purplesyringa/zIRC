<template>
	<div class="message">
		<template v-if="certUserId !== channelName">
			<template>
				<span class="user" v-if="certUserId">{{certUserId.split("@")[0]}}</span>
				<span class="user anonymous" v-else>Anonymous</span>
			</template>:
		</template>
		{{message.text}}
	</div>
</template>

<style lang="sass" scoped>
	.message
		font-family: "Courier New", monospace
		color: #AAA
		height: 16px

		overflow: hidden
		white-space: nowrap
		text-overflow: ellipsis

		.user
			font-weight: bold
		.anonymous
			font-style: italic
			color: #FCC
</style>

<script type="text/javascript">
	export default {
		name: "SmallMessage",
		props: ["authAddress", "certUserId", "receiveDate", "message", "channelName"],
		data() {
			return {
				authAddress: "",
				certUserId: "",
				receiveDate: 0,
				message: {
					date: 0
				},
				channelName: ""
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