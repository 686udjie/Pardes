/* Pardes namespace, IDB helpers, localStorage utils */
var Pardes = {};

Pardes.$ = function(id) {
  return document.getElementById(id);
};

/* IndexedDB helpers for background blob storage */
var BG_DB_NAME = "bg-db";
var BG_DB_VERSION = 1;
var BG_DB_STORE = "kv";
var BG_DB_KEY = "bgData";

Pardes.idbOpen = function() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(BG_DB_NAME, BG_DB_VERSION);
    req.onupgradeneeded = function() {
      var db = req.result;
      if (!db.objectStoreNames.contains(BG_DB_STORE)) db.createObjectStore(BG_DB_STORE);
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error || new Error("IDB open error")); };
  });
};

Pardes.idbPut = function(value) {
  return Pardes.idbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(BG_DB_STORE, "readwrite");
      tx.objectStore(BG_DB_STORE).put(value, BG_DB_KEY);
      tx.oncomplete = function() { db.close(); resolve(); };
      tx.onerror = function() { db.close(); reject(tx.error); };
    });
  });
};

Pardes.idbGet = function() {
  return Pardes.idbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(BG_DB_STORE, "readonly");
      var req = tx.objectStore(BG_DB_STORE).get(BG_DB_KEY);
      req.onsuccess = function() { db.close(); resolve(req.result || null); };
      req.onerror = function() { db.close(); reject(req.error); };
    });
  });
};

Pardes.idbDel = function() {
  return Pardes.idbOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(BG_DB_STORE, "readwrite");
      tx.objectStore(BG_DB_STORE).delete(BG_DB_KEY);
      tx.oncomplete = function() { db.close(); resolve(); };
      tx.onerror = function() { db.close(); reject(tx.error); };
    });
  });
};

Pardes.getLocal = function(key, def) {
  try { return localStorage.getItem(key) ?? def; } catch { return def; }
};

Pardes.setLocal = function(key, val) {
  try { localStorage.setItem(key, val); } catch {}
};
