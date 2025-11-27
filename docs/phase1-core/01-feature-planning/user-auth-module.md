# Phase 1 - User Authentication Module Feature Planning

> Module: User Authentication Enhancement
> Priority: P0
> APIs: 6
> Status: Planning

---

## 1. Module Overview

The User Auth module provides enhanced authentication methods including OAuth, SSO, WeChat scan login, and related security features.

### Existing Resources

| Resource | Path | Status |
|----------|------|--------|
| User Schema | `packages/service/support/user/schema.ts` | Exists |
| Auth Utils | `packages/service/support/permission/user/auth.ts` | Exists |
| Token Service | Various | Exists |

---

## 2. API Specifications

### 2.1 OAuth Login

**Endpoint**: `POST /api/support/user/account/login/oauth`

**Request**:
```typescript
type OAuthLoginRequest = {
  provider: OAuthProviderEnum;  // github | google | dingtalk | feishu
  code: string;                  // Authorization code
  state?: string;                // CSRF state
  redirectUri?: string;
}

enum OAuthProviderEnum {
  github = 'github',
  google = 'google',
  dingtalk = 'dingtalk',
  feishu = 'feishu',
  wechat = 'wechat'
}
```

**Response**:
```typescript
type OAuthLoginResponse = {
  user: UserInfo;
  token: string;
  isNewUser: boolean;
}
```

---

### 2.2 Fast Login

**Endpoint**: `POST /api/support/user/account/login/fastLogin`

**Request**:
```typescript
type FastLoginRequest = {
  token: string;              // One-time login token
}
```

**Response**:
```typescript
type FastLoginResponse = {
  user: UserInfo;
  token: string;
}
```

---

### 2.3 WeChat QR Code Login

**Endpoint**: `GET /api/support/user/account/login/wx/getQR`

**Request**: None (uses query params)
```typescript
type GetWxQRRequest = {
  inviterId?: string;        // Referral ID
}
```

**Response**:
```typescript
type GetWxQRResponse = {
  ticket: string;            // QR code ticket
  qrUrl: string;             // QR code image URL
  expireTime: number;        // Seconds until expiry
  sceneId: string;           // Scene ID for polling
}
```

**Additional Endpoint for Status Check**:
`GET /api/support/user/account/login/wx/checkStatus`

```typescript
type CheckWxStatusRequest = {
  sceneId: string;
}

type CheckWxStatusResponse = {
  status: 'waiting' | 'scanned' | 'confirmed' | 'expired';
  user?: UserInfo;
  token?: string;
}
```

---

### 2.4 SSO Single Sign-On

**Endpoint**: `GET /api/support/user/account/sso`

**Request**:
```typescript
type SSORequest = {
  token: string;             // SSO token from IdP
  provider: string;          // SSO provider ID
}
```

**Response**:
```typescript
type SSOResponse = {
  redirectUrl: string;       // Redirect with session token
}
```

---

### 2.5 Update Contact Info

**Endpoint**: `PUT /api/support/user/account/updateContact`

**Request**:
```typescript
type UpdateContactRequest = {
  phone?: string;
  email?: string;
  verifyCode: string;        // SMS/Email verification code
}
```

**Response**: `{ success: true }`

---

### 2.6 Get Image Captcha

**Endpoint**: `GET /api/support/user/account/captcha/getImgCaptcha`

**Request**: None

**Response**:
```typescript
type GetImgCaptchaResponse = {
  captchaId: string;         // Captcha session ID
  captchaImg: string;        // Base64 image data
  expireTime: number;        // Seconds until expiry
}
```

---

## 3. Data Models

### OAuth Binding Schema
```typescript
type OAuthBindingSchema = {
  _id: ObjectId;
  userId: ObjectId;
  provider: OAuthProviderEnum;
  providerId: string;         // Third-party user ID
  accessToken?: string;       // Encrypted
  refreshToken?: string;      // Encrypted
  profile?: {
    nickname?: string;
    avatar?: string;
    email?: string;
  };
  bindTime: Date;
  lastLoginTime: Date;
}

// Indexes
{ userId: 1, provider: 1 } unique
{ provider: 1, providerId: 1 } unique
```

### Captcha Session Schema
```typescript
type CaptchaSessionSchema = {
  _id: ObjectId;
  captchaId: string;
  answer: string;             // Hashed
  expireAt: Date;             // TTL index
}
```

### WeChat Login Session Schema
```typescript
type WxLoginSessionSchema = {
  _id: ObjectId;
  sceneId: string;
  ticket: string;
  status: 'waiting' | 'scanned' | 'confirmed' | 'expired';
  openId?: string;
  userId?: ObjectId;
  inviterId?: string;
  expireAt: Date;             // TTL index, 5 minutes
}
```

---

## 4. OAuth Provider Configuration

### GitHub OAuth
```bash
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
```

### Google OAuth
```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

### DingTalk OAuth
```bash
DINGTALK_APP_KEY=
DINGTALK_APP_SECRET=
DINGTALK_CALLBACK_URL=
```

### Feishu OAuth
```bash
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_CALLBACK_URL=
```

### WeChat OAuth (Official Account)
```bash
WX_APPID=
WX_APPSECRET=
WX_TOKEN=
WX_ENCODING_AES_KEY=
```

---

## 5. SSO Configuration

```typescript
type SSOConfig = {
  providerId: string;
  name: string;
  protocol: 'saml' | 'oidc' | 'oauth2';

  // SAML config
  samlEntryPoint?: string;
  samlCert?: string;

  // OIDC config
  oidcIssuer?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;

  // Attribute mapping
  attributeMapping: {
    userId: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
}
```

---

## 6. Authentication Flow

### OAuth Flow
```
1. Frontend redirects to OAuth provider
2. User authorizes → Provider redirects with code
3. Frontend sends code to backend
4. Backend exchanges code for token
5. Backend fetches user info
6. Backend creates/updates user
7. Backend returns session token
```

### WeChat QR Login Flow
```
1. Frontend requests QR code
2. Backend creates login session
3. Backend generates QR via WeChat API
4. Frontend displays QR → User scans
5. WeChat sends event to backend
6. Backend updates session status
7. Frontend polls status → Receives token
```

### SSO Flow
```
1. User clicks SSO login
2. Frontend redirects to IdP
3. User authenticates at IdP
4. IdP redirects with assertion
5. Backend validates assertion
6. Backend creates session
7. Backend redirects to app
```

---

## 7. Frontend Integration

### Component Location
```
projects/app/src/pages/login/
├── index.tsx                # Main login page
├── provider/
│   ├── github.tsx
│   ├── google.tsx
│   ├── wechat.tsx
│   └── sso.tsx
└── components/
    ├── OAuthButtons.tsx
    ├── WxQRCode.tsx
    └── CaptchaInput.tsx
```

### API Client
```typescript
// projects/app/src/web/support/user/api.ts

export const postOAuthLogin = (data: OAuthLoginRequest) =>
  POST('/api/support/user/account/login/oauth', data);

export const postFastLogin = (data: FastLoginRequest) =>
  POST('/api/support/user/account/login/fastLogin', data);

export const getWxLoginQR = (params?: GetWxQRRequest) =>
  GET('/api/support/user/account/login/wx/getQR', params);

export const getSSORedirect = (params: SSORequest) =>
  GET('/api/support/user/account/sso', params);

export const putUpdateContact = (data: UpdateContactRequest) =>
  PUT('/api/support/user/account/updateContact', data);

export const getImgCaptcha = () =>
  GET('/api/support/user/account/captcha/getImgCaptcha');
```

---

## 8. Implementation Tasks

- [ ] Create OAuth binding schema
- [ ] Create captcha session schema
- [ ] Create WeChat login session schema
- [ ] Implement GitHub OAuth
- [ ] Implement Google OAuth
- [ ] Implement WeChat QR login
- [ ] Implement SSO framework
- [ ] Implement captcha generation
- [ ] Create 6 API routes
- [ ] Add security measures (rate limiting, etc.)
- [ ] Update frontend API paths
- [ ] Write unit tests

---

## 9. Security Considerations

1. **Token Security**
   - Use HTTP-only cookies for session tokens
   - Implement token rotation
   - Short-lived access tokens (1h) + refresh tokens (7d)

2. **OAuth Security**
   - Validate state parameter for CSRF protection
   - Store OAuth tokens encrypted
   - Implement token refresh logic

3. **Captcha Security**
   - Rate limit captcha generation
   - Captcha expires in 5 minutes
   - One-time use only

4. **SSO Security**
   - Validate assertions strictly
   - Check audience and issuer
   - Implement replay protection

---

## 10. Notes

1. Support multiple OAuth bindings per user
2. Auto-link accounts by email if verified
3. Log all auth events to audit log
4. Consider implementing passwordless login
5. Support account unlinking
