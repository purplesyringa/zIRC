import {zeroPage, zeroFS, zeroDB} from "zero"


export function isValidName(name) {
	return name[0] === "/" && /^[A-Za-z0-9]+$/.test(name.substr(1));
}


export async function getBotMetadata(name) {
	const data = await zeroFS.readFile(`data/bots/${name.substr(1)}.js`);

	let metadata = data.split("/* Metadata:")[1];
	metadata = metadata.split("End of metadata */")[0];
	metadata = JSON.parse(metadata);

	return metadata;
}

export async function getDeployedBotList() {
	return (await zeroFS.readDirectory("data/bots"))
		.filter(file => file.endsWith(".js"))
		.map(file => "/" + file.replace(/\.js$/, "").toLowerCase());
}
export async function getUserBotList(authAddress) {
	return (await zeroFS.readDirectory(`data/users/${authAddress}/bots`))
		.filter(file => file.endsWith(".js"))
		.map(file => "/" + file.replace(/\.js$/, "").toLowerCase());
}

export async function createBot(name) {
	const siteInfo = await zeroPage.getSiteInfo();
	const authAddress = siteInfo.auth_address;

	const path = `data/users/${authAddress}/bots/${name.substr(1)}.js`;
	let botContent = await zeroFS.readFile("DefaultBot.js");
	botContent = botContent.replace(/{{BotName}}/g, name.substr(1));
	await zeroFS.writeFile(path, botContent);
}

export async function renameBot(from, to) {
	const siteInfo = await zeroPage.getSiteInfo();
	const authAddress = siteInfo.auth_address;

	from = from.substr(1);
	to = to.substr(1);

	const fromPath = `data/users/${authAddress}/bots/${from}.js`;
	const toPath = `data/users/${authAddress}/bots/${to}.js`;

	let botContent = await zeroFS.readFile(fromPath);
	// Fix self.OldName -> self.NewName
	botContent = botContent.replace(`self.${from}`, `self.${to}`);

	await zeroFS.writeFile(toPath, botContent);
	await zeroFS.deleteFile(fromPath);
}

export async function deleteBot(name) {
	const siteInfo = await zeroPage.getSiteInfo();
	const authAddress = siteInfo.auth_address;

	const path = `data/users/${authAddress}/bots/${name.substr(1)}.js`;
	await zeroFS.deleteFile(path);
}


export async function deployBot(name) {
	const siteInfo = await zeroPage.getSiteInfo();
	const authAddress = siteInfo.auth_address;

	await zeroDB.insertRow(
		`data/users/${authAddress}/control.json`,
		`data/users/${authAddress}/content.json`,
		"deploy_bot",
		{
			name,
			action: "deploy",
			date_added: Date.now()
		}
	);
}

export async function undeployBot(name) {
	const siteInfo = await zeroPage.getSiteInfo();
	const authAddress = siteInfo.auth_address;

	await zeroDB.insertRow(
		`data/users/${authAddress}/control.json`,
		`data/users/${authAddress}/content.json`,
		"deploy_bot",
		{
			name,
			action: "undeploy",
			date_added: Date.now()
		}
	);
}