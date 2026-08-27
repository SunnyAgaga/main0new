### 100MG OF LOVE 


### deploy

```
npm i -g pm2

cd /var/www/loveapp/artifacts/wedplan/backend
pm2 start dist/index.mjs --name wedplan \
  --node-args="--env-file-if-exists=/var/www/loveapp/.env"

pm2 save
pm2 startup     # prints a command — copy/paste/run it, that's what survives reboots
```

```
cd /var/www/loveapp && git pull
pnpm install
pnpm --filter @workspace/backend run build
pm2 restart wedplan
```

### IP Address

```
209.38.143.229
```