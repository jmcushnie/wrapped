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
  try {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    const timeRange = "short_term";
    console.log("Access Token:", accessToken);
    console.log("User Profile:", profile);
    updateWelcomeMessage(profile);
    await fetchTopArtists(accessToken, timeRange);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Authorisation code flow Spotify using PKCE
export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  // Construct the authorisation URL
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/");
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
  params.append("redirect_uri", "http://localhost:5173/");
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

// Update UI

async function updateWelcomeMessage(profile) {
  try {
    const userName = profile.display_name;
    const welcomeMessage = document.getElementById("welcome-message");
    welcomeMessage.textContent = `Hi ${userName}, Welcome to your Spotify Wrapped`;
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}
