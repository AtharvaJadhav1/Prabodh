let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/** @deprecated use getAccessToken */
export function getClerkToken() {
  return accessToken;
}

/** @deprecated use setAccessToken */
export function setClerkToken(token: string | null) {
  accessToken = token;
}
