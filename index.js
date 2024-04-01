const { Client, GatewayIntentBits, REST, Events, Routes, Collection } = require('discord.js');
const { token, clientId } = require('./config.json');
const fs = require('fs');
const path = require('node:path');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const connection = require("./db.js");

client.commands = new Collection();
const commands = [];

const loadCommands = (dir) => {
    const commandFiles = fs.readdirSync(dir);
    
    for (const file of commandFiles) {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);
        
        if (stat.isDirectory()) {
            loadCommands(filePath); // Si le fichier est un répertoire, on appelle récursivement la fonction loadCommands
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
};

loadCommands(path.join(__dirname, 'commands'));

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();


client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});


// invites

const invites = new Collection();

const wait = require("timers/promises").setTimeout;

client.on("ready", async () => {
	await wait(1000);

	client.guilds.cache.forEach(async (guild) => {
		const firstInvites = await guild.invites.fetch();
		invites.set(guild.id, new Collection(firstInvites.map((invite) => [invite.code, invite.uses])));
	});
});

client.on("inviteDelete", (invite) => {
	// Delete the Invite from Cache
	invites.get(invite.guild.id).delete(invite.code);
});

client.on("inviteCreate", (invite) => {
	// Update cache on new invites
	invites.get(invite.guild.id).set(invite.code, invite.uses);
});

client.on("guildCreate", (guild) => {
	// We've been added to a new Guild. Let's fetch all the invites, and save it to our cache
	guild.invites.fetch().then(guildInvites => {
		// This is the same as the ready event
		invites.set(guild.id, new Map(guildInvites.map((invite) => [invite.code, invite.uses])));
	})
});

client.on("guildDelete", (guild) => {
	// We've been removed from a Guild. Let's delete all their invites
	invites.delete(guild.id);
});

client.on("guildMemberAdd", async (member) => {
	try {
		const newInvites = await member.guild.invites.fetch()
		const oldInvites = invites.get(member.guild.id);
		const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
		const inviter = await member.guild.members.fetch(invite.inviter.id);

		function AddInvite() {
			//add invite at inviter
			connection.query(`SELECT * FROM user WHERE user_id = '${invite.inviter.id}'`, (err, rows) => {
				if (!rows.length) {
					connection.query(`INSERT INTO user (user_id, inviter_id, money, invite_count, invite_leave, reduction) VALUES ('${invite.inviter.id}', '0', '0', '1', '0', '0')`);
				} else {
					connection.query(`UPDATE user SET invite_count = '${Number(rows[0]['invite_count']) + 1}'  WHERE user_id = '${invite.inviter.id}'`, (err) => { if (err) console.log(err) });
				}
			})

			//if event add reward at inviter
			connection.query(`SELECT * FROM event WHERE condi = 'invite' AND status = 'True'`, (err, rows) => {
				if (!rows.length) {

				} else {
					const reward = rows[0].reward;

					//stats
					connection.query(`UPDATE event SET stats = '${Number(rows[0].stats) + Number(reward)}'  WHERE name = '${rows[0].name}'`, (err) => { if (err) console.log(err) });

					connection.query(`SELECT * FROM user WHERE user_id = '${invite.inviter.id}'`, (err, rows) => {
						connection.query(`UPDATE user SET reduction = '${Number(rows[0]['reduction']) + Number(reward)}'  WHERE user_id = '${invite.inviter.id}'`, (err) => { if (err) console.log(err) });
					});
				}
			})

			//set inviter for new user
			connection.query(`SELECT * FROM user WHERE user_id = '${member.id}'`, (err, rows) => {
				if (!rows.length) {
					connection.query(`INSERT INTO user (user_id, inviter_id, money, invite_count, invite_leave, reduction) VALUES ('${member.id}', '${invite.inviter.id}', '0', '0', '0', '0')`);
				} else {

				}
			})

		}

		function nothing() {

		}


		inviter
			? AddInvite() //inviter = true
			: nothing(); // inviter = false
	} catch (error) {
		//console.log(error)
	}
});

client.on('guildMemberRemove', async (member) => {
	try {
		const newInvites = await member.guild.invites.fetch()
		const oldInvites = invites.get(member.guild.id);
		const invite = newInvites.find(i => i.uses > oldInvites.get(i.code));
		const inviter = await client.users.fetch(invite.inviter.id);

		function AddInvite() {
			connection.query(`SELECT * FROM user WHERE user_id = '${invite.inviter.id}'`, (err, rows) => {
				if (!rows.length) {
					connection.query(`INSERT INTO user (user_id, inviter_id, money, invite_count, invite_leave, reduction) VALUES ('${invite.inviter.id}', '0', '0', '0', '0', '0')`);
				} else {
					connection.query(`UPDATE user SET invite_leave = '${Number(rows[0]['invite_leave']) + 1}'  WHERE user_id = '${invite.inviter.id}'`, (err) => { if (err) console.log(err) });
				}
			})

		}

		function nothing() {

		}

		inviter
			? AddInvite()
			: nothing();
	} catch (error) {
		console.log(error)
	}
});

client.login(token);