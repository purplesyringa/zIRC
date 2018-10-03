<template>
	<div class="current-view">
		<Sidebar />
		<component :is="$parent.currentView" ref="currentView"></component>
	</div>
</template>

<style lang="sass" scoped>
	.current-view
		display: flex
		height: 100%
</style>

<script language="text/javascript">
	import {zeroPage} from "zero";

	export default {
		props: [],
		name: "root",

		async mounted() {
			// Request merger permission
			const permissions = (await zeroPage.getSiteInfo()).settings.permissions;
			if(permissions.indexOf("Merger:IRC") === -1) {
				await zeroPage.cmd("wrapperPermissionAdd", ["Merger:IRC"]);
			}
		}
	};
</script>