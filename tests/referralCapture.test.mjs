import assert from "node:assert/strict";
import test from "node:test";

import {
  getPendingReferralCode,
  getStoredReferralSource,
  installGlobalReferralCapture,
} from "../src/utils/referralCode.js";

class MockEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) || []) {
      listener(event);
    }
  }
}

test("an install-referrer received before Signup is retained as automatic", () => {
  const values = new Map();
  const postedMessages = [];
  const mockWindow = new MockEventTarget();
  const mockDocument = new MockEventTarget();

  mockWindow.location = { search: "" };
  mockWindow.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  mockWindow.ReactNativeWebView = {
    postMessage: (message) => postedMessages.push(JSON.parse(message)),
  };
  mockWindow.__MLMLIVE_EARLY_BRIDGE_HANDLER__ = () => {};
  mockWindow.__MLMLIVE_EARLY_BRIDGE_MESSAGES__ = [
    {
      type: "INSTALL_REFERRER",
      referrer: "ref=MLM300",
    },
  ];

  globalThis.window = mockWindow;
  globalThis.document = mockDocument;
  globalThis.CustomEvent = class {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  try {
    installGlobalReferralCapture();

    assert.equal(getPendingReferralCode(), "MLM300");
    assert.equal(getStoredReferralSource(), "automatic");
    assert.deepEqual(postedMessages[0], {
      type: "REQUEST_REFERRAL_CODE",
      request: "GET_INSTALL_REFERRER",
    });

    mockWindow.dispatchEvent({
      type: "message",
      data: {
        type: "PLAY_INSTALL_REFERRER",
        installReferrer: "ref=TEAM-7",
      },
    });

    assert.equal(getPendingReferralCode(), "TEAM-7");
    assert.equal(getStoredReferralSource(), "automatic");
  } finally {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.CustomEvent;
  }
});
