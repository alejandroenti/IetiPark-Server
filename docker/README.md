# Comandes essencials de Docker Compose

## 🚀 Aixecar i aturar
* **`docker-compose up -d`**: Crea i inicia els contenidors en segon pla (detached).
* **`docker-compose down`**: Atura i elimina contenidors, xarxes i volums associats.
* **`docker-compose start` / `stop`**: Inicia o atura contenidors ja existents sense destruir-los.

## 🔍 Monitorització
* **`docker-compose ps`**: Llista els contenidors del projecte i el seu estat.
* **`docker-compose logs -f`**: Mostra els registres (logs) de tots els serveis en temps real.

## 🛠️ Manteniment i interacció
* **`docker-compose build`**: Construeix o reconstrueix les imatges a partir dels `Dockerfile`.
* **`docker-compose exec <servei> <comanda>`**: Executa una comanda dins d'un contenidor en marxa (ex: `bash` per obrir-hi una terminal).

> **Nota:** En versions recents, la recomanació oficial és utilitzar la sintaxi integrada `docker compose` (sense el guionet).