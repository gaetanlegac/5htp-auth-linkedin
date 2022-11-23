# LinkedIn OAuth2.0 for 5HTP

Easy LinkedIn Authentication Plugin for 5HTP.

**This plugin is only compatible with projects based on 5HTP, a early-stage Node/TS/Preact framework designed for performance and productivity.**

[![npm](https://img.shields.io/npm/v/5htp-auth-linkedin)](https://www.npmjs.com/package/5htp-auth-linkedin) [![npm](https://img.shields.io/npm/dw/5htp-auth-linkedin)](https://www.npmjs.com/package/5htp-auth-linkedin)

## How it works basically

1. The user clicks on the auth button
2. He're redirected to the LinkedIn authorization page, asking to the user if he wants to login with your app and provide his data (email, etc ...)
3. `5htp-auth-linkedin` receive an Authorization token, which is then converted to an access token you can finally use to make API requests on LinkedIn

## Definitions

* 5HTP Service ID: `linkedinAuth`
* Availability: `global`

### Methods:

```typescript
// Run on user's action (ex: when he clicks on the "Login with LinkedIn" button)
$.linkedinAuth.requestAuthCode( context?: object, scopes?: string[] ): Promise<string>;
// Run on LinkedIn's callback response
$.linkedinAuth.handleResponse( linkedInResponse: Request ): Promise<{
    profile: { firstName: string, lastName: string, email: string },
    context: object,
    accessToken: string
}>;
```

## Installation

```bash
npm i --save 5htp-auth-linkedin
```

## Configuration

### Step 1: Configure your app on Linkedin

1. Create an app here: https://www.linkedin.com/developers/apps/new
2. Then go in you app settings > Product and enable `Sign In with LinkedIn`
3. Go on the Auth tab and configure redirect URLs

### Step 2: Update your config file

Enable this service plugin in your app by importing it in `@/server/index.ts`:

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
route.page('/auth', {}, null, () => (

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
import { Forbidden } from '@common/errors';

// Step 1: Redurect to LinkedIn's authorizatin page
route.get('/auth/linkedin', {  }, async ({ response, user }) => {

    const redirectUri = await $.linkedinAuth.requestAuthCode({ 
        // You can pass context data to callback (step 2)
        userId: user.id
    });

    return response.redirect(redirectUri);

});

// Step 2: Receive LinkedIn's response and retrieve profile data
route.get('/auth/linkedin/callback', {  }, async ({ request }) => {
    
    const { 
        profile, // User profile data: firstName, lastName, email
        context, // The context you passed in step 1
        accessToken // The LinkedIn access token if you want do to other API calls
    } = await $.linkedinAuth.handleResponse(linkedInResponse);

    return `
        Hi ${profile.firstName} ${profile.lastName}, 
        Your email is ${profile.email} and I also remind your user ID is ${res.context.userId}.
    `

});
```