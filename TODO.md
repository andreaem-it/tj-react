- Frontend API route da riallineare/deployare:
  il contatore views su `www.techjournal.it` andava in `502` su `/api/views/:postId`
  perché il proxy frontend dipendeva da `tj-api` (`TJ_API_BASE_URL`) ma su `api.techjournal.it`
  non era disponibile l'endpoint `/api/views/*` (risposta 404 HTML da WordPress/LiteSpeed).
  Abbiamo confermato che l'endpoint WordPress `https://api.techjournal.it/wp-json/tj/v1/views/:postId`
  incrementa correttamente via POST, quindi il problema residuo è di allineamento/deploy della route
  frontend: verificare in produzione che `/api/views/:postId` risponda JSON e usi fallback diretti WP,
  poi confermare incremento end-to-end da pagina articolo (GET iniziale + POST incremento + GET aggiornato).
