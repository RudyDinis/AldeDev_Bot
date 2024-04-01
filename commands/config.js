const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Configurez votre bot'),

	async execute(interaction) {
		interaction.reply("Choisissez la commande a configurer")
	}, 
};