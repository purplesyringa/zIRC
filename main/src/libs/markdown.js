import marked from "marked";
import sanitizeHtml from "sanitize-html";
import hljs from "highlight.js/lib/highlight";

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


function rebase(url, base=null) {
	if(url.startsWith("zero://")) {
		return `/${url.replace("zero://")}`;
	} else if(url.startsWith("/")) {
		return url;
	} else if(url.indexOf("://") === -1 && base) {
		return `/${base}/${url}`;
	} else {
		return url;
	}
}

export default function markdown(text, base=null) {
	const html = sanitizeHtml(
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
	const node = document.createElement("div");
	node.innerHTML = html;
	for(const link of node.querySelectorAll("a")) {
		link.href = rebase(link.getAttribute("href"), base);
	}
	for(const img of node.querySelectorAll("img")) {
		img.src = rebase(img.getAttribute("src"), base);
	}
	return node.innerHTML;
}