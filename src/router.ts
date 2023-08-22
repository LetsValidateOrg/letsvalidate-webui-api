import { Router } from 'itty-router';

import { getVerifier } from 'cloudflare-cognito-jwt-verifier';

// now let's create a router (note the lack of "new")
const router = Router();

function createHeaders() { 
    return {
        'Content-Type':                 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin':  'https://letsvalidate.org',
        'Access-Control-Allow-Methods': 'GET',
    };
}

// Runtime API's available to us in Worker environment: https://developers.cloudflare.com/workers/runtime-apis/

// Structure of an incoming request: https://developers.cloudflare.com/workers/runtime-apis/request/#properties

function failedAuth( errorInfo: string ) {
    return new Response( JSON.stringify( {"error": errorInfo}, null, 2), 
        { 
            status      : 401,
            headers     : createHeaders(),
        } 
    );
       
};

async function validateToken(authHeader: string, env: Env) : Promise<boolean> {
    //console.log("Checking auth header value \"" + authHeader + "\"");

    // Trim any whitespace
    const trimmedString : string = authHeader.trim();

    // Split on whitespace
    const tokens : string[] = trimmedString.split(" ");

    // make sure two tokens
    if ( tokens.length != 2 ) {
        console.log("Authorization header did not have exactly two tokens");
        return false;
    }

    // Make sure left token is "Bearer"
    if ( tokens[0] !== "Bearer" ) {
        console.log("Auth header did not start with \"Bearer\"");
        return false;
    }

    // Process access token from Cognito
    const cognitoJwt:string = tokens[1];

    console.log("JWT value: " + cognitoJwt);

    // Get our Wrangler secrets for userPoolId and clientId
    const cognitoUserPoolId:string  = env.AWS_COGNITO_USER_POOL_ID;
    const cognitoClientId:string    = env.AWS_COGNITO_CLIENT_ID;
    console.log("User Pool ID: " + cognitoUserPoolId );
    console.log("Client ID: " + cognitoClientId );


    // get function pointer to verifier
    const verifierOptions = {
        appClientId     : cognitoClientId,
        awsRegion       : 'us-east-2',
        tokenType       : 'access',
        userPoolId      : cognitoUserPoolId,
    };
    // Get function pointer to verification function
    //const { verify } = getVerifier( verifierOptions );
    const verifyFunctionPointer = getVerifier( verifierOptions ).verify;

    // Now use the function pointer, passing it the full value of "Authorization" header (including "Bearer")
    //return verify( trimmedString );

    // If validation fails, it'll throw a JwtVerificationError we can catch in the caller
    const validatedTokenData = verifyFunctionPointer( trimmedString );
    console.log("Token validated successfully!")
    return validatedTokenData;

    // https://gist.github.com/bcnzer/e6a7265fd368fa22ef960b17b9a76488

    // Oooh even better, lots of stars: https://github.com/tsndr/cloudflare-worker-jwt

    // Guide to getting public key from Cognito user pools to verify signature: https://stackoverflow.com/a/54865598

    // https://jwt.io/introduction

}

async function handleMonitoredCertificates(request: Request, env: Env): Promise<Response> {

    // Oh my god the pain of dealing with headers, as they come in via an opaque object (thanks fetch API)
    //      https://alexewerlof.medium.com/converting-fetchs-response-headers-to-a-plain-serializable-javascript-object-51fd3ee0e090
    const requestHeaders:[string: string] = Object.fromEntries(request.headers.entries());

    // Cloudflare specific properites about a request:
    //      https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
    const cloudflareRequestProperties : IncomingRequestCfProperties = request.cf;

    //console.log("Request headers:\n" + JSON.stringify(requestHeaders, null, 2));

    // See if user authenticated
    if ( !("authorization" in requestHeaders) ) { 
        return failedAuth("No Authorization header in query");
    }
    
    let verifiedTokenData = null;
    try {
        verifiedTokenData = await validateToken( requestHeaders['authorization'], env );
    } catch (exception) {
        return failedAuth(exception.message);
    }

    const userId = verifiedTokenData.payload.sub;

    console.log("User auth token successfully validated");

    const returnObj:[string:[string:string]] = {
        'monitored_certificates'    : [],
        'metadata': {
            'cloudflare_edge_location'  : cloudflareRequestProperties.colo.toLowerCase(),
            'cognito_user_id'           : userId,
        },
    }

    // See if we got an auth header
    return new Response( 
        JSON.stringify( returnObj, null, 2 ), { headers: createHeaders() } );
}

// GET user's list of monitored certs
router.get( '/api/v001/monitored-certificates', (request, env) => handleMonitoredCertificates(request, env) );
//router.get( '/api/v001/monitored-certificates', () => new Response( '[]', { headers: createHeaders() } ));



// {headers: { 'Content-Type': 'application/json'} } ));

/*
// GET collection index
router.get('/api/todos', () => new Response('Todos Index!'));

// GET item
router.get('/api/todos/:id', ({ params }) => new Response(`Todo #${params.id}`));

// POST to the collection (we'll use async here)
router.post('/api/todos', async (request) => {
	const content = await request.json();

	return new Response('Creating Todo: ' + JSON.stringify(content));
});
*/

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
