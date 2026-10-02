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
| `VITE_CARTO_API_KEY` | Carto basemap API key (opsiyonel; Carto uyarısını kaldırmak için) |

`VITE_CARTO_API_KEY` Vite build-time değişkenidir; anahtarı kaynak koda veya git'e
eklemeyin. Yerel geliştirmede git tarafından yok sayılan `.env.local` içine verin. Docker image üretirken build
arg olarak geçirin:

```bash
docker build --build-arg VITE_CARTO_API_KEY="$VITE_CARTO_API_KEY" -t trac-portal-ui .
```

GitHub Actions image build'i için repository secret olarak `CARTO_API_KEY`
tanımlanır ve workflow bunu build arg olarak geçirir. Production'da çalışan
image önceden derlendiği için key'i yalnızca container runtime environment'ına
eklemek yeterli değildir.

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
