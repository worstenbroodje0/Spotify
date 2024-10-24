import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { fetchRefresh } from '$helpers';

export const load: PageLoad = async ({ fetch: _fetch, params, parent, depends, route }) => {
    depends(`app:${route.id}`);
    const fetch = (path: string) => fetchRefresh(_fetch, path);
    const { user } = await parent();

    const artistRes = await fetch(`/api/spotify/artists/${params.id}`);
    if (!artistRes.ok) {
        throw error(artistRes.status, 'Failed to load artist!');
    }
    const artistResJSON: SpotifyApi.SingleArtistResponse = await artistRes.json();

    const colorReq = artistResJSON?.images?.length
        ? fetch(`/api/average-color?${new URLSearchParams({ image: artistResJSON.images[0].url }).toString()}`)
        : null;

    const [albumsRes, appearsOnRes, topTracksRes, relatedArtistsRes, colorRes] = await Promise.all([
        fetch(`/api/spotify/artists/${params.id}/albums?limit=6&include_groups=album,single`),
        fetch(`/api/spotify/artists/${params.id}/albums?limit=6&include_groups=appears_on`),
        fetch(`/api/spotify/artists/${params.id}/top-tracks?market=${user?.country}`),
        fetch(`/api/spotify/artists/${params.id}/related-artists`),
        colorReq ?? Promise.resolve(null)
    ]);

    return {
        title: artistResJSON.name,
        artist: artistResJSON,
        artistAlbums: albumsRes.ok ? await albumsRes.json() : undefined,
        artistAppearsOn: appearsOnRes.ok ? await appearsOnRes.json() : undefined,
        artistTopTracks: topTracksRes.ok ? await topTracksRes.json() : undefined,
        artistRelatedArtists: relatedArtistsRes.ok ? await relatedArtistsRes.json() : undefined,
        color: colorRes?.ok ? (await colorRes.json()).color : null
    };
};
