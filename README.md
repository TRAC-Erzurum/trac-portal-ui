# TRAC Portal — UI

Frontend: Vue 3, TypeScript, Vite, Vue Router, Pinia, Tailwind. Ana repo (trac-portal): [TRAC-Erzurum/trac-portal](https://github.com/TRAC-Erzurum/trac-portal).

## Gereksinimler

Node 18+, yarn.

## Kurulum

```bash
yarn install
```

Ortam değişkenleri: `.env.example` → `.env` (bu dizinde).

| Değişken | Açıklama |
|----------|----------|
| `VITE_API_URL` | API base URL (örn. `http://localhost:8000/api`) |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (kayıt/giriş için) |

## Komutlar

```bash
yarn dev      # geliştirme sunucusu
yarn build    # production build
yarn preview  # build çıktısını yerelde önizleme
```

## Katkı

- **Issue’lar** yalnızca **ana repoda** (trac-portal): [trac-portal — Issues](https://github.com/TRAC-Erzurum/trac-portal/issues).
- **PR’lar** **bu repo’ya** (trac-portal-ui), **main**’e açılır. main korumalıdır; katkı yalnızca PR ile.
- Akış, PR kuralları ve deploy: [Geliştirici dökümanı](https://github.com/TRAC-Erzurum/trac-portal/blob/main/docs/gelistirici.md).
