import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMediaUrl,
  getSubscribedApps,
  isKapsoMode,
  registerPhoneNumber,
  sendTextMessage,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from "./meta-api";

// Kapso proxy mode tests. They stub WHATSAPP_API_KEY and assert that:
//   * outbound calls send X-API-Key instead of Authorization: Bearer
//   * Meta-only endpoints (phone metadata, /register, subscribed_apps)
//     become no-ops / stubs instead of hitting a proxy that can't serve
//     them
//   * media lookups carry phone_number_id
//
// The direct-Meta path (no env key) is asserted in the last describe to
// guarantee the default bearer behaviour is untouched.

const KAPSO_KEY = "kap_live_test";

function captureFetch() {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ messages: [{ id: "wamid.KAPSO" }] }), {
        status: 200,
      });
    }),
  );
  return calls;
}

describe("isKapsoMode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false by default (no env vars)", () => {
    vi.stubEnv("WHATSAPP_API_KEY", undefined);
    vi.stubEnv("WHATSAPP_API_BASE_URL", undefined);
    expect(isKapsoMode()).toBe(false);
  });

  it("is true when WHATSAPP_API_KEY is set", () => {
    vi.stubEnv("WHATSAPP_API_KEY", KAPSO_KEY);
    expect(isKapsoMode()).toBe(true);
  });

  it("is true when the base URL points at Kapso", () => {
    vi.stubEnv("WHATSAPP_API_KEY", undefined);
    vi.stubEnv("WHATSAPP_API_BASE_URL", "https://api.kapso.ai/meta/whatsapp/v24.0");
    expect(isKapsoMode()).toBe(true);
  });
});

describe("Kapso proxy mode", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_API_KEY", KAPSO_KEY);
    vi.stubEnv("WHATSAPP_API_BASE_URL", undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends X-API-Key instead of Authorization on outbound calls", async () => {
    const calls = captureFetch();
    await sendTextMessage({
      phoneNumberId: "test-phone",
      accessToken: "some-meta-token",
      to: "1234567890",
      text: "Hello from Kapso",
    });

    expect(calls).toHaveLength(1);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe(KAPSO_KEY);
    expect(headers.Authorization).toBeUndefined();
  });

  it("verifyPhoneNumber returns minimal info without hitting the network", async () => {
    const calls = captureFetch();
    const info = await verifyPhoneNumber({
      phoneNumberId: "pn-123",
      accessToken: "ignored-in-kapso-mode",
    });

    expect(info).toEqual({ id: "pn-123", display_phone_number: "" });
    expect(calls).toHaveLength(0);
  });

  it("registerPhoneNumber reports success without calling /register", async () => {
    const calls = captureFetch();
    const result = await registerPhoneNumber({
      phoneNumberId: "pn-123",
      accessToken: "ignored",
      pin: "123456",
    });

    expect(result).toEqual({ success: true, alreadyRegistered: true });
    expect(calls).toHaveLength(0);
  });

  it("subscribeWabaToApp is a no-op", async () => {
    const calls = captureFetch();
    await subscribeWabaToApp({ wabaId: "waba-1", accessToken: "ignored" });
    expect(calls).toHaveLength(0);
  });

  it("getSubscribedApps reports a Kapso entry without calling the API", async () => {
    const calls = captureFetch();
    const apps = await getSubscribedApps({ wabaId: "waba-1", accessToken: "ignored" });
    expect(apps).toHaveLength(1);
    expect(apps[0]?.whatsapp_business_api_data?.id).toBe("kapso-proxy");
    expect(calls).toHaveLength(0);
  });

  it("getMediaUrl forwards phone_number_id as a query param", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ url: "https://cdn.example.com/foo", mime_type: "image/png" }), {
          status: 200,
        });
      }),
    );
    await getMediaUrl({
      mediaId: "media-9",
      accessToken: "ignored",
      phoneNumberId: "pn-123",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("phone_number_id=pn-123");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe(KAPSO_KEY);
  });
});

describe("Direct Meta mode (regression)", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_API_KEY", undefined);
    vi.stubEnv("WHATSAPP_API_BASE_URL", undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps Authorization: Bearer on outbound calls", async () => {
    const calls = captureFetch();
    await sendTextMessage({
      phoneNumberId: "test-phone",
      accessToken: "meta-token",
      to: "1234567890",
      text: "Hello",
    });

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer meta-token");
    expect(headers["X-API-Key"]).toBeUndefined();
  });

  it("getMediaUrl does not add phone_number_id without a Kapso key", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ url: "https://cdn.example.com/foo", mime_type: "image/png" }), {
          status: 200,
        });
      }),
    );
    await getMediaUrl({
      mediaId: "media-9",
      accessToken: "meta-token",
      phoneNumberId: "pn-123",
    });

    expect(calls[0].url).not.toContain("phone_number_id");
  });
});
