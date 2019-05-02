import RemoteZeroDB from "zero-dev-lib/RemoteZeroDB";
import {zeroPage} from "zero";

const ZEROTALK = "1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT";

export default new class ZeroTalkIntegration {
	constructor() {
		this.db = new RemoteZeroDB(zeroPage, ZEROTALK);
	}

	async get(siteAddress, path) {
		if(
			siteAddress.toLowerCase() !== "talk.zeronetwork.bit" &&
			siteAddress !== ZEROTALK
		) {
			return null;
		}

		if(path.startsWith("?Topic:")) {
			const topicUri = path.replace("?Topic:", "").split("/")[0];
			if(!topicUri) {
				return null;
			}
			const topic = (await this.db.query(dedent`
				SELECT topic.*, likes, comments

				FROM (
					SELECT
						topic.*,
						topic.topic_id || "_" || json.directory AS topic_uri
					FROM topic
					LEFT JOIN json ON (json.json_id = topic.json_id)
					WHERE topic_uri = :topicUri
				) AS topic

				LEFT JOIN (
					SELECT topic_uri, COUNT(*) AS likes
					FROM topic_vote
					GROUP BY topic_uri
				) AS likes ON (topic.topic_uri = likes.topic_uri)

				LEFT JOIN (
					SELECT topic_uri, COUNT(*) AS comments
					FROM comment
					GROUP BY topic_uri
				) AS comments ON (topic.topic_uri = comments.topic_uri)
			`, {
				topicUri
			}))[0];
			if(!topic) {
				return null;
			}
			return {
				title: topic.title,
				status: `💗 ${topic.likes}  💬 ${topic.comments}`,
				text: topic.body
			};
		}

		return null;
	}
};