const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits  } = require('discord.js');
const connection = require("./../db.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Entrez votre anniversaire')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {

    let DescTicket = "Pour ouvrir un ticket cliquez sur le bouton \n \n💳 Payement : Paypal de préférence. N'oubliez pas de voir le <#1092189587910172734> \n🛒 Vous souhaitez commander ? Ouvrez un ticket et décrivez-nous vos besoins, votre budget et vos délais. Vous recevrez un devis personnalisé sous 48h. \n⛔ Toute demande qui n'est pas autorisée se vera refusé (exemple : Virus, tokebgrab etc) ";

    interaction.guild.channels.create({
      name: "commands",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: PermissionsBitField.Flags.ViewChannel },
        { id: interaction.user.id, allow: PermissionsBitField.Flags.ViewChannel },
      ]
    }).then(parent => {
      interaction.guild.channels.create({
        name: "ticket",
        type: ChannelType.GuildText,
        parent,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: PermissionsBitField.Flags.ViewChannel },
          { id: interaction.user.id, allow: PermissionsBitField.Flags.ViewChannel },
        ]
      }).then(channel => {
        connection.query(`UPDATE server SET Tcat = '${parent.id}' WHERE id = ${interaction.guild.id}`, (err) => { if (err) console.log(err) });
        connection.query(`UPDATE server SET Tchannel = '${channel.id}' WHERE id = ${interaction.guild.id}`, (err) => { if (err) console.log(err) });
        connection.query(`UPDATE server SET Ttotaux = '0' WHERE id = ${interaction.guild.id}`, (err) => { if (err) console.log(err) });

        const ticketO = new ButtonBuilder()
          .setCustomId('openT')
          .setLabel('Ouvrir un ticket')
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
          .addComponents(ticketO);

        const ticket = new EmbedBuilder()
          .setColor("00BFFF")
          .setTitle("Ticket")
          .setDescription(DescTicket)
          .setTimestamp()

        channel.send({ embeds: [ticket], components: [row] }).then(ticketMessage => {
          connection.query(`UPDATE config_serveur SET ticket = '${ticketMessage.id}' WHERE guild_id = ${interaction.guild.id}`, (err) => { if (err) console.log(err) });
        });
      });
    });
  },
};