async function main() {
  try {
    const clientId = import.meta.env.VITE_CLIENT_ID;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    console.log(clientId);
    if (!code) {
      console.log(
        "No authorization code found. Redirecting to authorization flow."
      );
      redirectToAuthCodeFlow(clientId);
    } else {
      const accessToken = await getAccessToken(clientId, code);
      const profile = await fetchProfile(accessToken);
      const timeRange = "short_term";
      console.log("Access Token:", accessToken);
      console.log("User Profile:", profile);
      updateWelcomeMessage(profile);
      await fetchTopArtists(accessToken, timeRange);
      await fetchTopSongs(accessToken, timeRange);
      await updateTopGenreUI(accessToken, timeRange);
      await fetchTop5Songs(accessToken, timeRange);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Call the main function to start the execution
main();

// Authorisation code flow Spotify using PKCE
export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  // Construct the authorisation URL
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "https://mywrapped.netlify.app");
  params.append("scope", "user-top-read user-read-private user-read-email");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  // Redirect to Spotify Authorisation
  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Generates random string of characters for code verifier.
function generateCodeVerifier(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Takes code verifier and generate a code challenge using SHA-256 hashing algorithm.
async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "https://mywrapped.netlify.app");
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const { access_token } = await result.json();
  return access_token;
}

async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return await result.json();
}

// Fetch top artists for that month
async function fetchTopArtists(token, timeRange) {
  try {
    const result = await fetch(
      `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const topArtists = await result.json();
    console.log(`Top Artists (${timeRange}):`, topArtists);

    if (topArtists.items.length > 0) {
      const numberOneArtist = topArtists.items[0];
      const artistName = numberOneArtist.name;
      const artistImage = numberOneArtist.images[0]?.url;

      const topArtistNameElement = document.getElementById("top-artist-name");
      const topArtistImageElement = document.getElementById("top-artist-image");

      topArtistNameElement.textContent = artistName;
      topArtistImageElement.src = artistImage;
      topArtistImageElement.alt = `${artistName} image`;

      const h2Element = document.querySelector(".top-artist h2");
      h2Element.textContent = `Your favorite artist this month was ${artistName}`;
    } else {
      console.log("No top artists found for the specified time range.");
    }
  } catch (error) {
    console.error("Error fetching top artists:", error);
  }
}

//Fetch Top Song for month

async function fetchTopSongs(token, timeRange) {
  try {
    const result = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const topSongs = await result.json();
    console.log(`Top Songs (${timeRange}):`, topSongs);

    if (topSongs.items.length > 0) {
      const numberOneTrack = topSongs.items[0];
      const trackName = numberOneTrack.name;
      const artistName = numberOneTrack.artists[0].name;
      const trackImage = numberOneTrack.album.images[0]?.url;

      // Update the DOM
      const topSongImageElement = document.getElementById("top-song-image");
      const topSongTextElement = document.getElementById("top-song-text");
      const topSongNameElement = document.getElementById("top-song-name");

      topSongImageElement.src = trackImage;
      topSongTextElement.textContent = "You kept listening to";
      topSongNameElement.textContent = `${trackName} by ${artistName}`;
    } else {
      console.log("No top tracks found for the specified time range.");
    }

    return topSongs;
  } catch (error) {
    console.error("Error fetching top tracks:", error);
    return [];
  }
}

//Fetch top 5 songs
async function fetchTop5Songs(token, timeRange) {
  try {
    const result = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=5`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const top5Songs = await result.json();
    console.log(`Top 5 Songs (${timeRange}):`, top5Songs);

    if (top5Songs.items.length > 0) {
      const top5SongList = document.getElementById("top-5-song-list");
      top5SongList.innerHTML = ""; // Clear previous content

      top5Songs.items.forEach((song, index) => {
        const trackName = song.name;
        const artistName = song.artists[0].name;
        const trackImage = song.album.images[0]?.url;

        const listItem = document.createElement("li");
        const imageElement = document.createElement("img");
        imageElement.src = trackImage;
        imageElement.alt = `${trackName} by ${artistName}`;
        listItem.appendChild(imageElement);

        const textElement = document.createElement("p");
        textElement.textContent = `${index + 1}. ${trackName} by ${artistName}`;
        listItem.appendChild(textElement);

        top5SongList.appendChild(listItem);
      });
    } else {
      console.log("No top tracks found for the specified time range.");
    }

    return top5Songs;
  } catch (error) {
    console.error("Error fetching top 5 tracks:", error);
    return [];
  }
}

// Top Genre
async function fetchTopGenre(token, timeRange) {
  try {
    const result = await fetch(
      `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const topArtists = await result.json();
    console.log(`Top Artists (${timeRange}):`, topArtists);

    const topGenres = topArtists.items.flatMap((artist) => artist.genres);
    const topGenre = mostCommonItem(topGenres);
    console.log(`Top Genre (${timeRange}):`, topGenre);

    return topGenre;
  } catch (error) {
    console.error("Error fetching top genre:", error);
    return "";
  }
}

// Find the most common item in an array
function mostCommonItem(arr) {
  const counts = arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
  const mostCommon = Object.keys(counts).reduce((a, b) =>
    counts[a] > counts[b] ? a : b
  );
  return mostCommon;
}

// Update UI with Top Genre
async function updateTopGenreUI(token, timeRange) {
  try {
    const topGenre = await fetchTopGenre(token, timeRange);
    const topGenreText = document.getElementById("top-genre-text");

    if (topGenre) {
      topGenreText.textContent = topGenre;
    } else {
      topGenreText.textContent =
        "No top genre found for the specified time range.";
    }
  } catch (error) {
    console.error("Error updating top genre UI:", error);
  }
}

// Populate Welcome message

async function updateWelcomeMessage(profile) {
  try {
    const userName = profile.display_name;
    const welcomeMessage = document.getElementById("welcome-message");
    welcomeMessage.textContent = `Hi ${userName}, Welcome to your Spotify Wrapped`;
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}
