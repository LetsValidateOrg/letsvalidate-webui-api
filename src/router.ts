import { Router } from 'itty-router';

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

function failedAuth() {
    return new Response( JSON.stringify( {"error": "Missing or invalid Authorization header in query"}, null, 2), 
        { 
            status      : 401,
            headers     : createHeaders(),
        } 
    );
       
};

function authorizationHeaderIsValid(authHeader: string) : boolean {
    console.log("Checking auth header value \"" + authHeader + "\"");

    return true;
}

function handleMonitoredCertificates(request: Request): Promise<Response> {

    // Oh my god the pain of dealing with headers, as they come in via an opaque object (thanks fetch API)
    //      https://alexewerlof.medium.com/converting-fetchs-response-headers-to-a-plain-serializable-javascript-object-51fd3ee0e090
    const requestHeaders:[string: string] = Object.fromEntries(request.headers.entries());

    // Cloudflare specific properites about a request:
    //      https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
    const cloudflareRequestProperties : IncomingRequestCfProperties = request.cf;

    // See if user authenticated
    if ( (!("Authorization" in requestHeaders)) || (successfullyValidatedAuthorizationHeader(requestHeaders['Authorization']) === false) ) {
        return failedAuth();
    }

    const returnObj:[string:[string:string]] = {
        'monitored_certificates'    : [],
        'metadata': {
            'cloudflare_edge_location'  : cloudflareRequestProperties.colo.toLowerCase(),
        },
    }

    // See if we got an auth header
    return new Response( 
        JSON.stringify( returnObj, null, 2 ), { headers: createHeaders() } );
}

// GET user's list of monitored certs
router.get( '/api/v001/monitored-certificates', (request) => handleMonitoredCertificates(request) );
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
