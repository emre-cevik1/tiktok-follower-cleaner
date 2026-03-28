// ==========================================
// TIKTOK MASTER CONTROL PANEL (V6.0)
// ==========================================

class TikTokGUIBot {
    constructor() {
        this.followingList = new Set();
        this.followersList = new Set();
        this.nonFollowersList = [];
        this.stopSignal = false;
        this.delay = ms => new Promise(res => setTimeout(res, ms));
        
        this.createPanel();
    }

    createPanel() {
        const oldPanel = document.getElementById('tiktok-master-panel');
        if(oldPanel) oldPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'tiktok-master-panel';
        panel.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; 
            background: rgba(0, 0, 0, 0.9); color: white; 
            padding: 15px; border-radius: 10px; z-index: 99999;
            box-shadow: 0 0 10px rgba(0,255,255,0.5);
            font-family: sans-serif; font-size: 12px; width: 220px;
        `;
        
        panel.innerHTML = `
            <h3 style="margin:0 0 10px 0; color:#00f2ea; text-align:center;">TikTok Temizleyici</h3>
            <div id="status-text" style="margin-bottom:10px; color:#aaa;">Durum: Hazır</div>
            
            <button id="btn-scan-following" style="${this.btnStyle('#333')}">1. Takip Edilenleri Tara</button>
            <button id="btn-scan-followers" style="${this.btnStyle('#333')}">2. Takipçileri Tara</button>
            <button id="btn-analyze" style="${this.btnStyle('#005500')}">3. Analiz Et</button>
            <button id="btn-unfollow" style="${this.btnStyle('#880000')}">4. Takipten Çık (Başlat)</button>
            <button id="btn-stop" style="${this.btnStyle('#555')}">🛑 DURDUR</button>
            
            <div style="margin-top:10px; font-size:10px; color:#666;">
                Takip Edilenler: <span id="lbl-following">0</span><br>
                Takipçiler: <span id="lbl-followers">0</span>
            </div>
        `;

        document.body.appendChild(panel);

        document.getElementById('btn-scan-following').onclick = () => this.startScrape('FOLLOWING');
        document.getElementById('btn-scan-followers').onclick = () => this.startScrape('FOLLOWERS');
        document.getElementById('btn-analyze').onclick = () => this.analyze();
        document.getElementById('btn-unfollow').onclick = () => this.massUnfollow();
        document.getElementById('btn-stop').onclick = () => { this.stopSignal = true; this.updateStatus("Durduruldu."); };
    }

    btnStyle(bgColor) {
        return `
            display:block; width:100%; padding:8px; margin-bottom:5px; 
            background:${bgColor}; color:white; border:1px solid #444; 
            cursor:pointer; border-radius:4px; font-weight:bold;
        `;
    }

    updateStatus(text) {
        const el = document.getElementById('status-text');
        if(el) el.innerText = text;
        console.log(`[DURUM]: ${text}`);
    }

    updateCounts() {
        document.getElementById('lbl-following').innerText = this.followingList.size;
        document.getElementById('lbl-followers').innerText = this.followersList.size;
    }


    async startScrape(type) {
        this.updateStatus(`${type} aranıyor...`);
        
        let scrollableDiv = this.findScrollableDiv();

        if (!scrollableDiv) {
            alert(`Lütfen önce ekrandan '${type === "FOLLOWING" ? "Takip Edilenler" : "Takipçiler"}' listesini açın, sonra butona basın.`);
            this.updateStatus("Liste bulunamadı!");
            return;
        }

        let lastCount = 0;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            if (this.stopSignal) { this.stopSignal = false; return; }
            
            scrollableDiv.scrollTop = scrollableDiv.scrollHeight;
            this.updateStatus(`Taranıyor... (${document.querySelectorAll('div[role="dialog"] a[href^="/@"]').length} kişi)`);
            
            await this.delay(800);

            const currentLen = document.querySelectorAll('div[role="dialog"] a[href^="/@"]').length;
            if (currentLen > lastCount) {
                lastCount = currentLen;
                attempts = 0;
                const items = document.querySelectorAll('div[role="dialog"] li');
                if(items.length > 0) items[items.length-1].scrollIntoView();
            } else {
                attempts++;
                await this.delay(500);
            }
        }


        const links = document.querySelectorAll('div[role="dialog"] a[href^="/@"]');
        const targetSet = type === "FOLLOWING" ? this.followingList : this.followersList;
        
        links.forEach(el => {
            const user = el.getAttribute('href').replace('/@', '');
            if(user) targetSet.add(user);
        });

        this.updateCounts();
        this.updateStatus(`${type} Bitti! Pencereyi kapatabilirsiniz.`);
        alert(`${type} Tarandı. Pencereyi kapatıp diğerine geçin.`);
    }

    findScrollableDiv() {

        const dialog = document.querySelector('div[role="dialog"]');
        if(!dialog) return null;

        const divs = dialog.querySelectorAll('div');
        for (let div of divs) {
            const style = window.getComputedStyle(div);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                return div;
            }
        }

        return dialog.querySelector('ul')?.parentElement;
    }

    analyze() {
        if (this.followingList.size === 0 || this.followersList.size === 0) {
            alert("Önce iki listeyi de taramanız lazım!");
            return;
        }

        this.nonFollowersList = [];
        this.followingList.forEach(user => {
            if (!this.followersList.has(user)) this.nonFollowersList.push(user);
        });

        this.updateStatus(`HEDEF: ${this.nonFollowersList.length} KİŞİ`);
        console.table(this.nonFollowersList);
        alert(`Analiz Bitti! ${this.nonFollowersList.length} kişi seni takip etmiyor.\n\nŞimdi 'Takip Edilenler' listesini aç ve 'Takipten Çık' butonuna bas.`);
    }

    async massUnfollow() {
        if (this.nonFollowersList.length === 0) {
            alert("Silinecek kimse yok veya analiz yapılmadı.");
            return;
        }


        const listItems = document.querySelectorAll('div[role="dialog"] li, div[role="dialog"] div[data-e2e="user-list-item"]');
        if (listItems.length === 0) {
            alert("Lütfen 'Takip Edilenler' listesini açın ve en alta kadar yüklendiğinden emin olun (Gerekirse '1. Butona' tekrar basıp taratın).");
            return;
        }

        if(!confirm(`${this.nonFollowersList.length} kişiyi silmek üzeresiniz. Başlasın mı?`)) return;

        this.updateStatus("Silme işlemi başladı...");
        let count = 0;

        for (const item of listItems) {
            if (this.stopSignal) {
                this.stopSignal = false;
                this.updateStatus("İşlem durduruldu.");
                break;
            }

            const linkElement = item.querySelector('a[href^="/@"]');
            if (!linkElement) continue;
            const username = linkElement.getAttribute('href').replace('/@', '');

            if (this.nonFollowersList.includes(username)) {
                const btn = item.querySelector('button');
                if (!btn) continue;

                const txt = btn.innerText.toLowerCase();

                if (txt.includes("following") || txt.includes("takip ediliyor")) {
                    
                    item.scrollIntoView({behavior: "auto", block: "center"});
                    btn.click();
                    count++;
                    
                    this.updateStatus(`Silindi: ${username} (${count})`);
                    
                    // Soğuma Süresi (Bot koruması için)
                    // 0.5 - 1.5 saniye arası
                    await this.delay(Math.floor(Math.random() * 1000) + 500);
                }
            }
        }
        this.updateStatus("İşlem Tamamlandı!");
        alert("Bitti!");
    }
}

window.guiBot = new TikTokGUIBot();
