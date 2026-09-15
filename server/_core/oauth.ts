import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function safeRedirectTarget(req: Request, state: string): string {
  const target = decodeOAuthState(state).redirectUri;
  try {
    const requested = new URL(target || "/", `${req.protocol}://${req.get("host")}`);
    const current = `${req.protocol}://${req.get("host")}`;
    if (requested.origin !== current) return "/";
    return `${requested.pathname}${requested.search}${requested.hash}` || "/";
  } catch {
    return "/";
  }
}

async function completeOAuth(req: Request, res: Response, requireNonce: boolean) {
  const code = getQueryParam(req, "code");
  const state = getQueryParam(req, "state");

  if (!code || !state) {
    res.status(400).json({ error: "code and state are required" });
    return;
  }

  if (requireNonce) {
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { ...getSessionCookieOptions(req) });
  }

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      res.status(400).json({ error: "openId missing from user info" });
      return;
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    res.cookie(COOKIE_NAME, sessionToken, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });
    res.redirect(302, safeRedirectTarget(req, state));
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    res.status(500).json({ error: "OAuth callback failed" });
  }
}

export function registerOAuthRoutes(app: Express) {
  // Direct Presently OAuth flow. The one-time nonce prevents forged callbacks.
  app.get("/api/oauth/callback", (req, res) => completeOAuth(req, res, true));

  // Managed WebDev deployments authenticate the initial visit and return here.
  // That platform callback uses a signed state redirect but does not set the
  // Presently nonce cookie, so it follows the platform's own auth contract.
  app.get("/manus-oauth/callback", (req, res) => completeOAuth(req, res, false));
}
