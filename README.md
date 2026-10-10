# Sistema de PDV Avançado (HTTP/WS Server)

Um sistema de Ponto de Venda (PDV) full-stack conteinerizado, construído com um um framework HTTP e WebSocket implementado do zero sobre sockets TCP brutos (via net module) no Node.js, dispensando bibliotecas de abstração de alto nível como Express ou Socket.io.

O sistema gerencia fluxo de caixa, estoque, emissão de comandas, autenticação OAuth2 e integra pagamentos físicos via maquininha e QR Code com o Mercado Pago (recebendo webhooks em tempo real via Cloudflared).


## Recursos Utilizados

*   **Backend:** Node.js, SQLite3, `@node-oauth/oauth2-server`
*   **Frontend:** Vanilla JavaScript, HTML5, CSS3, Apache HTTP Server
*   **Infraestrutura:** Docker, Docker Compose, Cloudflared (Túnel reverso), Dozzle (Visualizador de Logs)


## Estrutura do Projeto

Abaixo estão os principais arquivos e diretórios que compõem a inteligência da aplicação:

```text
├── docker-compose.yml      # Orquestração dos containers (Frontend, Backend, Cloudflared, Dozzle)
├── www/
│   ├── frontend/           # Aplicação SPA consumida pelo Apache
│   │   └── Middle.js       # Camada de serviços e integração de API do cliente
│   └── backend/
│       ├── Back-End.js     # Entrypoint da API, rotas, lógica de negócios e webhooks
│       ├── sockets/
│       │   ├── socket.js      # Motor do MiniExpress: parsing TCP/HTTP e roteamento
│       │   ├── websocket.js   # Implementação do protocolo WebSocket binário (RFC 6455)
│       │   └── fetch.js       # Wrapper HTTP para requisições externas
│       └── database/
│           └── db.js       # Conexão e esquemas do SQLite
└── logs/                   # Diretórios montados para persistência de logs
```

## Pré-requisitos

Para rodar o projeto localmente, você precisará apenas do Docker.

## Instalação e Execução

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/seu-repositorio.git
   cd seu-repositorio
   ```

2. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto (ou no caminho esperado pelo `docker-compose.yml`) com as seguintes chaves de integração do Mercado Pago e túnel.
   Caso queira testar apenas conexão TCP/HTTP, é possível ignorar o .env:
   ```env
   PORT=3005
   ACCESS_TOKEN=seu_access_token_do_mercado_pago
   SIGNATURE_WEBHOOK=sua_chave_hmac_do_webhook
   TUNNEL_TOKEN=seu_token_do_cloudflared (opcional dependendo da config)
   ```

3. **(Opcional, mas recomendado) Crie um arquivo tokens.json em backend -> /web:**
   Adicione este .json para conseguir acessar a funcionalidade de oauth2
   O formato de dados segue este princípio:
   ```
   {
      "oAuth_server": {
         "client_data": [ //This is Just a Test, THOUGH IT IS REQUIRED TO OAUTH FUNCTIONS
               {
                  "clientId": "90bdb3f8_b1de_4250_9dd1_dd8210ac7718",
                  "clientSecret": "SoJNkMlHRATL74i2RUjZvbIk2IMWgeTm",
                  "grants": [
                     "password",
                     "refresh_token"
                  ]
               }
         ],
         "users_information": [
               {
                  "username": "",
                  "password": "",
                  "identificador": "", //Nickname
                  "date": "" //DD-MM-YYYY or DD-MM-YYYY HH:MM:SS
               }
         ],
         "client_tokens": [
         ]
      }
   }
   ```

4. **Inicie os Containers:**
   Execute o comando abaixo para construir as imagens e subir os serviços em segundo plano:
   ```bash
   docker-compose up -d --build
   ```

5. **Acesse a Aplicação:**
   * **Frontend (PDV):** [http://localhost:85](http://localhost:85)
   * **Visualizador de Logs (Dozzle):** [http://localhost:8085](http://localhost:8085)
   * **O PRÓPRIO DOCKER MOSTRA NO TERMINAL AS TODAS AS CONEXÕES REALIZADAS ATÉ O MOMENTO (incluindo imagens e afins)**



   
