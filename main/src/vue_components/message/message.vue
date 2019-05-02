<template>
	<div class="message">
		<Avatar
			class="avatar"
			:channel="certUserId || `@${authAddress}`"
			:authAddress="`@${authAddress}`"
		/>

		<div class="content">
			<div class="header">
				<span class="user" v-if="certUserId">{{certUserId}}</span>
				<span class="user anonymous" v-else>Anonymous</span>
				<span class="date" :title="title">[{{dateText}}]</span>
			</div>
			<div class="messages">
				<div v-for="message, i in messages" class="message-item">
					<div class="message-splitter" v-if="i > 0" />

					<div class="markdown" v-html="renderMarkdown(message.text)" />
					<div class="buttons" v-if="message.buttons">
						<div v-for="row in message.buttons" class="button-row">
							<div v-for="button in row" :class="['button', `button-${button.color}`]" :style="{width: `${100 / row.length}%`}" @click="sendButton(button.text)">
								[{{button.text}}]
							</div>
						</div>
					</div>
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
			flex: 1 1 0

			.header
				padding: 8px 0
			.user
				font-weight: bold
			.anonymous
				font-style: italic
				[theme=dark] &
					color: #FCC
				[theme=light] &
					color: #F22
			.date
				font-style: italic
				color: #888

			.messages
				float: left
				margin: -8px 0
				width: 100%

				.message-item
					margin: 8px 0

					.message-splitter
						height: 1px
						margin: 8px 0
						[theme=dark] &
							background-color: rgba(255, 255, 255, 0.2)
						[theme=light] &
							background-color: rgba(0, 0, 0, 0.2)

					.markdown
						margin: -8px 0

						/deep/
							p, pre, blockquote
								margin: 16px 0
							.emoji
								font-size: 2em
								line-height: 1.5em
							code
								padding: 4px 8px
								border-radius: 4px
								[theme=dark] &
									background-color: rgba(0, 0, 0, 0.5)
								[theme=light] &
									background-color: rgba(255, 0, 0, 0.1)
							pre
								padding: 16px
								[theme=dark] &
									color: #FFC
									background-color: rgba(0, 0, 0, 0.5)
									@import "~highlight.js/styles/monokai-sublime"
								[theme=light] &
									color: #200
									background-color: rgba(255, 0, 0, 0.1)
									@import "~highlight.js/styles/a11y-light"
								code
									padding: 0
									border-radius: 0
									[theme] &
										background: none
							blockquote
								padding: 16px
								[theme=dark] &
									background-color: rgba(0, 0, 0, 0.5)
									border-left: 4px solid #000
								[theme=light] &
									background-color: rgba(255, 0, 0, 0.1)
									border-left: 4px solid #FCC
								> :first-child
									margin-top: 0
								> :last-child
									margin-bottom: 0
							hr
								[theme=dark] &
									color: #FFA
									background-color: #FFA
									border-color: #FFA
								[theme=light] &
									color: #FAA
									background-color: #FAA
									border-color: #FAA
							h1, h2, h3, h4, h5, h6
								margin: 16px 0
								line-height: 1em
							h1
								font-size: 2em
							h2
								font-size: 1.8em
							h3
								font-size: 1.5em
							h4
								font-size: 1.3em
							h5
								font-size: 1.2em
							h6
								font-size: 1.1em


					.buttons
						display: flex
						flex-direction: column
						margin-top: 8px

						.button-row
							display: flex
							flex-direction: row
							margin: 4px -4px

							.button
								display: block
								text-align: center
								padding: 12px
								margin: 0 4px
								border-radius: 12px
								cursor: pointer

								[theme] &
									&.button-red, &.button-green, &.button-cyan,
									&.button-blue, &.button-yellow, &.button-orange,
									&.button-purple
										border: none

								[theme=dark] &
									border: 1px solid rgba(220, 220, 255, 0.3)
									opacity: 0.8
									&:hover
										opacity: 1

									&.button-red
										background-color: #B24523
									&.button-green
										background-color: #60B223
									&.button-cyan
										background-color: #22A18A
									&.button-blue
										background-color: #3A64A8
									&.button-yellow
										background-color: #A0A323
									&.button-orange
										background-color: #A26D22
									&.button-purple
										background-color: #9621A0
								[theme=light] &
									border: 1px solid rgba(40, 0, 0, 0.3)
									opacity: 1
									&:hover
										opacity: 0.8

									&.button-red
										background-color: #F97F66
									&.button-green
										background-color: #8AF966
									&.button-cyan
										background-color: #79E5E1
									&.button-blue
										background-color: #859CF2
									&.button-yellow
										background-color: #E2E847
									&.button-orange
										background-color: #EFAE34
									&.button-purple
										background-color: #F185D4
</style>

<script type="text/javascript">
	import marked from "marked";
	import sanitizeHtml from "sanitize-html";
	import hljs from "highlight.js/lib/highlight";
	import emojis from "libs/emojis";

	// Do not optimize the lines below using a for loop, this will break WebPack
	// optimizations
	const context = require.context(
		"highlight.js/lib/languages", false,
		/\b(apache|asp|brainfuck|c|cfm|clojure|cmake|cpp|cs|csharp|css|csv|bash|diff|elixir|go|haml|http|java|javascript|json|jsx|less|make|markdown|matlab|nginx|objectivec|pascal|php|perl|python|rust|shell|sql|scss|sql|svg|swift|ruby|vim|vue|xml|yaml)\b/
	);
	for(const name of context.keys()) {
		const language = name.replace("./", "").replace(".js", "");
		hljs.registerLanguage(language, context(name));
	}

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
		},

		methods: {
			sendButton(button) {
				this.$emit("sendButton", button);
			},
			renderMarkdown(text) {
				if(Object.values(emojis).indexOf(text) > -1) {
					// It's an emoji
					return `<span class="emoji">${text}</span>`;
				}

				return sanitizeHtml(
					marked(text, {
						gfm: true,
						silent: true,
						tables: true,
						highlight(code, lang) {
							if(lang) {
								return hljs.highlight(lang, code).value;
							} else {
								return hljs.highlightAuto(code).value;
							}
						}
					}),
					{
						allowedTags: [
							"h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
							"p", "a", "ul", "ol", "nl", "li", "b", "i",
							"strong", "em", "strike", "code", "hr", "br", "div",
							"table", "thead", "caption", "tbody", "tr", "th",
							"td", "pre", "img", "span"
						],
						allowedAttributes: {
							a: ["href", "name", "target"],
							img: ["src"],
							"*": ["class", "align"]
						},
						selfClosing: ["img", "br", "hr"],
						allowedSchemes: ["http", "https", "ftp", "mailto"],
						allowedSchemesByTag: {},
						allowedSchemesAppliedToAttributes: ["href", "src"],
						allowProtocolRelative: true
					}
				);
			}
		}
	};
</script>