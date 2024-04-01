const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const connection = require("../../../db.js");



/* fonctionnement commande mine :
    minage en fonction de la pioche, plus la pioche est haute, plus elle a des enchantements plus elle raporte.

    tables utile pour cette commande:

    Schéma de la table "utilisateurs":
    +--------------+--------------+------+-----+-------------------+----------------+
    | Field        | Type         | Null | Key | Default           | Extra          |
    +--------------+--------------+------+-----+-------------------+----------------+
    | id           | INT          | NO   | PRI | NULL              | auto_increment |
    | id_pioche    | INT          | NO   |     | NULL              |                |
    | argent       | VARCHAR(100) | NO   |     | NULL              |                |
    | experience   | VARCHAR(100) | NO   |     | NULL              |                |
    | ...          | TIMESTAMP    | NO   |     | CURRENT_TIMESTAMP |                |
    +--------------+--------------+------+-----+-------------------+----------------+


    Schéma de la table "Pioches":
    +--------------+--------------+------+-----+-------------------+----------------+
    | Field        | Type         | Null | Key | Default           | Extra          |
    +--------------+--------------+------+-----+-------------------+----------------+
    | id           | INT          | NO   | PRI | NULL              | auto_increment |
    | name         | VARCHAR(100) | NO   |     | NULL              |                |
    | durability   | INT          | NO   |     | NULL              |                |
    | price        | INT          | NO   |     | NULL              |                |
    +--------------+--------------+------+-----+-------------------+----------------+


    Schéma de la table "Enchantements":
    +--------------+--------------+------+-----+-------------------+----------------+
    | Field        | Type         | Null | Key | Default           | Extra          |
    +--------------+--------------+------+-----+-------------------+----------------+
    | id           | INT          | NO   | PRI | NULL              | auto_increment |
    | name         | VARCHAR(100) | NO   |     | NULL              |                |    
    | tier         | INT          | NO   |     | NULL              |                |
    | price        | INT          | NO   |     | NULL              |                |
    +--------------+--------------+------+-----+-------------------+----------------+

    Schéma exemple de la table :

    +----+-------------+------+-------+
    | id | name        | tier | price |
    +----+-------------+------+-------+
    | 0  | Efficiency  | 1    | 10    |
    | 1  | Efficiency  | 2    | 15    |
    | 2  | Efficiency  | 3    | 20    |
    | 3  | Efficiency  | 4    | 25    |
    | 4  | Efficiency  | 5    | 30    |
    | 5  | Fortune     | 1    | 10    | -> * 0.25 -0.50
    | 6  | Fortune     | 2    | 15    | -> * 0.50 - 1
    | 7  | Fortune     | 3    | 20    | -> * 1 - 2
    | 8  | Solidité    | 1    | 10    |
    | 9  | Solidité    | 2    | 15    |
    | 10 | Solidité    | 3    | 20    |
    +----+-------------+------+-------+






    Schéma de la table "inventaire_mineraix":
    +--------------+--------------+------+-----+-------------------+----------------+
    | Field        | Type         | Null | Key | Default           | Extra          |
    +--------------+--------------+------+-----+-------------------+----------------+
    | id_user      | INT          | NO   | PRI | NULL              |                |
    | pierre       | VARCHAR(100) | NO   |     | NULL              |                |    
    | charbon      | VARCHAR(100) | NO   |     | NULL              |                |
    | cuivre       | VARCHAR(100) | NO   |     | NULL              |                |
    | fer          | VARCHAR(100) | NO   |     | NULL              |                |    
    | Lapis-lazuli | VARCHAR(100) | NO   |     | NULL              |                |
    | or           | VARCHAR(100) | NO   |     | NULL              |                |
    | redstone     | VARCHAR(100) | NO   |     | NULL              |                |
    | diamant      | VARCHAR(100) | NO   |     | NULL              |                |
    | emeraude     | VARCHAR(100) | NO   |     | NULL              |                |
    +--------------+--------------+------+-----+-------------------+----------------+

    Schéma de la table "inventaire_pioches":
    +--------------+--------------+------+-----+-------------------+----------------+
    | Field        | Type         | Null | Key | Default           | Extra          |
    +--------------+--------------+------+-----+-------------------+----------------+
    | id_user      | INT          | NO   | PRI | NULL              |                |
    | pioches      | VARCHAR(100) | NO   |     | NULL              |                |    ->    [id_pioche1, id_pioche2, id_pioche3, ...]
    | dura         | INT          | NO   |     | NULL              |                |
    | enchantements| VARCHAR(100) | NO   |     | NULL              |                |    ->    [[id_enchant1, id_enchant2], [id_enchant5, id_enchant1], [...]]   ->   tableau avec dedans un tableau par pioche   ->    [[echant_pioche1],[echant_pioche2],[...] ]
    +--------------+--------------+------+-----+-------------------+----------------+
    
*/


module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Minez !'),
    async execute(interaction) {

        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min;
        }

        function getRandomArbitrary(min, max) {
            return Math.random() * (max - min) + min;
        }

        function chiffreAleatoirePondere(chiffres, coefficients) {
            if (chiffres.length !== coefficients.length) {
                throw new Error("Les listes de chiffres et de coefficients doivent avoir la même longueur.");
            }

            const totalCoefficient = coefficients.reduce((acc, curr) => acc + curr, 0);
            const randomNumber = Math.random() * totalCoefficient;

            let cumulativeProbability = 0;
            for (let i = 0; i < chiffres.length; i++) {
                cumulativeProbability += coefficients[i];
                if (randomNumber < cumulativeProbability) {
                    return chiffres[i];
                }
            }

            // Au cas où il y aurait une petite erreur d'arrondi
            return chiffres[chiffres.length - 1];
        }

        async function Mine() {

            //recuperer les données de l'user
            await connection.query(`SELECT * FROM utilisateurs WHERE id = '${interaction.user.id}'`, (err, user_data) => {

                //recuperer les données des pioches de l'user
                connection.query(`SELECT * FROM inventaire_pioches WHERE id_user = '${interaction.user.id}' `, (err, picks_user_data) => {
                    const pick_id = user_data[0].id_pioche

                    //si la dura de la pioche est strictement superieur à 0 alors continuer
                    if (JSON.parse(picks_user_data[0].dura)[pick_id] > 0) {

                        //Cette fonction est celle qui mine les ressources, elle peut être appeler une ou plusieurs fois en fonction des enchantements
                        function minage() {

                            //Variable représentant tous les mineraix, elle sera modifié pour ajouter les mineraix
                            let pierre;
                            let charbon;
                            let cuivre;
                            let fer;
                            let lapis;
                            let or;
                            let redstone;
                            let diamant;
                            let emeraude;
                            let xp = getRandomInt(9, 50);


                            switch (pick_id) {
                                case 0: // pioche en bois
                                    pierre = getRandomInt(7, 30);
                                    charbon = getRandomInt(4, 27);
                                    cuivre = 0;
                                    fer = 0;
                                    lapis = 0;
                                    or = 0;
                                    redstone = 0;
                                    diamant = 0;
                                    emeraude = 0;
                                    break;

                                case 1: // pioche en pierre
                                    pierre = getRandomInt(10, 42);
                                    charbon = getRandomInt(8, 35);
                                    cuivre = getRandomInt(7, 26);
                                    fer = getRandomInt(3, 15);
                                    lapis = 0;
                                    or = 0;
                                    redstone = 0;
                                    diamant = 0;
                                    emeraude = 0;
                                    break;

                                case 2: //pioche en fer
                                    pierre = getRandomInt(20, 60);
                                    charbon = getRandomInt(14, 52);
                                    cuivre = getRandomInt(13, 42);
                                    fer = getRandomInt(9, 20);
                                    lapis = getRandomInt(9, 15);
                                    or = getRandomInt(5, 14);
                                    redstone = getRandomInt(10, 21);
                                    diamant = getRandomInt(1, 9);
                                    emeraude = getRandomInt(1, 3);
                                    break;

                                case 3: //pioche en or
                                    pierre = getRandomInt(30, 80);
                                    charbon = getRandomInt(23, 70);
                                    cuivre = getRandomInt(22, 61);
                                    fer = getRandomInt(15, 37);
                                    lapis = getRandomInt(14, 21);
                                    or = getRandomInt(10, 20);
                                    redstone = getRandomInt(15, 29);
                                    diamant = getRandomInt(3, 13);
                                    emeraude = getRandomInt(2, 7);
                                    break;

                                case 4: //pioche en diamant
                                    pierre = getRandomInt(40, 100);
                                    charbon = getRandomInt(32, 89);
                                    cuivre = getRandomInt(31, 80);
                                    fer = getRandomInt(27, 48);
                                    lapis = getRandomInt(23, 36);
                                    or = getRandomInt(17, 29);
                                    redstone = getRandomInt(24, 38);
                                    diamant = getRandomInt(5, 21);
                                    emeraude = getRandomInt(4, 14);
                                    break;
                            }
                            //getRandomArbitrary(0.25, 0.50)

                            //application de l'enchantement fortune

                            let ressources = [pierre, charbon, cuivre, fer, lapis, or, redstone, diamant, emeraude, xp]

                            switch (JSON.parse(picks_user_data[0].enchantements)[pick_id][1]) {
                                case null:
                                    break;
                                case 5:
                                    for (let i = 0; i < ressources.length; i++) {
                                        if (typeof ressources[i] === 'number') {
                                            ressources[i] = Math.round((ressources[i] * getRandomArbitrary(0.25, 0.50)) + ressources[i])
                                        }
                                    }
                                    break;
                                case 6:
                                    for (let i = 0; i < ressources.length; i++) {
                                        if (typeof ressources[i] === 'number') {
                                            ressources[i] = Math.round((ressources[i] * getRandomArbitrary(0.50, 1)) + ressources[i])
                                        }
                                    }
                                    break;
                                case 7:
                                    for (let i = 0; i < ressources.length; i++) {
                                        if (typeof ressources[i] === 'number') {
                                            ressources[i] = Math.round((ressources[i] * getRandomArbitrary(1, 2)) + ressources[i])
                                        }
                                    }
                                    break;
                            }


                            pierre = ressources[0];
                            charbon = ressources[1];
                            cuivre = ressources[2];
                            fer = ressources[3];
                            lapis = ressources[4];
                            or = ressources[5];
                            redstone = ressources[6];
                            diamant = ressources[7];
                            emeraude = ressources[8];
                            xp = ressources[9];

                            return [pierre, charbon, cuivre, fer, lapis, or, redstone, diamant, emeraude, xp]
                        }

                        //application de l'enchantement efficiency
                        let tour;

                        switch (JSON.parse(picks_user_data[0].enchantements)[pick_id][0]) {
                            case null:
                                tour = 1;
                                break;
                            case 0:
                                tour = chiffreAleatoirePondere([1, 2], [75, 25]);
                                break;
                            case 1:
                                tour = chiffreAleatoirePondere([1, 2, 3], [65, 25, 10]);
                                break;
                            case 2:
                                tour = chiffreAleatoirePondere([1, 2, 3], [55, 30, 15]);
                                break;
                            case 3:
                                tour = chiffreAleatoirePondere([1, 2, 3, 4], [40, 35, 20, 5]);
                                break;
                            case 4:
                                tour = chiffreAleatoirePondere([1, 2, 3, 4, 5], [20, 35, 25, 15, 5]);
                                break;
                        }

                        //addition des ressources en fonction du nombre de tour(s)
                        let final_ressources;

                        for (let i = 0; i < tour; i++) {
                            temp_ressources = minage()
                            console.log("tour " + i)
                            if (i == 0) {
                                final_ressources = temp_ressources
                            } else {
                                for (let i = 0; i < temp_ressources.length; i++) {
                                    if (typeof temp_ressources[i] === 'number') {
                                        final_ressources[i] += temp_ressources[i]
                                    }
                                }
                            }
                        }
                        
                        //modification de la base de donnée

                        let dura = JSON.parse(picks_user_data[0].dura);
                        dura[pick_id] = dura[pick_id]-tour
                        

                        //on enlève de la dura a la pioche en fonction du nombre de tour
                        connection.query(`UPDATE inventaire_pioches SET dura = '${JSON.stringify(dura)}' WHERE id_user = '${interaction.user.id}'`, (err) => {
                            if (err) {console.log(err)}
                        })

                        connection.query(`SELECT * FROM inventaire_mineraix WHERE id_user = '${interaction.user.id}'`, (err, inventaire_user) =>{

                            final_ressources[0] = final_ressources[0] + inventaire_user[0].pierre
                            final_ressources[1] = final_ressources[1] + inventaire_user[0].charbon
                            final_ressources[2] = final_ressources[2] + inventaire_user[0].cuivre
                            final_ressources[3] = final_ressources[3] + inventaire_user[0].fer
                            final_ressources[4] = final_ressources[4] + inventaire_user[0].lapis
                            final_ressources[5] = final_ressources[5] + inventaire_user[0].gold
                            final_ressources[6] = final_ressources[6] + inventaire_user[0].redstone
                            final_ressources[7] = final_ressources[7] + inventaire_user[0].diamant
                            final_ressources[8] = final_ressources[8] + inventaire_user[0].emeraude


                            connection.query(`UPDATE inventaire_mineraix SET pierre='${final_ressources[0]}',charbon='${final_ressources[1]}',cuivre='${final_ressources[2]}',fer='${final_ressources[3]}',lapis='${final_ressources[4]}',gold='${final_ressources[5]}',redstone='${final_ressources[6]}',diamant='${final_ressources[7]}',emeraude='${final_ressources[8]}' WHERE id_user = '${interaction.user.id}'`, (err) => {
                                if (err) {console.log(err)}
                            })
                        })


                        connection.query(`UPDATE utilisateurs SET experience='${user_data[0].experience + final_ressources[9]}'`, (err) => {
                            if (err) {console.log(err)}
                        })

                        // réponse sur discord avec le bot
                        







                    } else {
                        return interaction.reply("Votre pioche n'a plus de durabilité dura")
                    }
                })
            });

        }

        connection.query(`SELECT * FROM utilisateurs WHERE id = '${interaction.user.id}'`, async (err, rows) => {
            if (!rows[0]) {
                await connection.query(`INSERT INTO utilisateurs (id, id_pioche, argent, experience) VALUES ('${interaction.user.id}','0','0','0')`, (err, rows) => { if (err) console.log(err) });
                await connection.query(`INSERT INTO inventaire_mineraix (id_user) VALUES ('${interaction.user.id}')`, (err, rows) => { if (err) console.log(err) });
                await connection.query(`INSERT INTO inventaire_pioches (id_user, pioches, dura, enchantements) VALUES ('${interaction.user.id}', '[0]', '[59]', '[[]]')`, (err, rows) => { if (err) console.log(err) });

                if (err) console.log(err)

                Mine()
            } else {
                Mine()
            }

        });




    },
};


