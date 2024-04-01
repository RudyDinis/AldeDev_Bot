const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('profil')
		.setDescription("Voir votre profil"),

	async execute(interaction) {
		try {

			connection.query(`SELECT * FROM user WHERE user_id = '${interaction.user.id}'`, (err, rows) => {
				const inviteEmbed = new EmbedBuilder()
					.setColor(0x0099FF)
					.setTitle('Ton profil')
					.setDescription(`Invitation : \n :star: | ${rows[0].invite_count} total \n` + `:white_check_mark: | ${Number(rows[0].invite_count) - Number(rows[0].invite_leave)} joins \n` + `:x: | ${rows[0].invite_leave} leave \n \nCrédit : \n crédit | ${rows[0].money} € \n réduction | ${rows[0].reduction} €` );

				interaction.reply({ embeds: [inviteEmbed] });
			});


		} catch (error) {
			
		}
	},
};