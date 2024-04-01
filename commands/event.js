const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

//=========BDD SCHEMA=========//
//name : name of the event
//condi : condition for have reward
//reward : reward of the event
//date : date of end
//stats : statistique of the event


module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription("Lancer un event")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('Nom de l\event')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('condi')
                .setDescription('Condition de l\event')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reward')
                .setDescription('Récompense de l\event')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('date')
                .setDescription('Date de fin de l\event')
                .setRequired(true)),
    async execute(interaction) {
        try {
            connection.query(`INSERT INTO event (name, condi, reward, date, stats, status) VALUES ('${interaction.options.getString('name')}', '${interaction.options.getString('condi')}', '${interaction.options.getString('reward')}', '${interaction.options.getString('date')}', '0', 'True')`);
            interaction.reply("Votre event a été créer")
        } catch (error) {

        }
    },
};