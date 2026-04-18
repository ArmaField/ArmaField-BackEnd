/**
 * Test mode utilities.
 *
 * When ARMAFIELD_TEST_MODE is set to the magic value, game API routes
 * return mock data instead of touching the database, and the admin panel
 * runs without real authentication.
 */

export const TEST_MODE =
  process.env.ARMAFIELD_TEST_MODE === "enabled-i-know-what-i-am-doing";

/**
 * Build a fake player object for game API mock responses.
 */
export function fakePlayer(uid: string, nickname: string = "TestPlayer") {
  return {
    id: "test-player",
    uid,
    nickname,
    xpBalance: 999999,
    xpLifetime: 999999,
    kills: 0,
    deaths: 0,
    assists: 0,
    wins: 0,
    losses: 0,
    flagsCaptured: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Hardcoded test server shown on the Servers page in test mode.
 */
export const TEST_SERVER = {
  id: "test-server",
  name: "TEST SERVER",
  ip: "localhost",
  token: "ARMAFIELD-TEST-TOKEN",
  sortOrder: 0,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
