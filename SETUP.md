# File Store Bot — Deno Deploy Setup

## Kya theek/naya kiya gaya (pichhle version se)
- ✅ **Multiple storage & force-sub channels/groups** — pehle sirf 1-1 ho sakta tha, ab jitne chaho
- ✅ **Group force-sub bug fix** — link ke andar channel-ID ka sign/type properly save hota hai ab (pehle hamesha `-100` assume hota tha, group links todta tha)
- ✅ **`/broadcast`** ab dono bots me hai — kaam bhi karta hai (queue + cron se)
- ✅ **Multi-owner support** — agar `OWNERS` me kai IDs hain, sabko notification jata hai, koi bhi reply kar sakta hai
- ✅ **Auto-delete ab actually kaam karta hai** — `Deno.cron` se har minute check hota hai, expired files delete ho jati hain
- ✅ **Default secret hata diya** — `LINK_SECRET_KEY` ab zaroor set karni hogi, warna links generate hi nahi honge (security ke liye jaan-bujh kar)
- ✅ Dead/incomplete code hata diya

## Files
```
config.js     - OWNERS (hardcoded), env vars, constants
telegram.js   - Telegram API wrapper
linkutil.js   - stateless signed get/batch links (fixed for groups)
kv.js         - Deno KV storage (sirf zaroori cheezein: channels, shorteners, clones, settings, verified-passes, broadcast queue)
mainbot.js    - Master bot: token receive, approve/reject, /broadcast, reply-bridge
storebot.js   - Har clone ka File Store logic: admin commands, delivery, forcesub, shortener
cron.js       - auto-delete + broadcast queue draining
main.js       - entrypoint (HTTP server + Deno.cron)
deno.json     - run config
```

## Deploy Steps (Deno Deploy — free, no credit card)

1. **`OWNERS` set karo** — `config.js` file me apni Telegram User ID(s) daalo:
   ```js
   export const OWNERS = [5351848105, 5344078567];
   ```
2. Poora folder **GitHub repo** me push karo
3. [dash.deno.com](https://dash.deno.com) par jao → **New Project → Deploy from GitHub** → apna repo select karo
4. **Entry point**: `main.js`
5. **Environment Variables** add karo (Project Settings → Environment Variables):
   - `BOT_TOKEN` — apne Master bot ka token
   - `WEBHOOK_SECRET` — koi random string
   - `LINK_SECRET_KEY` — **kam se kam 16+ character ki lambi random string** (jaise `openssl rand -hex 32` se generate karo) — ye links sign karne ke liye hai, kabhi kisi ko mat batana
6. Deploy hone do
7. **Webhook set karo** (Master bot ke liye):
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<your-project>.deno.dev/tg/main&secret_token=<WEBHOOK_SECRET>
   ```
8. Telegram pe `/start` bhejke test karo

## Naya clone banane ka tarika
Koi bhi user Master bot ko apna BotFather token bhejega:
- Tum ho (`OWNERS` me) → turant live
- Koi aur hai → tumhe notification (Approve/Reject) → Approve dabate hi clone turant live, webhook `/tg/clone/<bot_id>` pe khud set ho jayega

## Deno Deploy free tier — live rahega kya?
Haan — Deno Deploy **serverless hai lekin Cloudflare Workers jaisa hi always-on** hota hai, koi "sleep after inactivity" wali dikkat nahi (jo Render/Railway/Cloud Shell jaisi services me hoti hai). Free tier me:
- Requests ki generous free limit hai
- `Deno.cron` bhi free tier me kaam karta hai
- Deno KV bhi free tier me included hai (kuch GB tak free)
- Koi credit card nahi maanga jata sign-up par

## Zaroori: LINK_SECRET_KEY na bhoole
Agar ye set nahi ki, to `/getlink` aur `/batch` **error dega** (jaan-bujh kar aisa rakha hai — taaki koi default/guessable key se links forge na kar sake). Ek baar set karke kabhi mat badalna — badalte hi **saari purani links kaam karna band kar degi** (kyunki signature match nahi hoga).
