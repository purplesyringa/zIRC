import RemoteZeroDB from "zero-dev-lib/RemoteZeroDB";
import {zeroPage} from "zero";

const ZEROWIKI = "138R53t3ZW7KDfSfxVpWUsMXgwUnsDNXLP";
const NEWZEROWIKI = "1LX2wiouHctuUXtu5WkVM9TJJ3YoL6gAfm";

export default new class ZeroTalkIntegration {
	constructor() {
		this.db = new RemoteZeroDB(zeroPage, ZEROWIKI);
		this.dbNew = new RemoteZeroDB(zeroPage, NEWZEROWIKI);
	}

	async get(siteAddress, path) {
		if(siteAddress !== ZEROWIKI && siteAddress !== NEWZEROWIKI) {
			return null;
		}

		const db = siteAddress === ZEROWIKI ? this.db : this.dbNew;

		if(path.startsWith("?Page:")) {
			const slug = path.replace("?Page:", "");
			if(!slug) {
				return null;
			}
			const page = (await db.query(dedent`
				SELECT
					pages.*,
					keyvalue.value
				FROM pages

				LEFT JOIN json AS data_json ON (
					data_json.json_id = pages.json_id
				)

				LEFT JOIN json AS content_json ON (
					content_json.directory = data_json.directory AND
					content_json.file_name = "content.json"
				)

				LEFT JOIN keyvalue ON (
					content_json.json_id = keyvalue.json_id AND
					keyvalue.key = "cert_user_id"
				)

				WHERE slug = :slug
				ORDER BY date_added DESC
				LIMIT 1
			`, {
				slug
			}))[0];
			if(!page) {
				return null;
			}

			const status = dedent`
				Last updated: ${(new Date(page.date_added)).toLocaleDateString()}
				by ${page.value}
			`;

			const lines = page.body.split("\n");
			if(lines[0].startsWith("#")) {
				return {
					title: lines[0].replace("#", ""),
					status,
					text: this.format(lines.slice(1).join("\n"))
				};
			} else if(lines[1] === "-".repeat(lines[1].length)) {
				return {
					title: lines[0],
					status,
					text: this.format(lines.slice(2).join("\n"))
				};
			} else {
				return {
					title: slug.replace("-", "").replace(/(\s|^)([a-z])/, (_, pref, l) => {
						return pref + l.toUpperCase();
					}),
					status,
					text: this.format(page.body)
				};
			}
		}

		return null;
	}

	format(text) {
		return text
			.replace(/\[\[(.*?)\]\]/g, (_, slug) => {
				let title = slug;
				if(slug.indexOf("|") > -1) {
					[slug, title] = slug.split("|");
				}
				return `[${title}](?Page:${slug.replace(/\s+/g, "-").toLowerCase()})`;
			});
	}
};