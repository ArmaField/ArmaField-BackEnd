export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ARMAFIELD Backend API",
    version: "1.0.0",
    description:
      "Game backend API for the ARMAFIELD mod for Arma Reforger. Handles player management, loadout customization, and game server integration.",
    contact: {
      name: "ARMAFIELD",
    },
  },
  servers: [
    {
      url: "{baseUrl}",
      description: "API Server",
      variables: {
        baseUrl: {
          default: "/",
          description: "Base URL of the API",
        },
      },
    },
  ],
  tags: [
    { name: "Player", description: "Player session and profile (connect, respawn)" },
    { name: "Loadout", description: "Loadout selection — list available items and update class slots" },
    { name: "Stats", description: "Player stats updates (combat, xp, match results)" },
    { name: "System", description: "System health and status" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        bearerFormat: "API Key",
        description: "Game server authentication token passed as a Bearer token",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", description: "Error message" },
        },
        required: ["error"],
      },
      HealthCheck: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          database: { type: "string", enum: ["connected", "disconnected"] },
          version: { type: "string", example: "0.1.0" },
          testMode: { type: "boolean" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/connect": {
      post: {
        tags: ["Player"],
        summary: "Player connect",
        description:
          "Called when a player joins the game server. Creates a new player profile with default loadouts if first time, or returns existing loadouts. Updates nickname on every connect.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["uid", "nickname"],
                properties: {
                  uid: { type: "string", description: "Unique player identifier from the game" },
                  nickname: { type: "string", description: "Player display name" },
                },
              },
              example: { uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0", nickname: "ArmaPlayer" },
            },
          },
        },
        responses: {
          "200": {
            description: "Player loadouts (4 classes, ordered: ASSAULT, ENGINEER, SUPPORT, RECON)",
            content: {
              "application/json": {
                example: {
                  uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0",
                  xp: 2500,
                  loadouts: [
                    {
                      classId: 1,
                      primary: { guid: "FA5C25BF66A53DCF", price: 0, attachments: [{ type: 6, guid: "0A84AA5A3884176F", price: 0 }] },
                      secondary: { guid: "C0F7DD85A86B2900", price: 0, attachments: [{ type: 6, guid: "8B853CDD11BA916E", price: 0 }] },
                      special: null,
                      gadget: "84215EB8AF53C91C",
                      grenade: "645C73791ECA1698",
                    },
                    { classId: 2, primary: null, secondary: null, special: null, gadget: null, grenade: null },
                    { classId: 3, primary: null, secondary: null, special: null, gadget: null, grenade: null },
                    { classId: 4, primary: null, secondary: null, special: null, gadget: null, grenade: null },
                  ],
                },
              },
            },
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/items": {
      get: {
        tags: ["Loadout"],
        summary: "Get items for class/type",
        description:
          "Returns all items of a specific type for a specific class. Owned items have price=0 and include attachments (for weapons). Unowned items show real price with attachments=null.",
        parameters: [
          { name: "uid", in: "query", required: true, schema: { type: "string" }, description: "Player UID" },
          { name: "classId", in: "query", required: true, schema: { type: "integer", enum: [1, 2, 3, 4] }, description: "1=ASSAULT, 2=ENGINEER, 3=SUPPORT, 4=RECON" },
          { name: "type", in: "query", required: true, schema: { type: "integer", enum: [1, 2, 3, 4, 5] }, description: "1=PRIMARY, 2=SECONDARY, 3=SPECIAL, 4=GADGET, 5=GRENADE" },
        ],
        responses: {
          "200": {
            description: "Array of items",
            content: {
              "application/json": {
                example: {
                  uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0",
                  xp: 2500,
                  items: [
                    { guid: "FA5C25BF66A53DCF", price: 0, attachments: [{ type: 6, guid: "0A84AA5A3884176F", price: 0 }] },
                    { guid: "96DFD2E7E63B3386", price: 4000, attachments: [{ type: 1, guid: "ACDF49FACD0701A8", price: 300 }, { type: 6, guid: "0A84AA5A3884176F", price: 0 }] },
                  ],
                },
              },
            },
          },
          "400": { description: "Invalid parameters", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Player not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/attachments": {
      get: {
        tags: ["Loadout"],
        summary: "Get weapon attachments",
        description:
          "Returns all available attachments for a specific weapon. Price is 0 if player owns it or it's free, otherwise the real price.",
        parameters: [
          { name: "uid", in: "query", required: true, schema: { type: "string" }, description: "Player UID" },
          { name: "classId", in: "query", required: true, schema: { type: "integer", enum: [1, 2, 3, 4] }, description: "1=ASSAULT, 2=ENGINEER, 3=SUPPORT, 4=RECON" },
          { name: "type", in: "query", required: true, schema: { type: "integer", enum: [1, 2, 3] }, description: "Weapon type: 1=PRIMARY, 2=SECONDARY, 3=SPECIAL" },
          { name: "guid", in: "query", required: true, schema: { type: "string" }, description: "Weapon GUID (or full prefab path)" },
        ],
        responses: {
          "200": {
            description: "Weapon attachments",
            content: {
              "application/json": {
                example: {
                  uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0",
                  xp: 2500,
                  attachments: [
                    { type: 1, guid: "ACDF49FACD0701A8", price: 0 },
                    { type: 4, guid: "3B96FAC169E27037", price: 1500 },
                    { type: 6, guid: "0A84AA5A3884176F", price: 0 },
                  ],
                },
              },
            },
          },
          "400": { description: "Invalid parameters", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "Player or weapon not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/loadout": {
      post: {
        tags: ["Loadout"],
        summary: "Update loadout slot",
        description:
          "Updates a single slot in the player's class loadout. Validates that the item exists for this class+type and is unlocked for the player (either owned or price=0).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["uid", "classId", "type", "guid"],
                properties: {
                  uid: { type: "string", description: "Player UID" },
                  classId: { type: "integer", enum: [1, 2, 3, 4], description: "1=ASSAULT, 2=ENGINEER, 3=SUPPORT, 4=RECON" },
                  type: { type: "integer", enum: [1, 2, 3, 4, 5], description: "1=PRIMARY, 2=SECONDARY, 3=SPECIAL, 4=GADGET, 5=GRENADE" },
                  guid: { type: "string", description: "GUID of the selected item" },
                },
              },
              example: { uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0", classId: 1, type: 1, guid: "FA5C25BF66A53DCF" },
            },
          },
        },
        responses: {
          "200": {
            description: "Loadout slot updated",
            content: {
              "application/json": {
                example: { ok: true },
              },
            },
          },
          "400": {
            description: "Bad request. Error codes: `invalid_body`, `validation_error`, `invalid_class`, `invalid_type`",
            content: {
              "application/json": {
                example: { ok: false, error: "invalid_class" },
              },
            },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": {
            description: "Forbidden. Error codes: `item_not_unlocked` — player hasn't unlocked this paid item",
            content: {
              "application/json": {
                example: { ok: false, error: "item_not_unlocked" },
              },
            },
          },
          "404": {
            description: "Not found. Error codes: `player_not_found`, `item_not_found` — item with this guid doesn't exist for the given class+type",
            content: {
              "application/json": {
                example: { ok: false, error: "item_not_found" },
              },
            },
          },
        },
      },
    },
    "/api/loadout/attachment": {
      post: {
        tags: ["Loadout"],
        summary: "Equip/remove attachment",
        description:
          "Equip or remove an attachment on a player's weapon setup. Send attachmentGuid=\"\" to remove from slot. Validates weapon is unlocked, attachment is compatible with weapon, and attachment is unlocked.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["uid", "classId", "weaponType", "weaponGuid", "attachmentType", "attachmentGuid"],
                properties: {
                  uid: { type: "string", description: "Player UID" },
                  classId: { type: "integer", enum: [1, 2, 3, 4], description: "1=ASSAULT, 2=ENGINEER, 3=SUPPORT, 4=RECON" },
                  weaponType: { type: "integer", enum: [1, 2, 3], description: "1=PRIMARY, 2=SECONDARY, 3=SPECIAL" },
                  weaponGuid: { type: "string", description: "Weapon GUID (or prefab path)" },
                  attachmentType: { type: "integer", enum: [1, 2, 3, 4, 5, 6], description: "1=OPTIC, 2=UNDER_BARREL, 3=HAND_GUARD, 4=MUZZLE, 5=STOCK, 6=MAGAZINE" },
                  attachmentGuid: { type: "string", description: "Attachment GUID (or prefab path). Empty string \"\" to remove." },
                },
              },
              example: { uid: "84968975-...", classId: 1, weaponType: 1, weaponGuid: "FA5C25BF66A53DCF", attachmentType: 1, attachmentGuid: "ACDF49FACD0701A8" },
            },
          },
        },
        responses: {
          "200": { description: "Success", content: { "application/json": { example: { ok: true } } } },
          "400": {
            description: "Bad request. Codes: `invalid_body`, `validation_error`, `invalid_class`, `invalid_weapon_type`, `invalid_attachment_type`, `attachment_not_compatible`",
            content: { "application/json": { example: { ok: false, error: "attachment_not_compatible" } } },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": {
            description: "Forbidden. Codes: `weapon_not_unlocked`, `attachment_not_unlocked`",
            content: { "application/json": { example: { ok: false, error: "attachment_not_unlocked" } } },
          },
          "404": {
            description: "Not found. Codes: `player_not_found`, `weapon_not_found`, `attachment_not_found`",
            content: { "application/json": { example: { ok: false, error: "weapon_not_found" } } },
          },
        },
      },
    },
    "/api/purchase": {
      post: {
        tags: ["Loadout"],
        summary: "Purchase item",
        description:
          "Purchase a weapon, gadget, or grenade. Deducts XP from player balance and creates an unlock record. Returns new XP balance on success.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["uid", "classId", "itemType", "itemGuid"],
                properties: {
                  uid: { type: "string" },
                  classId: { type: "integer", enum: [1, 2, 3, 4], description: "1=ASSAULT, 2=ENGINEER, 3=SUPPORT, 4=RECON" },
                  itemType: { type: "integer", enum: [1, 2, 3, 4, 5], description: "1=PRIMARY, 2=SECONDARY, 3=SPECIAL, 4=GADGET, 5=GRENADE" },
                  itemGuid: { type: "string" },
                },
              },
              example: { uid: "84968975-...", classId: 1, itemType: 1, itemGuid: "96DFD2E7E63B3386" },
            },
          },
        },
        responses: {
          "200": {
            description: "Purchase successful. Returns updated items list (same shape as GET /api/items)",
            content: { "application/json": { example: { uid: "84968975-...", xp: 5000, items: [{ guid: "96DFD2E7E63B3386", price: 0, attachments: [{ type: 6, guid: "0A84AA5A3884176F", price: 0 }] }] } } },
          },
          "400": {
            description: "Bad request. Codes: `invalid_body`, `validation_error`, `invalid_class`, `invalid_type`, `item_is_free`",
            content: { "application/json": { example: { error: "item_is_free" } } },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "402": {
            description: "Insufficient balance. Code: `insufficient_balance`",
            content: { "application/json": { example: { error: "insufficient_balance" } } },
          },
          "404": {
            description: "Not found. Codes: `player_not_found`, `item_not_found`",
            content: { "application/json": { example: { error: "item_not_found" } } },
          },
          "409": {
            description: "Already owned. Code: `already_owned`",
            content: { "application/json": { example: { error: "already_owned" } } },
          },
        },
      },
    },
    "/api/purchase/attachment": {
      post: {
        tags: ["Loadout"],
        summary: "Purchase attachment",
        description:
          "Purchase an attachment for a specific weapon. Weapon must already be unlocked (or free). Deducts XP and creates unlock. Returns new XP balance on success.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["uid", "classId", "weaponType", "weaponGuid", "attachmentType", "attachmentGuid"],
                properties: {
                  uid: { type: "string" },
                  classId: { type: "integer", enum: [1, 2, 3, 4] },
                  weaponType: { type: "integer", enum: [1, 2, 3], description: "1=PRIMARY, 2=SECONDARY, 3=SPECIAL" },
                  weaponGuid: { type: "string" },
                  attachmentType: { type: "integer", enum: [1, 2, 3, 4, 5, 6], description: "1=OPTIC, 2=UNDER_BARREL, 3=HAND_GUARD, 4=MUZZLE, 5=STOCK, 6=MAGAZINE" },
                  attachmentGuid: { type: "string" },
                },
              },
              example: { uid: "84968975-...", classId: 1, weaponType: 1, weaponGuid: "96DFD2E7E63B3386", attachmentType: 1, attachmentGuid: "ACDF49FACD0701A8" },
            },
          },
        },
        responses: {
          "200": {
            description: "Purchase successful. Returns updated attachments list for the weapon (same shape as GET /api/attachments)",
            content: { "application/json": { example: { uid: "84968975-...", xp: 4700, attachments: [{ type: 1, guid: "ACDF49FACD0701A8", price: 0 }, { type: 4, guid: "3B96FAC169E27037", price: 1500 }] } } },
          },
          "400": {
            description: "Bad request. Codes: `invalid_body`, `validation_error`, `invalid_class`, `invalid_weapon_type`, `invalid_attachment_type`, `attachment_not_compatible`, `item_is_free`",
            content: { "application/json": { example: { error: "attachment_not_compatible" } } },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "402": {
            description: "Insufficient balance. Code: `insufficient_balance`",
            content: { "application/json": { example: { error: "insufficient_balance" } } },
          },
          "403": {
            description: "Forbidden. Code: `weapon_not_unlocked`",
            content: { "application/json": { example: { error: "weapon_not_unlocked" } } },
          },
          "404": {
            description: "Not found. Codes: `player_not_found`, `weapon_not_found`, `attachment_not_found`",
            content: { "application/json": { example: { error: "weapon_not_found" } } },
          },
          "409": {
            description: "Already owned. Code: `already_owned`",
            content: { "application/json": { example: { error: "already_owned" } } },
          },
        },
      },
    },
    "/api/stats/combat": {
      post: {
        tags: ["Stats"],
        summary: "Combat stats batch update",
        description:
          "Accepts an array of player combat deltas. Increments kills/deaths on each player by the provided values. Called every ~60s by the game server and on round end / shutdown. Players not found in DB are silently skipped.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  required: ["uid", "kills", "deaths"],
                  properties: {
                    uid: { type: "string" },
                    kills: { type: "integer", minimum: 0 },
                    deaths: { type: "integer", minimum: 0 },
                  },
                },
              },
              example: [
                { uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0", kills: 3, deaths: 1 },
                { uid: "11111111-2222-3333-4444-555555555555", kills: 5, deaths: 2 },
              ],
            },
          },
        },
        responses: {
          "200": { description: "Stats updated", content: { "application/json": { example: { ok: true } } } },
          "400": {
            description: "Bad request. Codes: `invalid_body`, `validation_error`",
            content: { "application/json": { example: { error: "validation_error" } } },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/stats/xp": {
      post: {
        tags: ["Stats"],
        summary: "XP batch update",
        description:
          "Batch XP delta — array of { uid, xp }. Increments xpBalance AND xpLifetime. Negative values subtract (both clamped to 0). Players not found are silently skipped. Individual failures don't affect others.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  required: ["uid", "xp"],
                  properties: {
                    uid: { type: "string" },
                    xp: { type: "integer", description: "Positive adds, negative subtracts" },
                  },
                },
              },
              example: [
                { uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0", xp: 500 },
                { uid: "11111111-2222-3333-4444-555555555555", xp: -100 },
              ],
            },
          },
        },
        responses: {
          "200": { description: "XP updated", content: { "application/json": { example: { ok: true } } } },
          "400": {
            description: "Bad request. Codes: `invalid_body`, `validation_error`",
            content: { "application/json": { example: { error: "validation_error" } } },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/stats/xp/player": {
      post: {
        tags: ["Stats"],
        summary: "XP single player update",
        description:
          "Single player XP delta. Increments xpBalance AND xpLifetime. Negative values subtract (both clamped to 0).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["uid", "xp"],
                properties: {
                  uid: { type: "string" },
                  xp: { type: "integer", description: "Positive adds, negative subtracts" },
                },
              },
              example: { uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0", xp: 500 },
            },
          },
        },
        responses: {
          "200": { description: "XP updated", content: { "application/json": { example: { ok: true } } } },
          "400": {
            description: "Bad request. Codes: `invalid_body`, `validation_error`",
            content: { "application/json": { example: { error: "validation_error" } } },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/stats/match": {
      post: {
        tags: ["Stats"],
        summary: "Match result (end of round)",
        description:
          "End-of-round results. Increments `wins` by 1 for each uid in `winners`, `losses` by 1 for each uid in `losers`. Players not found are silently skipped.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["winners", "losers"],
                properties: {
                  winners: { type: "array", items: { type: "string" }, description: "UIDs of winning players" },
                  losers: { type: "array", items: { type: "string" }, description: "UIDs of losing players" },
                },
              },
              example: {
                winners: ["84968975-9c1c-4774-bfbb-e8d32a9ceff0", "11111111-2222-3333-4444-555555555555"],
                losers: ["22222222-3333-4444-5555-666666666666"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Match results recorded", content: { "application/json": { example: { ok: true } } } },
          "400": {
            description: "Bad request. Codes: `invalid_body`, `validation_error`",
            content: { "application/json": { example: { error: "validation_error" } } },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/respawn": {
      post: {
        tags: ["Player"],
        summary: "Player respawn loadout",
        description:
          "Returns the player's full loadout for a specific class — weapons (with equipped attachments), gadget, and grenade GUIDs. Called when the player respawns.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["uid", "classId"],
                properties: {
                  uid: { type: "string" },
                  classId: { type: "integer", enum: [1, 2, 3, 4], description: "1=ASSAULT, 2=ENGINEER, 3=SUPPORT, 4=RECON" },
                },
              },
              example: { uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0", classId: 1 },
            },
          },
        },
        responses: {
          "200": {
            description: "Player loadout for the class",
            content: {
              "application/json": {
                example: {
                  uid: "84968975-9c1c-4774-bfbb-e8d32a9ceff0",
                  classId: 1,
                  loadout: {
                    primary: { guid: "FA5C25BF66A53DCF", price: 0, attachments: [{ type: 6, guid: "0A84AA5A3884176F", price: 0 }] },
                    secondary: { guid: "C0F7DD85A86B2900", price: 0, attachments: [{ type: 6, guid: "8B853CDD11BA916E", price: 0 }] },
                    special: null,
                    gadget: "84215EB8AF53C91C",
                    grenade: "645C73791ECA1698",
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request. Codes: `invalid_body`, `validation_error`, `invalid_class`",
            content: { "application/json": { example: { error: "invalid_class" } } },
          },
          "401": { description: "Invalid or missing Bearer token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": {
            description: "Not found. Code: `player_not_found`",
            content: { "application/json": { example: { error: "player_not_found" } } },
          },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description:
          "Returns the system health status, including database connectivity, application version, and test mode status. No authentication required.",
        security: [],
        responses: {
          "200": {
            description: "System is healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthCheck" },
                example: {
                  status: "ok",
                  database: "connected",
                  version: "0.1.0",
                  testMode: false,
                  timestamp: "2025-06-15T10:30:00.000Z",
                },
              },
            },
          },
          "503": {
            description: "System is degraded (database unavailable)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthCheck" },
                example: {
                  status: "degraded",
                  database: "disconnected",
                  version: "0.1.0",
                  testMode: false,
                  timestamp: "2025-06-15T10:30:00.000Z",
                },
              },
            },
          },
        },
      },
    },
  },
};
