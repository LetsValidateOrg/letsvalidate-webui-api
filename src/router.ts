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

function handleMonitoredCertificates(request: Request): Promise<Response> {

    // See if we got an auth header
    return new Response( 
        JSON.stringify( { 'headers': [...request.headers] }, null, 4 ), { headers: createHeaders() } );
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
