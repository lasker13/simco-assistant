// Dictionnaire complet des ressources Sim Companies
const globalResourceMap = {
    1: "Power", 2: "Water", 3: "Apples", 4: "Oranges", 5: "Grapes", 6: "Grain", 
    7: "Steak", 8: "Sausages", 9: "Eggs", 10: "Crude oil", 11: "Petrol", 12: "Diesel", 
    13: "Transport", 14: "Minerals", 15: "Bauxite", 16: "Silicon", 17: "Chemicals", 
    18: "Aluminium", 19: "Plastic", 20: "Processors", 21: "Electronic components", 
    22: "Batteries", 23: "Displays", 24: "Smart phones", 25: "Tablets", 26: "Laptops", 
    27: "Monitors", 28: "Televisions", 29: "Plant research", 30: "Energy research", 
    31: "Mining research", 32: "Electronics research", 33: "Breeding research", 
    34: "Chemistry research", 35: "Software", 40: "Cotton", 41: "Fabric", 
    42: "Iron ore", 43: "Steel", 44: "Sand", 45: "Glass", 46: "Leather", 
    47: "On-board computer", 48: "Electric motor", 49: "Luxury car interior", 
    50: "Basic interior", 51: "Car body", 52: "Combustion engine", 53: "Economy e-car", 
    54: "Luxury e-car", 55: "Economy car", 56: "Luxury car", 57: "Truck", 
    58: "Automotive research", 59: "Fashion research", 60: "Underwear", 61: "Gloves", 
    62: "Dress", 63: "Stiletto Heel", 64: "Handbags", 65: "Sneakers", 66: "Seeds", 
    67: "Xmas crackers", 68: "Gold ore", 69: "Golden bars", 70: "Luxury watch", 
    71: "Necklace", 72: "Sugarcane", 73: "Ethanol", 74: "Methane", 75: "Carbon fibers", 
    76: "Carbon composite", 77: "Fuselage", 78: "Wing", 79: "High grade e-comps", 
    80: "Flight computer", 81: "Cockpit", 82: "Attitude control", 83: "Rocket fuel", 
    84: "Propellant tank", 85: "Solid fuel booster", 86: "Rocket engine", 87: "Heat shield", 
    88: "Ion drive", 89: "Jet engine", 90: "Sub-orbital nd stage", 91: "Sub-orbital rocket", 
    92: "Orbital booster", 93: "Starship", 94: "BFR", 95: "Jumbo jet", 96: "Luxury jet", 
    97: "Single engine plane", 98: "Quadcopter", 99: "Satellite", 100: "Aerospace research", 
    101: "Reinforced concrete", 102: "Bricks", 103: "Cement", 104: "Clay", 105: "Limestone", 
    106: "Wood", 107: "Steel beams", 108: "Planks", 109: "Windows", 110: "Tools", 
    111: "Construction units", 112: "Bulldozer", 113: "Materials research", 114: "Robots", 
    115: "Cows", 116: "Pigs", 117: "Milk", 118: "Coffee beans", 119: "Coffee powder", 
    120: "Vegetables", 121: "Bread", 122: "Cheese", 123: "Apple pie", 124: "Orange juice", 
    125: "Apple cider", 126: "Ginger beer", 127: "Frozen pizza", 128: "Pasta", 
    129: "Hamburger", 130: "Lasagna", 131: "Meat balls", 132: "Cocktails", 133: "Flour", 
    134: "Butter", 135: "Sugar", 136: "Cocoa", 137: "Dough", 138: "Sauce", 
    139: "Fodder", 140: "Chocolate", 141: "Vegetable oil", 142: "Salad", 143: "Samosa", 
    145: "Recipes"
};

// Fonction de remplacement des balises :re-X: par le nom de la ressource
function parseResourceTags(text) {
    if (!text) return '';
    return text.replace(/:re-(\d+):/g, (match, resourceId) => {
        const resourceName = globalResourceMap[resourceId];
        if (resourceName) {
            return `<span class="resource-tag" style="color: #0059ff;">[${resourceName}]</span>`;
        }
        return match;
    });
}

// Sécurité HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    let currentRoom = 'Q'; // Salon social par défaut en premier

    // 1. Gestion de la navigation (Sidebar Home / Chat)
    const navHome = document.getElementById('nav-home');
    const navChat = document.getElementById('nav-chat');
    const viewHome = document.getElementById('view-home');
    const viewChat = document.getElementById('view-chat');

    if (navHome && navChat && viewHome && viewChat) {
        navHome.addEventListener('click', () => {
            viewHome.style.display = 'block';
            viewChat.style.display = 'none';
            document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));
            navHome.classList.add('active');
        });

        navChat.addEventListener('click', () => {
            viewHome.style.display = 'none';
            viewChat.style.display = 'block';
            document.querySelectorAll('.sidebar .nav-item').forEach(el => el.classList.remove('active'));
            navChat.classList.add('active');
            loadChat(currentRoom);
        });
    }

    // 2. Charger et afficher les messages avec filtres intelligents
    async function loadChat(room = 'Q', filters = {}) {
        currentRoom = room;
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML = `<div class="chat-message"><span class="chat-text">Chargement des messages...</span></div>`;

        try {
            const response = await fetch(`/api/chat/${room}`);
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

            const messages = await response.json();

            if (!Array.isArray(messages) || messages.length === 0) {
                container.innerHTML = `<div class="chat-message"><span class="chat-text">Aucun message enregistré pour ce salon.</span></div>`;
                return;
            }

            const keyword = (filters.keyword || '').toLowerCase();
            const player = (filters.player || '').toLowerCase();
            const dateFilter = filters.date || '';

            const filtered = messages.filter(msg => {
                const rawMsg = msg.message || '';
                // On traduit le texte pour que la recherche lise directement les noms (ex: "Power")
                const translatedText = parseResourceTags(rawMsg).toLowerCase();
                // On combine le texte brut et le texte traduit pour élargir les résultats
                const fullText = (rawMsg + ' ' + translatedText).toLowerCase();
                
                const sender = (msg.sender || '').toLowerCase();
                const msgDate = msg.time ? msg.time.split('T')[0] : '';

                const matchKeyword = !keyword || fullText.includes(keyword);
                const matchPlayer = !player || sender.includes(player);
                const matchDate = !dateFilter || msgDate === dateFilter;

                return matchKeyword && matchPlayer && matchDate;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div style="padding: 20px; text-align: center; opacity: 0.6;">Aucun message trouvé avec ces filtres.</div>`;
                return;
            }

            container.innerHTML = filtered.map(msg => {
                const rawTime = msg.time || msg.datetime;
                let timeStr = '';
                if (rawTime) {
                    const dateObj = new Date(rawTime);
                    if (!isNaN(dateObj.getTime())) {
                        const datePart = dateObj.toLocaleDateString('fr-FR');
                        const timePart = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                        timeStr = `${datePart} ${timePart}`;
                    } else {
                        timeStr = rawTime;
                    }
                }

                return `
                    <div class="chat-message">
                        <span class="chat-time" style="min-width: 130px; display: inline-block; color:#888; font-size: 0.9em;">${timeStr}</span>
                        <span class="chat-player" style="font-weight: bold; margin-right: 8px;">${escapeHtml(msg.sender)} :</span>
                        <span class="chat-text">${parseResourceTags(msg.message)}</span>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('❌ Erreur lors du chargement du chat :', error);
            container.innerHTML = `<div class="chat-message"><span class="chat-text" style="color: red;">Erreur lors de la récupération des messages.</span></div>`;
        }
    }

    // 3. Gestion des clics sur les onglets de salons
    const chatTabs = document.querySelectorAll('.chat-tab');
    chatTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            chatTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const room = tab.getAttribute('data-room') || 'Q';
            loadChat(room);
        });
    });

    // 4. Gestion de la recherche
    const btnSearch = document.getElementById('btn-search');
    if (btnSearch) {
        btnSearch.addEventListener('click', async () => {
            const originalText = btnSearch.textContent;
            btnSearch.textContent = '⏳ Recherche...';
            btnSearch.classList.add('loading');

            const keyword = document.getElementById('search-keyword')?.value || '';
            const player = document.getElementById('search-player')?.value || '';
            const date = document.getElementById('search-date')?.value || '';

            await loadChat(currentRoom, { keyword, player, date });

            btnSearch.textContent = originalText;
            btnSearch.classList.remove('loading');
        });
    }

    // Entrée clavier pour la recherche
    ['search-keyword', 'search-player', 'search-date'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('btn-search')?.click();
                }
            });
        }
    });

    // Chargement initial sur le salon 'Q' (Social) au démarrage
    loadChat('Q');

    // Actualisation automatique toutes les 3 minutes
    setInterval(() => {
        if (viewChat && viewChat.style.display !== 'none') {
            loadChat(currentRoom);
        }
    }, 3 * 60 * 1000);
});