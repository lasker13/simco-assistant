const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Force l'utilisation d'IPv4

require('dotenv').config(); // Permet de lire le fichier .env en local
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ton cookie Sim Companies (idéalement à mettre dans les variables d'env Render)
const SIM_COOKIE = process.env.SIM_COOKIE || 'sessionid=_ga=GA1.1.27867126.1765398854; __stripe_mid=fce92b60-2913-41f3-89ea-7c97c59d2150a1dc38; _ga_JX74LESVWN=GS2.1.s1777712918$o112$g0$t1777712918$j60$l0$h0; _ga_L9BF2VH0YN=GS2.1.s1777712919$o111$g0$t1777712919$j60$l0$h973502020; last-exchange-resource-0=145; last-exchange-resource-1=145; hiddenPins=["F-39859174"]; __stripe_sid=4fe373e2-9099-4236-bba5-7de8fd5bd66872466a; daily-achievements-4626318=collected; daily-achievements-5171914=collected; amp_a5727e=hxkEgsSr-gUe5EIB41hI8w...1k17isp2a.1k17kfv29.j0.j0.160; amp_a5727e_simcompanies.com=hxkEgsSr-gUe5EIB41hI8w...1k17isqff.1k17kfv4a.pb.pb.1im; sessionid=.eJx1UslOwzAQ_ZdcaaPx2HHs3FoQiE1UAiQ4RU46bkvTpNgJqEL8O05YKraLLc3zW-bJL1FeemfbZk11lEULe33auOuT88sNc7On6eHhw0W7npGcwYT41T3NfP14B8eTI8ntqtNLn-rq1iVdcdY9n0y30SjKTdcu886Ty1fzICkEaobpd6QwZTDs4W1lduR83GPxJBzTD-jb-6Xxy_B4DoVBoRgi2QQkJBznBsEUVouEkxXEFJU0l0pysFJaUxAqaaDkDLQyQfTdb4jGkStIcBSVzWZr6t0wFBIlZ2o_zB2ZajNgbBQNkVofsiCgHIMao75BCLRM8JinUiAcAGQAe6_K1IvOLCiQrNuPfee3YVHqW4A_xv_ZyDhUoHT6ZVMZ3-ambFdNnXvyvr_XtPtNVplI4lSh0vyL_EkYRMqm9lR27eqJPgU_SnoXS8YgxozdgMxQZxxi1ADsRxJHz41bh7ZSpYBLISGGP7YLtfqm_3PR6xvNLMRy:1x0Pyn:hCyDWkdybSVUADFzg4Qx09-ncgmZbL5nt1A8tP7fQFc';
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Sert tes fichiers index.html et app.js

// Connexion à Neon / Base de données PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false 
  },
  family: 4 // <-- LA SOLUTION MAGIQUE EST ICI : Force la connexion à la DB en IPv4 !
});

// Création automatique de la table
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        room TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        time TEXT NOT NULL,
        CONSTRAINT unique_msg UNIQUE(room, sender, message, time)
      );
    `);
    console.log('✅ Table "messages" prête sur la base de données.');
  } catch (err) {
    console.error('❌ Erreur initialisation DB :', err);
  }
}
initDB();

// Route : Récupérer l'historique pour le front
app.get('/api/chat/:room', async (req, res) => {
  const room = req.params.room.toUpperCase();
  const validRooms = ['F', 'S', 'T', 'Q'];

  if (!validRooms.includes(room)) {
    return res.status(400).json({ error: 'Salon invalide.' });
  }

  try {
    const result = await pool.query(`
      SELECT id, sender, message, time, room 
      FROM messages 
      WHERE room = $1 
      ORDER BY time DESC
    `, [room]);

    res.json(result.rows);
  } catch (dbError) {
    res.status(500).json({ error: 'Erreur Base de données' });
  }
});

const https = require('https');

// Fonction utilitaire pour simuler un fetch forcé en IPv4 (contourne le blocage Render)
// Fonction utilitaire ultra-robuste pour forcer l'IPv4 via DNS lookup
function fetchIPv4(url, cookie) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        // On force la recherche DNS en IPv4 pur
        dns.lookup(urlObj.hostname, { family: 4 }, (err, address) => {
            if (err) {
                return reject(new Error("Erreur DNS IPv4 : " + err.message));
            }

            const options = {
                hostname: address, // On utilise l'adresse IP IPv4 directement
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Host': urlObj.hostname, // On transmet le domaine d'origine dans le header
                    'Cookie': cookie,
                    'User-Agent': 'Mozilla/5.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            json: async () => JSON.parse(data)
                        });
                    } catch (e) {
                        reject(new Error("Réponse JSON invalide de Sim Companies"));
                    }
                });
            });

            req.on('error', (err) => { reject(err); });
            req.end();
        });
    });
}

// Synchro automatique avec Sim Companies
async function fetchAndSaveSimCompaniesMessages() {
  const rooms = ['F', 'S', 'T', 'Q'];
  console.log("🟢 LA FONCTION DE SYNCHRO VIENT DE SE LANCER !");
  let success = true;
  
  for (const room of rooms) {
    const url = `https://www.simcompanies.com/api/v2/chatroom/${room}/`;
    try {
      const response = await fetchIPv4(url, SIM_COOKIE);

      if (!response.ok) {
        success = false;
        continue;
      }

      let messages = await response.json();
      if (!Array.isArray(messages)) continue;

      for (const msg of messages) {
        const sender = (msg.sender && msg.sender.company) ? msg.sender.company : 'Inconnu';
        const text = msg.body || '';
        const time = msg.datetime || new Date().toISOString();
        
        if (text.trim() !== '') {
          await pool.query(`
            INSERT INTO messages (room, sender, message, time)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (room, sender, message, time) DO NOTHING
          `, [room, sender, text, time]);
        }
      }
      console.log(`[${new Date().toLocaleTimeString()}] Chat ${room} synchronisé avec succès.`);
    } catch (err) {
      console.error(`❌ Erreur chat ${room} :`, err.message);
      success = false;
    }
  }
  return success;
}

// Route de monitoring / déclenchement (appelée par UptimeRobot ou cron-job.org)
app.get('/api/trigger-sync', async (req, res) => {
  console.log("⏰ Ping reçu sur /api/trigger-sync : Lancement de la synchronisation forcée...");
  const success = await fetchAndSaveSimCompaniesMessages();
  
  if (success) {
    res.status(200).json({ status: "success", message: "Synchronisation forcée réussie !" });
  } else {
    res.status(500).json({ status: "error", message: "Erreur lors de la synchronisation." });
  }
});

// Synchronisation périodique de secours (toutes les 3 minutes)
setInterval(fetchAndSaveSimCompaniesMessages, 3 * 60 * 1000);

// Servir l'interface au visiteur
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
  fetchAndSaveSimCompaniesMessages();
});
app.get('/api/company-stats', async (req, res) => {
    try {
        // 1. Données d'authentification (Cash, Employés, Frais administratifs...)
        const authRes = await fetchIPv4('https://www.simcompanies.com/api/v3/companies/auth-data/', SIM_COOKIE);
        const authData = authRes.ok ? await authRes.json() : {};

        // 2. Aperçu des finances passées (Classement, EVA score, etc.)
        const overviewRes = await fetchIPv4('https://www.simcompanies.com/api/v2/companies/me/past-finances-overview/', SIM_COOKIE);
        const overviewData = overviewRes.ok ? await overviewRes.json() : {};

        // 3. Cashflow récent (Profits, salaires, etc.)
        const cashflowRes = await fetchIPv4('https://www.simcompanies.com/api/v2/companies/me/cashflow/recent/', SIM_COOKIE);
        const cashflowData = cashflowRes.ok ? await cashflowRes.json() : {};

        // 4. Finances passées détaillées (pour les graphiques / historique)
        const pastFinancesRes = await fetchIPv4('https://www.simcompanies.com/api/v3/companies/me/past-finances/', SIM_COOKIE);
        const pastFinancesData = pastFinancesRes.ok ? await pastFinancesRes.json() : {};

        const company = authData.company || authData;

        res.json({
            companyValue: company.companyValue || 0,
            adminCosts: company.overheadRate || 0,
            netProfit: cashflowData.netProfit || 0,
            rank: overviewData.rank || company.rank || 0,
            rankTop: overviewData.topPercentage || 0,
            placesChanged: overviewData.placesChanged || 0,
            cash: company.cash || 0,
            evaScore: overviewData.evaScore || 0,
            employees: company.employeesCount || company.employees || 0,
            dailyRevenue: cashflowData.revenue || 0,
            levels: company.level || 1,
            pastFinances: pastFinancesData
        });

    } catch (err) {
        console.error("❌ Erreur /api/company-stats :", err.message);
        res.status(500).json({ error: "Erreur serveur lors de la récupération des stats" });
    }
});