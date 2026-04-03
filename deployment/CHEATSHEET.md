🐝 DIALBEE DEPLOYMENT CHEATSHEET
════════════════════════════════════════════════════

✅ PROJECT STATUS: FULLY COMPLETE
   - PostgreSQL (NOT MongoDB) ← Important!
   - All 29 files across Phase 1, 2, 3

════════════════════════════════════════════════════
🚀 FASTEST WAY TO GO LIVE (30 minutes)
════════════════════════════════════════════════════

Step 1 — Push to GitHub (your computer):
  git init && git add . && git commit -m "v1.0"
  git remote add origin https://github.com/YOU/dialbee-app.git
  git push -u origin main

Step 2 — Launch EC2 (AWS Console):
  OS: Ubuntu 22.04
  Size: t3.medium
  Ports: 22, 80, 443, 3001

Step 3 — SSH Connect:
  chmod 400 dialbee-key.pem
  ssh -i dialbee-key.pem ubuntu@YOUR_SERVER_IP

Step 4 — Run setup script (on server):
  bash server-setup.sh
  ← PASTE the script and run it!

Step 5 — Deploy frontend (vercel.com):
  Import GitHub repo → Root: frontend
  Add env: NEXT_PUBLIC_API_URL=https://api.dialbee.ng

Step 6 — SSL:
  sudo certbot --nginx -d api.dialbee.ng

Step 7 — DONE! 🎉
  https://dialbee.ng ← Live!

════════════════════════════════════════════════════
🔑 KEY CREDENTIALS
════════════════════════════════════════════════════

  Admin Panel:  https://dialbee.ng/admin
  Email:        admin@dialbee.ng
  Password:     Admin@Dialbee2024!

  API Docs:     https://api.dialbee.ng/api/docs

════════════════════════════════════════════════════
⚡ DAILY COMMANDS
════════════════════════════════════════════════════

  pm2 status               Check if running
  pm2 logs dialbee-api     See errors
  pm2 restart dialbee-api  Restart
  docker ps                Check DB/Redis
  git pull && npm run build && pm2 restart dialbee-api

════════════════════════════════════════════════════
💰 MONTHLY COST
════════════════════════════════════════════════════

  EC2 t3.medium:  $30
  Domain .ng:     $1
  Vercel:         FREE
  SSL:            FREE
  ─────────────────
  TOTAL:          ~$31/month
  Break-even:     3 Standard Plan customers ✅

════════════════════════════════════════════════════
🆘 QUICK FIXES
════════════════════════════════════════════════════

  Site not loading?    → pm2 restart dialbee-api
  DB error?            → docker-compose up -d postgres
  502 error?           → pm2 status (check if running)
  SSL issue?           → DNS must point to server first
  Build failed?        → rm -rf node_modules && npm install

════════════════════════════════════════════════════
🐝 Connect. Discover. Prosper. — Dialbee
════════════════════════════════════════════════════
