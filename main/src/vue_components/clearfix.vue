<template>
	<div :style="{clear}"></div>
</template>

<script type="text/javascript">
	export default {
		name: "ClearFix",
		props: {
			clear: {
				type: String,
				default: "both"
			}
		}
	};
</script>