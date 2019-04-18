# This script is for bot deploying. A user won't need it, so you can just ignore
# this file.

import ZeroFrame
import Crypt
import Util
import json
import datetime
import base64


DEPLOY_PRIVATEKEY = None
DEPLOYER = None
def init():
	global DEPLOY_PRIVATEKEY, DEPLOYER

	# The private key for signing is expected to be found in user settings
	settings = ZeroFrame.userGetSettings(wait=True)
	if "deploy_privatekey" in settings:
		DEPLOY_PRIVATEKEY = settings["deploy_privatekey"]
		DEPLOYER = Crypt.privatekeyToAddress(DEPLOY_PRIVATEKEY)

		signers = ZeroFrame.fileRules("data/bots/content.json", wait=True)["signers"]
		if DEPLOYER not in signers:
			print(f"[zIRC] Invalid private key. Expected to match any public key of: {signers}")
			return

		start()


def start():
	handled_deploys = set()


	while True:
		# Get request list
		requests = ZeroFrame.dbQuery(
			"""
				SELECT
					deploy_bot.*,
					REPLACE(json.directory, "users/", "") AS auth_address,
					json.cert_user_id AS cert_user_id

				FROM (
					SELECT
						name,
						MAX(date_added) AS date_added,
						json_id
					FROM deploy_bot

					GROUP BY name, json_id
				) AS deployments

				INNER JOIN deploy_bot ON (
					deploy_bot.name = deployments.name AND
					deploy_bot.date_added = deployments.date_added AND
					deploy_bot.json_id = deployments.json_id
				)

				INNER JOIN json ON (
					deploy_bot.json_id = json.json_id
				)
			""",
			wait=True
		)
		changed = False
		for row in requests:
			name = row["name"]
			action = row["action"]
			date_added = row["date_added"]
			auth_address = row["auth_address"]
			cert_user_id = row["cert_user_id"]

			row_id = name + "/" + auth_address + "/" + str(date_added)
			# Check that we haven't deployed this bot yet
			if row_id in handled_deploys:
				continue
			if action == "deploy":
				# Deploy a new bot, check that it's not latest version yet
				metadata = getBotMetadata(name)
				if metadata and metadata["deploy"]["bot_revision"] >= date_added:
					# Already deployed
					handled_deploys.add(row_id)
					continue
				# Check that the bot code exists and load it
				code = getUserBotCode(name, auth_address)
				if not code:
					# Bot doesn't exist
					print(f"[zIRC] {name}@{auth_address} code doesn't exist, will check on the next iteration")
					return
				# Deploy the bot
				res = deployBot(name, code, metadata={
					"name": name,
					"deploy": {
						"bot_revision": date_added,
						"date": int(datetime.datetime.now().timestamp() * 1000),
						"deployer": DEPLOYER
					},
					"author": {
						"auth_address": auth_address,
						"cert_user_id": cert_user_id or auth_address
					}
				})
				if res == "ok":
					print(f"[zIRC] Deployed bot {name}@{auth_address} as {name}")
					handled_deploys.add(row_id)
					changed = True
					continue
				else:
					print(f"[zIRC] Error while deploying {name}@{auth_address}: {res}")

		if changed:
			# Makes sense to sign & publish
			ZeroFrame.sitePublish(
				privatekey=DEPLOY_PRIVATEKEY,
				inner_path="data/bots/content.json"
			)


		# Sleep for a minute
		Util.sleep(60)


def getBotMetadata(name):
	name = name[1:]
	res = ZeroFrame.fileGet(f"data/bots/{name}.js", wait=True)
	if not res:
		# The bot doesn't exist yet
		return None
	metadata = res.split("/* Metadata:")[1].split("End of metadata */")[0]
	return json.loads(metadata)

def getUserBotCode(name, auth_address):
	name = name[1:]
	res = ZeroFrame.fileGet(
		inner_path=f"data/users/{auth_address}/bots/{name}.js",
		required=False,
		timeout=3,
		wait=True
	)
	if not res:
		# The bot doesn't exist yet
		return None
	return res

def deployBot(name, code, metadata):
	metadata = json.dumps(metadata, indent="\t")
	code = f"/* Metadata:\n{metadata}\nEnd of metadata */\n{code}"

	name = name[1:]
	return ZeroFrame.fileWrite(
		f"data/bots/{name}.js",
		base64.b64encode(code.encode("utf8")).decode("utf8"),
		True,
		wait=True
	)


init()