# Deployment

Notea runs on the VPS at `139.59.139.30`, in `/var/www/notea`. PM2 keeps the process named `notea` online with `npm start -- -p 4300`.

```bash
ssh root@139.59.139.30
cd /var/www/notea
git pull origin main
npm install
npm run build
pm2 restart notea
```

Leave the server `.env` in place. Do not commit it, and do not overwrite it with a local file. `pm2 restart` reloads that file.

After the restart, `pm2 describe notea` should show status `online`, and this should print `200`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4300/welcome
```
