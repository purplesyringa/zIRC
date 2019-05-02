import RemoteZeroDB from "zero-dev-lib/RemoteZeroDB";
import {zeroPage} from "zero";

const ZEROBLOG = "1BLogC9LN4oPDcruNz3qo1ysa133E9AGg8";

export default new class ZeroBlogIntegration {
	constructor() {
		this.db = new RemoteZeroDB(zeroPage, ZEROBLOG);
	}

	async get(siteAddress, path) {
		if(
			siteAddress.toLowerCase() !== "blog.zeronetwork.bit" &&
			siteAddress !== ZEROBLOG
		) {
			return null;
		}

		if(path.startsWith("?Post:")) {
			const postId = path.split(":")[1];
			if(!postId) {
				return null;
			}
			const post = (await this.db.query(dedent`
				SELECT post.*, likes, comments
				FROM post

				LEFT JOIN (
					SELECT post_id, COUNT(*) AS likes
					FROM post_vote
					GROUP BY post_id
				) AS likes ON (post.post_id = likes.post_id)

				LEFT JOIN (
					SELECT post_id, COUNT(*) AS comments
					FROM comment
					GROUP BY post_id
				) AS comments ON (post.post_id = comments.post_id)

				WHERE post.post_id = :postId
			`, {
				postId
			}))[0];
			if(!post) {
				return null;
			}
			return {
				title: post.title,
				status: `💗 ${post.likes}  💬 ${post.comments}`,
				text: post.body
			};
		}

		return null;
	}
};