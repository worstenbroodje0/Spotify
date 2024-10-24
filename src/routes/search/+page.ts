import { fetchRefresh } from '$helpers';
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const query = url.searchParams.get('q')?.trim(); // Trim to handle empty or whitespace queries
	if (query) {
		throw redirect(307, `/search/${query}`);
	}

	const catsRes = await fetchRefresh(fetch, `/api/spotify/browse/categories?limit=50`);

	if (!catsRes.ok) {
		// Handle error or provide a fallback, like an empty categories array
		throw new Error('Failed to load categories');
	}

	const categories: SpotifyApi.MultipleCategoriesResponse = await catsRes.json();

	return {
		title: 'Search',
		categories // Fully resolved categories data
	};
};
