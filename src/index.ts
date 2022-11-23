/*----------------------------------
- DEPS
----------------------------------*/

// Npm
import got from 'got';
import ShortUniqueId from 'short-unique-id';
const uid = new ShortUniqueId();

// Core
import app from '@server/app';
import { Anomaly, Forbidden } from '@common/errors';
import ServerRequest from '@server/services/router/request';

// App
import LinkedInAPI, { TProfile } from './apiv2';

/*----------------------------------
- CONFIG
----------------------------------*/

const config = app.config.linkedinAuth;
const scopes = ['r_emailaddress', 'r_liteprofile'] as const;
const LogPrefix = '[auth][linkedin]';

const baseUrl = 'https://www.linkedin.com/oauth/v2';

/*----------------------------------
- TYPES: SERVICE
----------------------------------*/

type TScope = typeof scopes[number]

type TContextObject = { actionName: string } & {[k: string]: string};

export type LinkedInAuthServiceConfig = {
    id: string,
    secret: string,
    callbackUrl: string
}

declare global {
    namespace Core {
        interface EmailTransporters { }
        namespace Config {
            interface Services {
                linkedinAuth: LinkedInAuthServiceConfig
            }
        }
    }
}

/*----------------------------------
- SERVICE
----------------------------------*/
// https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow?context=linkedin%2Fcontext&tabs=HTTPS
class LinkedInAuthService {

    private redirectUri = app.env.url + config.callbackUrl;

    private debug = false;

    public async load() {}

    public setDebug( debug: boolean ) {
        this.debug = debug;
    }

    // Step 1: Request Authorization Code
    public async requestAuthCode<TContext extends TContextObject>( 
        context?: TContext,
        scope: TScope[] = [...scopes],
    ): Promise<string> {

        this.debug && console.log(LogPrefix, `Request auth code for scopes ${scope.join(', ')}. Context =`, context);

        const state = uid() + '::' + new Buffer( context 
            ? JSON.stringify(context) 
            : '{}' 
        ).toString('base64')
        
        const response = await got.get( baseUrl + '/authorization', {
            searchParams: {
                response_type: 'code',
                client_id: config.id,
                redirect_uri: this.redirectUri,
                // Gen random id + pass data 
                state: state,
                scope: scope.join(' ')
            },
        })

        this.debug && console.log(LogPrefix, `Received redirect URL for auth code request:`, response.url, `. Status code: ${response.statusCode}`);

        return response.url;
    }

    // Step 2: Exchange Authorization Code for an Access Token
    public async handleResponse<TContext extends TContextObject>({  schema }: ServerRequest): Promise<{ 
        profile: TProfile, 
        context: TContext,
        accessToken: string
    }> {

        const res = await schema.validate({
            state: schema.string(),
            code: schema.string({ opt: true }),
            error: schema.string({ opt: true }),
            error_description: schema.string({ opt: true }),
        });
        
        const context = this.decodeContext<TContext>(res.state);

        let error: Error | undefined;
        if (res.error) switch (res.error) {
            case 'user_cancelled_login':
            case 'user_cancelled_authorize':
                error = new Error("Login cancelled by user");
            default:
                throw new Error(`[auth][linkedin] Unexpected error ocurred: ${res.error} (${res.error_description})`);
        }

        if (error)
            throw new Forbidden(res.error.message);

        const accessToken = await this.requestAccessToken( res.code );

        const linkedInAPI = new LinkedInAPI( accessToken, this.debug );
        const profile = await linkedInAPI.getProfile();
        
        return { profile, context, accessToken }

    }

    private decodeContext<TContext extends TContextObject>( responseState: string ): TContext {

        this.debug && console.log(LogPrefix, `Decode state received from auth code response: `, responseState);

        const [state, contextStr] = responseState.split('::');

        let context: TContext;
        if (contextStr) {
            try {
                context = JSON.parse( Buffer.from( contextStr, 'base64').toString('utf8') );
            } catch (error) {
                throw new Error(LogPrefix + ` Failed to decode context: ${error}`);
            }
        } else
            throw new Error(LogPrefix + ` Context not provided`);

        this.debug && console.log(LogPrefix, `Decoded state received from auth code response: `, { state, context });

        return context
    }

    private async requestAccessToken( authCode: string ) {

        this.debug && console.log(LogPrefix, `Exchange  Authorization Code "${authCode}" for an Access Token`);

        const response = await got.post( baseUrl + '/accessToken', {
            headers: {
                Accept: 'application/json'
            },
            searchParams: {
                grant_type: 'authorization_code',
                code: authCode,
                client_id: config.id,
                client_secret: config.secret,
                redirect_uri: this.redirectUri,
            }
        })

        this.debug && console.log(LogPrefix, `Access token response:`, response);

        if (response.statusCode !== 200)
            throw new Anomaly( LogPrefix + ` Failed to retireve access token: ` + response.statusMessage, {
                code: response.statusCode,
                response: response.body
            });

        const body = JSON.parse(response.body);

        this.debug && console.log(LogPrefix, `Access token response body:`, body);

        return body.access_token;
    }
}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('linkedinAuth', LinkedInAuthService);
declare global {
    namespace Core {
        interface Services {
            linkedinAuth: LinkedInAuthService
        }
    }
}