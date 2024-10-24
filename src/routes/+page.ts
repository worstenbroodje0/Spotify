import { fetchRefresh } from "$helpers";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch: _fetch, parent }) => {
    try {
        const fetch = (path: string) => fetchRefresh(_fetch, path);
        const { user } = await parent();

        // Log user to check if it's correctly fetched from parent
        console.log("User:", user);

        // Fetch new releases, featured playlists, and user playlists
        const newReleases = fetch('/api/spotify/browse/new-releases?limit=6');
        const featuredPlaylists = fetch('/api/spotify/browse/featured-playlists?limit=6');
        const userPlaylists = fetch(`/api/spotify/users/${user?.id}/playlists?limit=6`);

        // Fetch categories
        const catsRes = await fetch(`api/spotify/browse/categories`);
        const catsResJSON: SpotifyApi.MultipleCategoriesResponse | undefined = catsRes.ok
            ? await catsRes.json()
            : undefined;

        // Log categories response for debugging
        console.log("Categories Response:", catsResJSON);

        const randomCats = catsResJSON
            ? catsResJSON.categories.items.sort(() => 0.5 - Math.random()).slice(0, 3)
            : [];

        // Map the promises for categories playlists
        const randomCatsPromises = randomCats.map((cat) =>
            fetch(`/api/spotify/browse/categories/${cat.id}/playlists?limit=6`)
        );

        // Wait for all API responses
        const [newReleasesRes, featuredPlaylistsRes, userPlaylistsRes, ...randomCatsRes] =
            await Promise.all([newReleases, featuredPlaylists, userPlaylists, ...randomCatsPromises]);

        // Log each of the responses for debugging
      
        // Return the data

        const test = {
            newReleases: newReleasesRes.ok
                ? (newReleasesRes.json() as Promise<SpotifyApi.ListOfNewReleasesResponse>)
                : undefined,
            featuredPlaylists: featuredPlaylistsRes.ok
                ? (featuredPlaylistsRes.json() as Promise<SpotifyApi.ListOfFeaturedPlaylistsResponse>)
                : undefined,
            userPlaylists: userPlaylistsRes.ok
                ? (userPlaylistsRes.json() as Promise<SpotifyApi.ListOfUsersPlaylistsResponse>)
                : undefined,
            homeCategories: randomCats,
            categoriesPlaylists: Promise.all(
                randomCatsRes.map((res) =>
                    res.ok ? (res.json() as Promise<SpotifyApi.CategoryPlaylistsResponse>) : undefined
                )
            )
        }
        console.log("Test: ", test)
        return {
            newReleases: await test.newReleases,
            featuresPlaylists: await test.featuredPlaylists,
            userPlaylists: await test.userPlaylists,
            homeCategories
                : await test.homeCategories,
            categoriesPlaylists: await test.categoriesPlaylists,

        }
      
        // return test;
    } catch (error) {
        // Log the error to see what exactly went wrong
        console.error("Error in load function:", error);
        throw error; // Rethrow the error to trigger the 500 status
    }
};
