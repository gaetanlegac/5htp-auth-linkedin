# LinkedIn OAuth2.0 for 5HTP

5HTP module for easily handling the LinkedIn OAuth2.0 process, and retrieve and final access token.

[![npm](https://img.shields.io/npm/v/5htp-auth-linkedin)](https://www.npmjs.com/package/5htp-auth-linkedin) [![npm](https://img.shields.io/npm/dw/5htp-auth-linkedin)](https://www.npmjs.com/package/5htp-auth-linkedin)

This module is only compatible with projects based on the 5HTP framework (still in development).

## Installation

```bash
npm i --save @5htp/auth-linkedin
```

## How it works basically

1. The user clicks on the auth button
2. He're redirected to the LinkedIn authorization page, asking to the user if he wants to login with your app and provide his data (email, etc ...)
3. `5htp-auth-linkedin` receive an Authorization token, which is then converted to an access token you can finally use to make API requests on LinkedIn

## Configuration

### Step 1: Configure your app on Linkedin

1. Create an app here: https://www.linkedin.com/developers/apps/new
2. Then go in you app settings > Product and enable `Sign In with LinkedIn`
3. Go on the Auth tab and configure redirect URLs

### Step 2: Update your config file

Enable this service module in your app by importing it in `@/server/index.ts`:

```typescript
import '5htp-auth-linkedin';
```

Then, add the following entry in `@/server/config.ts`:

```typescript
{
    linkedinAuth: {
        id: "<linkedin client ID>",
        secret: "<linkedin secret key>",
        callbackUrl: '/auth/linkedin/callback'
    }
}
```

## Usage

### Step 1: In your frontend, create a redirection button

`@/client/pages/auth.tsx`

```typescript
// Deps
import React from 'react';
import route from '@router';
import Button from '@client/components/button';

// Component
route.page('/companies', {}, null, () => (

    <Button link="/auth/linkedin" target="_blank">
        Login with Linkedin
    </Button>
)
```

### Step 2: In your backend, create the redirection and handle LinkedIn's response

`@/server/routes/auth.ts`

```typescript
// Core deps
import app, { $ } from '@server/app';
const route = $.route;
import { ForbiddenAccess } from '@server/common';

// Step 1: Retrieve auth code
route.get('/auth/linkedin', {  }, async ({ response }) => {

    const redirectUri = await $.linkedinAuth.requestAuthCode(
        // Context you want to receive in the callback
        { actionName: 'linkedinLogin' }
        // LinkedIn scopes
        ['r_emailaddress', 'r_liteprofile'],
    );

    return response.redirect(redirectUri);

});

// Step 2: Handle LinkedIn's response
route.get('/auth/linkedin/callback', {  }, async ({ request }) => {
    
    const res = await $.linkedinAuth.handleResponse(linkedInResponse);

    // Handle error
    if ('error' in res)
        throw new ForbiddenAccess(res.error.message);

    console.log('Access token:', res.accessToken);

    if (res.context.actionName === 'linkedinLogin') {
        // Use the access token here
        // Ex: make API calls to LinkedIn
    }
    
    return true;

});