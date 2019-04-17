import Bot from "libs/irc/object/bot";
import UserStorage from "libs/irc/userstorage";
import {zeroPage, zeroFS} from "zero";

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const SLASH_COMMANDS = [
	[
		{text: "/help"},
		{text: "/storage"},
		{text: "/notifications"}
	]
];

export default class HelloBot extends Bot {
	constructor() {
		super("/HelloBot", "1chat4ahuD4atjYby2JA9T9xZWdTY4W4D");
		this.state = "start";
		this.showHelloMessage = true;

		this.on("start", this.onStart);
		this.on("received", this.onReceived);
		this.on("tabOpened", this.onTabOpened);
	}

	async onStart() {
		// Let's check whether there's a storage we haven't setup yet
		const mergedSites = await zeroPage.cmd("mergerSiteList", [true]);
		for(const address of Object.keys(mergedSites)) {
			const content = mergedSites[address].content;
			if(content && content.permanent_storage && !content.setup) {
				// Yay, we've found an unset hub!
				this.send(
					`
						Okay, so you've just made a permanent storage! It has
						address "${address}", but you don't have to remember
						that. Just know that nothing will be lost now! When
						you're ready to start using IRC, tell me.
					`,
					[
						[
							{text: "Ok, I'm ready"}
						]
					],
				);
				this.state = "tour";
				this.showHelloMessage = false; // Get rid of "Hello" message

				let content = await zeroFS.readFile(`merged-IRC/${address}/content.json`);
				content = JSON.parse(content);
				content.setup = true;
				content = JSON.stringify(content, null, 1);
				await zeroFS.writeFile(`merged-IRC/${address}/content.json`, content);

				return;
			}
		}
	}

	async onReceived(message) {
		// First, handle commands
		if(message.text === "/help") {
			await sleep(1000);

			this.send(`
				Help: /storage -- create a new permanent storage; /notifications
				-- enable or disable push notifications
			`);
			return;
		} else if(message.text === "/storage") {
			await sleep(1000);

			this.send(`
				You'll see a message inviting to clone a site, please do it! ^_^
			`);
			this.state = "clone";

			await sleep(1000);

			const siteInfo = await zeroPage.getSiteInfo();
			zeroPage.cmd("siteClone", [siteInfo.address, "storage"]);
			return;
		} else if(message.text === "/notifications") {
			await sleep(1000);

			const storage = await UserStorage.get();
			const notificationsEnabled = storage.notificationsEnabled;

			this.send(
				`
					Do you want to enable or to disable push notifications?
					(they are currently
					${notificationsEnabled ? "enabled" : "disabled"})
				`,
				[
					[
						{text: "Enable", color: "green"},
						{text: "Disable", color: "red"},
						{text: "Nothing"}
					]
				]
			);

			this.state = "notifications";
			return;
		}

		if(this.state === "start") {
			await sleep(1000);

			this.send(`
				First, let me briefly explain what's going on. ZeroNet has a
				plugin called "PeerMessage". Unfortunately, it's not included to
				the standard package. It will let you send and receive messages
				very fast. If you don't have the plugin, you'll still be able to
				receive and send messages, but with 30-second limit. So, if you
				need fast communication, we recommend you to install the plugin
				at: [https://github.com/HelloZeroNet/Plugin-PeerMessage] .
			`);
			this.state = "plugin";

			await sleep(5000);

			this.send(`
				Aah, yet another thing. On our IRC, you can log in as
				"Anonymous". You may find this feature useful -- but! You'll
				only be able to use "Anonymous" if you use PeerMessage plugin,
				and others will only be able to read "Anonymous" messages if
				they have PeerMessage plugin.
			`);
			this.state = "anonymous";

			await sleep(1000);

			this.send(
				`
					After that, please login (if you want to) by clicking the
					[Change] button ^^ and tell me when you're ready.
				`,
				[
					[
						{text: "I'm done"}
					]
				]
			);
			this.state = "login";
		} else if(this.state === "login") {
			await sleep(1000);

			this.send(
				`
					Nice! Now another question: would you like to save the
					messages you receive and send to a permanent storage? This
					means that Anonymous messages will be saved (not deleted, as
					usual), and if someone deletes his message, you'll still
					have it. Please answer "yes"/"no", whether you want to set
					up a permanent storage.
				`,
				[
					[
						{text: "Yes", color: "green"},
						{text: "No", color: "red"}
					]
				]
			);
			this.state = "storage";
		} else if(this.state === "storage") {
			if(message.text.toLowerCase() === "yes") {
				await sleep(1000);

				this.send(`
					Niiice! So, you'll see a message inviting to clone a site,
					please do it! ^_^
				`);
				this.state = "clone";

				await sleep(1000);

				const siteInfo = await zeroPage.getSiteInfo();
				zeroPage.cmd("siteClone", [siteInfo.address, "storage"]);
			} else if(message.text.toLowerCase() === "no") {
				await sleep(1000);

				this.send(
					`
						Oh. Okaay, you can always setup the permanent storage
						any time later by accessing me (reminder: press "+",
						then "/HelloBot" ^_^) and pressing "/storage" button.
						When you're ready to start using IRC, tell me.
					`,
					[
						[
							{text: "I'm ready!!"}
						]
					]
				);
				this.state = "tour";
			} else {
				await sleep(1000);

				this.send(`Please answer "yes" or "no".`);
			}
		} else if(this.state === "tour") {
			await sleep(1000);

			this.send(`
				Okay. Now, look at the sidebar at the left << Right now, you
				only see /HelloBot (that's me!!) here. Let's start our tour by
				opening #lobby. Press the + at the bottom-left corner and type
				in "#lobby". Now, enjoy using the IRC! ^_^
			`);
			await sleep(1000);

			this.send(
				`
					By the way, I have some interesting features you might
					want to learn about. Press "/help" button if you want to
					learn about them!
				`,
				SLASH_COMMANDS
			);

			this.state = "done";
		} else if(this.state === "notifications") {
			this.state = "done";

			if(message.text.toLowerCase() === "enable") {
				this.send("Ok, I'm enabling notifications!");

				await zeroPage.cmd("wrapperPermissionAdd", ["PushNotifications"]);

				const storage = await UserStorage.get();
				storage.notificationsEnabled = true;
				await UserStorage.set(storage);

				this.send(`
					Done. You will now get a notification when someone sends a
					message.
				`);
			} else if(message.text.toLowerCase() === "disable") {
				this.send("Ok, I'm disabling notifications :(");

				const storage = await UserStorage.get();
				storage.notificationsEnabled = false;
				await UserStorage.set(storage);

				this.send("Done.");
			}
		}
	}

	onTabOpened() {
		if(this.showHelloMessage) {
			this.send(
				`
					Hi, I'm /HelloBot! I'll help you start using our IRC.
					Please, tell me something or press the button below! ^_^
				`,
				[
					[
						{text: "Continue!!", color: "green"}
					]
				].concat(SLASH_COMMANDS)
			);
		}
	}
}