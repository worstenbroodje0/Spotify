import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SPOTIFY_APP_CLIENT_ID, SPOTIFY_APP_CLIENT_SECRET, BASE_URL } from '$env/static/private';

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	// Retrieve cookies
	const storedState = cookies.get('spotify_auth_state');
	const storedChallengeVerifier = cookies.get('spotify_auth_challenge_verifier');

	// Check for state mismatch
	if (!state || state !== storedState) {
		throw error(400, 'State Mismatch!');
	}

	if (!code) {
		throw error(400, 'Missing Authorization Code');
	}
	// Base64 encode client credentials
	const clientCredentials = `${SPOTIFY_APP_CLIENT_ID}:${SPOTIFY_APP_CLIENT_SECRET}`;
	const encodedCredentials =
		typeof Buffer !== 'undefined'
			? Buffer.from(clientCredentials).toString('base64') // Node.js environments
			: btoa(clientCredentials); // Browser environments

	// Request access token
	const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${encodedCredentials}`
		},
		body: new URLSearchParams({
			code,
			redirect_uri: `${BASE_URL}/api/auth/callback`,
			grant_type: 'authorization_code',
			code_verifier: storedChallengeVerifier || '',
			client_id: SPOTIFY_APP_CLIENT_ID
		})
	});

	// Check if the token request succeeded
	if (!tokenResponse.ok) {
		const errorText = await tokenResponse.text();
		throw error(400, `Failed to retrieve token: ${errorText}`);
	}

	const responseJSON = await tokenResponse.json();

	// Handle possible errors from the response
	if (responseJSON.error) {
		throw error(400, responseJSON.error_description || 'Unknown error occurred.');
	}

	// Remove the state and verifier cookies after successful authorization
	cookies.delete('spotify_auth_state', { path: '/' });
	cookies.delete('spotify_auth_challenge_verifier', { path: '/' });

	// Set refresh and access tokens
	cookies.set('refresh_token', responseJSON.refresh_token, { path: '/' });
	cookies.set('access_token', responseJSON.access_token, { path: '/' });

	// Redirect user to home or desired location
	throw redirect(303, '/');
};
