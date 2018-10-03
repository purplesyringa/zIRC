<template>
	<div class="message">
		{{certUserId}}: {{message.text}}
	</div>
</template>

<style lang="sass" scoped>
	
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
		}
	};
</script>