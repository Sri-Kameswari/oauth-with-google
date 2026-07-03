# OAuth 2.0 Manual Implementation

A hands-on implementation of Google Login using the OAuth 2.0 Authorization Code Flow with OpenID Connect, built without Spring Security OAuth abstractions to understand every step of the protocol.

<img width="800" alt="image" src="https://github.com/user-attachments/assets/fada492b-adda-486d-a409-ba453870883f" />


## What's built

- Authorization request with state generation (CSRF protection)
- Callback handling with state validation
- Server-to-server token exchange
- ID token validation — JWKS fetch, RS256 signature verification, claims check (`iss`, `aud`, `exp`, `iat`)
- Application session management with session fixation protection
- Logout

<img width="800" alt="image" src="https://github.com/user-attachments/assets/4fb1596b-a4de-431a-aab8-3cd3b9420fdb" />
<img width="800" alt="image" src="https://github.com/user-attachments/assets/a5bbabd2-0ccf-470d-85b4-58903a198838" />


## Stack

| Layer | Tech |
|---|---|
| Backend | Java 17, Spring Boot 3.3, Nimbus JOSE+JWT |
| Frontend | React 18, Vite |

## Project structure

```
OAuth/
├── backend/      Spring Boot app
└── frontend/     React + Vite app
```

## Setup

### Prerequisites
- Java 17+
- Node 18+
- A Google Cloud project with an OAuth 2.0 Web Client ([console.cloud.google.com](https://console.cloud.google.com))

### Google Cloud
1. Create an OAuth 2.0 Client ID (Web application type)
2. Add `http://localhost:8080/login/oauth2/callback/google` as an authorised redirect URI
3. Add your Google account as a test user

### Backend

```bash
cd backend
```

Create `src/main/resources/application-local.properties`:

```properties
google.oauth.client-id=YOUR_CLIENT_ID
google.oauth.client-secret=YOUR_CLIENT_SECRET
google.oauth.redirect-uri=http://localhost:8080/login/oauth2/callback/google
google.oauth.authorization-endpoint=https://accounts.google.com/o/oauth2/v2/auth
google.oauth.token-endpoint=https://oauth2.googleapis.com/token
google.oauth.jwks-endpoint=https://www.googleapis.com/oauth2/v3/certs
google.oauth.issuer=https://accounts.google.com
google.oauth.scope=openid email profile
google.oauth.frontend-url=http://localhost:5173
spring.profiles.active=local
```

Run:
```bash
./mvnw spring-boot:run
```

Backend starts on `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:5173`.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/oauth2/authorize/google` | Starts the login flow |
| `GET` | `/login/oauth2/callback/google` | Google callback — exchanges code, validates token, creates session |
| `GET` | `/me` | Returns logged-in user info or 401 |
| `GET` | `/logout` | Invalidates session |

## What's intentionally excluded

- `spring-boot-starter-oauth2-client` — the point is to understand what it does under the hood
- Database — users are held in session only
- Token refresh — out of scope for a login-only flow
