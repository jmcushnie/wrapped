const clientId = import.meta.env.VITE_CLIENT_ID;
const code = undefined;

console.log(clientId);
if (!code) {
  redirectToAuthCodeFlow(clientId);
} else {
  const accessToken = await getAccessToken(clientId, code);
  const profile = await fetchProfile(accessToken);
  populateUI(profile);
}

async function redirectToAuthCodeFlow(clientId) {
  // TODO: Redirect to Spotify authorization page
}

async function getAccessToken(clientId, code) {
  // TODO: Get access token for code
}

async function fetchProfile(token) {
  // TODO: Call Web API
}

function populateUI(profile) {
  // TODO: Update UI with profile data
}
