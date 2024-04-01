const { PermissionsBitField, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events } = require('discord.js');
const connection = require("./../db.js");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        //if (!interaction.isChatInputCommand()) return;

        if (interaction.customId == "openT") {
            let err1 = "Vous avez déjà un ticket, voici votre ticket : ";
            let err2 = "Le salon de votre ticket a été suprimé, le bot l'a donc suprimé de la base de donnée. Merci d'en ouvrir un autre";
            let close = "Fermer le ticket";
            let titre = "Ticket de ";
            let ticketdesc = `Voici votre ticket <@${interaction.user.id}>`;

            interaction.deferUpdate();
            connection.query(`SELECT * FROM ticket WHERE guild_id = ${interaction.guild.id} AND user_id = ${interaction.user.id}`, async (err, rows) => {
                if (!rows.length) {
                    connection.query(`SELECT * FROM server WHERE id = ${interaction.guild.id}`, async (err, req) => {
                        const Cat = req[0].Tcat;
                        const parent = interaction.client.channels.cache.get(Cat);

                        let Nbrticket = req[0].Ttotaux;
                        typeof Nbrticket;
                        NBRticket = Number(Nbrticket) + 1;
                        connection.query(`UPDATE server SET Ttotaux = '${NBRticket}' WHERE id = ${interaction.guild.id}`, (err) => { if (err) console.log(err) });

                        interaction.guild.channels.create({
                            name: `Tickets #${NBRticket}`,
                            type: ChannelType.GuildText,
                            parent,
                            permissionOverwrites: [
                                { id: interaction.guild.id, deny: PermissionsBitField.Flags.ViewChannel },
                                { id: interaction.user.id, allow: PermissionsBitField.Flags.ViewChannel },
                            ]
                        }).then(channel => {

                            const ticketO = new ButtonBuilder()
                                .setCustomId('closeT')
                                .setLabel(close)
                                .setStyle(ButtonStyle.Danger);

                            const row = new ActionRowBuilder()
                                .addComponents(ticketO);

                            const ticket = new EmbedBuilder()
                                .setColor("00BFFF")
                                .setTitle(titre + interaction.user.username)
                                .setDescription(ticketdesc)
                                .setTimestamp()
                                .setFooter({ text: 'Jalion 0.1', iconURL: 'https://cdn.discordapp.com/emojis/825043302582845510.png?v=1' });

                            channel.send({ embeds: [ticket], components: [row] }).then(message => {
                                connection.query(`INSERT INTO ticket (guild_id, user_id, channel_id, interaction_id) VALUES ('${interaction.guild.id}', '${interaction.user.id}', '${channel.id}', '${message.id}')`);

                                const bot = new ButtonBuilder()
                                    .setCustomId('bot')
                                    .setLabel("Bot Discord")
                                    .setStyle(ButtonStyle.Primary);

                                const site = new ButtonBuilder()
                                    .setCustomId('site')
                                    .setLabel("Site Web")
                                    .setStyle(ButtonStyle.Primary);

                                const launcher_mc = new ButtonBuilder()
                                    .setCustomId('launcher_mc')
                                    .setLabel("Launcher Minecraft")
                                    .setStyle(ButtonStyle.Primary);

                                const application_web = new ButtonBuilder()
                                    .setCustomId('application_web')
                                    .setLabel("Application Web")
                                    .setStyle(ButtonStyle.Primary);

                                const autre = new ButtonBuilder()
                                    .setCustomId('autre')
                                    .setLabel("Autre")
                                    .setStyle(ButtonStyle.Primary)

                                const row = new ActionRowBuilder()
                                    .addComponents(bot, site, launcher_mc, application_web, autre);

                                channel.send({ content: "Bonjour/Bonsoir, afin d'optimiser le traitement des tickets et de faciliter le travail du développeur, je vais vous poser une série de questions. \n \n Pour cerner au mieux votre sujet, sélectionnez le bouton qui correspond.", components: [row] })

                            });
                        });
                    });
                } else {
                    connection.query(`SELECT * FROM ticket WHERE guild_id = ${interaction.guild.id} AND user_id = ${interaction.user.id}`, async (err, req) => {
                        const channel = interaction.client.channels.cache.get(req[0].channel_id)
                        if (channel == undefined) {
                            const ticketerr = new EmbedBuilder()
                                .setColor("00BFFF")
                                .setTitle("Ticket")
                                .setDescription(err2)
                                .setTimestamp()
                                .setFooter({ text: 'Jalion 0.1', iconURL: 'https://cdn.discordapp.com/emojis/825043302582845510.png?v=1' });

                            connection.query(`DELETE FROM ticket WHERE guild_id = ${interaction.guild.id} AND user_id = ${interaction.user.id}`);
                            interaction.user.send({ embeds: [ticketerr] });
                        } else {
                            const ticketerr = new EmbedBuilder()
                                .setColor("00BFFF")
                                .setTitle("Ticket")
                                .setDescription(err1 + `<#${req[0].channel_id}>`)
                                .setTimestamp()
                                .setFooter({ text: 'Jalion 0.1', iconURL: 'https://cdn.discordapp.com/emojis/825043302582845510.png?v=1' });

                            interaction.user.send({ embeds: [ticketerr] });
                        }
                    });
                }
            })
        }
        if (interaction.customId == "closeT") {
            connection.query(`DELETE FROM ticket WHERE guild_id = ${interaction.guild.id} AND user_id = ${interaction.user.id}`, async (err, rows) => { })
            interaction.channel.delete();
        }

        //=========Type of Tikets =========//
        //bot
        //site
        //launcher_mc
        //application_web
        //autre

        switch (interaction.customId) {
            case "bot":

                break;
            case "site":

                break;
            case "launcher_mc":

                break;
            case "application_web":

                break;
            case "autre":
                const autre = new ButtonBuilder()
                .setCustomId('autre')
                .setLabel("Autre")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)

                const row = new ActionRowBuilder()
                    .addComponents(autre);

                interaction.message.edit({components : [row]})
                interaction.channel.send({content : 'Dû au fait que vous avez sélectionné le bouton "Autre", je ne poserai pas de questions supplémentaires. Un membre de notre équipe vous répondra sous peu.'})
                interaction.channel.setName("Autre - " + interaction.user.username)
                interaction.deferUpdate()
                break;
        }

    },
};