require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    MessageFlags, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    MediaGalleryBuilder,
    SeparatorBuilder,
    SectionBuilder, 
    SeparatorSpacingSize, 
    PermissionFlagsBits,
    AttachmentBuilder, 
    FileBuilder        
} = require('discord.js');
const SteamUser = require('steam-user');
const express = require('express');
const mongoose = require('mongoose');
const AdmZip = require('adm-zip'); 
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process'); 
const wait = require('node:timers/promises').setTimeout; 

// --- 1. CONFIGURACIÓN DEL SERVIDOR WEB PARA RENDER ---
const app = express();
app.get('/', (req, res) => res.send('The Denuvo bot is working perfectly! / ¡El bot funciona perfectamente!'));
app.listen(process.env.PORT || 3000, () => console.log('Web server started for Render.'));

// --- 2. CONFIGURACIÓN DEL BOT Y STEAM ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const steam = new SteamUser();

let isSteamConnected = false;
const BOT_OWNER_ID = process.env.OWNER_ID || "684122651660255359";

// --- MODELO DE MONGOOSE PARA LA BASE DE DATOS ---
const botMemorySchema = new mongoose.Schema({}, { strict: false, minimize: false });
const MemoryModel = mongoose.model('Botupdatesglobal', botMemorySchema);

// --- DICCIONARIO Y CONSTANTES ---
const CUSTOM_EMOJIS = {
    check: '✅',          
    calendario: '🗓️',      
    dinero: '💰',         
    generos: '🎭',        
    plataforma: '💻',    
    steam: '1465416289077035079',
    ig: '1516783878499471482'             
};

const SUGERENCIAS_JUEGOS = [
    { name: 'Forza Horizon 6 (2483190)', value: '2483190' },
    { name: '007 First Light (3768760)', value: '3768760' },
    { name: 'LEGO® Batman™ Legacy of the Dark Knight (2215200)', value: '2215200' },
    { name: 'Assassins Creed Shadows (3159330)', value: '3159330' },
    { name: 'Subnautica 2 (1962700)', value: '1962700' },
    { name: 'Grand Theft Auto V Enhanced (3240220)', value: '3240220' },
    { name: 'Call of Duty WWII (476600)', value: '476600' }
];

const i18n = {
    'es': {
        connecting: (appId) => `🔄 **[1/3]** Conectando con la base de datos de Frank17xx: \`${appId}\`...`,
        notFound: (appId) => `❌ No se encontró información en la base de datos para el AppID **${appId}**.`,
        dbError: `\n> *⚠️ No se pudieron obtener los archivos desde Frank17xx.*`,
        localized: `🔎 **[2/3]** ¡Datos obtenidos!`,
        compiling: (size) => `📦 **[3/3]** Empaquetando archivos. (Tamaño: \`${size} KB\`). Subiendo a Discord...`,
        descFallback: "Descripción no disponible en Steam.",
        free: "Gratis",
        ready: (id) => `✅ ¡Listo, <@${id}>! Aquí tienes tu archivo \`.zip\``,
        success: (name) => `✅ ¡Proceso terminado! Los archivos de **${name}** fueron extraídos con éxito.`,
        error: (id) => `⚠️ Hubo un error al procesar la solicitud, <@${id}>.\n> *🔍 Asegúrate de que el AppID sea correcto o intenta de nuevo en unos minutos.*`,
        wrongChannel: (id) => `❌ Solo puedes usar este comando en el canal <#${id}>.`,
        invalidFormat: '❌ Formato inválido. Por favor ingresa solo números o un enlace válido de Steam.',
        init: `⏳ Iniciando proceso...`,
        btnSteam: 'Tienda de Steam',
        btnSponsor: 'Ofertas Instant Gaming',
        release: 'Lanzamiento',
        price: 'Precio',
        genres: 'Géneros',
        platforms: 'Plataforma',
        completed: 'Completado', 
        denuvoNotice: '<a:warning:1515742880764006602> AVISO: Se ha detectado Denuvo Anti-tamper. El juego requiere configuración adicional para jugar sin conexión.',
        createdBy: 'Fuente:',
        requestedBy: 'Pedido por',
        setChannelSuccess: (id) => `✅ ¡Canal configurado! Ahora el bot solo responderá al generador Lua en <#${id}> para este servidor.`,
        configUpdatesTitle: '📺 Canales Configurados New/Updates',
        configLuaTitle: '📺 Canales Configurados Lua/Manifest',
        notConfigured: '*Ningún canal configurado aún.*',
        downloadInit: (appId) => `⏳ Iniciando descarga con DepotDownloaderMod para el AppID: **${appId}**...`,
        downloadSuccess: (appId) => `✅ ¡Descarga de **${appId}** completada con éxito en el servidor local!`,
        downloadError: `❌ Hubo un error al intentar descargar el juego con DepotDownloaderMod. Verifica los logs.`
    },
    'en': {
        connecting: (appId) => `🔄 **[1/3]** Connecting to Frank17xx's database: \`${appId}\`...`,
        notFound: (appId) => `❌ No information was found in the database for the AppID **${appId}**.`,
        dbError: `\n> *⚠️ The game files could not be obtained from Frank17xx.*`,
        localized: `🔎 **[2/3]** Data fetched!`,
        compiling: (size) => `📦 **[3/3]** Packaging files. (Size: \`${size} KB\`). Uploading to Discord...`,
        descFallback: "Description not available on Steam.",
        free: "Free",
        ready: (id) => `✅ Ready, <@${id}>! Here is your \`.zip\``,
        success: (name) => `✅ Process finished! The files for **${name}** were successfully extracted.`,
        error: (id) => `⚠️ There was an error processing the request, <@${id}>.\n> *🔍 Make sure the AppID is correct or try again in a few minutes.*`,
        wrongChannel: (id) => `❌ You can only use this command in the channel <#${id}>.`,
        invalidFormat: '❌ Invalid format. Please enter only numbers or a valid Steam link.',
        init: `⏳ Starting process...`,
        btnSteam: 'Steam Store',
        btnSponsor: 'Instant Gaming Offers',
        release: 'Release Date',
        price: 'Price',
        genres: 'Genres',
        platforms: 'Platforms',
        completed: 'Completed', 
        denuvoNotice: '<a:warning:1515742880764006602> NOTICE: Denuvo Anti-tamper detected. The game requires additional configuration to play offline.',
        createdBy: 'Source:',
        requestedBy: 'Requested by',
        setChannelSuccess: (id) => `✅ Channel configured! The bot will now only respond to the Lua generator in <#${id}> for this server.`,
        configUpdatesTitle: '📺 Configured Channels New/Updates',
        configLuaTitle: '📺 Configured Channels Lua/Manifest',
        notConfigured: '*No channels configured yet.*',
        downloadInit: (appId) => `⏳ Starting download with DepotDownloaderMod for AppID: **${appId}**...`,
        downloadSuccess: (appId) => `✅ Download for **${appId}** completed successfully on the local server!`,
        downloadError: `❌ There was an error trying to download the game with DepotDownloaderMod. Check the logs.`
    },
    'pt': {
        connecting: (appId) => `🔄 **[1/3]** Conectando ao banco de dados de Frank17xx: \`${appId}\`...`,
        notFound: (appId) => `❌ Nenhuma informação foi encontrada no banco de dados para o AppID. **${appId}**.`,
        dbError: `\n> *⚠️ Os arquivos do jogo não puderam ser obtidos da API Frank17xx.*`,
        localized: `🔎 **[2/3]** Dados obtidos!`,
        compiling: (size) => `📦 **[3/3]** Empacotando arquivos. (Tamanho: \`${size} KB\`). Enviando para o Discord...`,
        descFallback: "Descrição não disponível no Steam.",
        free: "Grátis",
        ready: (id) => `✅ Pronto, <@${id}>! Aqui está o seu arquivo \`.zip\``,
        success: (name) => `✅ Processo finalizado! Os arquivos para **${name}** foram extraídos com sucesso.`,
        error: (id) => `⚠️ Ocorreu um erro ao processar a solicitação, <@${id}>.\n> *🔍 Certifique-se de que o AppID está correto ou tente novamente em alguns minutos.*`,
        wrongChannel: (id) => `❌ Você só pode usar este comando no canal <#${id}>.`,
        invalidFormat: '❌ Formato inválido. Insira apenas números ou um link válido do Steam.',
        init: `⏳ Iniciando processo...`,
        btnSteam: 'Loja Steam',
        btnSponsor: 'Ofertas Instant Gaming',
        release: 'Lançamento',
        price: 'Preço',
        genres: 'Gêneros',
        platforms: 'Plataformas',
        completed: 'Concluído', 
        denuvoNotice: '<a:warning:1515742880764006602> AVISO: Denuvo Anti-tamper detectado. O jogo requer configuração adicional para jogar offline.',
        createdBy: 'Fonte:',
        requestedBy: 'Solicitado por',
        setChannelSuccess: (id) => `✅ Canal configurado! O bot agora só responderá ao gerador Lua em <#${id}> para este servidor.`,
        configUpdatesTitle: '📺 Canais Configurados New/Updates',
        configLuaTitle: '📺 Canais Configurados Lua/Manifest',
        notConfigured: '*Nenhum canal configurado ainda.*',
        downloadInit: (appId) => `⏳ Iniciando download com DepotDownloaderMod para o AppID: **${appId}**...`,
        downloadSuccess: (appId) => `✅ Download de **${appId}** concluído com sucesso no servidor local!`,
        downloadError: `❌ Ocorreu um erro ao tentar baixar o jogo com DepotDownloaderMod. Verifique os logs.`
    }
};

function getLang(localeStr) {
    if (!localeStr) return i18n['en'];
    const base = localeStr.toLowerCase().split('-')[0];
    return i18n[base] || i18n['en'];
}

// --- FUNCIÓN PARA OBTENER LA CANTIDAD REAL DE DLCS (USANDO STEAMDB INTERNO) ---
async function obtenerCantidadRealDLC(appId) {
    try {
        const idNumerico = parseInt(appId);
        
        if (isSteamConnected) {
            const result = await steam.getProductInfo([idNumerico], []);
            const gameInfo = result.apps[idNumerico];

            if (gameInfo && gameInfo.appinfo && gameInfo.appinfo.extended && gameInfo.appinfo.extended.listofdlc) {
                const listofdlc = gameInfo.appinfo.extended.listofdlc;
                if (typeof listofdlc === 'string') return listofdlc.split(',').length; 
                else if (typeof listofdlc === 'number') return 1;
            }
        }

        const url = `https://store.steampowered.com/api/appdetails?appids=${idNumerico}`;
        const respuesta = await fetch(url);
        const data = await respuesta.json();
        
        if (data[idNumerico] && data[idNumerico].success && data[idNumerico].data.dlc) {
            return data[idNumerico].data.dlc.length; 
        }
        
        return 0; 
    } catch (error) {
        return 0;
    }
}

async function obtenerImagenSteam(appId) {
    try {
        const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=spanish&cc=us`);
        if (!steamRes.ok) throw new Error(`Steam API caída. Código: ${steamRes.status}`);
        
        const steamData = await steamRes.json();
        if (steamData[appId] && steamData[appId].success && steamData[appId].data) {
            return steamData[appId].data.header_image; 
        }
    } catch (error) {}
    return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
}

async function verificarDenuvoEnStore(appId) {
    try {
        const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english&cc=us`);
        if (!steamRes.ok) throw new Error(`Steam API (Store) inaccesible. Código: ${steamRes.status}`);
        
        const steamData = await steamRes.json();
        if (steamData[appId] && steamData[appId].success && steamData[appId].data) {
            const storeDataText = JSON.stringify(steamData[appId].data).toLowerCase();
            return storeDataText.includes('denuvo');
        } else {
            return null; 
        }
    } catch (error) {
        return null;
    }
}

// --- LÓGICA DE EXTRACCIÓN .MANIFEST Y GENERACIÓN DE .LUA (NUEVA API RYUU) ---
async function generarYEnviarManifest(appId, usuario, canal, funcionEditar, localeCode) {
    const lang = getLang(localeCode);
    const API_KEY = 'jzVel8AgxRyn7Ghg'; // Tu Key actual y funcional

    try {
        await wait(200);
        await funcionEditar({ content: lang.connecting(appId) });

        // Extraer metadata visual para el Embed de Discord
        const baseLang = localeCode ? localeCode.toLowerCase().split('-')[0] : 'es';
        const steamLangMap = { 'es': 'spanish', 'en': 'english', 'pt': 'brazilian' };
        const steamLang = steamLangMap[baseLang] || 'english';

        const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=${steamLang}&cc=us`);
        const steamJson = await steamRes.json();
        let gameData = {};
        let finalGameName = `App ${appId}`;
        
        if (steamJson[appId] && steamJson[appId].success) {
            gameData = steamJson[appId].data;
            if (gameData.name) finalGameName = gameData.name;
        }

        // 1. Solicitar a la API que actualice la información del juego
        try {
            await axios.get(`https://generator.ryuu.lol/requestupdate?appid=${appId}&branch=public`, {
                headers: { 'X-Auth-Key': API_KEY },
                timeout: 10000
            });
            await wait(1500); 
        } catch (updateErr) {
            console.log(`Fallo al forzar update para ${appId}, intentando descargar de todas formas...`);
        }

        await wait(200);
        await funcionEditar({ content: lang.localized });

        // 2. Descargar el archivo ZIP que contiene los .manifest desde la API
        const tempDir = path.join(os.tmpdir(), `steam-bot-${appId}-${Date.now()}`);
        const zipPath = path.join(tempDir, `downloaded_${appId}.zip`);

        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        let downloaded = false;
        try {
            const response = await axios.get(`https://generator.ryuu.lol/api/download/${appId}?file_type=manifest`, {
                headers: { 'X-Auth-Key': API_KEY },
                responseType: 'arraybuffer',
                timeout: 30000
            });
            fs.writeFileSync(zipPath, response.data);
            if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 0) {
                downloaded = true;
            }
        } catch (err) {
            console.error(`Error descargando manifest de la API para ${appId}:`, err.message);
        }

        if (!downloaded) {
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
            return funcionEditar({ content: lang.notFound(appId) + lang.dbError });
        }

        // 3. Extraer el archivo ZIP de la API y crear el ZIP final
        const finalZip = new AdmZip();
        let manifestFound = 0;

        try {
            const downloadedZip = new AdmZip(zipPath);
            downloadedZip.extractAllTo(tempDir, true);

            function walkDirectory(dir) {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    if (fs.statSync(filePath).isDirectory()) {
                        walkDirectory(filePath);
                    } else {
                        if (file.endsWith('.manifest')) {
                            finalZip.addLocalFile(filePath);
                            manifestFound++;
                        }
                    }
                }
            }
            walkDirectory(tempDir);

            // 4. Descargar el archivo .lua y FORMATEARLO
            let luaContent = `addappid(${appId})`; // Valor por defecto por si falla
            try {
                const luaResponse = await axios.get(`https://generator.ryuu.lol/api/download/${appId}?file_type=lua`, {
                    headers: { 'X-Auth-Key': API_KEY },
                    responseType: 'text', 
                    timeout: 15000
                });
                
                if (luaResponse.data) {
                    luaContent = luaResponse.data; 
                    
                    // --- NUEVA LIMPIEZA DEL TEXTO LUA ---
                    // a) Quitar los "-- " (descomentar la línea)
                    luaContent = luaContent.replace(/-- setManifestid/g, 'setManifestid');
                    // b) Pegar todas las líneas al borde izquierdo (quitando espacios o tabulaciones al inicio)
                    luaContent = luaContent.replace(/^[ \t]+/gm, '');
                }
            } catch (luaErr) {
                console.error(`Error descargando el LUA completo para ${appId}:`, luaErr.message);
            }

            // Añadimos el LUA (ahora limpio y formateado) al ZIP
            finalZip.addFile(`${appId}.lua`, Buffer.from(luaContent, 'utf8'));

        } catch (err) {
            console.error("Error al procesar el ZIP:", err);
        }

        if (manifestFound === 0) {
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
            return funcionEditar({ content: lang.notFound(appId) + `\n> *⚠️ Archivo descargado, pero no contenía archivos .manifest válidos.*` });
        }

        // Generar el Buffer del nuevo ZIP final
        const zipBuffer = finalZip.toBuffer();
        const sizeKB = (zipBuffer.length / 1024).toFixed(2);
        const fileAttachment = new AttachmentBuilder(zipBuffer, { name: `${appId}.zip` });

        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}

        await wait(200);
        await funcionEditar({ content: lang.compiling(sizeKB) });

        // --- CONSTRUIR LA UI INTERACTIVA (Embeds) ---
        let releaseDate = gameData.release_date?.date || 'N/A';
        const price = gameData.is_free ? lang.free : (gameData.price_overview?.final_formatted || 'N/A');
        
        const platformsArr = [];
        if (gameData.platforms?.windows) platformsArr.push('Windows');
        if (gameData.platforms?.mac) platformsArr.push('Mac');
        if (gameData.platforms?.linux) platformsArr.push('Linux');
        const platforms = platformsArr.join(', ') || 'N/A';
        
        const genresList = gameData.genres ? gameData.genres.map(g => g.description) : [];
        const genres = genresList.length > 0 ? genresList.slice(0, 1).join(', ') : 'N/A';

        const drmNotice = gameData.drm_notice ? gameData.drm_notice.toLowerCase() : '';
        const aboutGame = gameData.about_the_game ? gameData.about_the_game.toLowerCase() : '';
        const hasDenuvo = drmNotice.includes('denuvo') || aboutGame.includes('denuvo');

        const mainUI = new ContainerBuilder()
            .setAccentColor(0x32e612)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(lang.ready(usuario.id)))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addFileComponents(new FileBuilder().setURL(`attachment://${appId}.zip`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## <a:video_game:1515749977979228321> [${finalGameName}](https://store.steampowered.com/app/${appId}/)`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${gameData.short_description || lang.descFallback}`))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

        const numeroExactoDLC = await obtenerCantidadRealDLC(appId);

        const infoBloque = `${CUSTOM_EMOJIS.calendario} **${lang.release}:** \`${releaseDate}\` \u00A0\u00A0|\u00A0\u00A0 ${CUSTOM_EMOJIS.dinero} **${lang.price}:** \`${price}\`\n` +
                           `${CUSTOM_EMOJIS.plataforma} **${lang.platforms}:** \`${platforms}\` \u00A0\u00A0|\u00A0\u00A0 ${CUSTOM_EMOJIS.generos} **${lang.genres}:** \`${genres}\`\n` +
                           `${CUSTOM_EMOJIS.check} **${lang.completed}:** \`100%\` \u00A0\u00A0|\u00A0\u00A0 📦 **DLCs:** \`${numeroExactoDLC}\``;

        mainUI.addTextDisplayComponents(new TextDisplayBuilder().setContent(infoBloque))
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

        if (hasDenuvo) {
            mainUI.addTextDisplayComponents(new TextDisplayBuilder().setContent(lang.denuvoNotice))
                  .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));
        }

        if (gameData.header_image) {
            mainUI.addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems({ media: { url: gameData.header_image } })
            );
        }

        // 1. Configurar la fecha según el idioma (inglés, español, portugués)
        const localeMap = { 'es': 'es-ES', 'en': 'en-US', 'pt': 'pt-BR' };
        const dateLocale = localeMap[baseLang] || 'en-US';
        const formattedDate = new Date().toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' });

        // 2. Mostrarlo en el diseño con el nuevo orden
        mainUI.addTextDisplayComponents(new TextDisplayBuilder().setContent(`\`App ID: ${appId} | ${lang.requestedBy} ${usuario.username} | ${formattedDate}\``))
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(lang.btnSteam)
                .setEmoji(CUSTOM_EMOJIS.steam) 
                .setURL(`https://store.steampowered.com/app/${appId}/`)
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel(lang.btnSponsor)
                .setEmoji(CUSTOM_EMOJIS.ig) 
                .setURL('https://www.instant-gaming.com/?igr=Frank17xx')
                .setStyle(ButtonStyle.Link)
        );

        mainUI.addActionRowComponents(row);

        await wait(200);
        const mensajeCarga = await funcionEditar({ content: lang.success(finalGameName) });

        await wait(2000);
        if (mensajeCarga && mensajeCarga.delete) {
            await mensajeCarga.delete().catch(() => {});
        }

        await canal.send({
            components: [mainUI], 
            files: [fileAttachment], 
            flags: [MessageFlags.IsComponentsV2] 
        });

    } catch (error) {
        console.error("❌ Error en generarYEnviarManifest:", error);
        try {
            await funcionEditar({ content: lang.error(usuario.id) });
        } catch (e) {
            console.error("No se pudo editar el mensaje de error:", e);
        }
    }
}

// --- LISTA DE JUEGOS POR DEFECTO ---
const defaultDenuvoGames = {
    3321460: { name: "Crimson Desert" },
    2358720: { name: "Black Myth: Wukong" },
    3357650: { name: "Pragmata" },
    3764200: { name: "Resident Evil Requiem" },
    3159330: { name: "Assassin's Creed Shadows" },
    3017860: { name: "DOOM The Dark Ages" },
    2840770: { name: "Avatar: Frontiers of Pandora" },
    2842040: { name: "Star Wars Outlaws" },
    3489700: { name: "Stellar Blade" },
    1846380: { name: "Need for Speed™ Unbound" },
    1222680: { name: "Need for Speed™ Heat" },
    1971870: { name: "Mortal Kombat 1" },
    1941540: { name: "Mafia: The Old Country" },
    3768760: { name: "007 First Light" },
    703080: { name: "Planet Zoo" },
    3274580: { name: "Anno 117: Pax Romana" },
    3405690: { name: "EA SPORTS FC™ 26" },
    1364780: { name: "Street Fighter™ 6" },
    1142710: { name: "Total War: WARHAMMER III" },
    2669320: { name: "EA SPORTS FC 25" },
    668580: { name: "Atomic Heart" },
    1490890: { name: "Demon Slayer -Kimetsu no Yaiba- The Hinokami Chronicles" },
    1984270: { name: "Digimon Story Time Stranger" },
    2495100: { name: "Hello Kitty Island Adventure" },
    990080: { name: "Hogwarts Legacy" },
    1244460: { name: "Jurassic World Evolution 2" },
    532210: { name: "Life is Strange 2" },
    629820: { name: "Maneater" },
    368260: { name: "Marvel's Midnight Suns" },
    3472040: { name: "NBA 2K26" },
    2161700: { name: "Persona 3 Reload" },
    1687950: { name: "Persona 5 Royal" },
    312660: { name: "Sniper Elite 4" },
    1029690: { name: "Sniper Elite 5" },
    312670: { name: "Strange Brigade" },
    315210: { name: "Suicide Squad: Kill: the Justice League" },
    626690: { name: "Sword Art Online: Fatal Bullet" },
    429660: { name: "Tales of Berseria" },
    2680010: { name: "The First Berserker: Khazan" },
    1937780: { name: "Total War: PHARAOH" },
    2951630: { name: "Total War: PHARAOH DYNASTIES" },
    1649080: { name: "Two Point Campus" },
    2375550: { name: "Like a Dragon Gaiden: The Man Who Erased His Name" },
    1235140: { name: "Yakuza: Like a Dragon" },
    3059520: { name: "F1® 25" }
};

const defaultWhitelist = [
    process.env.GUILD_ID || "1417925730393788479"
];

const defaultAdminServers = [
    process.env.GUILD_ID || "1417925730393788479"
];

// --- SMART MEMORY CONTAINER EN MONGO ---
let botMemory = { savedVersions: {}, denuvoStatus: {}, denuvoGames: {}, servers: {}, whitelist: [], adminServers: [] };

async function initializeDatabase() {
    try {
        let doc = await MemoryModel.findOne();

        if (doc) {
            botMemory = doc.toObject();
            let changesMade = false;

            if (!botMemory.denuvoGames || Object.keys(botMemory.denuvoGames).length === 0) {
                botMemory.denuvoGames = defaultDenuvoGames;
                changesMade = true;
            }

            if (!botMemory.whitelist || botMemory.whitelist.length === 0) {
                botMemory.whitelist = defaultWhitelist;
                changesMade = true;
            }
            
            if (!botMemory.adminServers || botMemory.adminServers.length === 0) {
                botMemory.adminServers = defaultAdminServers;
                changesMade = true;
            }

            if (botMemory.serverChannels) {
                botMemory.servers = {};
                for (const [gId, cId] of Object.entries(botMemory.serverChannels)) {
                    botMemory.servers[gId] = { 
                        channelId: cId, 
                        trackedGames: Object.keys(botMemory.denuvoGames).map(Number) 
                    };
                }
                delete botMemory.serverChannels;
                changesMade = true;
                console.log("🔄 Base de datos migrada al nuevo formato multi-servidor.");
            }

            if (!botMemory.servers) {
                botMemory.servers = {};
                changesMade = true;
            }

            if (changesMade) await saveMemory();
            console.log("💾 Memory successfully loaded from MongoDB.");
        } else {
            console.log("📝 Empty database. Creating initial configuration in MongoDB...");
            botMemory.denuvoGames = defaultDenuvoGames;
            botMemory.whitelist = defaultWhitelist;
            botMemory.adminServers = defaultAdminServers;
            botMemory.servers = {};
            
            await saveMemory();
        }
    } catch (error) {
        console.error("❌ Error initializing MongoDB database:", error);
    }
}

async function saveMemory() {
    try {
        const dataToSave = { ...botMemory };
        delete dataToSave._id; 
        await MemoryModel.updateOne({}, { $set: dataToSave }, { upsert: true });
        console.log("💾 Database successfully synced with MongoDB.");
    } catch (error) {
        console.error("❌ Error updating database on MongoDB:", error);
    }
}

// --- 3. CONEXIÓN Y REGISTRO DE COMANDOS ---
client.once('ready', async () => {
    console.log(`Discord bot connected as ${client.user.tag}!`);
    client.user.setActivity('Steam Updates', { type: 3 }); 

    try {
        if (!process.env.MONGO_URI) {
            throw new Error("La variable MONGO_URI no está definida en el archivo .env");
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🍃 Conectado con éxito a MongoDB.");

    } catch (mongoErr) {
        console.error("❌ Error fatal al conectar a MongoDB:", mongoErr);
        process.exit(1);
    }

    await initializeDatabase();

    const GUILD_ID = process.env.GUILD_ID || "1417925730393788479"; 

    try {
        // --- COMANDOS PÚBLICOS GLOBALES ---
        await client.application.commands.set([
            {
                name: 'new_updates',
                name_localizations: { 'es-ES': 'nuevas_actualizaciones', 'pt-BR': 'novas_atualizacoes' },
                description: 'Configure a channel to receive Denuvo news and patches (Admins Only)',
                description_localizations: { 'es-ES': 'Configura un canal para recibir noticias y parches de Denuvo (Admins Only)', 'pt-BR': 'Configura um canal para receber notícias e patches do Denuvo (Admins Only)' },
                default_member_permissions: PermissionFlagsBits.ManageChannels.toString(), 
                options: [
                    {
                        name: 'channel',
                        name_localizations: { 'es-ES': 'canal', 'pt-BR': 'canal' }, 
                        description: 'The channel to send updates to',
                        description_localizations: { 'es-ES': 'El canal donde enviar las actualizaciones', 'pt-BR': 'O canal donde enviar as atualizações' },
                        type: 7, 
                        required: false 
                    }
                ]
            },
            {
                name: 'set_channel_for_luascript',
                name_localizations: { 'es-ES': 'configurar_canal_luascript', 'pt-BR': 'configurar_canal_luascript' },
                description: 'Configure the channel where the bot can be used (Admins Only)',
                description_localizations: { 'es-ES': 'Configura el canal donde se puede usar el bot (Solo Admins)', 'pt-BR': 'Configura o canal onde o bot pode ser usado (Apenas Admins)' },
                default_member_permissions: PermissionFlagsBits.Administrator.toString(),
                options: [
                    {
                        name: 'channel',
                        name_localizations: { 'es-ES': 'canal', 'pt-BR': 'canal' },
                        description: 'Select the channel to configure',
                        description_localizations: { 'es-ES': 'Selecciona el canal a configurar', 'pt-BR': 'Selecione o canal a configurar' },
                        type: 7, 
                        required: true
                    }
                ]
            },
            {
                name: 'gen', 
                description: 'Generates a Lua/Manifest file for SteamTools',
                description_localizations: { 'es-ES': 'Genera un archivo Lua/Manifest para SteamTools', 'pt-BR': 'Gera um arquivo Lua/Manifest para SteamTools' },
                options: [{
                    name: 'appid', 
                    description: 'Steam App ID, steam store link or SteamDB link',
                    description_localizations: { 'es-ES': 'Steam App ID, enlace de la tienda de steam o SteamDB link', 'pt-BR': 'Steam App ID, Link da loja Steam ou link do SteamDB' },
                    type: 3, 
                    required: true,
                    autocomplete: true 
                }]
            },
            {
                name: 'denuvo_list',
                name_localizations: { 'es-ES': 'lista_denuvo', 'pt-BR': 'lista_denuvo' },
                description: 'Shows the list of games currently being tracked in this server.',
                description_localizations: { 'es-ES': 'Muestra la lista de juegos rastreados actualmente en este servidor.', 'pt-BR': 'Mostra a lista de jogos rastreados atualmente neste servidor.' }
            },
            {
                name: 'check_game',
                name_localizations: { 'es-ES': 'comprobar_juego', 'pt-BR': 'verificar_jogo' },
                description: 'Check if a Steam game currently has Denuvo.',
                description_localizations: { 'es-ES': 'Comprueba si un juego de Steam tiene Denuvo actualmente.', 'pt-BR': 'Verifica se um jogo do Steam tem Denuvo actualmente.' },
                options: [
                    { name: 'appid', description: 'The Game App ID', description_localizations: { 'es-ES': 'El App ID del Juego', 'pt-BR': 'O App ID do Jogo' }, type: 4, required: true }
                ]
            },
            {
                name: 'help',
                name_localizations: { 'es-ES': 'ayuda', 'pt-BR': 'ajuda' },
                description: 'Shows information about available public commands.',
                description_localizations: { 'es-ES': 'Muestra información sobre los comandos públicos disponibles.', 'pt-BR': 'Mostra informações sobre los comandos públicos disponíveis.' }
            },
            // COMANDOS DE ADMIN GLOBALES
            {
                name: 'new_denuvo',
                name_localizations: { 'es-ES': 'nuevo_juego_con_denuvo', 'pt-BR': 'novo_jogo_com_denuvo' },
                description: 'Announces a new game with Denuvo globally',
                description_localizations: { 'es-ES': 'Anuncia un nuevo juego con Denuvo globalmente', 'pt-BR': 'Anuncia um novo jogo com Denuvo globalmente' },
                default_member_permissions: PermissionFlagsBits.Administrator.toString(),
                options: [
                    { name: 'appid', description: 'The Game App ID', description_localizations: { 'es-ES': 'El App ID del Juego', 'pt-BR': 'O App ID do Jogo' }, type: 4, required: true }
                ]
            },
            {
                name: 'add_denuvo_game',
                name_localizations: { 'es-ES': 'agregar_juego_con_denuvo', 'pt-BR': 'adicionar_jogo_com_denuvo' },
                description: 'Adds a game to the global tracking database',
                description_localizations: { 'es-ES': 'Añade un juego a la base de datos de rastreo global', 'pt-BR': 'Adiciona um juego ao banco de datos de rastreamento global' },
                default_member_permissions: PermissionFlagsBits.Administrator.toString(),
                options: [
                    { name: 'appid', description: 'The Game App ID', description_localizations: { 'es-ES': 'El App ID del Juego', 'pt-BR': 'O App ID do Jogo' }, type: 4, required: true }
                ]
            },
            {
                name: 'cracked_game',
                name_localizations: { 'es-ES': 'juego_crackeado', 'pt-BR': 'jogo_crackeado' },
                description: 'Announce globally that a Denuvo game has been cracked',
                description_localizations: { 'es-ES': 'Anuncia globalmente que un juego ha sido crackeado', 'pt-BR': 'Anuncia globalmente que um jogo foi crackeado' },
                default_member_permissions: PermissionFlagsBits.Administrator.toString(),
                options: [
                    { name: 'appid', description: 'The Game App ID', description_localizations: { 'es-ES': 'El App ID del Juego', 'pt-BR': 'O App ID do Jogo' }, type: 4, required: true },
                    { name: 'cracker', description: 'Name of the cracker/group', description_localizations: { 'es-ES': 'Nombre del cracker/grupo', 'pt-BR': 'Nome do cracker/grupo' }, type: 3, required: true },
                    { name: 'reddit_link', description: 'Direct reddit Link', description_localizations: { 'es-ES': 'Enlace directo a Reddit', 'pt-BR': 'Link direto do Reddit' }, type: 3, required: true },
                    { name: 'cs_rin_link', description: 'Direct CS.RIN Link (Optional)', description_localizations: { 'es-ES': 'Enlace directo a CS.RIN (Opcional)', 'pt-BR': 'Link direto do CS.RIN (Opcional)' }, type: 3, required: false },
                ]
            },
            // NUEVO COMANDO: DOWNLOAD GAME (MODIFICADO)
            {
                name: 'download_game',
                name_localizations: { 'es-ES': 'descargar_juego', 'pt-BR': 'baixar_jogo' },
                description: 'Generates a local download script for a Steam game (Admins Only)',
                description_localizations: { 'es-ES': 'Genera un script de descarga local para un juego de Steam (Solo Admins)', 'pt-BR': 'Gera um script de download local para um jogo Steam (Apenas Admins)' },
                default_member_permissions: PermissionFlagsBits.Administrator.toString(),
                options: [
                    {
                        name: 'appid',
                        description: 'The Steam App ID to download',
                        description_localizations: { 'es-ES': 'El App ID de Steam a descargar', 'pt-BR': 'O App ID do Steam para baixar' },
                        type: 3,
                        required: true
                    }
                ]
            }
        ]);
        console.log("✅ Comandos públicos y de Admin autorizados registrados globalmente.");

        // --- COMANDOS PRIVADOS EXCLUSIVOS DEL DUEÑO DEL BOT ---
        const privateGuild = client.guilds.cache.get(GUILD_ID);
        if (privateGuild) {
            await privateGuild.commands.set([
                {
                    name: 'remove_channel',
                    name_localizations: { 'es-ES': 'eliminar_canal', 'pt-BR': 'remover_canal' },
                    description: 'Removes configured channels (Updates or Lua) from a server.',
                    description_localizations: { 'es-ES': 'Elimina canales configurados (Updates o Lua) de un servidor.', 'pt-BR': 'Remove canais configurados (Updates ou Lua) de um servidor.' },
                    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
                    options: [
                        {
                            name: 'type',
                            name_localizations: { 'es-ES': 'tipo', 'pt-BR': 'tipo' },
                            description: 'The type of channel to remove',
                            description_localizations: { 'es-ES': 'El tipo de canal a eliminar', 'pt-BR': 'O tipo de canal a remover' },
                            type: 3, 
                            required: true,
                            choices: [
                                { name: 'Updates Channel', value: 'updates' },
                                { name: 'Lua Script Channel', value: 'lua' },
                                { name: 'Both', value: 'both' }
                            ]
                        },
                        {
                            name: 'server_id',
                            name_localizations: { 'es-ES': 'id_servidor', 'pt-BR': 'id_servidor' },
                            description: 'The ID of the server (optional, defaults to current).',
                            description_localizations: { 'es-ES': 'El ID del servidor (opcional, por defecto el actual).', 'pt-BR': 'O ID do servidor (opcional, por padrão o atual).' },
                            type: 3,
                            required: false
                        }
                    ]
                },
                {
                    name: 'remove_game',
                    name_localizations: { 'es-ES': 'eliminar_juego', 'pt-BR': 'remover_jogo' },
                    description: 'Removes a game from the global tracking database',
                    description_localizations: { 'es-ES': 'Elimina un juego de la base de datos de rastreo global', 'pt-BR': 'Remove um jogo do banco de datos de rastreamento global' },
                    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
                    options: [
                        { name: 'appid', description: 'The App ID of the Game to Delete', description_localizations: { 'es-ES': 'El App ID del Juego a Eliminar', 'pt-BR': 'O App ID do Jogo a Remover' }, type: 4, required: true }
                    ]
                },
                {
                    name: 'force_check',
                    name_localizations: { 'es-ES': 'verificacion_forzada', 'pt-BR': 'verificacao_forcada' },
                    description: 'Forces an immediate check for Steam updates and patches.',
                    description_localizations: { 'es-ES': 'Fuerza una comprobación inmediata de actualizaciones y parches.', 'pt-BR': 'Força uma verificação imediata de atualizações e patches.' },
                    default_member_permissions: PermissionFlagsBits.Administrator.toString()
                },
                {
                    name: 'manage_servers',
                    name_localizations: { 'es-ES': 'gestionar_servidores', 'pt-BR': 'gerenciar_servidores' },
                    description: 'Manage allowed servers and admin permissions for the bot.',
                    description_localizations: { 'es-ES': 'Gestiona los servidores permitidos y permisos de admin para el bot.', 'pt-BR': 'Gerencia os servidores permitidos e permissões de admin para o bot.' },
                    default_member_permissions: PermissionFlagsBits.Administrator.toString(),
                    options: [
                        {
                            name: 'action',
                            name_localizations: { 'es-ES': 'accion', 'pt-BR': 'acao' },
                            description: 'The action to perform',
                            description_localizations: { 'es-ES': 'La acción a realizar', 'pt-BR': 'A ação a realizar' },
                            type: 3, 
                            required: true,
                            choices: [
                                { name: 'Add to Whitelist', name_localizations: { 'es-ES': 'Añadir a Whitelist' }, value: 'add_wl' },
                                { name: 'Remove from Whitelist', name_localizations: { 'es-ES': 'Eliminar de Whitelist' }, value: 'remove_wl' },
                                { name: 'Add to Admin Servers', name_localizations: { 'es-ES': 'Añadir a Servidores Admin' }, value: 'add_admin' },
                                { name: 'Remove from Admin Servers', name_localizations: { 'es-ES': 'Eliminar de Servidores Admin' }, value: 'remove_admin' }
                            ]
                        },
                        {
                            name: 'server_id',
                            name_localizations: { 'es-ES': 'id_servidor', 'pt-BR': 'id_servidor' },
                            description: 'The ID of the Discord server.',
                            description_localizations: { 'es-ES': 'El ID del servidor de Discord.', 'pt-BR': 'O ID do servidor do Discord.' },
                            type: 3,
                            required: true
                        }
                    ]
                },
                {
                    name: 'bot_status',
                    name_localizations: { 'es-ES': 'estado_del_bot', 'pt-BR': 'status_do_bot' },
                    description: 'Shows the current internal status and diagnostics of the bot.',
                    description_localizations: { 'es-ES': 'Muestra el estado interno actual y diagnóstico del bot.', 'pt-BR': 'Mostra o status interno atual e o diagnóstico do bot.' },
                    default_member_permissions: PermissionFlagsBits.Administrator.toString()
                },
                {
                    name: 'test_update',
                    description: 'Sends a test Build Update message to preview the format.',
                    default_member_permissions: PermissionFlagsBits.Administrator.toString()
                },
                {
                    name: 'test_denuvo_removed',
                    description: 'Sends a test Denuvo Removed message to preview the format.',
                    default_member_permissions: PermissionFlagsBits.Administrator.toString()
                },
                {
                    name: 'test_dlc',
                    description: 'Sends a test DLC message to preview the format.',
                    default_member_permissions: PermissionFlagsBits.Administrator.toString()
                }
            ]);
            console.log("✅ Comandos exclusivos del dueño registrados de forma privada.");
        }
    } catch (error) {
        console.error("❌ Error registering commands:", error);
    }

    console.log("Connecting to Steam servers...");
    steam.logOn({ anonymous: true });
});

steam.on('loggedOn', () => {
    console.log("Successfully connected to Steam's internal network!");
    isSteamConnected = true;
    checkUpdates();
    setInterval(checkUpdates, 300000); 
});

steam.on('disconnected', () => {
    console.log("⚠️ Disconnected from Steam network.");
    isSteamConnected = false;
});

steam.on('error', (err) => {
    console.error("❌ Steam connection error:", err);
    isSteamConnected = false;
});

// --- 4. BRAIN: MULTIPLE TRACKING ---
async function checkUpdates() {
    if (!botMemory.denuvoGames) return;
    const appIds = Object.keys(botMemory.denuvoGames).map(Number); 
    try {
        const result = await steam.getProductInfo(appIds, [], true); 
        const apps = result.apps;

        let changesMade = false;

        for (let id of appIds) {
            const gameInfo = apps[id];
            if (!gameInfo || !gameInfo.appinfo) continue;
            
            const gameName = botMemory.denuvoGames[id].name;

            const appInfoText = JSON.stringify(gameInfo.appinfo).toLowerCase();
            let hasDenuvo = appInfoText.includes('denuvo');

            if (!hasDenuvo) {
                const storeCheck = await verificarDenuvoEnStore(id);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                if (storeCheck === null) {
                    continue; 
                }
                
                hasDenuvo = storeCheck;
            }

            if (botMemory.denuvoStatus[id] === undefined) {
                botMemory.denuvoStatus[id] = hasDenuvo;
                changesMade = true;
            } else if (botMemory.denuvoStatus[id] === true && hasDenuvo === false) {
                console.log(`DENUVO REMOVED FROM ${gameName}!`);
                botMemory.denuvoStatus[id] = false;
                
                delete botMemory.denuvoGames[id]; 
                changesMade = true;
                
                const gameImage = await obtenerImagenSteam(id);
                await sendDenuvoRemovedMessage({ 
                    title: gameName, 
                    idSteam: id, 
                    image: gameImage, 
                    timestamp: Math.floor(Date.now() / 1000) 
                });
                continue; 
            }

            if (!gameInfo.appinfo.depots) continue;
            const branches = gameInfo.appinfo.depots.branches;
            if (!branches || !branches.public) continue;

            const currentVersion = branches.public.buildid;

            if (!botMemory.savedVersions[id]) {
                botMemory.savedVersions[id] = currentVersion;
                changesMade = true;
            } else if (botMemory.savedVersions[id] !== currentVersion) {
                console.log(`NEW VERSION DETECTED FOR ${gameName}!`);
                const oldVersion = botMemory.savedVersions[id];
                botMemory.savedVersions[id] = currentVersion; 
                changesMade = true;
                
                const gameImage = await obtenerImagenSteam(id);
                await sendDiscordMessage({
                    title: gameName,
                    idSteam: id,
                    image: gameImage, 
                    timestamp: Math.floor(Date.now() / 1000),
                    oldVersion: oldVersion,
                    newVersion: currentVersion
                });
            }

            const extended = gameInfo.appinfo.extended;
            if (extended && extended.listofdlc) {
                const currentDlcs = extended.listofdlc.split(',').map(Number);
                
                if (!botMemory.savedDLCs) {
                    botMemory.savedDLCs = {};
                    changesMade = true;
                }
                
                if (!botMemory.savedDLCs[id]) {
                    botMemory.savedDLCs[id] = currentDlcs;
                    changesMade = true; 
                } else {
                    const newDlcs = currentDlcs.filter(dlcId => !botMemory.savedDLCs[id].includes(dlcId));
                    
                    if (newDlcs.length > 0) {
                        for (const dlcId of newDlcs) {
                            try {
                                const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${dlcId}&cc=us`);
                                if (steamRes.ok) {
                                    const steamData = await steamRes.json();
                                    
                                    if (steamData[dlcId] && steamData[dlcId].success) {
                                        console.log(`NUEVO DLC PÚBLICO DETECTADO PARA ${gameName}: ${dlcId}`);
                                        
                                        const dlcImage = steamData[dlcId].data.header_image;
                                        
                                        await sendDlcMessage({
                                            gameName: gameName,
                                            parentId: id,
                                            dlcId: dlcId,
                                            image: dlcImage,
                                            timestamp: Math.floor(Date.now() / 1000)
                                        });
                                        
                                        botMemory.savedDLCs[id].push(dlcId);
                                        changesMade = true;
                                    }
                                }
                            } catch (error) {
                                console.error(`Error al verificar DLC ${dlcId} en la tienda:`, error.message);
                            }
                        }
                    }
                }
            }
        }

        if (changesMade) {
            await saveMemory();
        }

    } catch (error) {
        console.error("Error querying Steam:", error);
    }
}

// 5. MENSAJES DE PARCHES
async function sendDiscordMessage(data) {

    const text1EN = new TextDisplayBuilder()
        .setContent(`## [${data.title}](https://store.steampowered.com/app/${data.idSteam}/)\nA new version of the game has been released on the public branch.\n-# <t:${data.timestamp}:F> ( <t:${data.timestamp}:R> )`);

    const text2EN = new TextDisplayBuilder()
        .setContent(`### Build Update\n\`${data.oldVersion}\` <a:green:1515840334888828979> \`${data.newVersion}\``);

    const buttonEN = new ButtonBuilder()
        .setLabel('View patch')
        .setEmoji('1515829479757578480') 
        .setURL(`https://steamdb.info/app/${data.idSteam}/patchnotes/`)
        .setStyle(ButtonStyle.Link);

    const sectionEN = new SectionBuilder()
        .addTextDisplayComponents(text2EN)
        .setButtonAccessory(buttonEN); 

    const containerEN = new ContainerBuilder()
        .setAccentColor(0x32e612) 
        .addTextDisplayComponents(text1EN)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)) 
        .addSectionComponents(sectionEN) 
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)); 
        
    if (data.image) containerEN.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: data.image } }));

    const text1ES = new TextDisplayBuilder()
        .setContent(`## [${data.title}](https://store.steampowered.com/app/${data.idSteam}/)\nSe ha lanzado una nueva versión del juego en la rama pública.\n-# <t:${data.timestamp}:F> ( <t:${data.timestamp}:R>\ )`);

    const text2ES = new TextDisplayBuilder()
        .setContent(`### Build Update\n\`${data.oldVersion}\` <a:green:1515840334888828979> \`${data.newVersion}\``);

    const buttonES = new ButtonBuilder()
        .setLabel('Ver parche')
        .setEmoji('1515829479757578480') 
        .setURL(`https://steamdb.info/app/${data.idSteam}/patchnotes/`)
        .setStyle(ButtonStyle.Link);

    const sectionES = new SectionBuilder()
        .addTextDisplayComponents(text2ES)
        .setButtonAccessory(buttonES); 

    const containerES = new ContainerBuilder()
        .setAccentColor(0x32e612) 
        .addTextDisplayComponents(text1ES)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addSectionComponents(sectionES) 
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

    if (data.image) containerES.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: data.image } }));

    if (!botMemory.servers) return;

    for (const [guildId, serverConfig] of Object.entries(botMemory.servers)) {
        const channelId = serverConfig.channelId;

        if (!channelId) continue;

        try {
            const channel = await client.channels.fetch(channelId);
            if (channel && channel.guild) {
                const isSpanish = channel.guild.preferredLocale?.startsWith('es') || false;
                
                await channel.send({ 
                    components: [isSpanish ? containerES : containerEN],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        } catch (error) {
            console.error(`❌ Error sending patch update to channel ${channelId} in guild ${guildId}.`);
        }
    }
}

async function sendDenuvoRemovedMessage(data) {
    const textEN = new TextDisplayBuilder()
        .setContent(`## Denuvo Removed • [${data.title}](https://store.steampowered.com/app/${data.idSteam}/)\nThis game no longer has Denuvo Anti-Tamper protection! Removing from the database...\n-# <t:${data.timestamp}:F> ( <t:${data.timestamp}:R> )`);
        
    const containerEN = new ContainerBuilder()
        .setAccentColor(0x32e612)
        .addTextDisplayComponents(textEN)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

    if (data.image) containerEN.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: data.image } }));

    const textES = new TextDisplayBuilder()
        .setContent(`## Denuvo Eliminado • [${data.title}](https://store.steampowered.com/app/${data.idSteam}/)\n¡Ya no cuenta con la protección Denuvo Anti-Tamper! Eliminando de la base de datos...\n-# <t:${data.timestamp}:F> ( <t:${data.timestamp}:R>\ )`);
        
    const containerES = new ContainerBuilder()
        .setAccentColor(0x32e612)
        .addTextDisplayComponents(textES)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

    if (data.image) containerES.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: data.image } }));

    if (!botMemory.servers) return;

    for (const [guildId, serverConfig] of Object.entries(botMemory.servers)) {
        const channelId = serverConfig.channelId;

        if (!channelId) continue;

        try {
            const channel = await client.channels.fetch(channelId);
            if (channel && channel.guild) {
                const isSpanish = channel.guild.preferredLocale?.startsWith('es') || false;
                await channel.send({ 
                    components: [isSpanish ? containerES : containerEN],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        } catch (error) {
            console.error(`❌ Error sending Denuvo removed notification to channel ${channelId}.`);
        }
    }
}

async function sendDlcMessage(data) {
    const colorDlc = 0x7e0097; 

    const textEN = new TextDisplayBuilder()
        .setContent(`## New DLC Detected • [${data.gameName}](https://store.steampowered.com/app/${data.parentId}/)\nDetected with Denuvo Anti-Tamper...\n-# <t:${data.timestamp}:F> ( <t:${data.timestamp}:R> )`);

    const buttonEN = new ButtonBuilder()
        .setLabel('Steam Store')
        .setEmoji('1465416289077035079')
        .setURL(`https://store.steampowered.com/app/${data.dlcId}/`)
        .setStyle(ButtonStyle.Link);

    const actionRowEN = new ActionRowBuilder().addComponents(buttonEN);

    const containerEN = new ContainerBuilder()
        .setAccentColor(colorDlc)
        .addTextDisplayComponents(textEN)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents(actionRowEN)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

    if (data.image) containerEN.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: data.image } }));

    const textES = new TextDisplayBuilder()
        .setContent(`## Nuevo DLC Detectado • [${data.gameName}](https://store.steampowered.com/app/${data.parentId}/)\nSe Ha Detectado Con Denuvo Anti-Tamper...\n-# <t:${data.timestamp}:F> ( <t:${data.timestamp}:R> )`);

    const buttonES = new ButtonBuilder()
        .setLabel('Tienda de Steam')
        .setEmoji('1465416289077035079')
        .setURL(`https://store.steampowered.com/app/${data.dlcId}/`)
        .setStyle(ButtonStyle.Link);

    const actionRowES = new ActionRowBuilder().addComponents(buttonES);

    const containerES = new ContainerBuilder()
        .setAccentColor(colorDlc)
        .addTextDisplayComponents(textES)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addActionRowComponents(actionRowES)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

    if (data.image) containerES.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: data.image } }));

    if (!botMemory.servers) return;

    for (const [guildId, serverConfig] of Object.entries(botMemory.servers)) {
        const channelId = serverConfig.channelId;

        if (!channelId) continue;

        try {
            const channel = await client.channels.fetch(channelId);
            if (channel && channel.guild) {
                const isSpanish = channel.guild.preferredLocale?.startsWith('es') || false;
                await channel.send({ 
                    components: [isSpanish ? containerES : containerEN],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        } catch (error) {
            console.error(`❌ Error enviando notificación de DLC al canal ${channelId}.`);
        }
    }
}

// --- 6. EJECUCIÓN DE COMANDOS (INTERACCIONES) ---
client.on('interactionCreate', async (interaction) => {

    // AUTOCOMPLETADO PARA /GEN
    if (interaction.isAutocomplete() && interaction.commandName === 'gen') {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = SUGERENCIAS_JUEGOS.filter(juego => juego.name.toLowerCase().includes(focusedValue));
        await interaction.respond(filtered.slice(0, 25));
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const userLocale = interaction.locale || interaction.guild?.preferredLocale;
    const lang = getLang(userLocale);

    const isSpanish = userLocale && userLocale.startsWith('es');
    const isPortuguese = userLocale && userLocale.startsWith('pt');

    // --- PROTECCIÓN DE COMANDOS EXCLUSIVOS DEL DUEÑO ---
    const ownerOnlyCommands = ['remove_channel', 'remove_game', 'force_check', 'manage_servers', 'bot_status', 'test_update', 'test_denuvo_removed', 'test_dlc'];
    if (ownerOnlyCommands.includes(interaction.commandName)) {
        if (interaction.user.id !== BOT_OWNER_ID) {
            return interaction.reply({
                content: isSpanish ? '❌ Este comando está bloqueado y solo puede ser utilizado por el creador del bot.' : '❌ This command is locked and can only be used by the bot creator.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    // --- PROTECCIÓN DE COMANDOS DE ADMINS AUTORIZADOS ---
    const adminServerCommands = ['new_denuvo', 'add_denuvo_game', 'cracked_game'];
    if (adminServerCommands.includes(interaction.commandName)) {
        const isAdminServer = botMemory.adminServers && botMemory.adminServers.includes(interaction.guildId);
        const isOwner = interaction.user.id === BOT_OWNER_ID;
        
        if (!isAdminServer && !isOwner) {
            return interaction.reply({ 
                content: isSpanish ? '❌ Este servidor no está autorizado por el dueño para usar los comandos globales de la base de datos.' : '❌ This server is not authorized by the owner to use global database commands.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }

    // COMMAND: /remove_channel (DUEÑO DEL BOT)
    if (interaction.commandName === 'remove_channel') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const type = interaction.options.getString('type');
        const targetGuildId = interaction.options.getString('server_id') || interaction.guildId;

        if (!botMemory.servers || !botMemory.servers[targetGuildId]) {
            return interaction.editReply(isSpanish ? `⚠️ No hay configuraciones guardadas para el servidor \`${targetGuildId}\`.` : `⚠️ No configurations saved for server \`${targetGuildId}\`.`);
        }

        let changesMade = false;

        if (type === 'updates' || type === 'both') {
            if (botMemory.servers[targetGuildId].channelId) {
                delete botMemory.servers[targetGuildId].channelId;
                changesMade = true;
            }
        }

        if (type === 'lua' || type === 'both') {
            if (botMemory.servers[targetGuildId].luaChannelId) {
                delete botMemory.servers[targetGuildId].luaChannelId;
                changesMade = true;
            }
        }

        if (changesMade) {
            await saveMemory();
            return interaction.editReply(isSpanish ? `✅ Los canales seleccionados (\`${type}\`) han sido eliminados del servidor \`${targetGuildId}\`.` : `✅ The selected channels (\`${type}\`) have been removed from server \`${targetGuildId}\`.`);
        } else {
            return interaction.editReply(isSpanish ? `⚠️ El servidor \`${targetGuildId}\` no tenía configurado ese tipo de canal.` : `⚠️ Server \`${targetGuildId}\` did not have that type of channel configured.`);
        }
    }

    // COMMAND: /new_updates
    if (interaction.commandName === 'new_updates') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ 
                content: isSpanish ? '❌ Necesitas permisos de gestionar canales para configurar esto.' : '❌ You need Manage Channels permissions to configure this.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const guildId = interaction.guildId;
        const chosenChannel = interaction.options.getChannel('channel');
        const channelId = chosenChannel ? chosenChannel.id : interaction.channelId;

        if (!botMemory.servers) botMemory.servers = {};
        
        if (!botMemory.servers[guildId]) {
            botMemory.servers[guildId] = { channelId: channelId };
        } else {
            botMemory.servers[guildId].channelId = channelId;
        }
        
        await saveMemory(); 

        return interaction.reply({ 
            content: isSpanish 
                ? `✅ ¡Hecho! Las alertas de Denuvo se enviarán a <#${channelId}> y hemos cargado la lista global de juegos para ti.`
                : `✅ Done! Denuvo alerts will be sent to <#${channelId}> and the global tracking list has been loaded for you.`, 
            flags: MessageFlags.Ephemeral 
        });
    }

    // COMMAND: /set_channel_for_luascript
    if (interaction.commandName === 'set_channel_for_luascript') {
        const guildId = interaction.guildId;
        const chosenChannel = interaction.options.getChannel('channel');

        if (!botMemory.servers) botMemory.servers = {};
        if (!botMemory.servers[guildId]) {
            botMemory.servers[guildId] = { luaChannelId: chosenChannel.id };
        } else {
            botMemory.servers[guildId].luaChannelId = chosenChannel.id;
        }

        await saveMemory();

        return interaction.reply({
            content: lang.setChannelSuccess(chosenChannel.id),
            flags: MessageFlags.Ephemeral
        });
    }

    // COMMAND: /gen
    if (interaction.commandName === 'gen') {
        const config = botMemory.servers ? botMemory.servers[interaction.guildId] : null;

        if (config && config.luaChannelId && interaction.channelId !== config.luaChannelId) {
            return interaction.reply({ 
                content: lang.wrongChannel(config.luaChannelId), 
                flags: MessageFlags.Ephemeral 
            });
        }

        const input = interaction.options.getString('appid').trim();
        let appId = null;
        const match = input.match(/\/app\/(\d+)/) || input.match(/^(\d+)$/);
        
        if (match && match[1]) {
            appId = match[1]; 
        } else {
            return interaction.reply({ content: lang.invalidFormat, flags: MessageFlags.Ephemeral });
        }

        await interaction.reply(lang.init);

        await generarYEnviarManifest(
            appId, 
            interaction.user, 
            interaction.channel, 
            async (datos) => {
                const editado = await interaction.editReply(datos);
                if (datos.content && (datos.content.includes('❌') || datos.content.includes('⚠️'))) {
                    setTimeout(() => {
                        interaction.deleteReply().catch(() => {});
                    }, 5000);
                }
                return editado;
            },
            userLocale
        );
    }

    // COMANDO: /descargar_juego (ENVÍA ARCHIVO .BAT, EXTRAE HERRAMIENTA EN CARPETA SEPARADA)
    if (interaction.commandName === 'download_game' || interaction.commandName === 'descargar_juego') {
        await interaction.deferReply();
        
        const input = interaction.options.getString('appid').trim();
        let appId = null;
        const match = input.match(/\/app\/(\d+)/) || input.match(/^(\d+)$/);
        
        if (match && match[1]) {
            appId = match[1]; 
        } else {
            return interaction.editReply({ content: '❌ Formato de AppID o URL inválido.' });
        }

        await interaction.editReply({ content: `⏳ Conectando con la API y generando archivos para el AppID **${appId}**...` });

        try {
            const API_KEY = 'jzVel8AgxRyn7Ghg';
            
            // 1. Obtener nombre del juego
            const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us`).catch(() => null);
            let gameName = `Juego_${appId}`;
            if (steamRes && steamRes.ok) {
                const steamData = await steamRes.json();
                if (steamData[appId] && steamData[appId].success) {
                    gameName = steamData[appId].data.name;
                }
            }
            const safeGameName = gameName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();

            // 2. Descargar Manifests de la API
            await axios.get(`https://generator.ryuu.lol/requestupdate?appid=${appId}&branch=public`, { headers: { 'X-Auth-Key': API_KEY }, timeout: 5000 }).catch(() => {});
            
            const responseManifest = await axios.get(`https://generator.ryuu.lol/api/download/${appId}?file_type=manifest`, {
                headers: { 'X-Auth-Key': API_KEY },
                responseType: 'arraybuffer',
                timeout: 20000
            });

            // Leer los manifests en memoria
            const downloadedZip = new AdmZip(responseManifest.data);
            const zipEntries = downloadedZip.getEntries();
            const manifests = zipEntries.filter(entry => entry.entryName.endsWith('.manifest'));

            if (manifests.length === 0) {
                return interaction.editReply({ content: `❌ No se encontraron manifests en la API para el AppID ${appId}.` });
            }

            // 3. Descargar LUA y guardar las Keys en un Diccionario
            let depotKeys = {};
            try {
                const luaResponse = await axios.get(`https://generator.ryuu.lol/api/download/${appId}?file_type=lua`, {
                    headers: { 'X-Auth-Key': API_KEY },
                    responseType: 'text',
                    timeout: 15000
                });

                if (luaResponse.data) {
                    const keyRegex = /(\d{3,7}).*?([a-fA-F0-9]{64})/g;
                    let matchKey;
                    while ((matchKey = keyRegex.exec(luaResponse.data)) !== null) {
                        depotKeys[matchKey[1]] = matchKey[2]; 
                    }
                }
            } catch (luaErr) {
                console.log(`[AVISO] No se pudo obtener el LUA o extraer las keys para ${appId}.`);
            }

            // 4. Construir el nuevo ZIP
            const finalZip = new AdmZip();
            
            // Empezar a redactar el .bat
            let batContent = `@echo off\n`;
            batContent += `title Descargando ${safeGameName}\n`;
            batContent += `echo ========================================================\n`;
            batContent += `echo Preparando descarga de: ${gameName}\n`;
            batContent += `echo ========================================================\n\n`;

            // Agregar script al .bat para descargar DepotDownloaderMod en una SUBCARPETA
            batContent += `IF NOT EXIST "DepotDownloader_Tool\\DepotDownloaderMod.exe" (\n`;
            batContent += `    echo [INFO] Descargando herramienta de descarga desde GitHub...\n`;
            batContent += `    if not exist "DepotDownloader_Tool" mkdir "DepotDownloader_Tool"\n`;
            batContent += `    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/Frank17xx/public/raw/main/DepotDownloaderMod.zip' -OutFile 'DepotDownloaderMod.zip'"\n`;
            batContent += `    powershell -Command "Expand-Archive -Path 'DepotDownloaderMod.zip' -DestinationPath '.\\DepotDownloader_Tool' -Force"\n`;
            batContent += `    del DepotDownloaderMod.zip\n`;
            batContent += `)\n\n`;
            batContent += `echo Iniciando descargas...\n\n`;

            let missingKeysCount = 0;

            for (const entry of manifests) {
                finalZip.addFile(entry.entryName, entry.getData()); 

                const filename = entry.entryName;
                const matchRegex = filename.match(/_(\d+)\.manifest$/);
                const manifestId = matchRegex ? matchRegex[1] : "";
                const depotId = filename.split('_')[0];

                const hexKey = depotKeys[depotId];

                batContent += `echo.\n`;
                batContent += `echo --------------------------------------------------------\n`;
                batContent += `echo Descargando Depot ${depotId}...\n`;

                // Apuntamos al .exe que ahora vive dentro de la carpeta "DepotDownloader_Tool"
                if (hexKey) {
                    batContent += `DepotDownloader_Tool\\DepotDownloaderMod.exe -app ${appId} -depot ${depotId} -manifest ${manifestId} -manifestfile "${filename}" -depotkey "${hexKey}" -dir ".\\${safeGameName}" -max-downloads 16\n`;
                } else {
                    batContent += `echo [ADVERTENCIA] No se encontro la llave de desencriptacion para el depot ${depotId}!\n`;
                    batContent += `DepotDownloader_Tool\\DepotDownloaderMod.exe -app ${appId} -depot ${depotId} -manifest ${manifestId} -manifestfile "${filename}" -dir ".\\${safeGameName}" -max-downloads 16\n`;
                    missingKeysCount++;
                }
            }

            batContent += `\necho ========================================================\n`;
            batContent += `echo Descarga de ${gameName} finalizada.\n`;
            if (missingKeysCount > 0) {
                batContent += `echo [ATENCION] Hubo ${missingKeysCount} depot(s) sin llave. Si el juego es de pago, esos archivos no se descargaron.\n`;
            }
            batContent += `echo Los archivos del juego se encuentran en la carpeta "${safeGameName}".\n`;
            batContent += `pause\n`;

            // Añadir el .bat al zip
            finalZip.addFile(`Descargar_${safeGameName}.bat`, Buffer.from(batContent, "utf8"));

            // 5. Enviar el ZIP a Discord
            const zipBuffer = finalZip.toBuffer();
            const attachment = new AttachmentBuilder(zipBuffer, { name: `${safeGameName}_Archivos.zip` });

            await interaction.editReply({ 
                content: `✅ ¡Archivos de **${gameName}** generados!\n\n📥 **Instrucciones:**\n1. Descarga el archivo \`.zip\` adjunto y extráelo en una carpeta vacía.\n2. Haz doble clic en el archivo \`Descargar_${safeGameName}.bat\`.\n*El script descargará las herramientas necesarias automáticamente sin desordenar tu carpeta.*`, 
                files: [attachment] 
            });

        } catch (error) {
            console.error(`❌ Error general en download_game:`, error);
            await interaction.editReply({ content: '❌ Ocurrió un error al generar los archivos de descarga. Intenta nuevamente más tarde.' });
        }
    }
    
     // COMMAND: /denuvo_list
    if (interaction.commandName === 'denuvo_list') {
        const gameEntries = Object.entries(botMemory.denuvoGames || {});
        
        if (gameEntries.length === 0) {
            const noGamesMsg = isPortuguese ? '❌ Este servidor não está rastreando nenhum jogo atualmente.' : (isSpanish ? '❌ Este servidor no está rastreando ningún juego actualmente.' : '❌ This server is not tracking any games currently.');
            return interaction.reply({ content: noGamesMsg, flags: MessageFlags.Ephemeral });
        }

        gameEntries.sort((a, b) => a[1].name.localeCompare(b[1].name));

        const listText = gameEntries.map(([id, gameData]) => `• **${gameData.name}** (ID: \`${id}\`)`).join('\n');
        const safeListText = listText.length > 4000 ? listText.substring(0, 4000) + '...' : listText;

        const embedTitle = isPortuguese ? '📜 Jogos Rastreados Neste Servidor' : (isSpanish ? '📜 Juegos Rastreados En Este Servidor' : '📜 Tracked Games In This Server');
        const embedFooter = isPortuguese ? `Total: ${gameEntries.length} jogos` : (isSpanish ? `Total: ${gameEntries.length} juegos` : `Total: ${gameEntries.length} tracked games`);

        const textComponent = new TextDisplayBuilder().setContent(`## ${embedTitle}\n${safeListText}\n\n*${embedFooter}*`);
        const container = new ContainerBuilder().setAccentColor(0x32e612).addTextDisplayComponents(textComponent);

        return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // COMMAND: /check_game
    if (interaction.commandName === 'check_game') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); 
        const appId = interaction.options.getInteger('appid');

        try {
            const result = await steam.getProductInfo([appId], []);
            const gameInfo = result.apps[appId];

            if (!gameInfo || !gameInfo.appinfo || !gameInfo.appinfo.common) {
                const notFoundMsg = isPortuguese ? '❌ Não foi possível encontrar esse jogo no Steam. Verifique o ID.' : (isSpanish ? '❌ No se pudo encontrar ese juego en Steam. Verifica el ID.' : '❌ Could not find that game on Steam. Check the ID.');
                return interaction.editReply(notFoundMsg);
            }

            const gameName = gameInfo.appinfo.common.name;
            const autoImage = await obtenerImagenSteam(appId);
            const appInfoText = JSON.stringify(gameInfo.appinfo).toLowerCase();
            let hasDenuvo = appInfoText.includes('denuvo');

            if (!hasDenuvo) hasDenuvo = await verificarDenuvoEnStore(appId);

            const timestamp = Math.floor(Date.now() / 1000);
            let descStatus;
            let containerColor;

            if (hasDenuvo) {
                containerColor = 0xFF0000; 
                if (isPortuguese) descStatus = 'Inclui A Proteção Denuvo Anti-Tamper';
                else if (isSpanish) descStatus = 'Incluye La Protección Denuvo Anti-Tamper';
                else descStatus = 'Includes Denuvo Anti-Tamper Protection';
            } else {
                containerColor = 0x32e612; 
                if (isPortuguese) descStatus = 'Não Inclui A Proteção Denuvo Anti-Tamper';
                else if (isSpanish) descStatus = 'No Incluye La Protección Denuvo Anti-Tamper';
                else descStatus = 'Does Not Include Denuvo Anti-Tamper Protection';
            }

            const container = new ContainerBuilder().setAccentColor(containerColor);

            const primerTexto = new TextDisplayBuilder().setContent(`## [${gameName}](https://store.steampowered.com/app/${appId}/)\n${descStatus}\n-# <t:${timestamp}:F> ( <t:${timestamp}:R> )`);
            container.addTextDisplayComponents(primerTexto);
            container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));

            if (autoImage) container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: autoImage } }));

            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`App ID: \`${appId}\``));

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            const errorMsg = isPortuguese ? '❌ Houve um erro ao consultar os servidores do Steam.' : (isSpanish ? '❌ Hubo un error al consultar los servidores de Steam.' : '❌ There was an error querying Steam servers.');
            interaction.editReply(errorMsg);
        }
    }

    // COMMAND: /help
    if (interaction.commandName === 'help') {
        const title = isPortuguese ? '<a:libro:1515755903406837891> Guia De Comandos Disponíveis' : (isSpanish ? '<a:libro:1515755903406837891> Guía De Comandos Disponibles' : '<a:libro:1515755903406837891> Available Commands Guide');
        
        const f1Name = isPortuguese ? '`/lista_denuvo`' : (isSpanish ? '`/lista_denuvo`' : '`/denuvo_list`');
        const f1Value = isPortuguese ? 'Mostra a lista dos jogos que este servidor está rastreando.' : (isSpanish ? 'Muestra la lista de los juegos que este servidor está rastreando.' : 'Shows the list of games this server is tracking.');
        
        const f2Name = isPortuguese ? '`/verificar_jogo [appid]`' : (isSpanish ? '`/comprobar_juego [appid]`' : '`/check_game [appid]`');
        const f2Value = isPortuguese ? 'Verifica em tempo real se um jogo específico do Steam tem Denuvo.' : (isSpanish ? 'Comprueba en tiempo real si un juego específico de Steam tiene Denuvo.' : 'Checks in real-time if a specific Steam game has Denuvo.');

        const f3Name = '`/gen [appid]`';
        const f3Value = isPortuguese 
            ? 'Gera um arquivo Lua/Manifest para o SteamTools para um jogo específico do Steam. Você só precisa fornecer o ID do aplicativo ou o link da loja.' 
            : (isSpanish ? 'Genera un archivo Lua/Manifest  para SteamTools de un juego específico de Steam. Solo necesitas proporcionar su AppID o el enlace de la tienda.' : 'Generates a Lua/Manifest file for SteamTools for a specific Steam game. You only need to provide its AppID or store link.');

        const textComponent1 = new TextDisplayBuilder().setContent(`## ${title}\n\n**${f1Name}**\n${f1Value}`);
        const separator = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);
        const textComponent2 = new TextDisplayBuilder().setContent(`**${f2Name}**\n${f2Value}`);
        const textComponent3 = new TextDisplayBuilder().setContent(`**${f3Name}**\n${f3Value}`);

        const container = new ContainerBuilder()
            .setAccentColor(0x21e60f)
            .addTextDisplayComponents(textComponent1)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(textComponent2)
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
            .addTextDisplayComponents(textComponent3);

        return interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // --- Comando de Prueba Build Update ---
    if (interaction.commandName === 'test_update') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const gameImage = await obtenerImagenSteam(3159330);
        await sendDiscordMessage({ title: "Assassin's Creed Shadows", idSteam: 3159330, image: gameImage, timestamp: Math.floor(Date.now() / 1000), oldVersion: "23523763", newVersion: "23682854" });
        return interaction.editReply('✅ **Mensaje de prueba (Actualización de Build) enviado** exitosamente a los canales configurados.');
    }

    // --- Comando de Prueba Denuvo Eliminado ---
    if (interaction.commandName === 'test_denuvo_removed') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const gameImage = await obtenerImagenSteam(3405690);
        await sendDenuvoRemovedMessage({ title: "EA SPORTS FC™ 26", idSteam: 3405690, image: gameImage, timestamp: Math.floor(Date.now() / 1000) });
        return interaction.editReply('✅ **Mensaje de prueba (Denuvo Eliminado) enviado** exitosamente a los canales configurados.');
    }

    // --- Comando de Prueba de DLC ---
    if (interaction.commandName === 'test_dlc') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const dlcPruebaId = 4131670; 
        const gameImage = await obtenerImagenSteam(dlcPruebaId);
        await sendDlcMessage({ gameName: "Jurassic World Evolution 3: Rebirth Expansion", parentId: 1244460, dlcId: dlcPruebaId, image: gameImage, timestamp: Math.floor(Date.now() / 1000), isTest: true });
        return interaction.editReply('✅ **Mensaje de prueba (Nuevo DLC)** enviado exitosamente al canal configurado.');
    }

    // COMMAND: /cracked_game (ADMINS AUTORIZADOS)
    if (interaction.commandName === 'cracked_game') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const appId = interaction.options.getInteger('appid');
        const cracker = interaction.options.getString('cracker');
        let RedditLink = interaction.options.getString('reddit_link');
        let csRinLink = interaction.options.getString('cs_rin_link');

        if (!RedditLink.startsWith('http://') && !RedditLink.startsWith('https://')) RedditLink = 'https://' + RedditLink;
        if (csRinLink && !csRinLink.startsWith('http://') && !csRinLink.startsWith('https://')) csRinLink = 'https://' + csRinLink;

        try {
            const result = await steam.getProductInfo([appId], []);
            const gameInfo = result.apps[appId];

            if (!gameInfo || !gameInfo.appinfo || !gameInfo.appinfo.common) return interaction.editReply(isSpanish ? '❌ Juego no encontrado en Steam.' : '❌ Game not found on Steam.');

            const gameName = gameInfo.appinfo.common.name;
            const autoImage = await obtenerImagenSteam(appId);
            const timestamp = Math.floor(Date.now() / 1000);

            const EMOJI_TITULO = '<a:pirate:1515746702651560076>';
            const EMOJI_REDDIT = '1516193773657260072'; 
            const EMOJI_CSRIN = '1516456203994267820';

            const textEN = new TextDisplayBuilder().setContent(`## ${EMOJI_TITULO} Game With Denuvo Cracked\n**[${gameName}](https://store.steampowered.com/app/${appId}/)** Was Cracked By **${cracker}**\n-# <t:${timestamp}:F> ( <t:${timestamp}:R> )`);
            const actionRowEN = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Reddit').setEmoji(EMOJI_REDDIT).setURL(RedditLink).setStyle(ButtonStyle.Link));
            if (csRinLink) actionRowEN.addComponents(new ButtonBuilder().setLabel('CS.RIN').setEmoji(EMOJI_CSRIN).setURL(csRinLink).setStyle(ButtonStyle.Link));

            const containerEN = new ContainerBuilder().setAccentColor(0xf7d82c).addTextDisplayComponents(textEN).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)).addActionRowComponents(actionRowEN).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));
            if (autoImage) containerEN.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: autoImage } }));

            const textES = new TextDisplayBuilder().setContent(`## ${EMOJI_TITULO} Juego Con Denuvo Crackeado\n**[${gameName}](https://store.steampowered.com/app/${appId}/)** Fue Crackeado Por **${cracker}**\n-# <t:${timestamp}:F> ( <t:${timestamp}:R> )`);
            const actionRowES = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Reddit').setEmoji(EMOJI_REDDIT).setURL(RedditLink).setStyle(ButtonStyle.Link));
            if (csRinLink) actionRowES.addComponents(new ButtonBuilder().setLabel('CS.RIN').setEmoji(EMOJI_CSRIN).setURL(csRinLink).setStyle(ButtonStyle.Link));

            const containerES = new ContainerBuilder().setAccentColor(0xf7d82c).addTextDisplayComponents(textES).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)).addActionRowComponents(actionRowES).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));
            if (autoImage) containerES.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: autoImage } }));

            if (botMemory.servers) {
                for (const [guildId, serverConfig] of Object.entries(botMemory.servers)) {
                    const channelId = serverConfig.channelId;
                    if (!channelId) continue;
                    try {
                        const channel = await client.channels.fetch(channelId);
                        if (channel && channel.guild) {
                            const isGuildSpanish = channel.guild.preferredLocale?.startsWith('es') || false;
                            await channel.send({ components: [isGuildSpanish ? containerES : containerEN], flags: MessageFlags.IsComponentsV2 });
                        }
                    } catch (err) {}
                }
            }

            await interaction.editReply(isSpanish ? '¡Anuncio global de crack enviado con éxito! 🎉' : 'Global crack announcement successfully sent! 🎉');
        } catch (error) {
            interaction.editReply('❌ Error.');
        }
    }

    // COMMAND: /force_check
    if (interaction.commandName === 'force_check') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await checkUpdates();
        return interaction.editReply(isSpanish ? '¡Comprobación forzada completada con éxito! 🎉' : 'Forced scan completed successfully! 🎉');
    }

    // COMMAND: /manage_servers 
    if (interaction.commandName === 'manage_servers') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const action = interaction.options.getString('action');
        const targetGuildId = interaction.options.getString('server_id');

        if (!botMemory.whitelist) botMemory.whitelist = [...defaultWhitelist];
        if (!botMemory.adminServers) botMemory.adminServers = [...defaultAdminServers];

        if (action === 'add_wl') {
            if (botMemory.whitelist.includes(targetGuildId)) return interaction.editReply(isSpanish ? `⚠️ El servidor \`${targetGuildId}\` ya está autorizado.` : `⚠️ Server \`${targetGuildId}\` is already authorized.`);
            botMemory.whitelist.push(targetGuildId);
            await saveMemory();
            return interaction.editReply(isSpanish ? `✅ Servidor \`${targetGuildId}\` añadido a la lista blanca correctamente.` : `✅ Server \`${targetGuildId}\` successfully added to the whitelist.`);
        }

        if (action === 'remove_wl') {
            if (!botMemory.whitelist.includes(targetGuildId)) return interaction.editReply(isSpanish ? `⚠️ El servidor \`${targetGuildId}\` no está en la lista blanca.` : `⚠️ Server \`${targetGuildId}\` is not in the whitelist.`);
            botMemory.whitelist = botMemory.whitelist.filter(id => id !== targetGuildId);
            botMemory.adminServers = botMemory.adminServers.filter(id => id !== targetGuildId); 
            if (botMemory.servers && botMemory.servers[targetGuildId]) delete botMemory.servers[targetGuildId];
            await saveMemory();

            try {
                const targetGuild = client.guilds.cache.get(targetGuildId);
                if (targetGuild) await targetGuild.leave();
            } catch (error) {}

            return interaction.editReply(isSpanish ? `✅ Servidor \`${targetGuildId}\` removido de la lista blanca.` : `✅ Server \`${targetGuildId}\` removed from the whitelist.`);
        }

        if (action === 'add_admin') {
            if (botMemory.adminServers.includes(targetGuildId)) return interaction.editReply(isSpanish ? `⚠️ El servidor \`${targetGuildId}\` ya tiene permisos de Admin.` : `⚠️ Server \`${targetGuildId}\` already has Admin permissions.`);
            if (!botMemory.whitelist.includes(targetGuildId)) botMemory.whitelist.push(targetGuildId); 
            botMemory.adminServers.push(targetGuildId);
            await saveMemory();
            return interaction.editReply(isSpanish ? `👑 Servidor \`${targetGuildId}\` ahora tiene permisos para añadir juegos y avisar de cracks.` : `👑 Server \`${targetGuildId}\` now has permissions to add games and announce cracks.`);
        }

        if (action === 'remove_admin') {
            if (!botMemory.adminServers.includes(targetGuildId)) return interaction.editReply(isSpanish ? `⚠️ El servidor \`${targetGuildId}\` no tiene permisos de Admin.` : `⚠️ Server \`${targetGuildId}\` does not have Admin permissions.`);
            botMemory.adminServers = botMemory.adminServers.filter(id => id !== targetGuildId);
            await saveMemory();
            return interaction.editReply(isSpanish ? `⛔ Se le han retirado los permisos de Admin al servidor \`${targetGuildId}\`.` : `⛔ Admin permissions revoked for server \`${targetGuildId}\`.`);
        }
    }

    // COMMAND: /bot_status
    if (interaction.commandName === 'bot_status') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const steamStatus = isSteamConnected 
            ? (isSpanish ? '🟢 Conectado' : (isPortuguese ? '🟢 Conectado' : '🟢 Connected')) 
            : (isSpanish ? '🔴 Desconectado' : (isPortuguese ? '🔴 Desconectado' : '🔴 Disconnected'));
            
        const totalGames = Object.keys(botMemory.denuvoGames || {}).length;
        const totalWhitelisted = (botMemory.whitelist || []).length;
        const totalAdmins = (botMemory.adminServers || []).length;
        const activeGuilds = client.guilds.cache.size;

        let updatesList = "";
        let luaList = "";
        
        if (botMemory.servers && Object.keys(botMemory.servers).length > 0) {
            for (const [sId, config] of Object.entries(botMemory.servers)) {
                const guild = client.guilds.cache.get(sId);
                const guildName = guild ? guild.name : `ID: ${sId}`; 
                const adminTag = (botMemory.adminServers && botMemory.adminServers.includes(sId)) ? " 👑" : "";
                
                if (config.channelId) {
                    updatesList += `• **${guildName}**${adminTag} ➔ <#${config.channelId}>\n`;
                }
                
                if (config.luaChannelId) {
                    luaList += `• **${guildName}**${adminTag} ➔ <#${config.luaChannelId}>\n`;
                }
            }
        }

        if (!updatesList || updatesList.trim() === "") updatesList = lang.notConfigured;
        if (!luaList || luaList.trim() === "") luaList = lang.notConfigured;

        if (updatesList.length > 900) updatesList = updatesList.substring(0, 900) + "\n*...y más (límite de texto)*";
        if (luaList.length > 900) luaList = luaList.substring(0, 900) + "\n*...y más (límite de texto)*";

        const titleText = isSpanish 
            ? '## <a:ikhjjkh:1514996517327474798> Estado & Diagnóstico del Bot' 
            : (isPortuguese ? '## <a:ikhjjkh:1514996517327474798> Status & Diagnósticos do Bot' : '## <a:ikhjjkh:1514996517327474798> Bot Status & Diagnostics');
            
        const steamNetworkLabel = isSpanish 
            ? '📡 Red de Steam' 
            : (isPortuguese ? '📡 Rede Steam' : '📡 Steam Network');

        const titleAndSteamText = new TextDisplayBuilder().setContent(`${titleText}\n${steamNetworkLabel}: \`${steamStatus}\``);
        
        const dbGamesLabel = isSpanish ? '💾 Juegos en DB' : (isPortuguese ? '💾 Jogos no DB' : '💾 Games in DB');
        const wlServersLabel = isSpanish ? '🌐 Servidores Autorizados' : (isPortuguese ? '🌐 Servidores Autorizados' : '🌐 Whitelisted Servers');
        const activeGuildsLabel = isSpanish ? '✅ Servidores Activos' : (isPortuguese ? '✅ Servidores Ativos' : '✅ Active Guilds');
        
        const statsText = new TextDisplayBuilder().setContent(`${dbGamesLabel}: \`${totalGames}\`\n${wlServersLabel}: \`${totalWhitelisted}\`\n👑 Admin Servers: \`${totalAdmins}\`\n${activeGuildsLabel}: \`${activeGuilds}\``);
        
        const channelsUpdatesText = new TextDisplayBuilder().setContent(`### ${lang.configUpdatesTitle}\n${updatesList}`);
        const channelsLuaText = new TextDisplayBuilder().setContent(`### ${lang.configLuaTitle}\n${luaList}`);

        const largeSeparator = new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large);

        const container = new ContainerBuilder()
            .setAccentColor(0xf7d82c)
            .addTextDisplayComponents(titleAndSteamText)
            .addSeparatorComponents(largeSeparator)
            .addTextDisplayComponents(statsText)
            .addSeparatorComponents(largeSeparator)
            .addTextDisplayComponents(channelsUpdatesText)
            .addSeparatorComponents(largeSeparator)
            .addTextDisplayComponents(channelsLuaText)
            .addSeparatorComponents(largeSeparator)
            .addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: 'https://cdn.discordapp.com/attachments/1420114359795060776/1517530746733203618/hihjk.gif?ex=6a369e24&is=6a354ca4&hm=70ca5825ea0e8811a7d0adaf7776d9c7f0443d9c91b6c81bdd747b8749606e7b&' } }));

        return interaction.editReply({ 
            components: [container], 
            flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressEmbeds] 
        });
    }

    // COMMAND: /new_denuvo (ADMINS AUTORIZADOS)
    if (interaction.commandName === 'new_denuvo') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const appId = interaction.options.getInteger('appid');
        try {
            const result = await steam.getProductInfo([appId], []);
            const gameInfo = result.apps[appId];
            if (!gameInfo || !gameInfo.appinfo || !gameInfo.appinfo.common) return interaction.editReply(isSpanish ? '❌ Error buscando en Steam.' : '❌ Error searching on Steam.');

            const gameName = gameInfo.appinfo.common.name;
            const autoImage = await obtenerImagenSteam(appId);
            const timestamp = Math.floor(Date.now() / 1000);

            const EMOJI_TEXTO = '<a:siren:1483833518957002842>'; 
            const EMOJI_BOTON = '1465416289077035079'; 

            const textEN = new TextDisplayBuilder().setContent(`## ${EMOJI_TEXTO} New Denuvo Game Detected\n**[${gameName}](https://store.steampowered.com/app/${appId}/)** Includes Denuvo Anti-Tamper Protection\n-# <t:${timestamp}:F> ( <t:${timestamp}:R> )`);
            const actionRowEN = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Steam Store').setEmoji(EMOJI_BOTON).setURL(`https://store.steampowered.com/app/${appId}/`).setStyle(ButtonStyle.Link));

            const containerEN = new ContainerBuilder().setAccentColor(0xff0000).addTextDisplayComponents(textEN).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)).addActionRowComponents(actionRowEN).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)); 
            if (autoImage) containerEN.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: autoImage } })); 

            const textES = new TextDisplayBuilder().setContent(`## ${EMOJI_TEXTO} Nuevo Juego Con Denuvo Detectado\n**[${gameName}](https://store.steampowered.com/app/${appId}/)** Incluye La Protección Denuvo Anti-Tamper\n-# <t:${timestamp}:F> ( <t:${timestamp}:R> )`);
            const actionRowES = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Tienda de Steam').setEmoji(EMOJI_BOTON).setURL(`https://store.steampowered.com/app/${appId}/`).setStyle(ButtonStyle.Link));

            const containerES = new ContainerBuilder().setAccentColor(0xff0000).addTextDisplayComponents(textES).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)).addActionRowComponents(actionRowES).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)); 
            if (autoImage) containerES.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: autoImage } })); 

            if (botMemory.servers) {
                for (const [guildId, serverConfig] of Object.entries(botMemory.servers)) {
                    if (!serverConfig.channelId) continue;
                    try {
                        const channel = await client.channels.fetch(serverConfig.channelId);
                        if (channel && channel.guild) {
                            const isGuildSpanish = channel.guild.preferredLocale?.startsWith('es') || false;
                            await channel.send({ components: [isGuildSpanish ? containerES : containerEN], flags: MessageFlags.IsComponentsV2 });
                        }
                    } catch (err) {}
                }
            }

            await interaction.editReply(isSpanish ? 'Anuncio global enviado 🎉' : 'Global announcement sent 🎉');
        } catch (error) {
            interaction.editReply('❌ Error.');
        }
    }

    // COMMAND: /add_denuvo_game (ADMINS AUTORIZADOS)
    if (interaction.commandName === 'add_denuvo_game') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); 
        const appId = interaction.options.getInteger('appid');
        try {
            const result = await steam.getProductInfo([appId], []);
            const gameInfo = result.apps[appId];
            if (!gameInfo || !gameInfo.appinfo || !gameInfo.appinfo.common) return interaction.editReply(isSpanish ? '❌ Error buscando en Steam.' : '❌ Steam search error.');

            const gameName = gameInfo.appinfo.common.name;
            const autoImage = await obtenerImagenSteam(appId); 

            if (!botMemory.denuvoGames) botMemory.denuvoGames = {};
            botMemory.denuvoGames[appId] = { name: gameName }; 
            
            await saveMemory(); 
            
            const timestamp = Math.floor(Date.now() / 1000);
            const EMOJI_TEXTO = '<a:rocket:1515752381290123424>'; 

            const textEN = new TextDisplayBuilder().setContent(`## [${gameName}](https://store.steampowered.com/app/${appId}/)\n${EMOJI_TEXTO} Has been added to the database...\n-# <t:${timestamp}:F> ( <t:${timestamp}:R> )`);
            const containerEN = new ContainerBuilder().setAccentColor(0x1e2bdb).addTextDisplayComponents(textEN).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));
            if (autoImage) containerEN.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: autoImage } }));

            const textES = new TextDisplayBuilder().setContent(`## [${gameName}](https://store.steampowered.com/app/${appId}/)\n${EMOJI_TEXTO} Se ha añadido a la base de datos...\n-# <t:${timestamp}:F> ( <t:${timestamp}:R> )`);
            const containerES = new ContainerBuilder().setAccentColor(0x1e2bdb).addTextDisplayComponents(textES).addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large));
            if (autoImage) containerES.addMediaGalleryComponents(new MediaGalleryBuilder().addItems({ media: { url: autoImage } }));

            if (botMemory.servers) {
                for (const [guildId, serverConfig] of Object.entries(botMemory.servers)) {
                    if (!serverConfig.channelId) continue;
                    try {
                        const channel = await client.channels.fetch(serverConfig.channelId);
                        if (channel && channel.guild) {
                            const isGuildSpanish = channel.guild.preferredLocale?.startsWith('es') || false;
                            await channel.send({ components: [isGuildSpanish ? containerES : containerEN], flags: MessageFlags.IsComponentsV2 });
                        }
                    } catch (err) {}
                }
            }

            await interaction.editReply(isSpanish ? 'Juego guardado y anunciado globalmente 🎉' : 'Game saved and announced globally 🎉');
        } catch (error) {
            interaction.editReply('❌ Error.');
        }
    }

    // COMMAND: /remove_game
    if (interaction.commandName === 'remove_game') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); 
        const appId = interaction.options.getInteger('appid');

        try {
            const gameData = botMemory.denuvoGames ? botMemory.denuvoGames[appId] : null;

            if (gameData) {
                const gameName = gameData.name;
                
                delete botMemory.denuvoGames[appId];
                if (botMemory.savedVersions && botMemory.savedVersions[appId]) delete botMemory.savedVersions[appId];
                if (botMemory.denuvoStatus && botMemory.denuvoStatus[appId] !== undefined) delete botMemory.denuvoStatus[appId];

                await saveMemory();

                return interaction.editReply(isSpanish ? `El juego **${gameName}** (ID: ${appId}) ha sido eliminado completamente 🗑️` : `The game **${gameName}** (ID: ${appId}) has been completely removed 🗑️`);
            } else {
                return interaction.editReply(isSpanish ? `No encontré ningún juego guardado con el ID **${appId}** ❌` : `I couldn't find any saved game con ID **${appId}** ❌`);
            }
        } catch (error) {
            console.error("Error deleting the game:", error);
            interaction.editReply(isSpanish ? '❌ Hubo un error al intentar borrar el juego.' : '❌ There was an error trying to delete the game.');
        }
    }
});

// --- GENERADOR AUTOMÁTICO VÍA TEXTO ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const msgContent = message.content.trim();
    const guildLocale = message.guild?.preferredLocale || 'es';
    const lang = getLang(guildLocale);

    if (/^\d+$/.test(msgContent)) {
        const config = botMemory.servers ? botMemory.servers[message.guildId] : null;
        
        if (config && config.luaChannelId && message.channelId !== config.luaChannelId) {
             return; 
        }

        const appId = msgContent;
        const loadingMsg = await message.channel.send(lang.init);

        await generarYEnviarManifest(
            appId,
            message.author,
            message.channel,
            async (datos) => {
                const editado = await loadingMsg.edit(datos);
                
                if (datos.content && (datos.content.includes('❌') || datos.content.includes('⚠️'))) {
                    setTimeout(() => {
                        editado.delete().catch(() => {});
                        message.delete().catch(() => {}); 
                    }, 5000);
                }
                return editado;
            },
            guildLocale
        );
    }
});

// --- 7. AUTO-SALIDA, DM AL DUEÑO Y AVISO EN TU CANAL ---
const CANAL_DE_AVISOS_ID = "1499038088733790391"; 

client.on('guildCreate', async (guild) => {
    const isWhitelisted = botMemory.whitelist && botMemory.whitelist.includes(guild.id);

    if (!isWhitelisted) {
        try {
            const owner = await guild.fetchOwner();
            
            if (owner) {
                const ownerId = process.env.OWNER_ID || "684122651660255359";
                const mensajeSalida = 
                    `🇪🇸 Para usar el bot en tu servidor contacta a: **<@${ownerId}>**\n\n` +
                    `🇺🇸 To use the bot on your server, contact: **<@${ownerId}>**\n\n` +
                    `🇧🇷 Para usar o bot no seu servidor, contate: **<@${ownerId}>**`;
                
                await owner.send(mensajeSalida);
            }
        } catch (error) {
            console.error(`No pude enviarle el DM al dueño del server: ${guild.name}.`);
        }

        try {
            const canalAvisos = client.channels.cache.get(CANAL_DE_AVISOS_ID);
            if (canalAvisos) {
                await canalAvisos.send(`🚨 Alguien intentó añadir El Bot a un Servidor **${guild.name}** (ID: \`${guild.id}\`).\n🚪 *Saliendo automáticamente y dejando un DM.*`);
            }
        } catch (error) {
            console.error("No se pudo enviar el mensaje al canal de avisos:", error);
        }

        try {
            await guild.leave();
            console.log(`🚪 Me salí automáticamente de: ${guild.name} (${guild.id})`);
        } catch (error) {
            console.error(`Error al intentar salirme del server ${guild.name}:`, error);
        }
    }
});

// --- 8. LOG IN THE BOT ---
if (!process.env.TOKEN) {
    console.error("❌ ERROR CRÍTICO: No se encontró la variable TOKEN en Render.");
}

client.login(process.env.TOKEN).catch((error) => {
    console.error("❌ ERROR DE DISCORD AL INICIAR SESIÓN:", error);
});