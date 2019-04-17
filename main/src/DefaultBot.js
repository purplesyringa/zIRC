self.{{BotName}} = {
	onStart() {
		// This method is executed at the moment when a user opens zIRC. Do some
		// initialization here. Sending a message inside onStart() is *not*
		// recommended.
		// Example:
		this.state = "started";
	},

	onTabOpened: function() {
		// This method is the same as onStart(), but it will only be executed
		// when the user opens your bot's tab. Print a hello message here, e.g.:
		this.send("Hello! Welcome to /{{BotName}}!");
	},
	onReceived: function(message) {
		// This method is called when the users sends you a new message.
		// <message> object is defined as the following:
		// {
		//     text: "<the message>",
		//     date: 1234567890 (timestamp),
		//     id: "abcdefg" (unique message id)
		// }
		// To send a message, use <this.send(message, buttons=null)>
		// <buttons> is an 2D-table of buttons that will appear below your
		// message. Each button is defined as:
		// {
		//     text: "/help",
		//     color: "red" // red/green/cyan/blue/yellow/orange/purple
		//                  // (optional)
		// }
		// Communicate with the user here, e.g.:

		if(message.text == "/help") {
			this.send(
				"Here are the commands that you can use:",
				[
					[{text: "/help"}],
					[
						{text: "/disable", color: "red"},
						{text: "/enable", color: "green"}
					]
				]
			);
		} else {
			this.send(
				"Sorry, I didn't quite understand what you meant. Send /help " +
				"to get a list of commands that you can use."
			);
		}
	}
};