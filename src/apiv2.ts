/*----------------------------------
- DEPS
----------------------------------*/

// Npm
import got from 'got';

/*----------------------------------
- CONFIG
----------------------------------*/

const LogPrefix = '[auth][linkedin][api]';

const baseUrl = 'https://api.linkedin.com/v2';

/*----------------------------------
- TYPES
----------------------------------*/

type TLinkedInName = {
    preferredLocale: {
        country: string,
        language: string
    },
    localized: {
        [locale: string]: string
    }
}

export type TProfile = {
    firstName: string,
    lastName: string,
    email: string,
}

type TLinkedInEmail = {
    elements: {
        'handle~': {
            emailAddress: string
        },
        handle: string
    }[]
}

/*----------------------------------
- SERVICE
----------------------------------*/

export default class LinkedInAPI {

    public constructor( 
        private accessToken: string, 
        private debug: boolean = false 
    ) {

    }

    public async getProfile(): Promise<TProfile> {

        const [profileInfo, emailInfo] = await Promise.all([
            this.apiRequest('/me?projection=(id,firstName,lastName)'),
            this.apiRequest('/emailAddress?q=members&projection=(elements*(handle~))'),
        ])

        return {
            firstName: this.getName(profileInfo.firstName),
            lastName: this.getName(profileInfo.lastName),
            email: this.getEmail(emailInfo)
        }
    }

    private apiRequest( path: string, ) {
        const url = baseUrl + path;
        this.debug && console.log(LogPrefix, `Send request to ${url}`);
        return got.get( url, {
            headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + this.accessToken
            },
        }).then( res => {
            this.debug && console.log(LogPrefix, `Response for ${url}: ${res.statusCode}`);
            try {
                return JSON.parse(res.body);
            } catch (e) {
                console.error(LogPrefix, `Failed to parse response from ${url}:`, e);
                throw e;
            }
        }).catch( e => {
            console.error(LogPrefix, `Request to ${url} failed`, e);
            throw e;
        })
    }

    private getName( nameInfo: TLinkedInName ) {
        const { language, country } = nameInfo.preferredLocale;
        return nameInfo.localized[ language + '_' + country ];
    }

    private getEmail( emailInfo: TLinkedInEmail ): string | undefined {
        for (const element of emailInfo.elements) {
            const email = element['handle~']?.emailAddress;
            if (email)
                return email;
        }
    }

}