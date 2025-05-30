# Deploy di una nuova app con nginx-proxy, docker-gen e Let's Encrypt

## Architettura

- **nginx-proxy**: container Nginx che funge da reverse proxy per tutti i container delle app.
- **docker-gen**: genera dinamicamente la configurazione Nginx in base ai container attivi e alle loro variabili d'ambiente.
- **letsencrypt-nginx-proxy-companion**: gestisce i certificati SSL automatici tramite Let's Encrypt.

Tutti i container condividono la rete Docker `nginx-proxy` e i volumi per la configurazione e i certificati.

---

## Esempio: Deploy di una nuova app con wordpress (modello)

### 1. Struttura del file `docker-compose.yml`

```yaml
version: '3'

services:
  app_mysql:
    image: mysql:5.7
    volumes:
      - ./db:/var/lib/mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: <root_password>
      MYSQL_DATABASE: <db_name>
      MYSQL_USER: <db_user>
      MYSQL_PASSWORD: <db_password>
    container_name: <mysql_container_name>

  app_main:
    depends_on:
      - <mysql_container_name>
    image: <tua_immagine_app>
    expose:
      - 80
      - 443
    restart: always
    environment:
      VIRTUAL_HOST: <dominio_o_sottodominio>
      LETSENCRYPT_HOST: <dominio_o_sottodominio>
      LETSENCRYPT_EMAIL: <tua_email>
      # altre variabili specifiche della tua app
    container_name: <nome_container_app>
    volumes:
      - ./public:/percorso/nella/app # opzionale, se serve

networks:
  default:
    external:
      name: nginx-proxy
```

**Sostituisci** i valori tra `<...>` con quelli reali per la tua app.

---

### 2. Passaggi per il deploy

1. **Crea la directory della tua app e posiziona il file `docker-compose.yml` come sopra.**
2. **Assicurati che la rete `nginx-proxy` esista:**

   ```sh
   docker network ls
   ```

   Se non esiste, creala:

   ```sh
   docker network create nginx-proxy
   ```

3. **Avvia la tua app:**

   ```sh
   docker-compose up -d
   ```

4. **Il reverse proxy rileverà automaticamente la nuova app e la esporrà su HTTP/HTTPS.**

---

### 3. Note importanti

- **Le variabili d'ambiente** `VIRTUAL_HOST`, `LETSENCRYPT_HOST` e `LETSENCRYPT_EMAIL` sono fondamentali per l'esposizione e il certificato SSL.
- **La rete Docker** deve essere la stessa del reverse proxy (`nginx-proxy`).
- **Non serve modificare manualmente la configurazione di Nginx**: tutto è automatico.
- **I certificati SSL** sono gestiti dal companion e vengono rinnovati automaticamente.

---

### 4. Debug

- Per vedere i log del proxy:
  ```sh
  docker logs nginx-proxy
  ```
- Per vedere i log del companion (SSL):
  ```sh
  docker logs nginx-proxy-le
  ```

---

## Esempio reale (estratto da 7ii)

```yaml
services:
  wordpress:
    depends_on:
      - 7ii_mysql
    image: wordpress:latest
    expose:
      - 80
      - 443
    restart: always
    environment:
      VIRTUAL_HOST: 7ii.example.com
      LETSENCRYPT_HOST: 7ii.example.com
      LETSENCRYPT_EMAIL: admin@example.com
      WORDPRESS_DB_HOST: 7ii_mysql:3306
      WORDPRESS_DB_USER: user
      WORDPRESS_DB_PASSWORD: password
      WORDPRESS_DB_NAME: 7ii
    container_name: 7ii_wordpress
    volumes:
      - ./public/wp-content:/var/www/html/wp-content
      - ./public/.htaccess:/var/www/html/.htaccess
```

---

## Esempio: Deploy di una nuova app SvelteKit

### 1. Struttura del file `docker-compose.yml`

```yaml
version: '3'

services:
  sveltekit:
    image: node:20
    working_dir: /app
    volumes:
      - ./:/app
    command: sh -c "pnpm install && pnpm build && pnpm preview --host 0.0.0.0 --port 3000"
    expose:
      - 3000
    environment:
      VIRTUAL_HOST: <dominio_o_sottodominio>
      LETSENCRYPT_HOST: <dominio_o_sottodominio>
      LETSENCRYPT_EMAIL: <tua_email>
    container_name: <nome_container_sveltekit>
    restart: always
    networks:
      - nginx-proxy

networks:
  nginx-proxy:
    external: true
```

**Sostituisci** i valori tra `<...>` con quelli reali per la tua app.

---

### 2. Note specifiche per SvelteKit

- Assicurati che il tuo progetto SvelteKit sia già presente nella directory dove lanci `docker-compose up -d`.
- Il comando di avvio usa `pnpm preview` per servire l'app in modalità produzione sulla porta 3000.
- Se usi un adapter diverso (es. Node, Vercel, etc.), modifica il comando di avvio di conseguenza.
- Se vuoi usare una porta diversa, aggiorna sia `expose` che il comando di avvio e la variabile `VIRTUAL_PORT` (se necessario).

---

### 3. Esempio reale

```yaml
services:
  sveltekit:
    image: node:20
    working_dir: /app
    volumes:
      - ./:/app
    command: sh -c "pnpm install && pnpm build && pnpm preview --host 0.0.0.0 --port 3000"
    expose:
      - 3000
    environment:
      VIRTUAL_HOST: sveltekit.example.com
      LETSENCRYPT_HOST: sveltekit.example.com
      LETSENCRYPT_EMAIL: admin@example.com
    container_name: sveltekit_app
    restart: always
    networks:
      - nginx-proxy

networks:
  nginx-proxy:
    external: true
```

---

**Per ogni nuova app SvelteKit, basta seguire questo schema e il reverse proxy farà tutto il resto.**
